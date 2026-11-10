import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';
import { createNotification } from '../challenges';

// Ported from backend/src/routes/payout.routes.ts.
// Mounted at /api/v1/payouts. Socket.io emits are dropped; admin
// authorization checks are kept exactly as in Express.

const payouts = new Hono<{ Bindings: Env }>();

const ADMIN_ROLES = ['admin', 'super_admin'];

async function commissionRate(env: Env): Promise<number> {
  const { rows } = await getDb(env).query<any>(
    `SELECT value FROM system_settings WHERE key = 'commission_rate'`
  );
  return parseInt(rows[0]?.value || '30', 10);
}

async function balances(env: Env, instructorId: string): Promise<{
  totalRevenue: number;
  totalPaid: number;
  commissionRate: number;
  availableBalance: number;
}> {
  const db = getDb(env);
  const rate = await commissionRate(env);

  const balanceRes = await db.query<any>(
    `SELECT COALESCE(SUM(p.amount), 0) as total_revenue
     FROM payments p
     JOIN courses c ON p.course_id = c.id
     WHERE c.instructor_id = $1 AND p.status = 'completed'`,
    [instructorId]
  );

  const paidRes = await db.query<any>(
    `SELECT COALESCE(SUM(net_amount), 0) as total_paid
     FROM payouts
     WHERE instructor_id = $1 AND status IN ('approved', 'paid')`,
    [instructorId]
  );

  const totalRevenue = parseFloat(balanceRes.rows[0]?.total_revenue ?? 0) || 0;
  const totalPaid = parseFloat(paidRes.rows[0]?.total_paid ?? 0) || 0;
  const availableBalance = Math.max(0, totalRevenue * (1 - rate / 100) - totalPaid);

  return { totalRevenue, totalPaid, commissionRate: rate, availableBalance };
}

// ─── INSTRUCTOR ROUTES ────────────────────────────────────────────────────

// GET /api/v1/payouts/instructor — instructor payout history + balance
payouts.get('/instructor', async (c) => {
  try {
    const s = await requireRole(c, ['instructor', 'admin', 'super_admin']);
    const instructorId = s.userId;
    const page = parseInt(c.req.query('page') || '1') || 1;
    const limit = parseInt(c.req.query('limit') || '20') || 20;
    const offset = (page - 1) * limit;
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      `SELECT * FROM payouts WHERE instructor_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [instructorId, limit, offset]
    );

    const countRes = await db.query<any>(
      'SELECT COUNT(*) as count FROM payouts WHERE instructor_id = $1',
      [instructorId]
    );
    const total = parseInt(countRes.rows[0]?.count, 10) || 0;

    const b = await balances(c.env, instructorId);

    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      balance: {
        totalRevenue: b.totalRevenue,
        commissionRate: b.commissionRate,
        platformFee: b.totalRevenue * (b.commissionRate / 100),
        netShare: b.totalRevenue * (1 - b.commissionRate / 100),
        totalPaid: b.totalPaid,
        availableBalance: b.availableBalance,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load payouts');
  }
});

// POST /api/v1/payouts/instructor/request — request a payout
payouts.post('/instructor/request', async (c) => {
  try {
    const s = await requireRole(c, ['instructor']);
    const instructorId = s.userId;
    const body: any = await c.req.json().catch(() => ({}));
    const { amount, payment_method, payment_details } = body;

    if (!amount || amount <= 0) return fail(c, 400, 'Invalid amount');
    if (!payment_method) return fail(c, 400, 'Payment method is required');

    const b = await balances(c.env, instructorId);
    if (amount > b.availableBalance) {
      return fail(c, 400, `Insufficient balance. Available: $${b.availableBalance.toFixed(2)}`);
    }

    const fee = amount * (b.commissionRate / 100);
    const netAmount = amount - fee;

    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `INSERT INTO payouts (instructor_id, amount, fee, net_amount, payment_method, payment_details, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [instructorId, amount, fee, netAmount, payment_method, payment_details]
    );

    // Notify admins (best-effort, like the Express try/catch).
    const adminRes = await db.query<any>(
      `SELECT id FROM users WHERE role IN ('admin', 'super_admin')`
    );
    for (const admin of adminRes.rows) {
      try {
        await createNotification(db, {
          user_id: admin.id,
          title: 'New Payout Request',
          message: `An instructor has requested a payout of $${amount}.`,
          type: 'info',
        });
      } catch {
        /* non-critical */
      }
    }

    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to request payout');
  }
});

