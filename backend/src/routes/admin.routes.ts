import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as UserModel from '../models/user';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import * as PaymentModel from '../models/payment';
import * as NotificationModel from '../models/notification';
import { query } from '../config/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendInstructorApprovalEmail, sendInstructorUpgradeEmail } from '../utils/helpers';

const router = Router();

// All admin routes require admin role
router.use(authenticate, authorize('admin', 'super_admin'));

// GET /admin/dashboard
router.get('/dashboard', async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const totalStudents = await UserModel.countUsers('student');
    const totalInstructors = await UserModel.countUsers('instructor');
    const totalCourses = await CourseModel.countCourses();
    const publishedCourses = await CourseModel.countCourses(true);
    const totalEnrollments = await EnrollmentModel.countEnrollments();
    const revenueStats = await CourseModel.getRevenueStats();

    // Recent users
    const recentUsers = await UserModel.getAllUsers(10, 0);

    // Recent payments
    const recentPayments = await PaymentModel.getAllPayments(10, 0);

    // Monthly revenue (last 6 months)
    const monthlyRevenue = await query(
      `SELECT
         DATE_TRUNC('month', created_at)::date as month,
         COALESCE(SUM(amount), 0) as revenue,
         COUNT(*) as transactions
       FROM payments
       WHERE status = 'completed' AND created_at > NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC`
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalInstructors,
          totalCourses,
          publishedCourses,
          totalEnrollments,
          totalRevenue: revenueStats.total_revenue,
          averagePrice: revenueStats.average_price,
        },
        recentUsers,
        recentPayments,
        monthlyRevenue: monthlyRevenue.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/users
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const role = req.query.role as string | undefined;

    const users = await UserModel.getAllUsers(limit, offset);
    const total = role ? await UserModel.countUsers(role) : await UserModel.countUsers();

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/users/:id/role
router.put('/users/:id/role', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user!.userId;

    if (!['student', 'instructor', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const user = await UserModel.updateUser(id, { role });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await NotificationModel.createNotification({
      user_id: id,
      title: 'Role Updated',
      message: `Your role has been updated to ${role}`,
      type: 'info',
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/users/:id
router.delete('/users/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;

    if (id === adminId) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself' });
    }

    const deleted = await UserModel.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /admin/courses
router.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const courses = await CourseModel.getAllCourses(limit, offset);
    const total = await CourseModel.countCourses();

    res.json({
      success: true,
      data: courses,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /admin/courses/:id
router.delete('/courses/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deleted = await CourseModel.deleteCourse(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// GET /admin/payments
router.get('/payments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const payments = await PaymentModel.getAllPayments(limit, offset);
    const countRes = await query('SELECT COUNT(*) FROM payments');
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      success: true,
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/revenue
router.get('/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const revenueStats = await CourseModel.getRevenueStats();

    // Revenue by month
    const monthlyRevenue = await query(
      `SELECT
         DATE_TRUNC('month', created_at)::date as month,
         COALESCE(SUM(amount), 0) as revenue,
         COUNT(*) as transactions
       FROM payments
       WHERE status = 'completed'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY month DESC
       LIMIT 12`
    );

    // Revenue by course
    const revenueByCourse = await query(
      `SELECT
         c.id, c.title, c.slug,
         COUNT(p.id) as enrollments,
         COALESCE(SUM(p.amount), 0) as revenue
       FROM courses c
       LEFT JOIN payments p ON c.id = p.course_id AND p.status = 'completed'
       GROUP BY c.id, c.title, c.slug
       ORDER BY revenue DESC
       LIMIT 20`
    );

    // Revenue by provider
    const revenueByProvider = await query(
      `SELECT
         provider,
         COUNT(*) as transactions,
         COALESCE(SUM(amount), 0) as revenue
       FROM payments
       WHERE status = 'completed'
       GROUP BY provider`
    );

    res.json({
      success: true,
      data: {
        summary: revenueStats,
        monthly: monthlyRevenue.rows,
        byCourse: revenueByCourse.rows,
        byProvider: revenueByProvider.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /admin/applications
router.get('/applications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    
    let queryStr = `SELECT * FROM instructor_applications`;
    let countStr = `SELECT COUNT(*) FROM instructor_applications`;
    const queryParams: any[] = [];
    const countParams: any[] = [];
    
    if (status) {
      queryStr += ` WHERE status = $1`;
      countStr += ` WHERE status = $1`;
      queryParams.push(status);
      countParams.push(status);
    }
    
    queryStr += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const { rows } = await query(queryStr, queryParams);
    const countRes = await query(countStr, countParams);
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /admin/applications/:id
router.put('/applications/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes, review_notes } = req.body;
    const adminId = (req as AuthRequest).user!.userId;

    const oldAppResult = await query(`SELECT status FROM instructor_applications WHERE id = $1`, [id]);
    if (oldAppResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }
    const oldStatus = oldAppResult.rows[0].status;

    const { rows } = await query(
      `UPDATE instructor_applications 
       SET status = COALESCE($1, status), 
           notes = COALESCE($2, notes),
           review_notes = COALESCE($3, review_notes),
           reviewed_by = $4,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $5 
       RETURNING *`,
      [status, notes, review_notes, adminId, id]
    );

    const application = rows[0];

    // Work flow for approved status
    if (status === 'approved' && oldStatus !== 'approved') {
      const email = application.email;
      const name = application.full_name;

      const existingUser = await UserModel.getUserByEmail(email);
      if (existingUser) {
        // Upgrade existing user
        await UserModel.updateUser(existingUser.id, { role: 'instructor' });
        await NotificationModel.createNotification({
          user_id: existingUser.id, 
          title: 'Application Approved', 
          message: 'Your instructor application has been approved! Your account is now an Instructor account.', 
          type: 'success'
        });
        await sendInstructorUpgradeEmail(email, name);
      } else {
        // Create new user
        const tempPassword = crypto.randomBytes(4).toString('hex');
        const hashedPassword = await bcrypt.hash(tempPassword, 12);
        
        const newUser = await UserModel.createUser({
          name,
          email,
          password: hashedPassword,
          role: 'instructor'
        });
        await UserModel.updateUser(newUser.id, { is_verified: true });
        await NotificationModel.createNotification({
          user_id: newUser.id, 
          title: 'Welcome Instructor', 
          message: 'Your instructor application has been approved! Welcome to CareerCode Academy.', 
          type: 'success'
        });
        await sendInstructorApprovalEmail(email, name, tempPassword);
      }
    }

    res.json({
      success: true,
      message: 'Application updated successfully',
      data: application,
    });
  } catch (error) {
    next(error);
  }
});
// ----------------------------------------------------------------------
// COURSE PROPOSALS
// ----------------------------------------------------------------------
router.get('/course-proposals', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { rows } = await query(`
      SELECT cp.*, u.name as instructor_name, u.email as instructor_email
      FROM course_proposals cp
      JOIN users u ON cp.instructor_id = u.id
      ORDER BY cp.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countRes = await query('SELECT COUNT(*) FROM course_proposals');
    const total = parseInt(countRes.rows[0].count, 10);

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/course-proposals/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, notes, review_notes } = req.body;
    const adminId = req.user!.userId;

    const oldProposal = await query('SELECT * FROM course_proposals WHERE id = $1', [id]);
    if (oldProposal.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    const proposal = oldProposal.rows[0];

    const { rows } = await query(`
      UPDATE course_proposals 
      SET status = COALESCE($1, status),
          notes = COALESCE($2, notes),
          review_notes = COALESCE($3, review_notes),
          reviewed_by = $4,
          reviewed_at = NOW(),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [status, notes, review_notes, adminId, id]);

    const updatedProposal = rows[0];

    // If approved and wasn't previously approved, create the draft course
    if (status === 'approved' && proposal.status !== 'approved') {
      const slug = updatedProposal.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + crypto.randomBytes(4).toString('hex');
      
      await query(`
        INSERT INTO courses (
          title, description, thumbnail, price, category, instructor_id, level, duration, slug, published
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
      `, [
        updatedProposal.title,
        updatedProposal.description,
        updatedProposal.thumbnail_url,
        updatedProposal.recommended_price,
        updatedProposal.category,
        updatedProposal.instructor_id,
        updatedProposal.level,
        updatedProposal.duration,
        slug
      ]);
    }

    res.json({ success: true, data: updatedProposal });
  } catch (error) {
    next(error);
  }
});

// GET /admin/enrollments - list all enrollments
router.get('/enrollments', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    const enrollments = await EnrollmentModel.getAllEnrollmentsPaginated(limit, offset, status);
    const total = await EnrollmentModel.countEnrollments();

    res.json({
      success: true,
      data: enrollments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /admin/enrollments/:id - update enrollment (cancel/refund)
router.patch('/enrollments/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const updated = await EnrollmentModel.updateEnrollmentStatus(id, status);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Enrollment not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// POST /admin/enrollments/export - export enrollment data
router.post('/enrollments/export', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { status, dateFrom, dateTo } = req.body;
    let sql = `SELECT e.id, u.name as student_name, u.email as student_email, c.title as course_title,
                      c.price, e.status, e.progress, e.enrolled_at, e.completed_at
               FROM enrollments e
               JOIN users u ON e.user_id = u.id
               JOIN courses c ON e.course_id = c.id
               WHERE 1=1`;
    const params: any[] = [];

    if (status) {
      params.push(status);
      sql += ` AND e.status = $${params.length}`;
    }
    if (dateFrom) {
      params.push(dateFrom);
      sql += ` AND e.enrolled_at >= $${params.length}`;
    }
    if (dateTo) {
      params.push(dateTo);
      sql += ` AND e.enrolled_at <= $${params.length}`;
    }

    sql += ' ORDER BY e.enrolled_at DESC';
    const { rows } = await query(sql, params);

    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
});

export default router;
