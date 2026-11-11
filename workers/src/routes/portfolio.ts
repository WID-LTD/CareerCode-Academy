import { Hono } from 'hono';
import type { Env } from '../env';
import { fail, requireAuth, requireRole, statusOf } from '../route-utils';
import { getDb } from '../db';
import * as PortfolioModel from '../portfolio';
import { parseBody, storeOrLink } from '../uploads';
import { authenticate } from '../auth-helpers';
import { attachPagesDomain, pagesDomainStatus, detachPagesDomain } from '../portfolio-domains';

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


// ══════════════════════════════════════════════════════════════════════════
// Portfolio website (dedicated /u/:username site + builder)
// ══════════════════════════════════════════════════════════════════════════

const TEMPLATES = [
  { id: 'minimal', name: 'Minimal', description: 'Calm single-column layout for developers.', accent: '#6366f1' },
  { id: 'terminal', name: 'Terminal', description: 'Dark monospace portfolio with command-line flair.', accent: '#22c55e' },
  { id: 'grid', name: 'Grid', description: 'Masonry project grid for designers.', accent: '#ec4899' },
  { id: 'split', name: 'Split', description: 'Profile on the left, work on the right.', accent: '#0ea5e9' },
  { id: 'timeline', name: 'Timeline', description: 'Chronological story of your journey.', accent: '#f59e0b' },
  { id: 'gradient', name: 'Gradient', description: 'Bold colour blocks for creatives.', accent: '#8b5cf6' },
  { id: 'magazine', name: 'Magazine', description: 'Editorial layout with a large feature story.', accent: '#dc2626' },
  { id: 'compact', name: 'Compact', description: 'Dense one-page list for minimalists.', accent: '#0f766e' },
  { id: 'showcase', name: 'Showcase', description: 'Full-bleed project covers, image first.', accent: '#ea580c' },
  { id: 'resume', name: 'Resume', description: 'Two-column CV with skills and contact.', accent: '#334155' },
];

const siteSlug = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'project';

async function ensureSite(env: Env, userId: string) {
  const db = getDb(env);
  const existing = await db.query<any>('SELECT * FROM portfolio_sites WHERE user_id = $1', [userId]);
  if (existing.rows.length) return existing.rows[0];
  const user = (await db.query<any>('SELECT name, bio, username FROM users WHERE id = $1', [userId])).rows[0];
  const { rows } = await db.query<any>(
    `INSERT INTO portfolio_sites (user_id, template, headline, about, is_published)
     VALUES ($1, 'minimal', $2, $3, 0) RETURNING *`,
    [userId, user?.name || 'My portfolio', user?.bio || null]
  );
  return rows[0];
}

async function siteProjects(env: Env, siteId: string) {
  const { rows } = await getDb(env).query<any>(
    `SELECT * FROM portfolio_projects WHERE site_id = $1
     ORDER BY featured DESC, sort_order ASC, created_at DESC`,
    [siteId]
  );
  return rows.map((r: any) => ({
    ...r,
    gallery: safeJson(r.gallery, []),
    tech: safeJson(r.tech, []),
    featured: !!r.featured,
  }));
}

function safeJson(value: any, fallback: any) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

// GET /portfolio/templates
portfolio.get('/templates', (c) => c.json({ success: true, data: TEMPLATES }));

