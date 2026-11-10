import type { Env } from './env';
import { getDb } from './db';

// Job-board ingestion. Runs in the background (waitUntil) when the board is
// stale — never on every request. Sources are public JSON APIs, so no scraping
// of HTML or bypassing anti-bot measures.

interface NormalizedJob {
  title: string;
  company: string;
  description: string;
  location: string | null;
  type: string;
  salary_range: string | null;
  application_url: string | null;
  logo_url: string | null;
  source: string;
  external_id: string;
}

const MAX_DESCRIPTION = 6000;
const STALE_HOURS = 6;

function clean(html: string): string {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_DESCRIPTION);
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'CareerCodeAcademy/1.0 (+https://careercode.com.ng)' },
    });
    if (!res.ok) throw new Error(`${url} -> ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function remoteOk(): Promise<NormalizedJob[]> {
  const data = await fetchJson('https://remoteok.com/api');
  return (Array.isArray(data) ? data : [])
    .filter((j: any) => j && j.id && j.position)
    .slice(0, 60)
    .map((j: any) => ({
      title: String(j.position),
      company: String(j.company || 'Unknown'),
      description: clean(j.description),
      location: j.location ? String(j.location) : 'Remote',
      type: 'full-time',
      salary_range: j.salary_min ? `$${j.salary_min} - $${j.salary_max || j.salary_min}` : null,
      application_url: j.url || (j.slug ? `https://remoteok.com/remote-jobs/${j.slug}` : null),
      logo_url: j.company_logo || j.logo || null,
      source: 'remoteok',
      external_id: String(j.id),
    }));
}

async function arbeitnow(): Promise<NormalizedJob[]> {
  const data = await fetchJson('https://www.arbeitnow.com/api/job-board-api');
  return (data?.data || []).slice(0, 60).map((j: any) => ({
    title: String(j.title),
    company: String(j.company_name || 'Unknown'),
    description: clean(j.description),
    location: j.remote ? 'Remote' : (j.location || null),
    type: Array.isArray(j.job_types) && j.job_types[0] ? String(j.job_types[0]) : 'full-time',
    salary_range: null,
    application_url: j.url || null,
    logo_url: null,
    source: 'arbeitnow',
    external_id: String(j.slug),
  }));
}

async function jobicy(): Promise<NormalizedJob[]> {
  const data = await fetchJson('https://jobicy.com/api/v2/remote-jobs?count=50');
  return (data?.jobs || []).slice(0, 50).map((j: any) => ({
    title: String(j.jobTitle),
    company: String(j.companyName || 'Unknown'),
    description: clean(j.jobDescription),
    location: j.jobGeo || 'Remote',
    type: j.jobType ? String(j.jobType) : 'full-time',
    salary_range: j.annualSalaryMin ? `$${j.annualSalaryMin} - $${j.annualSalaryMax || j.annualSalaryMin}` : null,
    application_url: j.url || null,
    logo_url: j.companyLogo || null,
    source: 'jobicy',
    external_id: String(j.id),
  }));
}

export async function ingestJobs(env: Env): Promise<{ inserted: number; sources: Record<string, number> }> {
  const db = getDb(env);
  const sources: Record<string, number> = {};
  let inserted = 0;

  for (const [name, fn] of [['remoteok', remoteOk], ['arbeitnow', arbeitnow], ['jobicy', jobicy]] as const) {
    try {
      const jobs = await fn();
      sources[name] = jobs.length;
      for (const job of jobs) {
        if (!job.title || !job.company) continue;
        const { rows } = await db.query<any>(
          `INSERT INTO jobs (title, company, description, location, type, salary_range, application_url, logo_url, is_active, source, external_id, ingested_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,1,$9,$10,NOW())
           ON CONFLICT (source, external_id) DO NOTHING
           RETURNING id`,
          [
            job.title, job.company, job.description, job.location, job.type,
            job.salary_range, job.application_url, job.logo_url, job.source, job.external_id,
          ]
        );
        if (rows.length) inserted++;
      }
    } catch (e: any) {
      console.log(JSON.stringify({ src: 'jobs-ingest', source: name, error: e?.message }));
    }
  }

  await db.query(
    `INSERT INTO system_settings (key, value, category) VALUES ('jobs_last_ingest', $1, 'jobs')
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [new Date().toISOString()]
  );

  return { inserted, sources };
}

/** True when the board should be refreshed in the background. */
export async function jobsAreStale(env: Env): Promise<boolean> {
  try {
    const { rows } = await getDb(env).query<any>(
      `SELECT value FROM system_settings WHERE key = 'jobs_last_ingest'`
    );
    const last = rows[0]?.value ? new Date(rows[0].value).getTime() : 0;
    return Date.now() - last > STALE_HOURS * 60 * 60 * 1000;
  } catch {
    return false;
  }
}
