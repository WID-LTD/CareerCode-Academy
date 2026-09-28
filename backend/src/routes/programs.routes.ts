import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as ProgramModel from '../models/program';
import * as PaymentModel from '../models/payment';
import * as UserModel from '../models/user';
import { NotFoundError, ConflictError, ForbiddenError } from '../utils/errors';
import { emitDashboardUpdate, emitStudentUpdate } from '../config/socket';
import { query } from '../config/db';
import { isSupportedCurrency, getCurrencyInfo } from '../utils/currency';

const router = Router();

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 30000): Promise<any> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

const courseLinkSchema = z.object({
  course_id: z.string().uuid(),
  week_number: z.number().int().min(1).max(52).optional(),
  required: z.boolean().optional(),
});

const cohortInputSchema = z.object({
  title: z.string().min(1).max(200),
  starts_at: z.string().min(1),
  ends_at: z.string().min(1),
  capacity: z.number().int().min(1).max(10000).optional(),
  price: z.number().min(0).optional().nullable(),
});

const createProgramSchema = z.object({
  school_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  duration_weeks: z.number().int().min(1).max(52).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  thumbnail_url: z.string().url().optional().or(z.literal('')),
  career_outcomes: z.array(z.string().max(300)).max(20).optional(),
  courses: z.array(courseLinkSchema).max(60).optional(),
  cohorts: z.array(cohortInputSchema).max(10).optional(),
});

const updateProgramSchema = createProgramSchema.partial().extend({
  status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'archived']).optional(),
});

function canManage(program: any, userId: string, role: string): boolean {
  if (role === 'admin' || role === 'super_admin') return true;
  return program.created_by === userId;
}

// GET /programs (admin: all, instructor: published + own)
router.get(
  '/',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const role = req.user!.role;
      const isAdmin = role === 'admin' || role === 'super_admin';
      const status = req.query.status as string | undefined;
      const school_id = req.query.school_id as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      let programs = await ProgramModel.listPrograms({
        status: status && status !== 'all' ? status : undefined,
        school_id,
        limit,
        offset,
        ownerId: req.user!.userId,
        ownerOnly: false,
      });
      if (!isAdmin) {
        // Instructors: published programs + own drafts
        programs = programs.filter((p: any) => p.status === 'published' || p.created_by === req.user!.userId);
      }
      res.json({ success: true, data: programs });
    } catch (error) {
      next(error);
    }
  }
);

// POST /programs (admin + instructor; instructors always start as draft)
router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  validate(createProgramSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const role = req.user!.role;
      const isAdmin = role === 'admin' || role === 'super_admin';
      const school = await query('SELECT id FROM schools WHERE id = $1', [req.body.school_id]);
      if (!school.rows.length) throw new NotFoundError('School');
      const program = await ProgramModel.createProgram({
        ...req.body,
        thumbnail_url: req.body.thumbnail_url || null,
        created_by: req.user!.userId,
        status: 'draft',
      });
      if (req.body.cohorts?.length) {
        for (const c of req.body.cohorts) {
          await ProgramModel.createCohort(program.id, c, req.user!.userId);
        }
      }
      emitDashboardUpdate();
      res.status(201).json({ success: true, data: await ProgramModel.getProgramById(program.id) });
    } catch (error) {
      next(error);
    }
  }
);

// NOTE: /me/cohorts must be registered before /:id routes (Express matches in order).
// GET /programs/me/cohorts — my package enrollments (student)
router.get(
  '/me/cohorts',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const rows = await ProgramModel.getMemberCohorts(req.user!.userId);
      res.json({ success: true, data: rows });
    } catch (error) {
      next(error);
    }
  }
);

