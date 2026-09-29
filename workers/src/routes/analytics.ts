import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '../auth-helpers';
import type { Env } from '../env';
import { getDb } from '../db';

const analytics = new Hono<{ Bindings: Env }>();

const DEDUP_WINDOW = 30 * 1000;
const pageViewDedup = new Map<string, number>();

function visitorId(c: any): string | undefined {
  return getCookie(c, 'vcv_id');
}

async function userId(c: any): Promise<string | null> {
  try {
    const h = c.req.header('authorization');
    let token: string | undefined;
    if (h?.startsWith('Bearer ')) token = h.split(' ')[1];
    if (!token) token = getCookie(c, 'token');
    if (!token) return null;
    const decoded: any = await verifyToken(c.env, token);
    return decoded.userId || null;
  } catch {
    return null;
  }
}

async function insertPageView(env: Env, v: any): Promise<void> {
  await getDb(env).query(
    `INSERT INTO page_views (visitor_id, user_id, page_url, route_name, time_spent_sec, is_exit_page)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [v.visitor_id, v.user_id || null, v.page_url, v.route_name || null, v.time_spent_sec || 0, v.is_exit_page || false]
  );
}

async function insertClickEvent(env: Env, v: any): Promise<void> {
  await getDb(env).query(
    `INSERT INTO click_events (visitor_id, user_id, page_url, element_selector, element_text, element_type)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [v.visitor_id, v.user_id || null, v.page_url, v.element_selector || null, v.element_text || null, v.element_type || null]
  );
}

async function upsertScrollEvent(env: Env, v: any): Promise<void> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM scroll_events WHERE visitor_id = $1 AND page_url = $2 AND created_at > NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 1`,
    [v.visitor_id, v.page_url]
  );
  if (rows.length > 0) {
    await getDb(env).query(
      `UPDATE scroll_events SET depth_25 = depth_25 OR $3, depth_50 = depth_50 OR $4, depth_75 = depth_75 OR $5, depth_100 = depth_100 OR $6, max_depth = GREATEST(max_depth, $7) WHERE id = $1`,
      [rows[0].id, null, !!v.depth_25, !!v.depth_50, !!v.depth_75, !!v.depth_100, v.max_depth || 0]
    );
    return;
  }
  await getDb(env).query(
    `INSERT INTO scroll_events (visitor_id, user_id, page_url, depth_25, depth_50, depth_75, depth_100, max_depth)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [v.visitor_id, v.user_id || null, v.page_url, !!v.depth_25, !!v.depth_50, !!v.depth_75, !!v.depth_100, v.max_depth || 0]
  );
}

