import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import * as AssignmentModel from '../models/assignment';
import * as SubmissionModel from '../models/submission';
import * as CourseModel from '../models/course';
import * as EnrollmentModel from '../models/enrollment';
import { uploadSingle } from '../middleware/upload';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';

const router = Router();

const createAssignmentSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  dueDate: z.string().datetime().optional(),
  maxScore: z.number().min(1).max(1000).optional(),
});

const updateAssignmentSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  dueDate: z.string().datetime().optional(),
  maxScore: z.number().min(1).max(1000).optional(),
});

const gradeSubmissionSchema = z.object({
  score: z.number().min(0, 'Score must be 0 or more'),
  feedback: z.string().max(2000).optional(),
});

// GET /assignments/course/:courseId
router.get(
  '/course/:courseId',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const course = await CourseModel.getCourseById(req.params.courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      const assignments = await AssignmentModel.getAssignmentsByCourse(req.params.courseId);

      // If student, check enrollment
      if (req.user!.role === 'student') {
        const enrollment = await EnrollmentModel.getEnrollment(req.user!.userId, req.params.courseId);
        if (!enrollment) {
          throw new ForbiddenError('You are not enrolled in this course');
        }
      }

      res.json({ success: true, data: assignments });
    } catch (error) {
      next(error);
    }
  }
);

// GET /assignments/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const assignment = await AssignmentModel.getAssignmentById(req.params.id);
    if (!assignment) {
      throw new NotFoundError('Assignment');
    }
    res.json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
});

// POST /assignments
router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  validate(createAssignmentSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = req.body;
      const course = await CourseModel.getCourseById(data.courseId);
      if (!course) {
        throw new NotFoundError('Course');
      }

      if (req.user!.role !== 'admin' && course.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only add assignments to your own courses');
      }

      const assignment = await AssignmentModel.createAssignment({
        course_id: data.courseId,
        lesson_id: data.lessonId,
        title: data.title,
        description: data.description,
        due_date: data.dueDate,
        max_score: data.maxScore,
      });

      res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /assignments/:id
router.put(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  validate(updateAssignmentSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const assignment = await AssignmentModel.getAssignmentById(req.params.id);
      if (!assignment) {
        throw new NotFoundError('Assignment');
      }

      const course = await CourseModel.getCourseById(assignment.course_id);
      if (req.user!.role !== 'admin' && course!.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only edit assignments in your own courses');
      }

      const updated = await AssignmentModel.updateAssignment(req.params.id, req.body);
      res.json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /assignments/:id
router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const assignment = await AssignmentModel.getAssignmentById(req.params.id);
      if (!assignment) {
        throw new NotFoundError('Assignment');
      }

      const course = await CourseModel.getCourseById(assignment.course_id);
      if (req.user!.role !== 'admin' && course!.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only delete assignments in your own courses');
      }

      await AssignmentModel.deleteAssignment(req.params.id);
      res.json({ success: true, message: 'Assignment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /assignments/:id/submit
router.post(
  '/:id/submit',
  authenticate,
  authorize('student'),
  uploadSingle('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const assignmentId = req.params.id;
      const studentId = req.user!.userId;

      const assignment = await AssignmentModel.getAssignmentById(assignmentId);
      if (!assignment) {
        throw new NotFoundError('Assignment');
      }

      const enrollment = await EnrollmentModel.getEnrollment(studentId, assignment.course_id);
      if (!enrollment) {
        throw new ForbiddenError('You are not enrolled in this course');
      }

      const existing = await SubmissionModel.getSubmissionByStudentAndAssignment(studentId, assignmentId);
      if (existing) {
        throw new ConflictError('You have already submitted this assignment');
      }

      if (!(req as any).file && !req.body.fileUrl) {
        return res.status(400).json({ success: false, message: 'File is required for submission' });
      }

      const submission = await SubmissionModel.createSubmission({
        assignment_id: assignmentId,
        student_id: studentId,
        file_url: (req as any).file ? `/uploads/${(req as any).file.filename}` : req.body.fileUrl,
      });

      res.status(201).json({ success: true, data: submission });
    } catch (error) {
      next(error);
    }
  }
);

// GET /submissions - get submissions for an assignment (instructor)
router.get(
  '/:id/submissions',
  authenticate,
  authorize('instructor', 'admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const assignment = await AssignmentModel.getAssignmentById(req.params.id);
      if (!assignment) {
        throw new NotFoundError('Assignment');
      }

      const course = await CourseModel.getCourseById(assignment.course_id);
      if (req.user!.role !== 'admin' && course!.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only view submissions for your own assignments');
      }

      const submissions = await SubmissionModel.getSubmissionsByAssignment(req.params.id);
      res.json({ success: true, data: submissions });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /submissions/:id/grade
router.put(
  '/submissions/:id/grade',
  authenticate,
  authorize('instructor', 'admin'),
  validate(gradeSubmissionSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const submission = await SubmissionModel.getSubmissionById(req.params.id);
      if (!submission) {
        throw new NotFoundError('Submission');
      }

      const assignment = await AssignmentModel.getAssignmentById(submission.assignment_id);
      const course = await CourseModel.getCourseById(assignment!.course_id);
      if (req.user!.role !== 'admin' && course!.instructor_id !== req.user!.userId) {
        throw new ForbiddenError('You can only grade submissions for your own assignments');
      }

      if (req.body.score > assignment!.max_score) {
        return res.status(400).json({
          success: false,
          message: `Score cannot exceed maximum score of ${assignment!.max_score}`,
        });
      }

      const graded = await SubmissionModel.gradeSubmission(req.params.id, req.body);
      res.json({ success: true, data: graded });
    } catch (error) {
      next(error);
    }
  }
);

// GET /submissions/my - get my submissions (student)
router.get(
  '/submissions/my',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const submissions = await SubmissionModel.getSubmissionsByStudent(req.user!.userId);
      res.json({ success: true, data: submissions });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
