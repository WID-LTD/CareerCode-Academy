import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireRole, statusOf } from '../route-utils';
import { authenticate } from '../auth-helpers';

// Ported from backend/src/routes/showcase-video.routes.ts +
// backend/src/models/showcase-video.ts. Mounted at /api/v1/showcase-videos.

const showcaseVideos = new Hono<{ Bindings: Env }>();

const ADMIN_ROLES = ['admin', 'super_admin'];
const ENTITY_TYPES = ['school', 'program', 'course'];

// ── Model helpers ─────────────────────────────────────────────────────────

async function getVideosByEntity(env: Env, entityType: string, entityId: string): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM showcase_videos
     WHERE entity_type = $1 AND entity_id = $2 AND is_active = true
     ORDER BY created_at DESC`,
    [entityType, entityId]
  );
  return rows;
}

async function getVideoById(env: Env, id: string): Promise<any | null> {
  const { rows } = await getDb(env).query<any>('SELECT * FROM showcase_videos WHERE id = $1', [id]);
  return rows[0] || null;
}

async function getAllVideos(env: Env): Promise<any[]> {
  const { rows } = await getDb(env).query<any>(
    `SELECT sv.*,
            COALESCE(s.name, p.name, c.title) as entity_name
     FROM showcase_videos sv
     LEFT JOIN schools s ON sv.entity_type = 'school' AND s.id = sv.entity_id
     LEFT JOIN programs p ON sv.entity_type = 'program' AND p.id = sv.entity_id
     LEFT JOIN courses c ON sv.entity_type = 'course' AND c.id = sv.entity_id
     ORDER BY sv.created_at DESC`
  );
  return rows;
}

async function createVideo(env: Env, data: any): Promise<any> {
  const { rows } = await getDb(env).query<any>(
    `INSERT INTO showcase_videos (entity_type, entity_id, title, description, video_url, thumbnail_url, duration, provider)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.entity_type,
      data.entity_id,
      data.title,
      data.description || null,
      data.video_url,
      data.thumbnail_url || null,
      data.duration || 0,
      data.provider || 'html5',
    ]
  );
  return rows[0];
}

const UPDATE_COLUMNS = ['entity_type', 'entity_id', 'title', 'description', 'video_url', 'thumbnail_url', 'duration', 'provider', 'is_active'];

async function updateVideo(env: Env, id: string, data: any): Promise<any | null> {
  const sets: string[] = [];
  const values: any[] = [];
  for (const key of UPDATE_COLUMNS) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (!sets.length) return getVideoById(env, id);

  sets.push('updated_at = NOW()');
  values.push(id);
  const { rows } = await getDb(env).query<any>(
    `UPDATE showcase_videos SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  return rows[0] || null;
}

async function deleteVideo(env: Env, id: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>(
    'DELETE FROM showcase_videos WHERE id = $1 RETURNING id',
    [id]
  );
  return rows.length > 0;
}

async function logVideoView(env: Env, data: {
  video_id: string;
  user_id?: string | null;
  watch_duration: number;
  completed: boolean;
  ip_address?: string | null;
}): Promise<any> {
  const db = getDb(env);
  const { rows } = await db.query<any>(
    `INSERT INTO video_analytics (video_id, user_id, watch_duration, completed, ip_address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.video_id, data.user_id || null, data.watch_duration, data.completed, data.ip_address || null]
  );

  await db.query('UPDATE showcase_videos SET views = views + 1 WHERE id = $1', [data.video_id]);
  return rows[0];
}