// GET /portfolio/site — builder payload (creates a default site on first use)
portfolio.get('/site', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    const user = (await getDb(c.env).query<any>(
      'SELECT id, name, username, avatar, bio FROM users WHERE id = $1', [s.userId]
    )).rows[0];
    return c.json({
      success: true,
      data: {
        site: { ...site, theme: safeJson(site.theme, {}), socials: safeJson(site.socials, {}), sections: safeJson(site.sections, []), seo: safeJson(site.seo, {}), is_published: !!site.is_published },
        projects: await siteProjects(c.env, site.id),
        user,
        templates: TEMPLATES,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load portfolio site');
  }
});

// PUT /portfolio/site
portfolio.put('/site', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    const body: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    const push = (col: string, v: any) => { fields.push(`${col} = $${values.length + 1}`); values.push(v); };
    for (const key of ['template', 'headline', 'about', 'location', 'availability', 'contact_email']) {
      if (body[key] !== undefined) push(key, body[key]);
    }
    for (const key of ['theme', 'socials', 'sections', 'seo']) {
      if (body[key] !== undefined) push(key, JSON.stringify(body[key]));
    }
    if (!fields.length) return c.json({ success: true, data: site });
    fields.push('updated_at = NOW()');
    values.push(site.id);
    const { rows } = await getDb(c.env).query<any>(
      `UPDATE portfolio_sites SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update portfolio site');
  }
});

// POST /portfolio/site/publish | /unpublish
for (const [action, published] of [['publish', 1], ['unpublish', 0]] as const) {
  portfolio.post(`/site/${action}`, async (c) => {
    try {
      const s = await requireAuth(c);
      const site = await ensureSite(c.env, s.userId);
      await getDb(c.env).query(
        'UPDATE portfolio_sites SET is_published = $1, updated_at = NOW() WHERE id = $2',
        [published, site.id]
      );
      await PortfolioModel.ensureUsername(c.env, s.userId);
      const user = (await getDb(c.env).query<any>('SELECT username FROM users WHERE id = $1', [s.userId])).rows[0];
      return c.json({ success: true, data: { is_published: !!published, username: user?.username } });
    } catch (e: any) {
      return fail(c, statusOf(e), e?.message || 'Failed to publish portfolio');
    }
  });
}

// POST /portfolio/site/projects
portfolio.post('/site/projects', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    const b: any = await c.req.json().catch(() => ({}));
    if (!b.title) return fail(c, 400, 'title is required');
    const base = siteSlug(b.title);
    const db = getDb(c.env);
    let slug = base;
    for (let i = 1; i < 40; i++) {
      const dup = await db.query<any>('SELECT id FROM portfolio_projects WHERE site_id = $1 AND slug = $2', [site.id, slug]);
      if (!dup.rows.length) break;
      slug = `${base}-${i}`;
    }
    const { rows } = await db.query<any>(
      `INSERT INTO portfolio_projects (site_id, title, slug, summary, description, cover_url, gallery, tech, role, duration, repo_url, demo_url, featured, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        site.id, b.title, slug, b.summary || null, b.description || null, b.cover_url || null,
        JSON.stringify(b.gallery || []), JSON.stringify(b.tech || []), b.role || null, b.duration || null,
        b.repo_url || null, b.demo_url || null, !!b.featured, Number(b.sort_order) || 0,
      ]
    );
    return c.json({ success: true, data: rows[0] }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to create project');
  }
});