// GET /programs/:id
router.get(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const program = await ProgramModel.getProgramById(req.params.id);
      if (!program) throw new NotFoundError('Program');
      const role = req.user!.role;
      const isAdmin = role === 'admin' || role === 'super_admin';
      if (!isAdmin && program.status !== 'published' && program.created_by !== req.user!.userId) {
        throw new ForbiddenError('You do not have access to this program');
      }
      res.json({ success: true, data: program });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /programs/:id (owner or admin; instructors can only edit draft/rejected; status via admin or workflow endpoints)
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  validate(updateProgramSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const program = await ProgramModel.getProgramById(req.params.id);
      if (!program) throw new NotFoundError('Program');
      const role = req.user!.role;
      const isAdmin = role === 'admin' || role === 'super_admin';
      if (!canManage(program, req.user!.userId, role)) throw new ForbiddenError('Not your program');
      if (!isAdmin && !['draft', 'rejected'].includes(program.status) && req.body.status === undefined) {
        throw new ForbiddenError('Published programs must be edited by an admin');
      }
      if (req.body.status !== undefined && !isAdmin) {
        throw new ForbiddenError('Only admins can change program status directly — use submit for review');
      }
      const { courses, cohorts, ...patch } = req.body;
      if (courses !== undefined) {
        await ProgramModel.setProgramCourses(program.id, courses || []);
      }
      const updated = await ProgramModel.updateProgram(program.id, {
        ...patch,
        thumbnail_url: patch.thumbnail_url === '' ? null : patch.thumbnail_url,
      });
      emitDashboardUpdate();
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// POST /programs/:id/submit (owner or admin): draft/rejected -> pending_review
router.post(
  '/:id/submit',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const program = await ProgramModel.getProgramById(req.params.id);
      if (!program) throw new NotFoundError('Program');
      if (!canManage(program, req.user!.userId, req.user!.role)) throw new ForbiddenError('Not your program');
      if (!['draft', 'rejected'].includes(program.status)) {
        throw new ConflictError(`Cannot submit a ${program.status} program for review`);
      }
      if (!program.courses?.length) {
        throw new ConflictError('Add at least one course before submitting for review');
      }
      const updated = await ProgramModel.updateProgram(program.id, { status: 'pending_review', rejection_reason: null });
      emitDashboardUpdate();
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// POST /programs/:id/approve (admin): pending_review -> published
router.post(
  '/:id/approve',
  authenticate,
  authorize('admin', 'super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const program = await ProgramModel.getProgramById(req.params.id);
      if (!program) throw new NotFoundError('Program');
      if (program.status !== 'pending_review') throw new ConflictError('Only programs pending review can be approved');
      const updated = await ProgramModel.updateProgram(program.id, { status: 'published', rejection_reason: null });
      try {
        await query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Program approved', $2, 'info')`,
          [program.created_by, `Your program "${program.name}" is now published`]
        );
      } catch {}
      emitDashboardUpdate();
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// POST /programs/:id/reject (admin): pending_review -> rejected + reason
router.post(
  '/:id/reject',
  authenticate,
  authorize('admin', 'super_admin'),
  validate(z.object({ reason: z.string().min(1).max(1000) })),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const program = await ProgramModel.getProgramById(req.params.id);
      if (!program) throw new NotFoundError('Program');
      if (program.status !== 'pending_review') throw new ConflictError('Only programs pending review can be rejected');
      const updated = await ProgramModel.updateProgram(program.id, { status: 'rejected', rejection_reason: req.body.reason });
      try {
        await query(
          `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Program needs changes', $2, 'info')`,
          [program.created_by, `Your program "${program.name}" was not approved: ${req.body.reason}`]
        );
      } catch {}
      emitDashboardUpdate();
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// GET /programs/:id/cohorts
router.get(
  '/:id/cohorts',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const program = await ProgramModel.getProgramById(req.params.id);
      if (!program) throw new NotFoundError('Program');
      res.json({ success: true, data: program.cohorts || [] });
    } catch (error) {
      next(error);
    }
  }
);

// POST /programs/:id/cohorts (owner or admin)
router.post(
  '/:id/cohorts',
  authenticate,
  authorize('admin', 'super_admin', 'instructor'),
  validate(cohortInputSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const program = await ProgramModel.getProgramById(req.params.id);
      if (!program) throw new NotFoundError('Program');
      if (!canManage(program, req.user!.userId, req.user!.role)) throw new ForbiddenError('Not your program');
      if (new Date(req.body.ends_at) <= new Date(req.body.starts_at)) {
        return res.status(400).json({ success: false, message: 'ends_at must be after starts_at' });
      }
      const cohort = await ProgramModel.createCohort(program.id, req.body, req.user!.userId);
      emitDashboardUpdate();
      res.status(201).json({ success: true, data: cohort });
    } catch (error) {
      next(error);
    }
  }
);

// POST /programs/:id/cohorts/:cohortId/purchase (student checkout for the package)
const purchaseSchema = z.object({
  provider: z.enum(['paystack', 'flutterwave']).optional().default('paystack'),
  currency: z.string().length(3).optional(),
});

router.post(
  '/:id/cohorts/:cohortId/purchase',
  authenticate,
  validate(purchaseSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const cohort = await ProgramModel.getCohortById(req.params.cohortId);
      if (!cohort || cohort.program_id !== req.params.id) throw new NotFoundError('Cohort');
      if (cohort.program_status !== 'published') {
        return res.status(400).json({ success: false, message: 'This program is not published yet' });
      }
      if (cohort.status !== 'open') {
        return res.status(400).json({ success: false, message: `Cohort is ${cohort.status}` });
      }
      const existing = await ProgramModel.getMembership(cohort.id, userId);
      if (existing && existing.status === 'active') throw new ConflictError('Already enrolled in this cohort');

      const currency = (req.body.currency || cohort.program_currency || 'NGN').toUpperCase();
      if (!isSupportedCurrency(currency)) {
        return res.status(400).json({ success: false, message: `Unsupported currency ${currency}` });
      }
      const currencyInfo = getCurrencyInfo(currency);
      if (!(currencyInfo.gateways as readonly string[]).includes(req.body.provider)) {
        return res.status(400).json({ success: false, message: `${req.body.provider} does not support ${currency}` });
      }
      const amount = cohort.price !== null && cohort.price !== undefined ? Number(cohort.price) : Number(cohort.program_price || 0);
      const user = await UserModel.getUserById(userId);
      if (!user) throw new NotFoundError('User');

      // Free package: enroll immediately into cohort + all bundled courses
      if (amount <= 0) {
        const member = await ProgramModel.enrollMember(cohort.id, userId, null);
        emitDashboardUpdate();
        emitStudentUpdate(userId);
        return res.json({ success: true, data: { amount: 0, enrolled: true, membership: member } });
      }

      const provider = req.body.provider;
      const reference = `${provider}_${userId}_${cohort.id}_${Date.now()}`;
      const payment = await ProgramModel.createProgramPayment({
        user_id: userId,
        cohort_id: cohort.id,
        amount,
        currency,
        provider,
        reference,
      });

      const paystackKey = process.env.PAYSTACK_SECRET_KEY || '';
      const flutterwaveKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
      const isPaystackConfigured = paystackKey.length > 20 && !paystackKey.includes('xxxx');
      const isFlutterwaveConfigured = flutterwaveKey.length > 20 && !flutterwaveKey.includes('xxxx');
      const paymentData: any = { paymentId: payment.id, reference, amount, currency };

      if (provider === 'paystack' && isPaystackConfigured) {
        try {
          const response = await fetchWithTimeout('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: { Authorization: `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              amount: Math.round(amount * 100),
              reference,
              currency,
              callback_url: `${process.env.FRONTEND_URL}/verify-payment?reference=${reference}`,
              metadata: { userId, programId: cohort.program_id, cohortId: cohort.id },
            }),
          });
          const paystackData: any = await response.json();
          if (!paystackData.status) throw new Error(paystackData.message || 'Paystack initialization failed');
          paymentData.authorizationUrl = paystackData.data.authorization_url;
          paymentData.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
        } catch (err: any) {
          if (err?.message?.includes('initialization failed') || err?.message?.includes('Paystack')) throw err;
          return res.status(502).json({ success: false, message: 'Payment provider unreachable. Your payment was recorded as pending — please try again.', reference });
        }
      } else if (provider === 'flutterwave' && isFlutterwaveConfigured) {
        try {
          const response = await fetchWithTimeout('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: { Authorization: `Bearer ${flutterwaveKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tx_ref: reference,
              amount,
              currency,
              redirect_url: `${process.env.FRONTEND_URL}/verify-payment?reference=${reference}`,
              customer: { email: user.email, name: user.name },
              meta: { userId, programId: cohort.program_id, cohortId: cohort.id },
              customizations: { title: 'CareerCode Academy', description: `Program cohort: ${cohort.title}` },
            }),
          });
          const flwData: any = await response.json();
          if (flwData.status === 'success' || flwData.status === '1') {
            paymentData.authorizationUrl = flwData.data?.link;
            paymentData.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
            paymentData.provider = 'flutterwave';
          } else {
            throw new Error(flwData.message || 'Flutterwave initialization failed');
          }
        } catch (err: any) {
          if (err?.message?.includes('initialization failed') || err?.message?.includes('Flutterwave')) throw err;
          return res.status(502).json({ success: false, message: 'Payment provider unreachable. Your payment was recorded as pending — please try again.', reference });
        }
      } else {
        // Dev mode: skip gateway (same pattern as course checkout)
        paymentData.authorizationUrl = `${process.env.FRONTEND_URL}/verify-payment?reference=${reference}&status=success`;
        paymentData.publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
      }

      res.json({ success: true, data: paymentData });
    } catch (error) {
      next(error);
    }
  }
);

