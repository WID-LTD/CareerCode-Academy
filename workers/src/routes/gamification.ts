import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';
import * as G from '../gamification';

const gamification = new Hono<{ Bindings: Env }>();

// GET /api/v1/gamification/hearts
gamification.get('/hearts', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await G.getHearts(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load hearts');
  }
});

// GET /api/v1/gamification/daily-progress
gamification.get('/daily-progress', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await G.getDailyProgress(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load daily progress');
  }
});

// PUT /api/v1/gamification/daily-goal
gamification.put('/daily-goal', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (typeof body.goal !== 'number') return fail(c, 400, 'goal must be a number');
    await G.setDailyGoal(c.env, s.userId, body.goal);
    return c.json({ success: true });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to save goal');
  }
});

// GET /api/v1/gamification/xp-history
gamification.get('/xp-history', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await G.getXpBreakdown(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load XP history');
  }
});

// POST /api/v1/gamification/streak-freeze
gamification.post('/streak-freeze', async (c) => {
  try {
    const s = await requireAuth(c);
    const used = await G.useStreakFreeze(c.env, s.userId);
    return c.json({ success: true, data: { used } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to use streak freeze');
  }
});

// GET /api/v1/gamification/skill-tree/:courseId
gamification.get('/skill-tree/:courseId', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await G.getSkillTree(c.env, s.userId, c.req.param('courseId')) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load skill tree');
  }
});

// GET /api/v1/gamification/balance
gamification.get('/balance', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await G.getXpBalance(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load XP balance');
  }
});

// POST /api/v1/gamification/redeem
gamification.post('/redeem', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!Number.isInteger(body.xpAmount)) return fail(c, 400, 'xpAmount required (integer)');
    const code = await G.redeemXpForDiscount(c.env, s.userId, body.xpAmount);
    return c.json({ success: true, data: code }, 201);
  } catch (e: any) {
    const msg = e?.message || 'Failed to redeem';
    const status = /Insufficient|Minimum|steps|disabled/.test(msg) ? 400 : 500;
    return fail(c, status, msg);
  }
});

// POST /api/v1/gamification/validate-discount
gamification.post('/validate-discount', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    if (!body.code) return fail(c, 400, 'code required');
    let coursePrice: number | undefined;
    if (body.courseId) {
      const { rows } = await getDb(c.env).query<any>('SELECT price FROM courses WHERE id=$1', [body.courseId]);
      if (rows[0]) coursePrice = Number(rows[0].price);
    }
    const result = await G.validateDiscountCode(c.env, body.code, s.userId, coursePrice);
    if (!result.valid) return fail(c, 400, result.reason || 'Invalid code');
    return c.json({ success: true, data: { discount: result.discount, row: result.row } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to validate code');
  }
});

// GET /api/v1/gamification/discount-codes
gamification.get('/discount-codes', async (c) => {
  try {
    const s = await requireAuth(c);
    return c.json({ success: true, data: await G.getUserDiscountCodes(c.env, s.userId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load codes');
  }
});

// GET /api/v1/gamification/xp-history-full
gamification.get('/xp-history-full', async (c) => {
  try {
    const s = await requireAuth(c);
    const [balance, breakdown] = await Promise.all([
      G.getXpBalance(c.env, s.userId),
      G.getXpBreakdown(c.env, s.userId),
    ]);
    const { rows } = await getDb(c.env).query<any>(
      'SELECT * FROM xp_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [s.userId]
    );
    return c.json({ success: true, data: { balance, breakdown, history: rows } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load XP history');
  }
});

export default gamification;
