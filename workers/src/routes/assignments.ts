import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';
import { parseBody, storeOrLink } from '../uploads';
import {
  createAssignment,
  createSubmission,
  deleteAssignment,
  getAssignmentById,
  getAssignmentsByCourse,
  getCourse,
  getEnrollment,
  getSubmissionByStudentAndAssignment,
  getSubmissionById,
  getSubmissionsByAssignment,
  getSubmissionsByStudent,
  gradeSubmission,
  updateAssignment,
} from '../assignments';

const assignments = new Hono<{ Bindings: Env }>();

const STAFF = ['instructor', 'admin', 'super_admin'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Errors = Record<string, string[]>;

function addError(errors: Errors, field: string, message: string) {
  (errors[field] ||= []).push(message);
}

function isString(v: any): v is string {
  return typeof v === 'string';
}

function isDatetime(v: any): boolean {
  return isString(v) && !Number.isNaN(Date.parse(v));
}

function validationFailed(c: any, errors: Errors) {
  return fail(c, 400, 'Validation failed', { errors });
}

// Mirrors createAssignmentSchema from the Express route.
function validateCreate(body: any): Errors {
  const errors: Errors = {};
  if (!isString(body.courseId) || !UUID_RE.test(body.courseId)) {
    addError(errors, 'courseId', 'Invalid uuid');
  }
  if (body.lessonId !== undefined && (!isString(body.lessonId) || !UUID_RE.test(body.lessonId))) {
    addError(errors, 'lessonId', 'Invalid uuid');
  }
  if (!isString(body.title) || body.title.length < 3 || body.title.length > 200) {
    addError(errors, 'title', 'String must contain at least 3 and at most 200 character(s)');
  }
  if (!isString(body.description) || body.description.length < 10 || body.description.length > 5000) {
    addError(errors, 'description', 'String must contain at least 10 and at most 5000 character(s)');
  }
  if (body.dueDate !== undefined && !isDatetime(body.dueDate)) {
    addError(errors, 'dueDate', 'Invalid datetime');
  }
  if (body.maxScore !== undefined && (typeof body.maxScore !== 'number' || body.maxScore < 1 || body.maxScore > 1000)) {
    addError(errors, 'maxScore', 'Number must be between 1 and 1000');
  }
  return errors;
}

// Mirrors updateAssignmentSchema from the Express route.
function validateUpdate(body: any): Errors {
  const errors: Errors = {};
  if (body.title !== undefined && (!isString(body.title) || body.title.length < 3 || body.title.length > 200)) {
    addError(errors, 'title', 'String must contain at least 3 and at most 200 character(s)');
  }
  if (body.description !== undefined && (!isString(body.description) || body.description.length < 10 || body.description.length > 5000)) {
    addError(errors, 'description', 'String must contain at least 10 and at most 5000 character(s)');
  }
  if (body.dueDate !== undefined && !isDatetime(body.dueDate)) {
    addError(errors, 'dueDate', 'Invalid datetime');
  }
  if (body.maxScore !== undefined && (typeof body.maxScore !== 'number' || body.maxScore < 1 || body.maxScore > 1000)) {
    addError(errors, 'maxScore', 'Number must be between 1 and 1000');
  }
  return errors;
}

function validateGrade(body: any): Errors {
  const errors: Errors = {};
  if (typeof body.score !== 'number' || Number.isNaN(body.score) || body.score < 0) {
    addError(errors, 'score', 'Score must be 0 or more');
  }
  if (body.feedback !== undefined && (!isString(body.feedback) || body.feedback.length > 2000)) {
    addError(errors, 'feedback', 'String must contain at most 2000 character(s)');
  }
  return errors;
}

function ownsCourse(course: any, session: { userId: string; role: string }): boolean {
  // Mirrors the Express check: only `admin` bypasses ownership (super_admin
  // is treated like an instructor).
  return session.role === 'admin' || course.instructor_id === session.userId;
}

// GET /api/v1/assignments/course/:courseId
assignments.get('/course/:courseId', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const course = await getCourse(db, c.req.param('courseId'));
    if (!course) return fail(c, 404, 'Course not found');

    const list = await getAssignmentsByCourse(db, course.id);

    if (s.role === 'student') {
      const enrollment = await getEnrollment(db, s.userId, course.id);
      if (!enrollment) return fail(c, 403, 'You are not enrolled in this course');
    }

    return c.json({ success: true, data: list });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load assignments');
  }
});

// GET /api/v1/assignments/:id — public in the Express app (no authenticate)
assignments.get('/:id', async (c) => {
  try {
    const assignment = await getAssignmentById(getDb(c.env), c.req.param('id'));
    if (!assignment) return fail(c, 404, 'Assignment not found');
    return c.json({ success: true, data: assignment });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load assignment');
  }
});