// GET /programs/purchase/verify/:reference — verify package payment, then enroll
router.get(
  '/purchase/verify/:reference',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;
      const payment = await PaymentModel.getPaymentByReference(reference);
      if (!payment) throw new NotFoundError('Payment');
      if (payment.user_id !== req.user!.userId && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      if (!(payment as any).program_cohort_id) {
        return res.status(400).json({ success: false, message: 'Not a program purchase' });
      }
      if (payment.status === 'pending') {
        const paystackKey = process.env.PAYSTACK_SECRET_KEY || '';
        const flutterwaveKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
        const isPaystackConfigured = paystackKey.length > 20 && !paystackKey.includes('xxxx');
        const isFlutterwaveConfigured = flutterwaveKey.length > 20 && !flutterwaveKey.includes('xxxx');
        let verified = false;
        if (payment.provider === 'paystack' && isPaystackConfigured) {
          try {
            const response = await fetchWithTimeout(`https://api.paystack.co/transaction/verify/${reference}`, {
              headers: { Authorization: `Bearer ${paystackKey}` },
            });
            const paystackData: any = await response.json();
            if (paystackData.status && paystackData.data?.status === 'success') verified = true;
          } catch { /* fall through */ }
        } else if (payment.provider === 'flutterwave' && isFlutterwaveConfigured) {
          try {
            const response = await fetchWithTimeout(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
              headers: { Authorization: `Bearer ${flutterwaveKey}` },
            });
            const flwData: any = await response.json();
            if (flwData.status === 'success' && flwData.data?.status === 'successful') verified = true;
          } catch { /* fall through */ }
        } else {
          verified = true; // dev mode
        }
        if (verified) {
          await PaymentModel.updatePaymentStatus(reference, 'completed', { verified: true });
        }
      }
      const fresh = await PaymentModel.getPaymentByReference(reference);
      if (fresh?.status === 'completed') {
        const member = await ProgramModel.enrollMember((fresh as any).program_cohort_id, fresh.user_id, fresh.id);
        try {
          await query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Program enrollment', $2, 'enrollment')`,
            [fresh.user_id, 'Your program package purchase is confirmed. Start learning!']
          );
        } catch {}
        emitDashboardUpdate();
        emitStudentUpdate(fresh.user_id);
        return res.json({ success: true, data: { ...fresh, enrolled: true, membership: member } });
      }
      res.json({ success: true, data: fresh });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
