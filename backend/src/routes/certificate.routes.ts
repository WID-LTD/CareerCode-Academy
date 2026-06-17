import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as CertificateModel from '../models/certificate';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import { generateCertificateCode } from '../utils/helpers';
import { generateCertificatePdf } from '../utils/certificatePdf';
import { query } from '../config/db';
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

// GET /certificates/ - get current user's certificates
router.get(
  '/',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const certificates = await CertificateModel.getCertificatesByUser(userId, limit, offset);
      const total = await CertificateModel.countCertificatesByUser(userId);

      res.json({
        success: true,
        data: certificates,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

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

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const offset = (page - 1) * limit;

      const certificates = await CertificateModel.getCertificatesByUser(req.params.userId, limit, offset);
      const total = await CertificateModel.countCertificatesByUser(req.params.userId);

      res.json({
        success: true,
        data: certificates,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /certificates
router.post(
  '/',
  authenticate,
  authorize('admin', 'super_admin'),
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

// GET /certificates/:id/download - download PDF certificate
router.get(
  '/:id/download',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const certificate = await CertificateModel.getCertificateById(req.params.id);
      if (!certificate) throw new NotFoundError('Certificate');

      const isOwner = certificate.user_id === req.user!.userId;
      const isAdmin = req.user!.role === 'admin' || req.user!.role === 'super_admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      const course = await CourseModel.getCourseById(certificate.course_id);
      const instructorRes = await query(
        'SELECT u.name FROM courses c JOIN users u ON c.instructor_id = u.id WHERE c.id = $1',
        [certificate.course_id]
      );
      const { rows: userRows } = await query('SELECT name FROM users WHERE id = $1', [certificate.user_id]);

      const doc = generateCertificatePdf({
        user_name: userRows[0]?.name || 'Student',
        course_title: course?.title || 'Course',
        course_category: course?.category || '',
        verification_code: certificate.verification_code,
        issued_at: certificate.issued_at,
        instructor_name: instructorRes.rows[0]?.name,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.verification_code}.pdf"`);
      doc.pipe(res);
      doc.end();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
