import { Hono } from 'hono';
import type { Env } from '../env';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';
import * as PortfolioModel from '../portfolio';

// Portfolio routes ported from backend/src/routes/portfolio.routes.ts.
// Mounted at /api/v1/portfolio.

const portfolio = new Hono<{ Bindings: Env }>();
const REVIEWERS = ['admin', 'super_admin', 'instructor'];

function parseSkills(value: any): string[] {
  if (Array.isArray(value)) return value.map((s) => String(s).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

function requireText(value: any, field: string, errors: Record<string, string[]>): void {
  if (value === undefined || String(value).trim() === '') errors[field] = [`${field} is required`];
}

function validation(c: any, errors: Record<string, string[]>) {
  return c.json({ success: false, message: 'Validation failed', errors }, 400 as any);
}

// GET /portfolio/user/:username — public learner profile
portfolio.get('/user/:username', async (c) => {
  try {
    const profile = await PortfolioModel.getPublicProfileByUsername(c.env, c.req.param('username'));
    if (!profile) return fail(c, 404, 'Profile not found or not public');
    return c.json({ success: true, data: profile });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load profile');
  }
});

// ── All below require auth ──

// GET /portfolio/me — own portfolio (items, certs, projects, skills)
portfolio.get('/me', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await PortfolioModel.getMyPortfolio(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load portfolio');
  }
});

// POST /portfolio/items
portfolio.post('/items', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const errors: Record<string, string[]> = {};
    requireText(body.title, 'title', errors);
    if (Object.keys(errors).length) return validation(c, errors);
    const item = await PortfolioModel.createPortfolioItem(c.env, s.userId, {
      title: body.title,
      description: body.description,
      url: body.url,
      image_url: body.image_url,
      skills: parseSkills(body.skills),
      is_public: body.is_public !== false,
      project_id: body.project_id,
    });
    return c.json({ success: true, data: item }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create portfolio item');
  }
});

// PUT /portfolio/items/:id
portfolio.put('/items/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const item = await PortfolioModel.updatePortfolioItem(c.env, s.userId, c.req.param('id'), {
      title: body.title,
      description: body.description,
      url: body.url,
      image_url: body.image_url,
      skills: body.skills === undefined ? undefined : parseSkills(body.skills),
      is_public: body.is_public,
    });
    if (!item) return fail(c, 404, 'Portfolio item not found');
    return c.json({ success: true, data: item });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update portfolio item');
  }
});

// DELETE /portfolio/items/:id
portfolio.delete('/items/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    await PortfolioModel.deletePortfolioItem(c.env, s.userId, c.req.param('id'));
    return c.json({ success: true, message: 'Portfolio item deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete portfolio item');
  }
});

// PATCH /portfolio/privacy — toggle public profile exposure
portfolio.patch('/privacy', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    await PortfolioModel.ensureUsername(c.env, s.userId);
    await PortfolioModel.updateProfilePublic(c.env, s.userId, body.portfolio_public !== false);
    const data = await PortfolioModel.getMyPortfolio(c.env, s.userId);
    return c.json({ success: true, data });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update privacy');
  }
});

// ── Projects ──

// POST /portfolio/projects — submit a project (status: submitted)
portfolio.post('/projects', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const errors: Record<string, string[]> = {};
    requireText(body.title, 'title', errors);
    requireText(body.description, 'description', errors);
    if (Object.keys(errors).length) return validation(c, errors);
    const project = await PortfolioModel.createProject(c.env, s.userId, {
      title: body.title,
      description: body.description,
      source_url: body.source_url,
      demo_url: body.demo_url,
      image_url: body.image_url,
      skills: parseSkills(body.skills),
      course_id: body.course_id,
    });
    return c.json({ success: true, data: project }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to submit project');
  }
});

// GET /portfolio/projects — own projects
portfolio.get('/projects', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await PortfolioModel.getProjectsByUser(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load projects');
  }
});

// GET /portfolio/projects/review — instructor/admin queue (before /projects/:id)
portfolio.get('/projects/review', async (c) => {
  try {
    await requireRole(c, REVIEWERS);
    return c.json({ success: true, data: await PortfolioModel.getProjectsForReview(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load review queue');
  }
});

// GET /portfolio/projects/:id — single project (owner or reviewer)
portfolio.get('/projects/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const project = await PortfolioModel.getProjectById(c.env, c.req.param('id'));
    if (!project) return fail(c, 404, 'Project not found');
    if (project.user_id !== s.userId && !REVIEWERS.includes(s.role)) {
      return fail(c, 403, 'You cannot view this project');
    }
    return c.json({ success: true, data: project });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load project');
  }
});

// POST /portfolio/projects/:id/review — approve/reject + feedback; auto portfolio item on approve
portfolio.post('/projects/:id/review', async (c) => {
  try {
    const s = await requireRole(c, REVIEWERS);
    const body: any = await c.req.json().catch(() => ({}));
    const status = body.status;
    if (status !== 'approved' && status !== 'rejected') {
      return fail(c, 400, 'Status must be approved or rejected');
    }
    const project = await PortfolioModel.reviewProject(c.env, c.req.param('id'), s.userId, status, body.feedback);
    return c.json({ success: true, data: project });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to review project');
  }
});

export default portfolio;
