import { Hono } from 'hono';
import type { Env } from '../env';
import { getDb } from '../db';
import { fail, requireAuth, statusOf } from '../route-utils';

const courseProjects = new Hono<{ Bindings: Env }>();

const GITHUB_RE = /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/#?]+)(?:[/?#].*)?$/i;

function parseGithub(url: string): { owner: string; repo: string } | null {
  const match = String(url || '').trim().match(GITHUB_RE);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/i, '') };
}

async function githubJson(env: Env, path: string): Promise<{ ok: boolean; status: number; data: any }> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'CareerCode-Academy',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com${path}`, { headers });
    const data: any = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    return { ok: false, status: 0, data: { message: e?.message || 'GitHub is unreachable' } };
  }
}

function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

async function verifyRepository(env: Env, project: any, sourceUrl: string) {
  const parsed = parseGithub(sourceUrl);
  if (!parsed) {
    return {
      verified: false,
      score: 0,
      error: 'Enter a public GitHub repository URL like https://github.com/username/project.',
      checks: [],
      repo: null,
      languages: {},
      latest_commit: null,
    };
  }

  const base = `/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}`;
  const repoRes = await githubJson(env, base);
  if (!repoRes.ok || !repoRes.data) {
    const msg = repoRes.status === 404
      ? 'Repository not found. Check the URL and make sure the repository is public.'
      : repoRes.data?.message || 'GitHub could not verify this repository.';
    return { verified: false, score: 0, error: msg, checks: [], repo: null, languages: {}, latest_commit: null };
  }

  const repo = repoRes.data;
  const [commitsRes, languagesRes, readmeRes] = await Promise.all([
    githubJson(env, `${base}/commits?per_page=20`),
    githubJson(env, `${base}/languages`),
    githubJson(env, `${base}/readme`),
  ]);

  const commits = Array.isArray(commitsRes.data) ? commitsRes.data : [];
  const latest = commits[0] || null;
  const languages = languagesRes.ok && languagesRes.data && typeof languagesRes.data === 'object' ? languagesRes.data : {};
  let readmeText = '';
  if (readmeRes.ok && readmeRes.data?.content) {
    try { readmeText = atob(String(readmeRes.data.content).replace(/\s/g, '')); } catch { /* ignore */ }
  }

  const requiredLanguages: string[] = Array.isArray(project.required_languages)
    ? project.required_languages
    : (() => { try { return JSON.parse(project.required_languages || '[]'); } catch { return []; } })();
  const languageNames = Object.keys(languages);
  const languageMatch = requiredLanguages.length === 0 || requiredLanguages.some((l) => languageNames.some((n) => n.toLowerCase() === l.toLowerCase()));
  const recentDays = daysSince(repo.pushed_at);
  const checks = [
    { key: 'public', label: 'Repository is public', passed: !repo.private, weight: 10, detail: repo.private ? 'Private repositories cannot be reviewed.' : 'Public repository found.' },
    { key: 'commits', label: `At least ${Number(project.min_commits) || 1} commit(s)`, passed: commits.length >= (Number(project.min_commits) || 1), weight: 20, detail: `${commits.length} recent commit(s) found.` },
    { key: 'readme', label: 'README is present', passed: readmeText.trim().length >= 40, weight: 20, detail: readmeText.trim().length >= 40 ? 'README found.' : 'Add a README with setup, usage and screenshots.' },
    { key: 'language', label: 'Expected language detected', passed: languageMatch, weight: 15, detail: requiredLanguages.length ? `Expected ${requiredLanguages.join(' or ')}; found ${languageNames.join(', ') || 'none'}.` : 'No specific language required.' },
    { key: 'description', label: 'Repository description', passed: String(repo.description || '').trim().length >= 10, weight: 5, detail: repo.description || 'Add a short repository description.' },
    { key: 'recent', label: 'Recent activity (last 90 days)', passed: recentDays !== null && recentDays <= 90, weight: 10, detail: recentDays === null ? 'No push date available.' : `Last push ${recentDays} day(s) ago.` },
  ];
  const score = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  const requiredReadme = Number(project.requires_readme) !== 0;
  const hardPass = !repo.private && commits.length >= (Number(project.min_commits) || 1) && (!requiredReadme || readmeText.trim().length >= 40);
  const verified = hardPass && score >= 70;
  const failed = checks.filter((c) => !c.passed).map((c) => c.label);
  const feedback = verified
    ? `Verified ${score}/100. Your repository has a public commit history, a README and the expected project language.`
    : `Score ${score}/100. Fix these checks: ${failed.join(', ')}. Then re-verify.`;

  return {
    verified,
    score,
    error: null,
    checks,
    feedback,
    repo: {
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      private: !!repo.private,
      default_branch: repo.default_branch,
      stars: Number(repo.stargazers_count) || 0,
      forks: Number(repo.forks_count) || 0,
      size_kb: Number(repo.size) || 0,
      pushed_at: repo.pushed_at,
      created_at: repo.created_at,
    },
    languages,
    latest_commit: latest ? {
      sha: latest.sha,
      message: latest.commit?.message || '',
      author: latest.commit?.author?.name || latest.author?.login || '',
      date: latest.commit?.author?.date || null,
    } : null,
    readme_preview: readmeText.slice(0, 500),
  };
}

async function isEnrolled(env: Env, userId: string, courseId: string): Promise<boolean> {
  const { rows } = await getDb(env).query<any>(
    'SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2 LIMIT 1',
    [userId, courseId]
  );
  return rows.length > 0;
}

function parseJson(value: any, fallback: any) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(String(value)); } catch { return fallback; }
}

function mapProject(row: any) {
  return {
    ...row,
    requirements: parseJson(row.requirements, []),
    tools: parseJson(row.tools, []),
    steps: parseJson(row.steps, []),
    required_languages: parseJson(row.required_languages, []),
    submission: row.submission_id ? {
      id: row.submission_id,
      status: row.submission_status,
      source_url: row.source_url,
      demo_url: row.demo_url,
      notes: row.notes,
      repo_verified: !!row.repo_verified,
      verification: parseJson(row.verification, {}),
      verified_at: row.verified_at,
    } : null,
  };
}

// GET /api/v1/course-projects?courseId=...
courseProjects.get('/', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const courseId = c.req.query('courseId');
    const vals: any[] = [s.userId];
    let courseFilter = '';
    if (courseId) { vals.push(courseId); courseFilter = ` AND cp.course_id = $${vals.length}`; }
    const { rows } = await db.query<any>(
      `SELECT cp.*, p.id AS submission_id, p.status AS submission_status, p.source_url, p.demo_url,
              p.notes, p.repo_verified, p.verification, p.verified_at
       FROM course_projects cp
       LEFT JOIN projects p ON p.project_id = cp.id AND p.user_id = $1
       WHERE cp.course_id IN (SELECT course_id FROM enrollments WHERE user_id = $1)${courseFilter}
       ORDER BY cp.course_id, cp.order_index, cp.created_at`,
      vals
    );
    return c.json({ success: true, data: rows.map(mapProject) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load course projects');
  }
});

// GET /api/v1/course-projects/github/status
courseProjects.get('/github/status', async (c) => {
  try {
    await requireAuth(c);
    const rate = await githubJson(c.env, '/rate_limit');
    const core = rate.data?.resources?.core || null;
    return c.json({
      success: true,
      data: {
        reachable: rate.ok,
        authenticated: !!c.env.GITHUB_TOKEN,
        remaining: core?.remaining ?? null,
        limit: core?.limit ?? null,
        reset_at: core?.reset ? new Date(core.reset * 1000).toISOString() : null,
        message: rate.ok
          ? 'GitHub is reachable from CareerCode. Public repositories can be verified.'
          : rate.data?.message || 'GitHub is not reachable right now.',
        local_commands: [
          { command: 'git --version', purpose: 'Check that Git is installed.' },
          { command: 'gh --version', purpose: 'Check that the GitHub CLI is installed (optional).' },
          { command: 'gh auth status', purpose: 'Check which GitHub account is connected.' },
          { command: 'git remote -v', purpose: 'Check which repository your local project pushes to.' },
        ],
      },
    });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to check GitHub access');
  }
});

// GET /api/v1/course-projects/:id
courseProjects.get('/:id', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const { rows } = await db.query<any>(
      `SELECT cp.*, p.id AS submission_id, p.status AS submission_status, p.source_url, p.demo_url,
              p.notes, p.repo_verified, p.verification, p.verified_at
       FROM course_projects cp
       LEFT JOIN projects p ON p.project_id = cp.id AND p.user_id = $1
       WHERE cp.id = $2`,
      [s.userId, c.req.param('id')]
    );
    const project = rows[0];
    if (!project) return fail(c, 404, 'Project not found');
    if (!(await isEnrolled(c.env, s.userId, project.course_id))) return fail(c, 403, 'Enroll in this course to access the project');
    return c.json({ success: true, data: mapProject(project) });
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to load project');
  }
});

// POST /api/v1/course-projects/:id/submit
courseProjects.post('/:id/submit', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const project = (await db.query<any>('SELECT * FROM course_projects WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!project) return fail(c, 404, 'Project not found');
    if (!(await isEnrolled(c.env, s.userId, project.course_id))) return fail(c, 403, 'Enroll in this course to submit this project');

    const body: any = await c.req.json().catch(() => ({}));
    const sourceUrl = String(body.source_url || body.githubUrl || '').trim();
    const demoUrl = String(body.demo_url || body.liveUrl || '').trim();
    const notes = String(body.notes || body.description || '').slice(0, 4000);
    if (!sourceUrl) return fail(c, 400, 'A GitHub repository URL is required');
    if (!parseGithub(sourceUrl)) return fail(c, 400, 'Enter a valid public GitHub repository URL');

    const verification = await verifyRepository(c.env, project, sourceUrl);
    if (!verification.repo) {
      return c.json({ success: false, message: verification.error, data: verification }, 422 as any);
    }

    const status = verification.verified ? 'verified' : 'needs_work';
    const existing = (await db.query<any>(
      'SELECT id FROM projects WHERE user_id = $1 AND project_id = $2 LIMIT 1',
      [s.userId, project.id]
    )).rows[0];

    const values = [
      project.title,
      notes || `Submission for ${project.title}`,
      sourceUrl,
      demoUrl || null,
      project.course_id,
      status,
      verification.verified ? 1 : 0,
      JSON.stringify(verification),
      verification.verified ? new Date().toISOString() : null,
      verification.latest_commit?.date || null,
      s.userId,
      project.id,
    ];
    let submissionId: string;
    if (existing) {
      submissionId = existing.id;
      await db.query(
        `UPDATE projects SET title=$1, description=$2, source_url=$3, demo_url=$4, course_id=$5,
         status=$6, repo_verified=$7, verification=$8, verified_at=$9, last_commit_at=$10, updated_at=NOW()
         WHERE id=$11 AND user_id=$12`,
        [values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[7], values[8], values[9], submissionId, s.userId]
      );
    } else {
      submissionId = crypto.randomUUID();
      await db.query(
        `INSERT INTO projects (id,user_id,project_id,title,description,source_url,demo_url,course_id,status,
         repo_verified,verification,verified_at,last_commit_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [submissionId, s.userId, project.id, values[0], values[1], values[2], values[3], values[4], values[5], values[6], values[7], values[8], values[9]]
      );
    }

    return c.json({
      success: true,
      data: {
        id: submissionId,
        project_id: project.id,
        status,
        repo_verified: verification.verified,
        verification,
        source_url: sourceUrl,
        demo_url: demoUrl || null,
      },
    }, verification.verified ? 200 : 202 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to verify project');
  }
});