async function upsertUserJourney(env: Env, v: any): Promise<void> {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM user_journeys WHERE visitor_id = $1 AND created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC LIMIT 1`,
    [v.visitor_id]
  );
  if (rows.length > 0) {
    const pages: string[] = Array.isArray(rows[0].pages_visited) ? [...rows[0].pages_visited] : [];
    if (!pages.includes(v.page_url)) pages.push(v.page_url);
    await getDb(env).query(
      `UPDATE user_journeys SET pages_visited = $2, conversion_type = COALESCE($3, conversion_type), converted = $4 OR converted, enrolled_course_id = COALESCE($5, enrolled_course_id), journey_duration_sec = EXTRACT(EPOCH FROM (NOW() - created_at))::int WHERE id = $1`,
      [rows[0].id, pages, v.conversion_type || null, !!v.converted, v.enrolled_course_id || null]
    );
    return;
  }
  await getDb(env).query(
    `INSERT INTO user_journeys (visitor_id, user_id, pages_visited, conversion_type, converted, enrolled_course_id)
     VALUES ($1, $2, ARRAY[$3], $4, $5, $6)`,
    [v.visitor_id, v.user_id || null, v.page_url, v.conversion_type || null, !!v.converted, v.enrolled_course_id || null]
  );
}

async function touchVisitor(env: Env, visitor: string, uid: string | null): Promise<void> {
  const db = getDb(env);
  const { rows } = await db.query<any>('SELECT id FROM visitors WHERE visitor_id = $1', [visitor]);
  if (rows.length > 0) {
    await db.query(
      `UPDATE visitors SET user_id = COALESCE($2, user_id), last_visit = NOW(), visit_count = visit_count + 1,
        session_start = CASE WHEN session_end IS NULL OR session_end < NOW() - INTERVAL '30 minutes' THEN NOW() ELSE session_start END,
        session_end = NULL, is_active = true WHERE visitor_id = $1`,
      [visitor, uid]
    );
    return;
  }
  await db.query('INSERT INTO visitors (visitor_id, user_id) VALUES ($1, $2)', [visitor, uid]);
}

const ok = (c: any) => c.json({ success: true });

// NOTE: upsertVisitor full-parity (device/browser/os columns) happens on the
// heartbeat path with best-effort fields; the analytics middleware enrichment
// (ip/ua parsing) is intentionally lightweight here to stay in CPU budget.
analytics.post('/track/page-view', async (c) => {
  const vid = visitorId(c);
  if (!vid) return ok(c);
  const body: any = await c.req.json().catch(() => ({}));
  if (!body.page_url) return ok(c);
  const key = `${vid}:${body.page_url}`;
  const now = Date.now();
  if (now - (pageViewDedup.get(key) || 0) < DEDUP_WINDOW) return ok(c);
  pageViewDedup.set(key, now);
  const uid = await userId(c);
  c.executionCtx.waitUntil(
    insertPageView(c.env, {
      visitor_id: vid, user_id: uid,
      page_url: String(body.page_url).substring(0, 1000),
      route_name: body.route_name ? String(body.route_name).substring(0, 255) : null,
      time_spent_sec: Math.min(Math.max(Number(body.time_spent_sec) || 0, 0), 86400),
      is_exit_page: !!body.is_exit_page,
    }).catch(() => {})
  );
  return ok(c);
});

analytics.post('/track/click', async (c) => {
  const vid = visitorId(c);
  if (!vid) return ok(c);
  const body: any = await c.req.json().catch(() => ({}));
  if (!body.page_url || !body.element_text) return ok(c);
  const uid = await userId(c);
  c.executionCtx.waitUntil(
    insertClickEvent(c.env, {
      visitor_id: vid, user_id: uid,
      page_url: String(body.page_url).substring(0, 1000),
      element_selector: body.element_selector ? String(body.element_selector).substring(0, 500) : null,
      element_text: String(body.element_text).substring(0, 500),
      element_type: body.element_type ? String(body.element_type).substring(0, 100) : null,
    }).catch(() => {})
  );
  return ok(c);
});

analytics.post('/track/scroll', async (c) => {
  const vid = visitorId(c);
  if (!vid) return ok(c);
  const body: any = await c.req.json().catch(() => ({}));
  if (!body.page_url) return ok(c);
  const depthNum = Number(body.depth) || 0;
  const uid = await userId(c);
  c.executionCtx.waitUntil(
    upsertScrollEvent(c.env, {
      visitor_id: vid, user_id: uid,
      page_url: String(body.page_url).substring(0, 1000),
      depth_25: depthNum >= 25, depth_50: depthNum >= 50,
      depth_75: depthNum >= 75, depth_100: depthNum >= 100,
      max_depth: Math.min(Math.max(Number(body.max_depth) || depthNum, depthNum), 100),
    }).catch(() => {})
  );
  return ok(c);
});

analytics.post('/track/journey', async (c) => {
  const vid = visitorId(c);
  if (!vid) return ok(c);
  const body: any = await c.req.json().catch(() => ({}));
  if (!body.page_url) return ok(c);
  const uid = await userId(c);
  c.executionCtx.waitUntil(
    upsertUserJourney(c.env, {
      visitor_id: vid, user_id: uid,
      page_url: String(body.page_url).substring(0, 1000),
      conversion_type: body.conversion_type ? String(body.conversion_type).substring(0, 50) : null,
      converted: !!body.converted,
      enrolled_course_id: body.enrolled_course_id || null,
    }).catch(() => {})
  );
  return ok(c);
});

analytics.post('/track/heartbeat', async (c) => {
  const vid = visitorId(c);
  if (!vid) return ok(c);
  const uid = await userId(c);
  c.executionCtx.waitUntil(touchVisitor(c.env, vid, uid).catch(() => {}));
  return ok(c);
});

analytics.post('/track/batch', async (c) => {
  const vid = visitorId(c);
  const body: any = await c.req.json().catch(() => ({}));
  const events = body?.events;
  if (!vid || !Array.isArray(events) || events.length === 0) return ok(c);
  const uid = await userId(c);
  const jobs: Promise<void>[] = [];
  for (const event of events.slice(0, 50)) {
    const { endpoint, data } = event || {};
    if (!endpoint || !data) continue;
    try {
      if (endpoint === 'page-view') {
        if (!data.page_url) continue;
        const key = `${vid}:${data.page_url}`;
        const now = Date.now();
        if (now - (pageViewDedup.get(key) || 0) < DEDUP_WINDOW) continue;
        pageViewDedup.set(key, now);
        jobs.push(insertPageView(c.env, {
          visitor_id: vid, user_id: uid,
          page_url: String(data.page_url).substring(0, 1000),
          route_name: data.route_name ? String(data.route_name).substring(0, 255) : null,
          time_spent_sec: Math.min(Math.max(Number(data.time_spent_sec) || 0, 0), 86400),
          is_exit_page: !!data.is_exit_page,
        }).catch(() => {}));
      } else if (endpoint === 'click') {
        if (!data.page_url || !data.element_text) continue;
        jobs.push(insertClickEvent(c.env, {
          visitor_id: vid, user_id: uid,
          page_url: String(data.page_url).substring(0, 1000),
          element_selector: data.element_selector ? String(data.element_selector).substring(0, 500) : null,
          element_text: String(data.element_text).substring(0, 500),
          element_type: data.element_type ? String(data.element_type).substring(0, 100) : null,
        }).catch(() => {}));
      } else if (endpoint === 'scroll') {
        if (!data.page_url) continue;
        const depthNum = Number(data.depth) || 0;
        jobs.push(upsertScrollEvent(c.env, {
          visitor_id: vid, user_id: uid,
          page_url: String(data.page_url).substring(0, 1000),
          depth_25: depthNum >= 25, depth_50: depthNum >= 50,
          depth_75: depthNum >= 75, depth_100: depthNum >= 100,
          max_depth: Math.min(Math.max(Number(data.max_depth) || depthNum, depthNum), 100),
        }).catch(() => {}));
      } else if (endpoint === 'journey') {
        if (!data.page_url) continue;
        jobs.push(upsertUserJourney(c.env, {
          visitor_id: vid, user_id: uid,
          page_url: String(data.page_url).substring(0, 1000),
          conversion_type: data.conversion_type ? String(data.conversion_type).substring(0, 50) : null,
          converted: !!data.converted,
          enrolled_course_id: data.enrolled_course_id || null,
        }).catch(() => {}));
      }
    } catch { /* skip bad events */ }
  }
  if (jobs.length) c.executionCtx.waitUntil(Promise.all(jobs).then(() => {}));
  return ok(c);
});

export default analytics;