// ─── ADMIN ROUTES ─────────────────────────────────────────────────────────

// GET /api/v1/payouts/admin — list all payouts
payouts.get('/admin', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    const page = parseInt(c.req.query('page') || '1') || 1;
    const limit = parseInt(c.req.query('limit') || '20') || 20;
    const offset = (page - 1) * limit;
    const status = c.req.query('status');
    const db = getDb(c.env);

    let sql = `
      SELECT p.*, u.name as instructor_name, u.email as instructor_email
      FROM payouts p
      JOIN users u ON p.instructor_id = u.id
    `;
    const params: any[] = [];
    if (status) {
      params.push(status);
      sql += ` WHERE p.status = $1`;
    }
    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await db.query<any>(sql, params);

    let countSql = 'SELECT COUNT(*) as count FROM payouts';
    const countParams: any[] = [];
    if (status) {
      countParams.push(status);
      countSql += ' WHERE status = $1';
    }
    const countRes = await db.query<any>(countSql, countParams);
    const total = parseInt(countRes.rows[0]?.count, 10) || 0;

    const statsRes = await db.query<any>(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_total,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_total,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_total,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
       FROM payouts`
    );

    return c.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      stats: statsRes.rows[0],
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load payouts');
  }
});

// PUT /api/v1/payouts/admin/:id/approve — approve a payout
payouts.put('/admin/:id/approve', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      `UPDATE payouts
       SET status = 'approved', admin_notes = COALESCE($1, admin_notes), reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [body.notes, s.userId, id]
    );

    if (!rows.length) return fail(c, 404, 'Payout not found or already processed');

    try {
      await createNotification(db, {
        user_id: rows[0].instructor_id,
        title: 'Payout Approved',
        message: `Your payout of $${rows[0].amount} has been approved.`,
        type: 'success',
      });
    } catch {
      /* non-critical */
    }

    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to approve payout');
  }
});

// PUT /api/v1/payouts/admin/:id/mark-paid — mark payout as paid
payouts.put('/admin/:id/mark-paid', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const db = getDb(c.env);

    const { rows } = await db.query<any>(
      `UPDATE payouts
       SET status = 'paid', admin_notes = COALESCE($1, admin_notes), reviewed_by = $2, processed_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND status = 'approved'
       RETURNING *`,
      [body.notes, s.userId, id]
    );

    if (!rows.length) return fail(c, 404, 'Payout not found or not in approved status');

    try {
      await createNotification(db, {
        user_id: rows[0].instructor_id,
        title: 'Payout Sent',
        message: `Your payout of $${rows[0].amount} has been sent.`,
        type: 'success',
      });
    } catch {
      /* non-critical */
    }

    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to mark payout as paid');
  }
});

// PUT /api/v1/payouts/admin/:id/reject — reject a payout
payouts.put('/admin/:id/reject', async (c) => {
  try {
    const s = await requireRole(c, ADMIN_ROLES);
    const id = c.req.param('id');
    const body: any = await c.req.json().catch(() => ({}));
    const { reason } = body;

    if (!reason) return fail(c, 400, 'Rejection reason is required');

    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `UPDATE payouts
       SET status = 'rejected', admin_notes = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [reason, s.userId, id]
    );

    if (!rows.length) return fail(c, 404, 'Payout not found or already processed');

    try {
      await createNotification(db, {
        user_id: rows[0].instructor_id,
        title: 'Payout Rejected',
        message: `Your payout of $${rows[0].amount} was rejected. Reason: ${reason}`,
        type: 'error',
      });
    } catch {
      /* non-critical */
    }

    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reject payout');
  }
});

export default payouts;