// POST /api/v1/course-projects/:id/verify — re-check an existing submission
courseProjects.post('/:id/verify', async (c) => {
  try {
    const s = await requireAuth(c);
    const db = getDb(c.env);
    const project = (await db.query<any>('SELECT * FROM course_projects WHERE id = $1', [c.req.param('id')])).rows[0];
    if (!project) return fail(c, 404, 'Project not found');
    if (!(await isEnrolled(c.env, s.userId, project.course_id))) return fail(c, 403, 'Enroll in this course to verify this project');
    const existing = (await db.query<any>(
      'SELECT * FROM projects WHERE user_id = $1 AND project_id = $2 LIMIT 1',
      [s.userId, project.id]
    )).rows[0];
    if (!existing?.source_url) return fail(c, 404, 'Submit a GitHub repository first');

    const verification = await verifyRepository(c.env, project, existing.source_url);
    if (!verification.repo) return c.json({ success: false, message: verification.error, data: verification }, 422 as any);
    const status = verification.verified ? 'verified' : 'needs_work';
    await db.query(
      `UPDATE projects SET status=$1, repo_verified=$2, verification=$3, verified_at=$4, last_commit_at=$5, updated_at=NOW()
       WHERE id=$6 AND user_id=$7`,
      [status, verification.verified ? 1 : 0, JSON.stringify(verification), verification.verified ? new Date().toISOString() : null, verification.latest_commit?.date || null, existing.id, s.userId]
    );
    return c.json({ success: true, data: { id: existing.id, status, repo_verified: verification.verified, verification } }, verification.verified ? 200 : 202 as any);
  } catch (e: any) {
    return fail(c, statusOf(e), e?.message || 'Failed to verify project');
  }
});

export default courseProjects;
