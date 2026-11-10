import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';
import * as P from '../programs';

const programs = new Hono<{ Bindings: Env }>();
const STAFF = ['instructor', 'admin', 'super_admin'];
const isAdmin = (role: string) => role === 'admin' || role === 'super_admin';
const canManage = (program: any, userId: string, role: string) => isAdmin(role) || program.created_by === userId;

const CURRENCIES: Record<string, string[]> = {
  NGN: ['paystack', 'flutterwave'], USD: ['paystack', 'flutterwave'], GHS: ['paystack', 'flutterwave'],
  KES: ['paystack', 'flutterwave'], ZAR: ['paystack', 'flutterwave'], GBP: ['flutterwave'],
  EUR: ['flutterwave'], UGX: ['flutterwave'], TZS: ['flutterwave'], RWF: ['flutterwave'],
  XAF: ['flutterwave'], XOF: ['flutterwave'], CAD: ['flutterwave'], AUD: ['flutterwave'],
};

const gatewayConfigured = (k?: string) => !!k && k.length > 20 && !k.includes('xxxx');

async function fetchJson(url: string, init: RequestInit, timeout = 15000): Promise<any> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    return await r.json();
  } finally {
    clearTimeout(id);
  }
}

// GET /api/v1/programs
programs.get('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const status = c.req.query('status');
    const schoolId = c.req.query('school_id');
    const limit = parseInt(c.req.query('limit') || '20', 10) || 20;
    const offset = parseInt(c.req.query('offset') || '0', 10) || 0;
    let rows = await P.listPrograms(c.env, {
      status: status && status !== 'all' ? status : undefined,
      school_id: schoolId, limit, offset, ownerId: s.userId, ownerOnly: false,
    });
    if (!isAdmin(s.role)) {
      rows = rows.filter((p: any) => p.status === 'published' || p.created_by === s.userId);
    }
    return c.json({ success: true, data: rows });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load programs');
  }
});

// POST /api/v1/programs
programs.post('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.school_id || !body.name) return fail(c, 400, 'school_id and name are required');
    const school = await getDb(c.env).query<any>('SELECT id FROM schools WHERE id = $1', [body.school_id]);
    if (!school.rows.length) return fail(c, 404, 'School not found');

    const program = await P.createProgram(c.env, {
      ...body,
      thumbnail_url: body.thumbnail_url || null,
      created_by: s.userId,
      status: 'draft',
    });
    if (body.cohorts?.length) {
      for (const cohort of body.cohorts) await P.createCohort(c.env, program.id, cohort, s.userId);
    }
    return c.json({ success: true, data: await P.getProgramById(c.env, program.id) }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create program');
  }
});

// GET /api/v1/programs/me/cohorts (before /:id)
programs.get('/me/cohorts', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await P.getMemberCohorts(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load cohorts');
  }
});

// GET /api/v1/programs/purchase/verify/:reference (before /:id)
programs.get('/purchase/verify/:reference', async (c) => {
  try {
    const s = await requireAuth(c);
    const reference = c.req.param('reference');
    const db = getDb(c.env);
    const { rows } = await db.query<any>('SELECT * FROM payments WHERE reference = $1', [reference]);
    const payment = rows[0];
    if (!payment) return fail(c, 404, 'Payment not found');
    if (payment.user_id !== s.userId && !isAdmin(s.role)) return fail(c, 403, 'Forbidden');
    if (!payment.program_cohort_id) return fail(c, 400, 'Not a program purchase');

    if (payment.status === 'pending') {
      let verified = false;
      if (payment.provider === 'paystack' && gatewayConfigured(c.env.PAYSTACK_SECRET_KEY)) {
        try {
          const data = await fetchJson(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${c.env.PAYSTACK_SECRET_KEY}` },
          });
          if (data.status && data.data?.status === 'success') verified = true;
        } catch { /* ignore */ }
      } else if (payment.provider === 'flutterwave' && gatewayConfigured(c.env.FLUTTERWAVE_SECRET_KEY)) {
        try {
          const data = await fetchJson(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
            headers: { Authorization: `Bearer ${c.env.FLUTTERWAVE_SECRET_KEY}` },
          });
          if (data.status === 'success' && data.data?.status === 'successful') verified = true;
        } catch { /* ignore */ }
      } else {
        verified = true; // dev mode
      }
      if (verified) {
        await db.query(
          'UPDATE payments SET status = $1, metadata = $2 WHERE reference = $3',
          ['completed', JSON.stringify({ verified: true }), reference]
        );
      }
    }

    const fresh = (await db.query<any>('SELECT * FROM payments WHERE reference = $1', [reference])).rows[0];
    if (fresh?.status === 'completed') {
      const member = await P.enrollMember(c.env, fresh.program_cohort_id, fresh.user_id, fresh.id);
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Program enrollment', $2, 'enrollment', $3)`,
        [fresh.user_id, 'Your program package purchase is confirmed. Start learning!', '/student/courses']
      );
      return c.json({ success: true, data: { ...fresh, enrolled: true, membership: member } });
    }
    return c.json({ success: true, data: fresh });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to verify purchase');
  }
});

// GET /api/v1/programs/:id
programs.get('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const program = await P.getProgramById(c.env, c.req.param('id'));
    if (!program) return fail(c, 404, 'Program not found');
    if (!isAdmin(s.role) && program.status !== 'published' && program.created_by !== s.userId) {
      return fail(c, 403, 'You do not have access to this program');
    }
    return c.json({ success: true, data: program });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load program');
  }
});

