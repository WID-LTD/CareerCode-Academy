import type { Env } from '../env';
import { getDb } from '../db';
import { hourLabel, monDay, num } from './helpers';

// Port of backend/src/services/analytics.service.ts.
//
// Two Postgres-only constructs are rewritten for SQLite/D1:
//   * `COUNT(*) FILTER (WHERE ...)` -> SUM(CASE WHEN ... THEN 1 ELSE 0 END)
//   * per-bucket to_char()/date_trunc('hour') labels -> computed in JS
// The in-process 30s cache is dropped (Workers isolates are short-lived and a
// module-level cache would be per-isolate anyway); response shapes are unchanged.

function rangeInterval(range: string): string {
  const map: Record<string, string> = {
    '24h': '24 hours',
    '7d': '7 days',
    '30d': '30 days',
    '90d': '90 days',
    '1y': '1 year',
  };
  return map[range] || '7 days';
}

export async function getOverview(env: Env, range = '7d') {
  const db = getDb(env);
  const interval = rangeInterval(range);

  const [totalVisitors, returningVisitors, pageViews, activeVisitors, bounceSessions] = await Promise.all([
    db.query<any>(`SELECT COUNT(*)::int as count FROM visitors WHERE created_at > NOW() - INTERVAL '${interval}'`),
    db.query<any>(`SELECT COUNT(*)::int as count FROM visitors WHERE visit_count > 1 AND created_at > NOW() - INTERVAL '${interval}'`),
    db.query<any>(`SELECT COUNT(*)::int as count FROM page_views WHERE created_at > NOW() - INTERVAL '${interval}'`),
    db.query<any>(`SELECT COUNT(*)::int as count FROM visitors WHERE is_active = true`),
    db.query<any>(`SELECT COUNT(*)::int as count FROM visitors WHERE visit_count = 1 AND created_at > NOW() - INTERVAL '${interval}'`),
  ]);

  const total = num(totalVisitors.rows[0]?.count);
  const returning = num(returningVisitors.rows[0]?.count);
  const views = num(pageViews.rows[0]?.count);
  const active = num(activeVisitors.rows[0]?.count);
  const bounced = num(bounceSessions.rows[0]?.count);

  const uniqueVisitors = total;
  const returningRate = total > 0 ? Math.round((returning / total) * 100) : 0;
  const bounceRate = total > 0 ? Math.round((bounced / total) * 100) : 0;

  const avgSessionDuration = await db.query<any>(
    `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(session_end, NOW()) - session_start))), 0)::int as avg_sec
     FROM visitors WHERE session_start > NOW() - INTERVAL '${interval}' AND session_start IS NOT NULL`
  );

  return {
    totalVisitors: total,
    uniqueVisitors,
    returningVisitors: returning,
    totalPageViews: views,
    bounceRate,
    avgSessionDuration: num(avgSessionDuration.rows[0]?.avg_sec),
    activeVisitors: active,
  };
}

export async function getVisitorTrend(env: Env, range = '7d') {
  const db = getDb(env);
  const interval = rangeInterval(range);

  if (range === '24h') {
    // date_trunc('hour', ...) has no sql-compat translation — bucket in JS.
    const { rows } = await db.query<any>(
      `SELECT visitor_id, created_at FROM page_views WHERE created_at > NOW() - INTERVAL '${interval}'`
    );
    const buckets = new Map<string, { date: string; label: string; visitors: Set<string>; page_views: number }>();
    for (const row of rows) {
      const d = new Date(String(row.created_at));
      if (Number.isNaN(d.getTime())) continue;
      const date = d.toISOString().slice(0, 10);
      const label = hourLabel(row.created_at) as string;
      const key = `${date}::${label}`;
      let b = buckets.get(key);
      if (!b) {
        b = { date, label, visitors: new Set<string>(), page_views: 0 };
        buckets.set(key, b);
      }
      b.visitors.add(String(row.visitor_id));
      b.page_views += 1;
    }
    return Array.from(buckets.values())
      .sort((a, b) => (a.date === b.date ? a.label.localeCompare(b.label) : a.date.localeCompare(b.date)))
      .map((b) => ({ date: b.date, label: b.label, visitors: b.visitors.size, page_views: b.page_views }));
  }

  const { rows } = await db.query<any>(
    `SELECT DATE(created_at) as date,
            COUNT(DISTINCT visitor_id)::int as visitors,
            COUNT(*)::int as page_views
     FROM page_views
     WHERE created_at > NOW() - INTERVAL '${interval}'
     GROUP BY date
     ORDER BY date`
  );
  return rows.map((r) => ({
    date: r.date,
    label: monDay(r.date),
    visitors: num(r.visitors),
    page_views: num(r.page_views),
  }));
}

