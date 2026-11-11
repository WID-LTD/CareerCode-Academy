import { Hono } from 'hono';
import type { Env } from '../env';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';
import * as CareerModel from '../career';
import { ingestJobs, jobsAreStale } from '../jobs-ingest';
import { isEnabled } from '../feature-flags';

// Career Center routes ported from backend/src/routes/career.routes.ts.
// Mounted at /api/v1/career.

const career = new Hono<{ Bindings: Env }>();
const ADMIN = ['admin', 'super_admin'];

function parseSkills(value: any): string[] {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Mirrors backend requireFields + ValidationError shape. */
function fieldErrors(body: any, fields: string[]): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};
  for (const f of fields) {
    if (body[f] === undefined || String(body[f]).trim() === '') errors[f] = [`${f} is required`];
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

function validation(c: any, errors: Record<string, string[]>) {
  return c.json({ success: false, message: 'Validation failed', errors }, 400 as any);
}

// GET /career/jobs — active job listings
career.get('/jobs', async (c) => {
  try {
    const jobs = await CareerModel.getActiveJobs(c.env);
    // Refresh the board in the background at most every 6 hours.
    c.executionCtx.waitUntil((async () => {
      if (await isEnabled(c.env, 'jobs_enabled') && await jobsAreStale(c.env)) await ingestJobs(c.env);
    })().catch(() => {}));
    return c.json({ success: true, data: jobs });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load jobs');
  }
});

// POST /career/admin/jobs/ingest — force a refresh (admin)
career.post('/admin/jobs/ingest', async (c) => {
  try {
    await requireRole(c, ADMIN);
    return c.json({ success: true, data: await ingestJobs(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to ingest jobs');
  }
});

// GET /career/jobs/:id — single job detail
career.get('/jobs/:id', async (c) => {
  try {
    const job = await CareerModel.getJobById(c.env, c.req.param('id'));
    if (!job) return fail(c, 404, 'Job not found');
    return c.json({ success: true, data: job });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load job');
  }
});

// GET /career/internships — active internship listings
career.get('/internships', async (c) => {
  try {
    return c.json({ success: true, data: await CareerModel.getActiveInternships(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load internships');
  }
});

// GET /career/internships/:id — single internship detail
career.get('/internships/:id', async (c) => {
  try {
    const internship = await CareerModel.getInternshipById(c.env, c.req.param('id'));
    if (!internship) return fail(c, 404, 'Internship not found');
    return c.json({ success: true, data: internship });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load internship');
  }
});

// GET /career/alumni — alumni directory
career.get('/alumni', async (c) => {
  try {
    return c.json({ success: true, data: await CareerModel.getAllAlumni(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load alumni');
  }
});

// GET /career/alumni/featured — featured alumni
career.get('/alumni/featured', async (c) => {
  try {
    return c.json({ success: true, data: await CareerModel.getFeaturedAlumni(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load featured alumni');
  }
});

// ── Applications (student) ──

// POST /career/jobs/:id/apply — student applies to a job in-platform
career.post('/jobs/:id/apply', async (c) => {
  try {
    const s = await requireRole(c, ['student']);
    const body: any = await c.req.json().catch(() => ({}));
    const job = await CareerModel.getJobById(c.env, c.req.param('id'));
    if (!job) return fail(c, 404, 'Job not found');
    if (!job.is_active) return fail(c, 400, 'This job is no longer accepting applications');
    const existing = await CareerModel.getApplicationByTarget(c.env, s.userId, { job_id: job.id });
    if (existing) return fail(c, 409, 'You already applied to this job');
    const application = await CareerModel.createApplication(c.env, s.userId, { job_id: job.id, cover_note: body.cover_note });
    return c.json({ success: true, data: application }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to apply to job');
  }
});

// POST /career/internships/:id/apply — student applies to an internship in-platform
career.post('/internships/:id/apply', async (c) => {
  try {
    const s = await requireRole(c, ['student']);
    const body: any = await c.req.json().catch(() => ({}));
    const internship = await CareerModel.getInternshipById(c.env, c.req.param('id'));
    if (!internship) return fail(c, 404, 'Internship not found');
    if (!internship.is_active) return fail(c, 400, 'This internship is no longer accepting applications');
    const existing = await CareerModel.getApplicationByTarget(c.env, s.userId, { internship_id: internship.id });
    if (existing) return fail(c, 409, 'You already applied to this internship');
    const application = await CareerModel.createApplication(c.env, s.userId, { internship_id: internship.id, cover_note: body.cover_note });
    return c.json({ success: true, data: application }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to apply to internship');
  }
});

// GET /career/applications/mine — student's application pipeline
career.get('/applications/mine', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await CareerModel.getApplicationsByUser(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load applications');
  }
});

// GET /career/match — roles matched to the student's completed tracks/skills
career.get('/match', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await CareerModel.matchRolesForUser(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load matches');
  }
});

// ── Jobs/Internships admin CRUD ──

// GET /career/admin/jobs — all listings incl. inactive
career.get('/admin/jobs', async (c) => {
  try {
    await requireRole(c, ADMIN);
    return c.json({ success: true, data: await CareerModel.getAllJobsAdmin(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load jobs');
  }
});

// POST /career/admin/jobs
career.post('/admin/jobs', async (c) => {
  try {
    const s = await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = fieldErrors(body, ['title', 'company', 'description']);
    if (errors) return validation(c, errors);
    const job = await CareerModel.createJob(c.env, {
      ...body,
      skills: parseSkills(body.skills),
      posted_by: s.userId,
    });
    return c.json({ success: true, data: job }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create job');
  }
});

// PUT /career/admin/jobs/:id
career.put('/admin/jobs/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const job = await CareerModel.updateJob(c.env, c.req.param('id'), {
      ...body,
      skills: body.skills === undefined ? undefined : parseSkills(body.skills),
    });
    if (!job) return fail(c, 404, 'Job not found');
    return c.json({ success: true, data: job });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update job');
  }
});

// PATCH /career/admin/jobs/:id/toggle — activate/deactivate
career.patch('/admin/jobs/:id/toggle', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const job = await CareerModel.setJobActive(c.env, c.req.param('id'), body.is_active !== false);
    if (!job) return fail(c, 404, 'Job not found');
    return c.json({ success: true, data: job });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update job');
  }
});

// DELETE /career/admin/jobs/:id
career.delete('/admin/jobs/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    await CareerModel.deleteJob(c.env, c.req.param('id'));
    return c.json({ success: true, message: 'Job deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete job');
  }
});

// GET /career/admin/internships
career.get('/admin/internships', async (c) => {
  try {
    await requireRole(c, ADMIN);
    return c.json({ success: true, data: await CareerModel.getAllInternshipsAdmin(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load internships');
  }
});

// POST /career/admin/internships
career.post('/admin/internships', async (c) => {
  try {
    const s = await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const errors = fieldErrors(body, ['title', 'company', 'description']);
    if (errors) return validation(c, errors);
    const internship = await CareerModel.createInternship(c.env, {
      ...body,
      skills: parseSkills(body.skills),
      posted_by: s.userId,
    });
    return c.json({ success: true, data: internship }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create internship');
  }
});

// PUT /career/admin/internships/:id
career.put('/admin/internships/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const internship = await CareerModel.updateInternship(c.env, c.req.param('id'), {
      ...body,
      skills: body.skills === undefined ? undefined : parseSkills(body.skills),
    });
    if (!internship) return fail(c, 404, 'Internship not found');
    return c.json({ success: true, data: internship });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update internship');
  }
});

// PATCH /career/admin/internships/:id/toggle
career.patch('/admin/internships/:id/toggle', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const internship = await CareerModel.setInternshipActive(c.env, c.req.param('id'), body.is_active !== false);
    if (!internship) return fail(c, 404, 'Internship not found');
    return c.json({ success: true, data: internship });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update internship');
  }
});

// DELETE /career/admin/internships/:id
career.delete('/admin/internships/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    await CareerModel.deleteInternship(c.env, c.req.param('id'));
    return c.json({ success: true, message: 'Internship deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete internship');
  }
});

// ── Applications admin pipeline ──

// GET /career/admin/applications?status=reviewing
career.get('/admin/applications', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const applications = await CareerModel.getApplicationsAdmin(c.env, { status: c.req.query('status') });
    return c.json({ success: true, data: applications });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load applications');
  }
});

// PATCH /career/admin/applications/:id — update pipeline status
career.patch('/admin/applications/:id', async (c) => {
  try {
    await requireRole(c, ADMIN);
    const body: any = await c.req.json().catch(() => ({}));
    const statuses = ['applied', 'reviewing', 'interviewing', 'offered', 'hired', 'rejected'];
    if (!statuses.includes(body.status)) {
      return fail(c, 400, 'Invalid application status');
    }
    const application = await CareerModel.updateApplicationStatus(
      c.env,
      c.req.param('id'),
      body.status,
      body.note
    );
    if (!application) return fail(c, 404, 'Application not found');
    return c.json({ success: true, data: application });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update application');
  }
});

// GET /career/admin/outcomes — aggregate funnel + alumni stats
career.get('/admin/outcomes', async (c) => {
  try {
    await requireRole(c, ADMIN);
    return c.json({ success: true, data: await CareerModel.getCareerOutcomes(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load outcomes');
  }
});

export default career;