// PUT /api/v1/programs/:id
programs.put('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const program = await P.getProgramById(c.env, c.req.param('id'));
    if (!program) return fail(c, 404, 'Program not found');
    if (!canManage(program, s.userId, s.role)) return fail(c, 403, 'Not your program');
    const body: any = await c.req.json().catch(() => ({}));
    if (!isAdmin(s.role) && !['draft', 'rejected'].includes(program.status) && body.status === undefined) {
      return fail(c, 403, 'Published programs must be edited by an admin');
    }
    if (body.status !== undefined && !isAdmin(s.role)) {
      return fail(c, 403, 'Only admins can change program status directly — use submit for review');
    }
    const { courses, cohorts, ...patch } = body;
    if (courses !== undefined) await P.setProgramCourses(c.env, program.id, courses || []);
    const updated = await P.updateProgram(c.env, program.id, {
      ...patch,
      thumbnail_url: patch.thumbnail_url === '' ? null : patch.thumbnail_url,
    });
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update program');
  }
});

// POST /api/v1/programs/:id/submit
programs.post('/:id/submit', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const program = await P.getProgramById(c.env, c.req.param('id'));
    if (!program) return fail(c, 404, 'Program not found');
    if (!canManage(program, s.userId, s.role)) return fail(c, 403, 'Not your program');
    if (!['draft', 'rejected'].includes(program.status)) return fail(c, 409, `Cannot submit a ${program.status} program for review`);
    if (!program.courses?.length) return fail(c, 409, 'Add at least one course before submitting for review');
    return c.json({ success: true, data: await P.updateProgram(c.env, program.id, { status: 'pending_review', rejection_reason: null }) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit program');
  }
});