export async function getPageAnalytics(env: Env, range = '7d') {
  const db = getDb(env);
  const interval = rangeInterval(range);

  const [mostVisited, landingPages, exitPages] = await Promise.all([
    db.query<any>(
      `SELECT page_url, COUNT(*)::int as views,
              COUNT(DISTINCT visitor_id)::int as unique_visitors,
              ROUND(AVG(time_spent_sec))::int as avg_time_sec
       FROM page_views
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY page_url
       ORDER BY views DESC
       LIMIT 20`
    ),
    db.query<any>(
      `SELECT page_url, COUNT(*)::int as entries
       FROM page_views p1
       WHERE created_at > NOW() - INTERVAL '${interval}'
         AND NOT EXISTS (
           SELECT 1 FROM page_views p2
           WHERE p2.visitor_id = p1.visitor_id
             AND p2.created_at < p1.created_at
             AND p2.created_at > NOW() - INTERVAL '${interval}'
         )
       GROUP BY page_url
       ORDER BY entries DESC
       LIMIT 10`
    ),
    db.query<any>(
      `SELECT pv.page_url, COUNT(*)::int as exits
       FROM page_views pv
       WHERE pv.is_exit_page = true
         AND pv.created_at > NOW() - INTERVAL '${interval}'
       GROUP BY pv.page_url
       ORDER BY exits DESC
       LIMIT 10`
    ),
  ]);

  return {
    mostVisited: mostVisited.rows,
    landingPages: landingPages.rows,
    exitPages: exitPages.rows,
  };
}

export async function getDeviceAnalytics(env: Env, range = '7d') {
  const db = getDb(env);
  const interval = rangeInterval(range);

  const [devices, browsers, oss] = await Promise.all([
    db.query<any>(
      `SELECT device_type, COUNT(*)::int as count FROM visitors
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY device_type ORDER BY count DESC`
    ),
    db.query<any>(
      `SELECT browser, COUNT(*)::int as count FROM visitors
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY browser ORDER BY count DESC`
    ),
    db.query<any>(
      `SELECT os, COUNT(*)::int as count FROM visitors
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY os ORDER BY count DESC`
    ),
  ]);

  const total = devices.rows.reduce((acc: number, r: any) => acc + num(r.count), 0);
  const pct = (count: any) => (total > 0 ? Math.round((num(count) / total) * 100) : 0);

  return {
    devices: devices.rows.map((r: any) => ({ ...r, percentage: pct(r.count) })),
    browsers: browsers.rows.map((r: any) => ({ ...r, percentage: pct(r.count) })),
    os: oss.rows.map((r: any) => ({ ...r, percentage: pct(r.count) })),
    total,
  };
}

export async function getSourceAnalytics(env: Env, range = '7d') {
  const db = getDb(env);
  const interval = rangeInterval(range);

  const sources = await db.query<any>(
    `SELECT
       COALESCE(NULLIF(referral_source, ''), 'Direct') as source,
       COUNT(*)::int as visitors,
       SUM(CASE WHEN visit_count > 1 THEN 1 ELSE 0 END)::int as returning_count
     FROM visitors
     WHERE created_at > NOW() - INTERVAL '${interval}'
     GROUP BY source
     ORDER BY visitors DESC`
  );

  const total = sources.rows.reduce((acc: number, r: any) => acc + num(r.visitors), 0);

  return sources.rows.map((r: any) => {
    const visitors = num(r.visitors);
    const returning = num(r.returning_count);
    return {
      source: r.source,
      visitors,
      returning,
      percentage: total > 0 ? Math.round((visitors / total) * 100) : 0,
      returningRate: visitors > 0 ? Math.round((returning / visitors) * 100) : 0,
    };
  });
}

