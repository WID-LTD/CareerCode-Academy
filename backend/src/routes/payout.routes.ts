import { Router, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { query } from '../config/db';
import { createNotification } from '../models/notification';
import { io } from '../config/socket';

const router = Router();

// ─── INSTRUCTOR ROUTES ───────────────────────────────────────────────────────

// GET /payouts/instructor — Instructor's payout history
router.get(
  '/instructor',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const { rows } = await query(
        `SELECT * FROM payouts WHERE instructor_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [instructorId, limit, offset]
      );

      const countRes = await query('SELECT COUNT(*) FROM payouts WHERE instructor_id = $1', [instructorId]);
      const total = parseInt(countRes.rows[0].count, 10);

      // Get commission rate
      const rateRes = await query(
        `SELECT value FROM system_settings WHERE key = 'commission_rate'`
      );
      const commissionRate = parseInt(rateRes.rows[0]?.value || '30', 10);

      // Get available balance (total completed payments * (1 - commission_rate))
      const balanceRes = await query(`
        SELECT COALESCE(SUM(p.amount), 0) as total_revenue
        FROM payments p
        JOIN courses c ON p.course_id = c.id
        WHERE c.instructor_id = $1 AND p.status = 'completed'
      `, [instructorId]);

      // Get total already paid out
      const paidRes = await query(`
        SELECT COALESCE(SUM(net_amount), 0) as total_paid
        FROM payouts
        WHERE instructor_id = $1 AND status IN ('approved', 'paid')
      `, [instructorId]);

      const totalRevenue = parseFloat(balanceRes.rows[0].total_revenue);
      const totalPaid = parseFloat(paidRes.rows[0].total_paid);
      const availableBalance = totalRevenue * (1 - commissionRate / 100) - totalPaid;

      res.json({
        success: true,
        data: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        balance: {
          totalRevenue,
          commissionRate,
          platformFee: totalRevenue * (commissionRate / 100),
           netShare: totalRevenue * (1 - commissionRate / 100),
          totalPaid,
          availableBalance: Math.max(0, availableBalance),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /payouts/instructor/request — Request a payout
router.post(
  '/instructor/request',
  authenticate,
  authorize('instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const instructorId = req.user!.userId;
      const { amount, payment_method, payment_details } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid amount' });
      }

      if (!payment_method) {
        return res.status(400).json({ success: false, message: 'Payment method is required' });
      }

      // Get commission rate
      const rateRes = await query(
        `SELECT value FROM system_settings WHERE key = 'commission_rate'`
      );
      const commissionRate = parseInt(rateRes.rows[0]?.value || '30', 10);

      // Verify balance
      const balanceRes = await query(`
        SELECT COALESCE(SUM(p.amount), 0) as total_revenue
        FROM payments p
        JOIN courses c ON p.course_id = c.id
        WHERE c.instructor_id = $1 AND p.status = 'completed'
      `, [instructorId]);

      const paidRes = await query(`
        SELECT COALESCE(SUM(net_amount), 0) as total_paid
        FROM payouts
        WHERE instructor_id = $1 AND status IN ('approved', 'paid')
      `, [instructorId]);

      const totalRevenue = parseFloat(balanceRes.rows[0].total_revenue);
      const totalPaid = parseFloat(paidRes.rows[0].total_paid);
      const availableBalance = Math.max(0, totalRevenue * (1 - commissionRate / 100) - totalPaid);

      if (amount > availableBalance) {
        return res.status(400).json({
          success: false,
          message: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`,
        });
      }

      const fee = amount * (commissionRate / 100);
      const netAmount = amount - fee;

      const { rows } = await query(`
        INSERT INTO payouts (instructor_id, amount, fee, net_amount, payment_method, payment_details, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *
      `, [instructorId, amount, fee, netAmount, payment_method, payment_details]);

      // Notify admins
      const adminRes = await query(
        `SELECT id FROM users WHERE role IN ('admin', 'super_admin')`
      );
      for (const admin of adminRes.rows) {
        try {
          await createNotification({
            user_id: admin.id,
            title: 'New Payout Request',
            message: `An instructor has requested a payout of $${amount}.`,
            type: 'info',
          });
          io.to(admin.id).emit('new_notification', {
            title: 'New Payout Request',
            message: `A payout of $${amount} has been requested.`,
          });
        } catch { /* non-critical */ }
      }

      res.status(201).json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// ─── ADMIN ROUTES ────────────────────────────────────────────────────────────