// POST /api/v1/programs/:id/approve
programs.post('/:id/approve', async (c) => {
  try {
    await requireRole(c, ['admin', 'super_admin']);
    const program = await P.getProgramById(c.env, c.req.param('id'));
    if (!program) return fail(c, 404, 'Program not found');
    if (program.status !== 'pending_review') return fail(c, 409, 'Only programs pending review can be approved');
    const updated = await P.updateProgram(c.env, program.id, { status: 'published', rejection_reason: null });
    await getDb(c.env).query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, 'Program approved', $2, 'info', $3)`,
      [program.created_by, `Your program "${program.name}" is now published`, '/instructor/course-proposals']
    );
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to approve program');
  }
});

// POST /api/v1/programs/:id/reject
programs.post('/:id/reject', async (c) => {
  try {
    await requireRole(c, ['admin', 'super_admin']);
    const program = await P.getProgramById(c.env, c.req.param('id'));
    if (!program) return fail(c, 404, 'Program not found');
    if (program.status !== 'pending_review') return fail(c, 409, 'Only programs pending review can be rejected');
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.reason) return fail(c, 400, 'reason is required');
    const updated = await P.updateProgram(c.env, program.id, { status: 'rejected', rejection_reason: body.reason });
    await getDb(c.env).query(
      `INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, 'Program needs changes', $2, 'info', $3)`,
      [program.created_by, `Your program "${program.name}" was not approved: ${body.reason}`, '/instructor/course-proposals']
    );
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to reject program');
  }
});

// GET /api/v1/programs/:id/cohorts
programs.get('/:id/cohorts', async (c) => {
  try {
    await requireRole(c, STAFF);
    const program = await P.getProgramById(c.env, c.req.param('id'));
    if (!program) return fail(c, 404, 'Program not found');
    return c.json({ success: true, data: program.cohorts || [] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load cohorts');
  }
});

// POST /api/v1/programs/:id/cohorts
programs.post('/:id/cohorts', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const program = await P.getProgramById(c.env, c.req.param('id'));
    if (!program) return fail(c, 404, 'Program not found');
    if (!canManage(program, s.userId, s.role)) return fail(c, 403, 'Not your program');
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.title || !body.starts_at || !body.ends_at) return fail(c, 400, 'title, starts_at and ends_at are required');
    if (new Date(body.ends_at) <= new Date(body.starts_at)) return fail(c, 400, 'ends_at must be after starts_at');
    return c.json({ success: true, data: await P.createCohort(c.env, program.id, body, s.userId) }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create cohort');
  }
});

// POST /api/v1/programs/:id/cohorts/:cohortId/purchase
programs.post('/:id/cohorts/:cohortId/purchase', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const provider = body.provider === 'flutterwave' ? 'flutterwave' : 'paystack';
    const cohort = await P.getCohortById(c.env, c.req.param('cohortId'));
    if (!cohort || cohort.program_id !== c.req.param('id')) return fail(c, 404, 'Cohort not found');
    if (cohort.program_status !== 'published') return fail(c, 400, 'This program is not published yet');
    if (cohort.status !== 'open') return fail(c, 400, `Cohort is ${cohort.status}`);

    const existing = await P.getMembership(c.env, cohort.id, s.userId);
    if (existing && existing.status === 'active') return fail(c, 409, 'Already enrolled in this cohort');

    const currency = String(body.currency || cohort.program_currency || 'NGN').toUpperCase();
    if (!CURRENCIES[currency]) return fail(c, 400, `Unsupported currency ${currency}`);
    if (!CURRENCIES[currency].includes(provider)) return fail(c, 400, `${provider} does not support ${currency}`);

    const amount = cohort.price !== null && cohort.price !== undefined ? Number(cohort.price) : Number(cohort.program_price || 0);
    const db = getDb(c.env);
    const user = (await db.query<any>('SELECT * FROM users WHERE id = $1', [s.userId])).rows[0];
    if (!user) return fail(c, 404, 'User not found');

    if (amount <= 0) {
      const member = await P.enrollMember(c.env, cohort.id, s.userId, null);
      return c.json({ success: true, data: { amount: 0, enrolled: true, membership: member } });
    }

    const reference = `${provider}_${s.userId}_${cohort.id}_${Date.now()}`;
    const { rows } = await db.query<any>(
      `INSERT INTO payments (user_id, course_id, program_cohort_id, amount, currency, provider, reference)
       VALUES ($1, NULL, $2, $3, $4, $5, $6) RETURNING *`,
      [s.userId, cohort.id, amount, currency, provider, reference]
    );
    const payment = rows[0];
    const data: any = { paymentId: payment.id, reference, amount, currency };

    if (provider === 'paystack' && gatewayConfigured(c.env.PAYSTACK_SECRET_KEY)) {
      const json = await fetchJson('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${c.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          amount: Math.round(amount * 100),
          reference,
          currency,
          callback_url: `${c.env.FRONTEND_URL}/verify-payment?reference=${reference}`,
          metadata: { userId: s.userId, programId: cohort.program_id, cohortId: cohort.id },
        }),
      });
      if (!json.status) return fail(c, 502, json.message || 'Paystack initialization failed');
      data.authorizationUrl = json.data.authorization_url;
      data.publicKey = c.env.PAYSTACK_PUBLIC_KEY;
    } else if (provider === 'flutterwave' && gatewayConfigured(c.env.FLUTTERWAVE_SECRET_KEY)) {
      const json = await fetchJson('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${c.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: reference,
          amount,
          currency,
          redirect_url: `${c.env.FRONTEND_URL}/verify-payment?reference=${reference}`,
          customer: { email: user.email, name: user.name },
          meta: { userId: s.userId, programId: cohort.program_id, cohortId: cohort.id },
          customizations: { title: 'CareerCode Academy', description: `Program cohort: ${cohort.title}` },
        }),
      });
      if (json.status !== 'success' && json.status !== '1') return fail(c, 502, json.message || 'Flutterwave initialization failed');
      data.authorizationUrl = json.data?.link;
      data.publicKey = c.env.FLUTTERWAVE_PUBLIC_KEY;
      data.provider = 'flutterwave';
    } else {
      data.authorizationUrl = `${c.env.FRONTEND_URL}/verify-payment?reference=${reference}&status=success`;
      data.publicKey = c.env.PAYSTACK_PUBLIC_KEY || '';
    }

    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to start purchase');
  }
});

export default programs;