export async function getConversionFunnel(env: Env, range = '7d') {
  const db = getDb(env);
  const interval = rangeInterval(range);

  const [totalVisitors, newRegistrations, totalEnrollments, sourceConversions] = await Promise.all([
    db.query<any>(`SELECT COUNT(*)::int as count FROM visitors WHERE created_at > NOW() - INTERVAL '${interval}'`),
    db.query<any>(`SELECT COUNT(*)::int as count FROM users WHERE created_at > NOW() - INTERVAL '${interval}'`),
    db.query<any>(`SELECT COUNT(*)::int as count FROM enrollments WHERE enrolled_at > NOW() - INTERVAL '${interval}'`),
    db.query<any>(
      `SELECT
         COALESCE(NULLIF(v.referral_source, ''), 'Direct') as source,
         COUNT(DISTINCT v.visitor_id)::int as visitors,
         COUNT(DISTINCT u.id)::int as signups,
         COUNT(DISTINCT e.id)::int as enrollments
       FROM visitors v
       LEFT JOIN users u ON u.id = v.user_id AND u.created_at > NOW() - INTERVAL '${interval}'
       LEFT JOIN enrollments e ON e.user_id = v.user_id AND e.enrolled_at > NOW() - INTERVAL '${interval}'
       WHERE v.created_at > NOW() - INTERVAL '${interval}'
       GROUP BY source
       ORDER BY visitors DESC`
    ),
  ]);

  const visitors = num(totalVisitors.rows[0]?.count);
  const signups = num(newRegistrations.rows[0]?.count);
  const enrollments = num(totalEnrollments.rows[0]?.count);

  return {
    funnel: {
      visitors,
      signups,
      enrollments,
      visitorToSignup: visitors > 0 ? Math.round((signups / visitors) * 100) : 0,
      signupToEnrollment: signups > 0 ? Math.round((enrollments / signups) * 100) : 0,
      overallConversion: visitors > 0 ? Math.round((enrollments / visitors) * 10000) / 100 : 0,
    },
    sourcePerformance: sourceConversions.rows,
  };
}

export async function getJourneyAnalytics(env: Env, range = '7d') {
  const db = getDb(env);
  const interval = rangeInterval(range);

  const [commonPaths, dropOffs] = await Promise.all([
    db.query<any>(
      `SELECT pages_visited, COUNT(*)::int as count,
              SUM(CASE WHEN converted THEN 1 ELSE 0 END)::int as conversions
       FROM user_journeys
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY pages_visited
       ORDER BY count DESC
       LIMIT 20`
    ),
    db.query<any>(
      `SELECT dropped_at_page, COUNT(*)::int as drop_offs
       FROM user_journeys
       WHERE dropped_at_page IS NOT NULL
         AND created_at > NOW() - INTERVAL '${interval}'
       GROUP BY dropped_at_page
       ORDER BY drop_offs DESC
       LIMIT 10`
    ),
  ]);

  return {
    commonPaths: commonPaths.rows,
    dropOffs: dropOffs.rows,
  };
}

