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

// GET /api/v1/public/course-categories — live category counts for navigation
pub.get('/course-categories', async (c) => {
  try {
    const { rows } = await getDb(c.env).query<any>(
      `SELECT category, COUNT(*)::int AS n FROM courses WHERE published = 1 GROUP BY category`
    );
    const groups: Record<string, { name: string; slug: string; categories: string[]; count: number }> = {
      'Web Development': { name: 'Web Development', slug: 'web-development', categories: ['Web Development', 'Backend Development'], count: 0 },
      'Data Science': { name: 'Data Science', slug: 'data-science', categories: ['Data Science'], count: 0 },
      'Mobile Development': { name: 'Mobile Development', slug: 'mobile-development', categories: ['Mobile'], count: 0 },
      'DevOps': { name: 'DevOps', slug: 'devops', categories: ['DevOps'], count: 0 },
      'Security': { name: 'Security', slug: 'security', categories: ['Security'], count: 0 },
      'AI & Machine Learning': { name: 'AI & Machine Learning', slug: 'ai-machine-learning', categories: ['AI'], count: 0 },
      'Design': { name: 'Design', slug: 'design', categories: ['Design'], count: 0 },
      'Cloud Computing': { name: 'Cloud Computing', slug: 'cloud-computing', categories: ['Cloud Computing'], count: 0 },
      'Software Engineering': { name: 'Software Engineering', slug: 'software-engineering', categories: ['Software Engineering', 'Computer Science', 'Programming'], count: 0 },
      'Databases': { name: 'Databases', slug: 'databases', categories: ['Databases'], count: 0 },
      'Networking': { name: 'Networking', slug: 'networking', categories: ['Networking'], count: 0 },
    };
    for (const row of rows) {
      const group = Object.values(groups).find((g) => g.categories.includes(row.category));
      if (group) group.count += Number(row.n) || 0;
    }
    const data = Object.values(groups).filter((g) => g.count > 0).map((g) => ({ ...g, href: `/courses?categories=${encodeURIComponent(g.categories.join(','))}` }));
    return c.json({ success: true, data });
  } catch (e: any) {
    return c.json({ success: false, message: 'Failed to load categories' }, 500);
  }
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
      `SELECT key, value FROM system_settings WHERE key IN ('platform_name','platform_description','support_email','website_url','platform_currency','platform_currency_symbol','default_language','timezone')`
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
        description: map.platform_description || 'CareerCode Academy is the education venture of WID LTD, delivering practical, project-based technology education.',
        supportEmail: map.support_email || 'hello@careercode.com.ng',
        websiteUrl: map.website_url || 'https://careercode.com.ng',
        language: map.default_language || 'English (Nigeria)',
        timezone: map.timezone || 'West Africa Time (WAT)',
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
