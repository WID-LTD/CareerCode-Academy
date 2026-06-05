import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as PaymentModel from '../models/payment';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import { NotFoundError, ConflictError } from '../utils/errors';

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

      if (provider === 'paystack') {
        paymentData.authorizationUrl = `https://checkout.paystack.com/${reference}`;
        paymentData.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
      } else if (provider === 'flutterwave') {
        paymentData.authorizationUrl = `https://checkout.flutterwave.com/pay/${reference}`;
        paymentData.publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY;
      }

      res.json({ success: true, data: paymentData });
    } catch (error) {
      next(error);
    }
  }
);

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

      // In production, verify with Paystack/Flutterwave API here
      // For now, we simulate verification
      if (payment.status === 'pending') {
        // Simulate payment verification
        const status = (req.query.status as string) === 'success' ? 'completed' : 'failed';
        await PaymentModel.updatePaymentStatus(reference, status as any, { verified: true });

        if (status === 'completed') {
          await EnrollmentModel.createEnrollment({
            user_id: payment.user_id,
            course_id: payment.course_id,
          });
        }
      }

      const updatedPayment = await PaymentModel.getPaymentByReference(reference);
      res.json({ success: true, data: updatedPayment });
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
      const { reference, status } = req.body;

      if (!reference || !status) {
        return res.status(400).json({ success: false, message: 'Missing reference or status' });
      }

      const payment = await PaymentModel.getPaymentByReference(reference);
      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment not found' });
      }

      const paymentStatus = status === 'success' || status === 'completed' ? 'completed' : 'failed';
      await PaymentModel.updatePaymentStatus(reference, paymentStatus as any, req.body);

      if (paymentStatus === 'completed') {
        const existingEnrollment = await EnrollmentModel.getEnrollment(payment.user_id, payment.course_id);
        if (!existingEnrollment) {
          await EnrollmentModel.createEnrollment({
            user_id: payment.user_id,
            course_id: payment.course_id,
          });
        }
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