// POST /api/v1/assignments
assignments.post('/', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateCreate(body);
    if (Object.keys(errors).length) return validationFailed(c, errors);

    const db = getDb(c.env);
    const course = await getCourse(db, body.courseId);
    if (!course) return fail(c, 404, 'Course not found');
    if (!ownsCourse(course, s)) return fail(c, 403, 'You can only add assignments to your own courses');

    const assignment = await createAssignment(db, {
      course_id: body.courseId,
      lesson_id: body.lessonId,
      title: body.title,
      description: body.description,
      due_date: body.dueDate,
      max_score: body.maxScore,
    });
    return c.json({ success: true, data: assignment }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create assignment');
  }
});

// PUT /api/v1/assignments/:id
assignments.put('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateUpdate(body);
    if (Object.keys(errors).length) return validationFailed(c, errors);

    const db = getDb(c.env);
    const assignment = await getAssignmentById(db, c.req.param('id'));
    if (!assignment) return fail(c, 404, 'Assignment not found');

    const course = await getCourse(db, assignment.course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!ownsCourse(course, s)) return fail(c, 403, 'You can only edit assignments in your own courses');

    const updated = await updateAssignment(db, assignment.id, body);
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update assignment');
  }
});

// DELETE /api/v1/assignments/:id
assignments.delete('/:id', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const assignment = await getAssignmentById(db, c.req.param('id'));
    if (!assignment) return fail(c, 404, 'Assignment not found');

    const course = await getCourse(db, assignment.course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!ownsCourse(course, s)) return fail(c, 403, 'You can only delete assignments in your own courses');

    await deleteAssignment(db, assignment.id);
    return c.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete assignment');
  }
});

// POST /api/v1/assignments/:id/submit
// Accepts multipart file, JSON base64, or { fileUrl | url }.
assignments.post('/:id/submit', async (c) => {
  try {
    const s = await requireRole(c, ['student']);
    const db = getDb(c.env);
    const assignmentId = c.req.param('id');
    const { fields, file, url } = await parseBody(c as any);

    const assignment = await getAssignmentById(db, assignmentId);
    if (!assignment) return fail(c, 404, 'Assignment not found');

    const enrollment = await getEnrollment(db, s.userId, assignment.course_id);
    if (!enrollment) return fail(c, 403, 'You are not enrolled in this course');

    const existing = await getSubmissionByStudentAndAssignment(db, s.userId, assignmentId);
    if (existing) return fail(c, 409, 'You have already submitted this assignment');

    const fileUrl = await storeOrLink(
      c.env,
      file,
      url || fields.fileUrl || fields.url || null,
      'assignments'
    );
    if (!fileUrl) return fail(c, 400, 'A file or file URL is required for submission');

    const submission = await createSubmission(db, {
      assignment_id: assignmentId,
      student_id: s.userId,
      file_url: fileUrl,
    });
    return c.json({ success: true, data: submission }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit assignment');
  }
});

// GET /api/v1/assignments/:id/submissions — instructor view
assignments.get('/:id/submissions', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const db = getDb(c.env);
    const assignment = await getAssignmentById(db, c.req.param('id'));
    if (!assignment) return fail(c, 404, 'Assignment not found');

    const course = await getCourse(db, assignment.course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!ownsCourse(course, s)) return fail(c, 403, 'You can only view submissions for your own assignments');

    const submissions = await getSubmissionsByAssignment(db, assignment.id);
    return c.json({ success: true, data: submissions });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load submissions');
  }
});

// PUT /api/v1/assignments/submissions/:id/grade
assignments.put('/submissions/:id/grade', async (c) => {
  try {
    const s = await requireRole(c, STAFF);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = validateGrade(body);
    if (Object.keys(errors).length) return validationFailed(c, errors);

    const db = getDb(c.env);
    const submission = await getSubmissionById(db, c.req.param('id'));
    if (!submission) return fail(c, 404, 'Submission not found');

    const assignment = await getAssignmentById(db, submission.assignment_id);
    if (!assignment) return fail(c, 404, 'Assignment not found');

    const course = await getCourse(db, assignment.course_id);
    if (!course) return fail(c, 404, 'Course not found');
    if (!ownsCourse(course, s)) return fail(c, 403, 'You can only grade submissions for your own assignments');

    if (body.score > assignment.max_score) {
      return fail(c, 400, `Score cannot exceed maximum score of ${assignment.max_score}`);
    }

    const graded = await gradeSubmission(db, submission.id, { score: body.score, feedback: body.feedback });
    return c.json({ success: true, data: graded });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to grade submission');
  }
});

// GET /api/v1/assignments/submissions/my — student view
assignments.get('/submissions/my', async (c) => {
  try {
    const s = await requireAuth(c);
    const submissions = await getSubmissionsByStudent(getDb(c.env), s.userId);
    return c.json({ success: true, data: submissions });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load submissions');
  }
});

export default assignments;
