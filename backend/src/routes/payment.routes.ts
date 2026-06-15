import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as PaymentModel from '../models/payment';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import * as UserModel from '../models/user';
import { NotFoundError, ConflictError } from '../utils/errors';
import { emitDashboardUpdate, emitStudentUpdate } from '../config/socket';
import { query } from '../config/db';

const router = Router();

const initializePaymentSchema = z.object({
  courseId: z.string().uuid(),
  provider: z.enum(['flutterwave', 'paystack']),
  currency: z.string().length(3).optional().default('NGN'),
});

// POST /payments/initialize
router.post(
  '/initialize',
  authenticate,
  validate(initializePaymentSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId, provider, currency } = req.body;
      const userId = req.user!.userId;

      const user = await UserModel.getUserById(userId);
      if (!user) throw new NotFoundError('User');

      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      if (course.price === 0) {
        return res.status(400).json({
          success: false,
          message: 'This course is free. No payment required.',
        });
      }

      const existingEnrollment = await EnrollmentModel.getEnrollment(userId, courseId);
      if (existingEnrollment) {
        throw new ConflictError('Already enrolled in this course');
      }

      // Generate unique reference
      const reference = `${provider}_${userId}_${courseId}_${Date.now()}`;

      const payment = await PaymentModel.createPayment({
        user_id: userId,
        course_id: courseId,
        amount: course.price,
        currency,
        provider,
        reference,
      });

      let paymentData: any = {
        paymentId: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency,
      };

      const paystackKey = process.env.PAYSTACK_SECRET_KEY || '';
      const flutterwaveKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
      const isPaystackConfigured = paystackKey.length > 20 && !paystackKey.includes('xxxx');
      const isFlutterwaveConfigured = flutterwaveKey.length > 20 && !flutterwaveKey.includes('xxxx');

      if (provider === 'paystack' && isPaystackConfigured) {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${paystackKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: user.email,
            amount: Math.round(payment.amount * 100), // Paystack requires amount in kobo
            reference: payment.reference,
            currency: payment.currency,
            callback_url: `${process.env.FRONTEND_URL}/verify-payment`,
            metadata: { userId, courseId }
          })
        });

        const paystackData: any = await response.json();
        if (!paystackData.status) {
           throw new Error(paystackData.message || 'Paystack initialization failed');
        }
        
        paymentData.authorizationUrl = paystackData.data.authorization_url;
        paymentData.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
      } else if (provider === 'flutterwave' && isFlutterwaveConfigured) {
        const response = await fetch('https://api.flutterwave.com/v3/payments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${flutterwaveKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tx_ref: payment.reference,
            amount: payment.amount,
            currency: payment.currency,
            redirect_url: `${process.env.FRONTEND_URL}/verify-payment?reference=${payment.reference}`,
            customer: { email: user.email, name: user.name },
            meta: { userId, courseId },
            customizations: { title: 'CareerCode Academy', description: course.title },
          })
        });

        const flwData: any = await response.json();
        if (flwData.status === 'success' || flwData.status === '1') {
          paymentData.authorizationUrl = flwData.data?.link;
          paymentData.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
          paymentData.provider = 'flutterwave';
        } else {
          throw new Error(flwData.message || 'Flutterwave initialization failed');
        }
      } else {
        // Dev mode: skip payment gateway and auto-enroll
        paymentData.authorizationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-payment?reference=${payment.reference}&status=success`;
        paymentData.publicKey = process.env.PAYSTACK_PUBLIC_KEY || '';
      }

      res.json({ success: true, data: paymentData });
    } catch (error) {
      next(error);
    }
  }
);

async function verifyPaymentByReference(reference: string) {
  const payment = await PaymentModel.getPaymentByReference(reference);
  if (!payment) throw new NotFoundError('Payment');

  if (payment.status === 'pending') {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY || '';
    const flutterwaveKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
    const isPaystackConfigured = paystackKey.length > 20 && !paystackKey.includes('xxxx');
    const isFlutterwaveConfigured = flutterwaveKey.length > 20 && !flutterwaveKey.includes('xxxx');
    let verified = false;

    if (payment.provider === 'paystack' && isPaystackConfigured) {
      try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${paystackKey}` }
        });
        const paystackData: any = await response.json();
        if (paystackData.status && paystackData.data?.status === 'success') {
          verified = true;
        }
      } catch { /* fall through to dev mode */ }
    } else if (payment.provider === 'flutterwave' && isFlutterwaveConfigured) {
      try {
        const response = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
          headers: { Authorization: `Bearer ${flutterwaveKey}` }
        });
        const flwData: any = await response.json();
        if (flwData.status === 'success' && flwData.data?.status === 'successful') {
          verified = true;
        }
      } catch { /* fall through to dev mode */ }
    } else {
      verified = true;
    }

    if (verified) {
      await PaymentModel.updatePaymentStatus(reference, 'completed', { verified: true });
      const existing = await EnrollmentModel.getEnrollment(payment.user_id, payment.course_id);
      if (!existing) {
        await EnrollmentModel.createEnrollment({
          user_id: payment.user_id,
          course_id: payment.course_id,
        });
        const course = await CourseModel.getCourseById(payment.course_id);
        if (course) {
          await query(
            `INSERT INTO notifications (user_id, title, message, type)
             VALUES ($1, 'New Enrollment', $2, 'enrollment')`,
            [course.instructor_id, `A student enrolled in "${course.title}" (paid)`]
          );
        }
      }
    }
  }

  emitDashboardUpdate();
  emitStudentUpdate(payment.user_id);
  return PaymentModel.getPaymentByReference(reference);
}