export async function getCourseAnalytics(env: Env, range = '7d') {
  const db = getDb(env);
  const interval = rangeInterval(range);

  // `completion_rate` was a Postgres CASE/FILTER expression; it is computed in
  // JS below from the same two counts so the response shape is unchanged.
  const courses = await db.query<any>(
    `SELECT
       c.id, c.title, c.slug, c.price,
       COUNT(DISTINCT pv.id)::int as page_views,
       COUNT(DISTINCT e.id)::int as enrollments,
       COUNT(DISTINCT CASE WHEN e.completed THEN e.id END)::int as completions,
       ROUND(COALESCE(AVG(r.rating), 0), 1)::float as avg_rating,
       COUNT(DISTINCT r.id)::int as review_count,
       COALESCE(SUM(p.amount), 0)::float as revenue
     FROM courses c
     LEFT JOIN page_views pv ON pv.page_url LIKE '%' || c.slug || '%' AND pv.created_at > NOW() - INTERVAL '${interval}'
     LEFT JOIN enrollments e ON e.course_id = c.id AND e.enrolled_at > NOW() - INTERVAL '${interval}'
     LEFT JOIN reviews r ON r.course_id = c.id AND r.created_at > NOW() - INTERVAL '${interval}'
     LEFT JOIN payments p ON p.course_id = c.id AND p.status = 'completed' AND p.created_at > NOW() - INTERVAL '${interval}'
     GROUP BY c.id, c.title, c.slug, c.price
     ORDER BY enrollments DESC
     LIMIT 20`
  );

  return courses.rows.map((r: any) => {
    const enrollments = num(r.enrollments);
    const completions = num(r.completions);
    return {
      ...r,
      completion_rate: enrollments > 0 ? Math.round((completions / enrollments) * 100) : 0,
    };
  });
}

export async function getClickAnalytics(env: Env, range = '7d') {
  const db = getDb(env);
  const interval = rangeInterval(range);

  const [topClicks, topCtas] = await Promise.all([
    db.query<any>(
      `SELECT element_text, element_type, page_url, COUNT(*)::int as clicks
       FROM click_events
       WHERE created_at > NOW() - INTERVAL '${interval}'
       GROUP BY element_text, element_type, page_url
       ORDER BY clicks DESC
       LIMIT 30`
    ),
    db.query<any>(
      `SELECT element_text, COUNT(*)::int as clicks
       FROM click_events
       WHERE element_type IN ('button', 'cta', 'enroll', 'signup')
         AND created_at > NOW() - INTERVAL '${interval}'
       GROUP BY element_text
       ORDER BY clicks DESC
       LIMIT 10`
    ),
  ]);

  return {
    topClicks: topClicks.rows,
    topCtas: topCtas.rows,
  };
}

export async function getRealtimeStats(env: Env) {
  const db = getDb(env);

  const [activeVisitors, currentPages, todayRegistrations, todayEnrollments] = await Promise.all([
    db.query<any>(`SELECT COUNT(*)::int as count FROM visitors WHERE is_active = true`),
    db.query<any>(
      `SELECT pv.page_url, COUNT(DISTINCT pv.visitor_id)::int as viewers
       FROM page_views pv
       WHERE pv.created_at > NOW() - INTERVAL '5 minutes'
       GROUP BY pv.page_url
       ORDER BY viewers DESC
       LIMIT 10`
    ),
    db.query<any>(`SELECT COUNT(*)::int as count FROM users WHERE created_at > NOW() - INTERVAL '24 hours'`),
    db.query<any>(`SELECT COUNT(*)::int as count FROM enrollments WHERE enrolled_at > NOW() - INTERVAL '24 hours'`),
  ]);

  return {
    activeVisitors: num(activeVisitors.rows[0]?.count),
    currentPages: currentPages.rows,
    todayRegistrations: num(todayRegistrations.rows[0]?.count),
    todayEnrollments: num(todayEnrollments.rows[0]?.count),
  };
}

export async function getDashboardSummary(env: Env) {
  const db = getDb(env);

  const [todayStats, overview, realtime] = await Promise.all([
    db.query<any>(
      `SELECT
         (SELECT COUNT(*)::int FROM visitors WHERE created_at > NOW() - INTERVAL '24 hours') as visitors_today,
         (SELECT COUNT(*)::int FROM page_views WHERE created_at > NOW() - INTERVAL '24 hours') as page_views_today,
         (SELECT COUNT(*)::int FROM users WHERE created_at > NOW() - INTERVAL '24 hours') as signups_today,
         (SELECT COUNT(*)::int FROM enrollments WHERE enrolled_at > NOW() - INTERVAL '24 hours') as enrollments_today`
    ),
    getOverview(env, '7d'),
    getRealtimeStats(env),
  ]);

  return {
    today: todayStats.rows[0],
    overview,
    realtime,
  };
}