// GET /payouts/admin — List all payouts (admin view)
router.get(
  '/admin',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

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

      const { rows } = await query(sql, params);

      let countSql = 'SELECT COUNT(*) FROM payouts';
      const countParams: any[] = [];
      if (status) {
        countParams.push(status);
        countSql += ` WHERE status = $1`;
      }
      const countRes = await query(countSql, countParams);
      const total = parseInt(countRes.rows[0].count, 10);

      // Summary stats
      const statsRes = await query(`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_total,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_total,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_total,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
        FROM payouts
      `);

      res.json({
        success: true,
        data: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        stats: statsRes.rows[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /payouts/admin/:id/approve — Approve a payout
router.put(
  '/admin/:id/approve',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const adminId = req.user!.userId;

      const { rows } = await query(`
        UPDATE payouts
        SET status = 'approved', admin_notes = COALESCE($1, admin_notes), reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
        WHERE id = $3 AND status = 'pending'
        RETURNING *
      `, [notes, adminId, id]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Payout not found or already processed' });
      }

      // Notify instructor
      try {
        await createNotification({
          user_id: rows[0].instructor_id,
          title: 'Payout Approved',
          message: `Your payout of $${rows[0].amount} has been approved.`,
          type: 'success',
        });
        io.to(rows[0].instructor_id).emit('new_notification', {
          title: 'Payout Approved',
          message: `Your payout of $${rows[0].amount} has been approved.`,
        });
      } catch { /* non-critical */ }

      res.json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /payouts/admin/:id/mark-paid — Mark payout as paid
router.put(
  '/admin/:id/mark-paid',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const adminId = req.user!.userId;

      const { rows } = await query(`
        UPDATE payouts
        SET status = 'paid', admin_notes = COALESCE($1, admin_notes), reviewed_by = $2, processed_at = NOW(), updated_at = NOW()
        WHERE id = $3 AND status = 'approved'
        RETURNING *
      `, [notes, adminId, id]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Payout not found or not in approved status' });
      }

      // Notify instructor
      try {
        await createNotification({
          user_id: rows[0].instructor_id,
          title: 'Payout Sent',
          message: `Your payout of $${rows[0].amount} has been sent.`,
          type: 'success',
        });
        io.to(rows[0].instructor_id).emit('new_notification', {
          title: 'Payout Sent',
          message: `Your payout of $${rows[0].amount} has been sent.`,
        });
      } catch { /* non-critical */ }

      res.json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /payouts/admin/:id/reject — Reject a payout
router.put(
  '/admin/:id/reject',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user!.userId;

      if (!reason) {
        return res.status(400).json({ success: false, message: 'Rejection reason is required' });
      }

      const { rows } = await query(`
        UPDATE payouts
        SET status = 'rejected', admin_notes = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
        WHERE id = $3 AND status = 'pending'
        RETURNING *
      `, [reason, adminId, id]);

      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Payout not found or already processed' });
      }

      // Notify instructor
      try {
        await createNotification({
          user_id: rows[0].instructor_id,
          title: 'Payout Rejected',
          message: `Your payout of $${rows[0].amount} was rejected. Reason: ${reason}`,
          type: 'error',
        });
        io.to(rows[0].instructor_id).emit('new_notification', {
          title: 'Payout Rejected',
          message: `Your payout was rejected: ${reason}`,
        });
      } catch { /* non-critical */ }

      res.json({ success: true, data: rows[0] });
    } catch (error) {
      next(error);
    }
  }
);

export default router;