// GET /payments/verify/:reference
router.get(
  '/verify/:reference',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.params;
      const payment = await PaymentModel.getPaymentByReference(reference);

      if (!payment) {
        throw new NotFoundError('Payment');
      }

      if (payment.user_id !== req.user!.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const updatedPayment = await verifyPaymentByReference(reference);
      res.json({ success: true, data: updatedPayment, enrollment: true });
    } catch (error) {
      next(error);
    }
  }
);

// POST /payments/verify (alternative for frontend compatibility)
router.post(
  '/verify',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reference } = req.body;
      if (!reference) {
        return res.status(400).json({ success: false, message: 'Reference is required' });
      }

      const payment = await PaymentModel.getPaymentByReference(reference);
      if (!payment) {
        throw new NotFoundError('Payment');
      }

      if (payment.user_id !== req.user!.userId && req.user!.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const updatedPayment = await verifyPaymentByReference(reference);
      res.json({ success: true, data: updatedPayment, enrollment: true });
    } catch (error) {
      next(error);
    }
  }
);

// Webhook endpoint for Paystack/Flutterwave
router.post(
  '/webhook',
  async (req: Request, res: Response) => {
    try {
      // Paystack sends data nested under req.body.data
      // Generic providers send at top level
      const payload = req.body.data || req.body;
      const reference = payload.reference || payload.txRef;
      const status = payload.status || payload.data?.status;

      if (!reference || !status) {
        return res.status(400).json({ success: false, message: 'Missing reference or status' });
      }

      const payment = await PaymentModel.getPaymentByReference(reference);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      const paymentStatus = status === 'success' || status === 'completed' || status === 'successful' ? 'completed' : 'failed';
      await PaymentModel.updatePaymentStatus(reference, paymentStatus as any, req.body);

      if (paymentStatus === 'completed') {
        const existingEnrollment = await EnrollmentModel.getEnrollment(payment.user_id, payment.course_id);
        if (!existingEnrollment) {
          await EnrollmentModel.createEnrollment({
            user_id: payment.user_id,
            course_id: payment.course_id,
          });
        }
        emitDashboardUpdate();
        emitStudentUpdate(payment.user_id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ success: false, message: 'Webhook processing failed' });
    }
  }
);

// GET /payments/history
router.get(
  '/history',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const payments = await PaymentModel.getPaymentsByUser(req.user!.userId);
      res.json({ success: true, data: payments });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