async function getVideoStats(env: Env, videoId: string): Promise<any> {
  // COUNT(*) FILTER (...) from Postgres is rewritten as SUM(CASE WHEN ...).
  const { rows } = await getDb(env).query<any>(
    `SELECT
       COUNT(*)::int as total_views,
       COUNT(DISTINCT user_id)::int as unique_viewers,
       COALESCE(SUM(CASE WHEN completed = true THEN 1 ELSE 0 END), 0)::int as completions,
       COALESCE(ROUND(AVG(watch_duration)::numeric, 0), 0)::int as avg_watch_duration
     FROM video_analytics
     WHERE video_id = $1`,
    [videoId]
  );

  const stats = rows[0] || {};
  const totalViews = Number(stats.total_views) || 0;
  const completions = Number(stats.completions) || 0;
  return {
    total_views: totalViews,
    unique_viewers: Number(stats.unique_viewers) || 0,
    completions,
    avg_watch_duration: Number(stats.avg_watch_duration) || 0,
    completion_rate: totalViews > 0 ? Math.round((completions / totalViews) * 100) : 0,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────

// GET /api/v1/showcase-videos/all — admin: every video
showcaseVideos.get('/all', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    return c.json({ success: true, data: await getAllVideos(c.env) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load videos');
  }
});

// GET /api/v1/showcase-videos/detail/:id — public: single video
showcaseVideos.get('/detail/:id', async (c) => {
  try {
    const video = await getVideoById(c.env, c.req.param('id'));
    if (!video) return fail(c, 404, 'Video not found');
    return c.json({ success: true, data: video });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load video');
  }
});

// GET /api/v1/showcase-videos/:id/stats — admin: analytics
showcaseVideos.get('/:id/stats', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    return c.json({ success: true, data: await getVideoStats(c.env, c.req.param('id')) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load video stats');
  }
});

// POST /api/v1/showcase-videos — admin: create
showcaseVideos.post('/', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));
    const { entity_type, entity_id, title, video_url } = body;
    if (!entity_type || !entity_id || !title || !video_url) {
      return fail(c, 400, 'entity_type, entity_id, title, and video_url are required');
    }
    const video = await createVideo(c.env, body);
    return c.json({ success: true, data: video }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create video');
  }
});

// PUT /api/v1/showcase-videos/:id — admin: update
showcaseVideos.put('/:id', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    const body: any = await c.req.json().catch(() => ({}));
    const video = await updateVideo(c.env, c.req.param('id'), body);
    if (!video) return fail(c, 404, 'Video not found');
    return c.json({ success: true, data: video });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update video');
  }
});

// DELETE /api/v1/showcase-videos/:id — admin: delete
showcaseVideos.delete('/:id', async (c) => {
  try {
    await requireRole(c, ADMIN_ROLES);
    const deleted = await deleteVideo(c.env, c.req.param('id'));
    if (!deleted) return fail(c, 404, 'Video not found');
    return c.json({ success: true, message: 'Video deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete video');
  }
});

// POST /api/v1/showcase-videos/:id/analytics — public: heartbeat
showcaseVideos.post('/:id/analytics', async (c) => {
  try {
    const body: any = await c.req.json().catch(() => ({}));
    // The Express route had no auth middleware; use the caller when a valid
    // token is present, otherwise log an anonymous view.
    let userId: string | null = null;
    try {
      userId = (await authenticate(c)).userId;
    } catch {
      /* anonymous */
    }

    const analytics = await logVideoView(c.env, {
      video_id: c.req.param('id'),
      user_id: userId,
      watch_duration: body.watch_duration || 0,
      completed: body.completed || false,
      ip_address: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || null,
    });

    return c.json({ success: true, data: analytics }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to log video view');
  }
});

// GET /api/v1/showcase-videos/:entityType/:entityId — public: videos for entity
showcaseVideos.get('/:entityType/:entityId', async (c) => {
  try {
    const entityType = c.req.param('entityType');
    const entityId = c.req.param('entityId');
    if (!ENTITY_TYPES.includes(entityType)) {
      return fail(c, 400, 'Invalid entity type');
    }
    return c.json({ success: true, data: await getVideosByEntity(c.env, entityType, entityId) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load videos');
  }
});

export default showcaseVideos;
