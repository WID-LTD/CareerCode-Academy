import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as CertificateModel from '../models/certificate';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import { generateCertificateCode } from '../utils/helpers';
import { NotFoundError, ConflictError } from '../utils/errors';

const router = Router();

const createCertificateSchema = z.object({
  courseId: z.string().uuid(),
  certificateUrl: z.string().url().optional(),
});

// GET /certificates/verify/:code - public verification
router.get('/verify/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const certificate = await CertificateModel.getCertificateByVerificationCode(req.params.code);
    if (!certificate) {
      throw new NotFoundError('Certificate');
    }
    res.json({ success: true, data: certificate });
  } catch (error) {
    next(error);
  }
});

// GET /certificates/:userId - get all certificates for a user
router.get(
  '/:userId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // Users can view their own certificates; admins can view any
      if (req.user!.role !== 'admin' && req.user!.userId !== req.params.userId) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const certificates = await CertificateModel.getCertificatesByUser(req.params.userId);
      res.json({ success: true, data: certificates });
    } catch (error) {
      next(error);
    }
  }
);

// POST /certificates
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCertificateSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId, certificateUrl } = req.body;
      const userId = req.body.userId || req.user!.userId;

      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      const enrollment = await EnrollmentModel.getEnrollment(userId, courseId);
      if (!enrollment) {
        return res.status(400).json({
          success: false,
          message: 'User is not enrolled in this course',
        });
      }

      if (!enrollment.completed) {
        return res.status(400).json({
          success: false,
          message: 'Course is not completed yet',
        });
      }

      const existing = await CertificateModel.getCertificateByUserAndCourse(userId, courseId);
      if (existing) {
        throw new ConflictError('Certificate already issued for this course');
      }

      const verificationCode = generateCertificateCode();

      const certificate = await CertificateModel.createCertificate({
        user_id: userId,
        course_id: courseId,
        certificate_url: certificateUrl,
        verification_code: verificationCode,
      });

      res.status(201).json({ success: true, data: certificate });
    } catch (error) {
      next(error);
    }
  }
);

// POST /certificates/auto - auto-issue certificate on course completion
router.post(
  '/auto',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.body;
      const userId = req.user!.userId;

      const course = await CourseModel.getCourseById(courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      const enrollment = await EnrollmentModel.getEnrollment(userId, courseId);
      if (!enrollment) {
        return res.status(400).json({
          success: false,
          message: 'Not enrolled in this course',
        });
      }

      if (!enrollment.completed) {
        return res.status(400).json({
          success: false,
          message: 'Course not yet completed',
        });
      }

      const existing = await CertificateModel.getCertificateByUserAndCourse(userId, courseId);
      if (existing) {
        return res.json({ success: true, data: existing });
      }

      const verificationCode = generateCertificateCode();
      const certificate = await CertificateModel.createCertificate({
        user_id: userId,
        course_id: courseId,
        verification_code: verificationCode,
      });

      res.status(201).json({ success: true, data: certificate });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
