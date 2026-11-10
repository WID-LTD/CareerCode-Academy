import { Hono } from 'hono';
import type { Env } from '../env';
import { fail, requireAuth, statusOf } from '../route-utils';
import * as G from '../guided';
import { getLearningPathBySlug } from '../learning-paths';

const guided = new Hono<{ Bindings: Env }>();

// POST /api/v1/guided/enroll
guided.post('/enroll', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const slug = body.pathSlug || body.path_slug;
    if (!slug) return fail(c, 400, 'pathSlug is required');
    const path = await getLearningPathBySlug(c.env, slug);
    if (!path) return fail(c, 404, 'Learning path not found');
    return c.json({ success: true, data: await G.enrollInPath(c.env, s.userId, path.id) }, 201);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to enroll');
  }
});

// GET /api/v1/guided/today
guided.get('/today', async (c) => {
  try {
    const s = await requireAuth(c);
    const pathId = c.req.query('path_id');
    if (!pathId) {
      const active = await G.getActiveGuided(c.env, s.userId);
      if (!active) return fail(c, 404, 'No active guided path. Enroll first.');
      return c.json({ success: true, data: await G.getTodayState(c.env, s.userId, active.path_id) });
    }
    return c.json({ success: true, data: await G.getTodayState(c.env, s.userId, pathId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load plan');
  }
});

// POST /api/v1/guided/lessons/:lessonId/complete
guided.post('/lessons/:lessonId/complete', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const active = body.path_id ? null : await G.getActiveGuided(c.env, s.userId);
    const pathId = body.path_id || active?.path_id;
    if (!pathId) return fail(c, 404, 'No active guided path');
    return c.json({ success: true, data: await G.markLessonComplete(c.env, s.userId, pathId, c.req.param('lessonId')) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to complete lesson');
  }
});

// POST /api/v1/guided/checkin
guided.post('/checkin', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    return c.json({ success: true, data: await G.checkIn(c.env, s.userId, body) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to check in');
  }
});

// GET /api/v1/guided/readiness
guided.get('/readiness', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await G.getReadiness(c.env, s.userId, c.req.query('path_id')) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load readiness');
  }
});

// GET /api/v1/guided/accountability
guided.get('/accountability', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await G.getAccountability(c.env, s.userId, c.req.query('path_id')) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load accountability');
  }
});

// PATCH /api/v1/guided/:pathId/mode
guided.patch('/:pathId/mode', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!['active', 'paused'].includes(body.mode)) return fail(c, 400, 'Mode must be active or paused');
    const enrollment = await G.setMode(c.env, s.userId, c.req.param('pathId'), body.mode);
    if (!enrollment) return fail(c, 404, 'Guided enrollment not found');
    return c.json({ success: true, data: enrollment });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update mode');
  }
});

export default guided;
