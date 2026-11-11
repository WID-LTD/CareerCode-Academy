import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';

const pub = new Hono<{ Bindings: Env }>();

// GET /api/v1/public/stats — real platform counts (same shape as Express)
pub.get('/stats', async (c) => {
  const count = async (sql: string): Promise<number> => {
    try {
      const { rows } = await getDb(c.env).query<{ n: number }>(sql);
      return Number(rows[0]?.n) || 0;
    } catch {
      return 0;
    }
  };
  const [students, courses, certificates, alumni] = await Promise.all([
    count(`SELECT COUNT(*)::int AS n FROM users WHERE role = 'student'`),
    count(`SELECT COUNT(*)::int AS n FROM courses WHERE published = true`),
    count(`SELECT COUNT(*)::int AS n FROM certificates`),
    count(`SELECT COUNT(*)::int AS n FROM alumni`),
  ]);
  return c.json({ success: true, data: { students, courses, certificates, alumni } });
});

// GET /api/v1/public/currency — platform currency for checkout/pricing
pub.get('/currency', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      `SELECT key, value FROM system_settings WHERE key IN ('platform_currency','platform_currency_symbol','platform_currency_locale')`
    );
    const map: Record<string, string> = {};
    rows.forEach((r: any) => { map[r.key] = r.value; });
    return c.json({
      success: true,
      data: {
        code: map['platform_currency'] || 'NGN',
        symbol: map['platform_currency_symbol'] || '₦',
        locale: map['platform_currency_locale'] || 'en-NG',
      },
    });
  } catch {
    return c.json({ success: true, data: { code: 'NGN', symbol: '₦', locale: 'en-NG' } });
  }
});


// GET /api/v1/public/config — branding + public feature flags
pub.get('/config', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      `SELECT key, value FROM system_settings WHERE key IN ('platform_name','support_email','website_url','platform_currency','platform_currency_symbol')`
    );
    const map: Record<string, string> = {};
    rows.forEach((r: any) => { map[r.key] = r.value; });
    let flags: Record<string, boolean> = {};
    try {
      const f = await getDb(c.env).query<any>('SELECT key, enabled FROM feature_flags');
      flags = Object.fromEntries(f.rows.map((r: any) => [r.key, !!r.enabled]));
    } catch { /* ignore */ }
    return c.json({
      success: true,
      data: {
        name: map.platform_name || 'CareerCode Academy',
        supportEmail: map.support_email || 'hello@careercode.com.ng',
        websiteUrl: map.website_url || 'https://careercode.com.ng',
        currency: map.platform_currency || 'NGN',
        currencySymbol: map.platform_currency_symbol || '₦',
        flags,
      },
    });
  } catch {
    return c.json({ success: true, data: { name: 'CareerCode Academy', supportEmail: 'hello@careercode.com.ng', websiteUrl: 'https://careercode.com.ng', currency: 'NGN', currencySymbol: '₦', flags: {} } });
  }
});

// GET /api/v1/public/testimonials — real, published testimonials + top learner reviews
pub.get('/testimonials', async (c) => {
  try {
    const db = getDb(c.env);
    const { rows: curated } = await db.query<any>(
      `SELECT id, quote, role, company, image_url FROM testimonials WHERE status = 'published' ORDER BY sort_order ASC, created_at DESC LIMIT 8`
    );
    if (curated.length) {
      return c.json({ success: true, data: curated.map((t: any) => ({ ...t, source: 'curated' })) });
    }
    const { rows } = await db.query<any>(
      `SELECT r.id, r.rating, r.comment, u.name, c.title AS course_title, c.slug AS course_slug
       FROM reviews r JOIN users u ON u.id = r.user_id JOIN courses c ON c.id = r.course_id
       WHERE r.rating >= 4 AND r.comment IS NOT NULL AND length(trim(r.comment)) > 20 AND r.reported = 0
       ORDER BY r.rating DESC, r.created_at DESC LIMIT 6`
    );
    const data = rows.map((r: any) => {
      const parts = String(r.name || 'Learner').trim().split(/\s+/);
      const display = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
      return {
        id: r.id,
        quote: r.comment,
        role: `Learner · ${r.course_title}`,
        company: null,
        image_url: null,
        name: display,
        rating: r.rating,
        course_slug: r.course_slug,
        source: 'review',
      };
    });
    return c.json({ success: true, data });
  } catch (e: any) {
    return c.json({ success: true, data: [] });
  }
});

export default pub;