// PUT /portfolio/site/projects/:id
portfolio.put('/site/projects/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    const db = getDb(c.env);
    const existing = (await db.query<any>(
      'SELECT * FROM portfolio_projects WHERE id = $1 AND site_id = $2',
      [c.req.param('id'), site.id]
    )).rows[0];
    if (!existing) return fail(c, 404, 'Project not found');

    const b: any = await c.req.json().catch(() => ({}));
    const fields: string[] = [];
    const values: any[] = [];
    const push = (col: string, v: any) => { fields.push(`${col} = $${values.length + 1}`); values.push(v); };
    for (const key of ['title', 'summary', 'description', 'cover_url', 'role', 'duration', 'repo_url', 'demo_url', 'preview_image_url']) {
      if (b[key] !== undefined) push(key, b[key]);
    }
    for (const key of ['gallery', 'tech']) {
      if (b[key] !== undefined) push(key, JSON.stringify(b[key]));
    }
    if (b.featured !== undefined) push('featured', b.featured ? 1 : 0);
    if (b.sort_order !== undefined) push('sort_order', Number(b.sort_order));
    if (!fields.length) return c.json({ success: true, data: existing });
    fields.push('updated_at = NOW()');
    values.push(existing.id);
    const { rows } = await db.query<any>(
      `UPDATE portfolio_projects SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update project');
  }
});

// DELETE /portfolio/site/projects/:id
portfolio.delete('/site/projects/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    const { rows } = await getDb(c.env).query<any>(
      'DELETE FROM portfolio_projects WHERE id = $1 AND site_id = $2 RETURNING id',
      [c.req.param('id'), site.id]
    );
    if (!rows.length) return fail(c, 404, 'Project not found');
    return c.json({ success: true, message: 'Project deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete project');
  }
});

// POST /portfolio/site/projects/:id/media — upload or link an image
portfolio.post('/site/projects/:id/media', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    const db = getDb(c.env);
    const project = (await db.query<any>(
      'SELECT * FROM portfolio_projects WHERE id = $1 AND site_id = $2',
      [c.req.param('id'), site.id]
    )).rows[0];
    if (!project) return fail(c, 404, 'Project not found');

    const { fields, file } = await parseBody(c);
    const url = await storeOrLink(
      c.env,
      file,
      (fields.url as string) || (fields.imageUrl as string) || null,
      'portfolio'
    );
    if (!url) return fail(c, 400, 'No image provided');

    const gallery = safeJson(project.gallery, []);
    gallery.push(url);
    const cover = fields.cover === 'true' || fields.cover === true ? url : project.cover_url;
    const { rows } = await db.query<any>(
      'UPDATE portfolio_projects SET gallery = $1, cover_url = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [JSON.stringify(gallery), cover, project.id]
    );
    return c.json({ success: true, data: rows[0] });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to upload image');
  }
});

// GET /portfolio/site/analytics
portfolio.get('/site/analytics', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    const db = getDb(c.env);
    const [total, daily, projects] = await Promise.all([
      db.query<any>('SELECT COUNT(*)::int as n FROM portfolio_views WHERE site_id = $1', [site.id]),
      db.query<any>(
        `SELECT DATE(created_at) as day, COUNT(*)::int as n FROM portfolio_views
         WHERE site_id = $1 AND created_at >= date('now','-30 days')
         GROUP BY DATE(created_at) ORDER BY day ASC`,
        [site.id]
      ),
      db.query<any>('SELECT COUNT(*)::int as n FROM portfolio_projects WHERE site_id = $1', [site.id]),
    ]);
    return c.json({
      success: true,
      data: {
        views: Number(total.rows[0]?.n) || 0,
        projects: Number(projects.rows[0]?.n) || 0,
        daily: daily.rows,
        published: !!site.is_published,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load analytics');
  }
});

// GET /portfolio/directory — published portfolios (opt-in by publishing)
portfolio.get('/directory', async (c) => {
  try {
    const q = (c.req.query('q') || '').trim();
    const limit = Math.min(60, Math.max(1, parseInt(c.req.query('limit') || '24', 10) || 24));
    const params: any[] = [];
    let where = `s.is_published = 1`;
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (u.name ILIKE $${params.length} OR s.headline ILIKE $${params.length})`;
    }
    params.push(limit);
    const { rows } = await getDb(c.env).query<any>(
      `SELECT u.username, u.name, u.avatar, s.headline, s.template, s.theme, s.views,
        (SELECT COUNT(*)::int FROM portfolio_projects p WHERE p.site_id = s.id) AS project_count
       FROM portfolio_sites s JOIN users u ON u.id = s.user_id
       WHERE ${where} AND u.username IS NOT NULL
       ORDER BY s.views DESC, s.updated_at DESC LIMIT $${params.length}`,
      params
    );
    return c.json({
      success: true,
      data: rows.map((r: any) => ({
        ...r,
        theme: safeJson(r.theme, {}),
        project_count: Number(r.project_count) || 0,
      })),
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load directory');
  }
});


// ── Likes ────────────────────────────────────────────────────────────────
portfolio.post('/site/:username/like', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const user = (await db.query<any>('SELECT id FROM users WHERE username = $1', [c.req.param('username')])).rows[0];
    if (!user) return fail(c, 404, 'Portfolio not found');
    const site = (await db.query<any>('SELECT id FROM portfolio_sites WHERE user_id = $1 AND is_published = 1', [user.id])).rows[0];
    if (!site) return fail(c, 404, 'Portfolio not found');

    const existing = await db.query<any>('SELECT 1 FROM portfolio_likes WHERE site_id = $1 AND user_id = $2', [site.id, s.userId]);
    let liked: boolean;
    if (existing.rows.length) {
      await db.query('DELETE FROM portfolio_likes WHERE site_id = $1 AND user_id = $2', [site.id, s.userId]);
      liked = false;
    } else {
      await db.query('INSERT INTO portfolio_likes (site_id, user_id) VALUES ($1, $2)', [site.id, s.userId]);
      liked = true;
    }
    const count = await db.query<any>('SELECT COUNT(*)::int as n FROM portfolio_likes WHERE site_id = $1', [site.id]);
    return c.json({ success: true, data: { liked, likes: Number(count.rows[0]?.n) || 0 } });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to update like');
  }
});

// ── Reviews ──────────────────────────────────────────────────────────────
portfolio.get('/site/:username/reviews', async (c) => {
  try {
    const db = getDb(c.env);
    const user = (await db.query<any>('SELECT id FROM users WHERE username = $1', [c.req.param('username')])).rows[0];
    if (!user) return fail(c, 404, 'Portfolio not found');
    const site = (await db.query<any>('SELECT id FROM portfolio_sites WHERE user_id = $1 AND is_published = 1', [user.id])).rows[0];
    if (!site) return fail(c, 404, 'Portfolio not found');

    const { rows } = await db.query<any>(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name, u.avatar, u.username
       FROM portfolio_reviews r JOIN users u ON u.id = r.user_id
       WHERE r.site_id = $1 AND r.status = 'published'
       ORDER BY r.created_at DESC LIMIT 50`,
      [site.id]
    );
    const avg = await db.query<any>(
      `SELECT COALESCE(AVG(rating), 0) as average, COUNT(*)::int as count
       FROM portfolio_reviews WHERE site_id = $1 AND status = 'published'`,
      [site.id]
    );
    return c.json({
      success: true,
      data: rows,
      average: Math.round((Number(avg.rows[0]?.average) || 0) * 10) / 10,
      total: Number(avg.rows[0]?.count) || 0,
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load reviews');
  }
});

portfolio.post('/site/:username/review', async (c) => {
  try {
    const s = await requireAuth(c);
    const body: any = await c.req.json().catch(() => ({}));
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail(c, 400, 'rating must be 1-5');
    const db = getDb(c.env);
    const user = (await db.query<any>('SELECT id FROM users WHERE username = $1', [c.req.param('username')])).rows[0];
    if (!user) return fail(c, 404, 'Portfolio not found');
    if (user.id === s.userId) return fail(c, 400, 'You cannot review your own portfolio');
    const site = (await db.query<any>('SELECT id FROM portfolio_sites WHERE user_id = $1 AND is_published = 1', [user.id])).rows[0];
    if (!site) return fail(c, 404, 'Portfolio not found');

    await db.query(
      `INSERT INTO portfolio_reviews (site_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (site_id, user_id)
       DO UPDATE SET rating = $3, comment = $4, updated_at = NOW(), status = 'published'`,
      [site.id, s.userId, rating, body.comment ? String(body.comment).slice(0, 1000) : null]
    );
    return c.json({ success: true }, 201 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to save review');
  }
});

portfolio.delete('/site/reviews/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const review = (await db.query<any>('SELECT * FROM portfolio_reviews WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!review) return fail(c, 404, 'Review not found');
    const site = (await db.query<any>('SELECT * FROM portfolio_sites WHERE id = $1', [review.site_id])).rows[0];
    const allowed = review.user_id === s.userId || site?.user_id === s.userId || ['admin', 'super_admin'].includes(s.role);
    if (!allowed) return fail(c, 403, 'Forbidden');
    await db.query('DELETE FROM portfolio_reviews WHERE id = $1', [review.id]);
    return c.json({ success: true, message: 'Review deleted' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to delete review');
  }
});

// ── Custom domain (request + DNS verification) ───────────────────────────
portfolio.put('/site/custom-domain', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    const body: any = await c.req.json().catch(() => ({}));
    const domain = String(body.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!domain) return fail(c, 400, 'domain is required');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) return fail(c, 400, 'Invalid domain');

    const token = `careercode-verify-${crypto.randomUUID()}`;
    await getDb(c.env).query(
      `UPDATE portfolio_sites SET custom_domain = $1, domain_status = 'pending', domain_token = $2, updated_at = NOW() WHERE id = $3`,
      [domain, token, site.id]
    );
    return c.json({
      success: true,
      data: {
        domain,
        status: 'pending',
        instructions: [
          `Add a TXT record on _careercode.${domain} with value: ${token}`,
          `Add a CNAME record for ${domain} pointing to career-code-academy.pages.dev (proxied).`,
          'Then press Verify. CareerCode attaches the domain to the portfolio site and Cloudflare provisions SSL automatically.',
        ],
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to set domain');
  }
});

portfolio.post('/site/custom-domain/verify', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    if (!site.custom_domain || !site.domain_token) return fail(c, 400, 'Set a custom domain first');
    const name = `_careercode.${site.custom_domain}`;
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, {
      headers: { Accept: 'application/dns-json' },
    });
    const json: any = await res.json().catch(() => ({}));
    const answers: string[] = (json?.Answer || []).map((a: any) => String(a.data || ''));
    const verified = answers.some((a) => a.includes(site.domain_token));
    let attach: any = null;
    let status = 'pending';
    if (verified) {
      attach = await attachPagesDomain(c.env, site.custom_domain);
      status = attach.ok ? 'attached' : 'verified';
      await getDb(c.env).query(
        `UPDATE portfolio_sites SET domain_status = $1, domain_verified_at = COALESCE(domain_verified_at, NOW()),
           custom_hostname_id = COALESCE($2, custom_hostname_id), domain_last_error = $3, updated_at = NOW()
         WHERE id = $4`,
        [status, attach.id || null, attach.ok ? null : attach.error || 'Attach failed', site.id]
      );
    } else {
      await getDb(c.env).query(`UPDATE portfolio_sites SET domain_status = 'pending', updated_at = NOW() WHERE id = $1`, [site.id]);
    }
    return c.json({
      success: true,
      data: {
        verified,
        status,
        attach,
        message: !verified
          ? 'TXT record not found yet. DNS can take a few minutes.'
          : attach?.ok
            ? 'Domain verified and attached. Cloudflare is provisioning SSL; it usually becomes active within a few minutes.'
            : 'DNS verified, but attaching the domain to Pages failed. Check the CNAME and press Verify again.',
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to verify domain');
  }
});

// GET /portfolio/site/custom-domain/status — poll Pages attachment/SSL
portfolio.get('/site/custom-domain/status', async (c) => {
  try {
    const s = await requireAuth(c);
    const site = await ensureSite(c.env, s.userId);
    if (!site.custom_domain) return c.json({ success: true, data: { status: 'none' } });
    const res = await pagesDomainStatus(c.env, site.custom_domain);
    const status = res.ok
      ? (res.status === 'active' ? 'active' : res.status === 'error' ? 'error' : 'attached')
      : 'verified';
    await getDb(c.env).query(
      `UPDATE portfolio_sites SET domain_status = $1, domain_last_error = $2, custom_hostname_id = COALESCE($3, custom_hostname_id), updated_at = NOW() WHERE id = $4`,
      [status, res.ok ? null : res.error || null, res.id || null, site.id]
    );
    return c.json({
      success: true,
      data: {
        domain: site.custom_domain,
        status,
        pages_status: res.status,
        error: res.error || null,
        cname_target: 'career-code-academy.pages.dev',
        url: `https://${site.custom_domain}`,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to check domain status');
  }
});

// GET /portfolio/sitemap.xml — public sitemap of published portfolios
portfolio.get('/sitemap.xml', async (c) => {
  try {
    const db = getDb(c.env);
    const sites = await db.query<any>(
      `SELECT u.username, ps.updated_at FROM portfolio_sites ps JOIN users u ON u.id = ps.user_id
       WHERE ps.is_published = 1 AND u.username IS NOT NULL AND u.username <> '' LIMIT 5000`
    );
    const projects = await db.query<any>(
      `SELECT u.username, pp.slug, pp.updated_at FROM portfolio_projects pp
       JOIN portfolio_sites ps ON ps.id = pp.site_id JOIN users u ON u.id = ps.user_id
       WHERE ps.is_published = 1 AND u.username IS NOT NULL AND u.username <> '' LIMIT 20000`
    );
    const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const urls: string[] = [
      'https://careercode.com.ng/', 'https://careercode.com.ng/courses',
      'https://careercode.com.ng/learning-paths', 'https://careercode.com.ng/portfolios',
    ].map((loc) => `  <url><loc>${loc}</loc><changefreq>weekly</changefreq></url>`);
    for (const site of sites.rows) {
      const loc = `https://${site.username}.careercode.com.ng/`;
      const lastmod = site.updated_at ? `<lastmod>${new Date(site.updated_at).toISOString()}</lastmod>` : '';
      urls.push(`  <url><loc>${esc(loc)}</loc>${lastmod}<changefreq>weekly</changefreq></url>`);
    }
    for (const p of projects.rows) {
      const loc = `https://${p.username}.careercode.com.ng/${encodeURIComponent(p.slug)}`;
      const lastmod = p.updated_at ? `<lastmod>${new Date(p.updated_at).toISOString()}</lastmod>` : '';
      urls.push(`  <url><loc>${esc(loc)}</loc>${lastmod}<changefreq>monthly</changefreq></url>`);
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
    return c.body(xml, 200, { 'Content-Type': 'application/xml; charset=utf-8' });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to build sitemap');
  }
});

// GET /portfolio/resolve-host?host=... — public host → username lookup for Pages Functions
portfolio.get('/resolve-host', async (c) => {
  try {
    const host = String(c.req.query('host') || '').trim().toLowerCase().replace(/:\d+$/, '');
    if (!host) return fail(c, 400, 'host is required');
    const db = getDb(c.env);
    if (host.endsWith('.careercode.com.ng')) {
      const sub = host.split('.')[0];
      if (['api', 'www', 'portfolio'].includes(sub)) return c.json({ success: true, data: null });
      const { rows } = await db.query<any>('SELECT username FROM users WHERE lower(username) = $1 LIMIT 1', [sub]);
      return c.json({ success: true, data: rows[0] ? { username: rows[0].username, source: 'subdomain' } : null });
    }
    const { rows } = await db.query<any>(
      `SELECT u.username FROM portfolio_sites ps JOIN users u ON u.id = ps.user_id
       WHERE lower(ps.custom_domain) = $1 AND ps.domain_status IN ('verified','attached','active') AND ps.is_published = 1 LIMIT 1`,
      [host]
    );
    return c.json({ success: true, data: rows[0] ? { username: rows[0].username, source: 'custom_domain' } : null });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Host lookup failed');
  }
});

// GET /portfolio/site/:username — public portfolio
portfolio.get('/site/:username', async (c) => {
  try {
    const db = getDb(c.env);
    const user = (await db.query<any>(
      'SELECT id, name, username, avatar, bio, headline, location, website, github, twitter, linkedin FROM users WHERE username = $1',
      [c.req.param('username')]
    )).rows[0];
    if (!user) return fail(c, 404, 'Portfolio not found');
    const site = (await db.query<any>(
      'SELECT * FROM portfolio_sites WHERE user_id = $1 AND is_published = 1',
      [user.id]
    )).rows[0];
    if (!site) return fail(c, 404, 'Portfolio not found');
    const projects = await siteProjects(c.env, site.id);
    const likes = await db.query<any>('SELECT COUNT(*)::int as n FROM portfolio_likes WHERE site_id = $1', [site.id]);
    let liked = false;
    try {
      const viewer = await authenticate(c);
      const mine = await db.query<any>('SELECT 1 FROM portfolio_likes WHERE site_id = $1 AND user_id = $2', [site.id, viewer.userId]);
      liked = mine.rows.length > 0;
    } catch { /* anonymous */ }
    const reviewStats = await db.query<any>(
      `SELECT COALESCE(AVG(rating),0) as average, COUNT(*)::int as count FROM portfolio_reviews WHERE site_id = $1 AND status = 'published'`,
      [site.id]
    );
    c.executionCtx.waitUntil((async () => {
      await db.query('UPDATE portfolio_sites SET views = views + 1 WHERE id = $1', [site.id]);
      await db.query(
        'INSERT INTO portfolio_views (site_id, path, referrer) VALUES ($1, $2, $3)',
        [site.id, c.req.path, c.req.header('referer') || null]
      );
    })().catch(() => {}));
    return c.json({
      success: true,
      data: {
        user,
        site: {
          ...site,
          theme: safeJson(site.theme, {}),
          socials: safeJson(site.socials, {}),
          sections: safeJson(site.sections, []),
          seo: safeJson(site.seo, {}),
        },
        projects,
        likes: Number(likes.rows[0]?.n) || 0,
        liked,
        review_average: Math.round((Number(reviewStats.rows[0]?.average) || 0) * 10) / 10,
        review_count: Number(reviewStats.rows[0]?.count) || 0,
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load portfolio');
  }
});

// GET /portfolio/site/:username/:projectSlug — public project page
portfolio.get('/site/:username/:projectSlug', async (c) => {
  try {
    const db = getDb(c.env);
    const user = (await db.query<any>('SELECT id, name, username, avatar, bio FROM users WHERE username = $1', [c.req.param('username')])).rows[0];
    if (!user) return fail(c, 404, 'Project not found');
    const site = (await db.query<any>('SELECT * FROM portfolio_sites WHERE user_id = $1 AND is_published = 1', [user.id])).rows[0];
    if (!site) return fail(c, 404, 'Project not found');
    const project = (await db.query<any>(
      'SELECT * FROM portfolio_projects WHERE site_id = $1 AND slug = $2',
      [site.id, c.req.param('projectSlug')]
    )).rows[0];
    if (!project) return fail(c, 404, 'Project not found');
    return c.json({
      success: true,
      data: {
        user,
        site: { ...site, theme: safeJson(site.theme, {}), socials: safeJson(site.socials, {}), sections: safeJson(site.sections, []) },
        project: { ...project, gallery: safeJson(project.gallery, []), tech: safeJson(project.tech, []), featured: !!project.featured },
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load project');
  }
});

export default portfolio;

