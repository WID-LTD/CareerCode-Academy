import type { Env } from './env';

// Cloudflare Pages custom domains are used for external portfolio domains.
// They are simpler than SSL-for-SaaS custom hostnames and support a CNAME to
// the Pages project with automatic certificate provisioning.

function config(env: Env) {
  return {
    token: env.CF_API_TOKEN || '',
    account: env.CF_ACCOUNT_ID || '',
    project: env.CF_PAGES_PROJECT || 'career-code-academy',
  };
}

async function cfFetch(env: Env, path: string, init: RequestInit = {}): Promise<any> {
  const { token, account } = config(env);
  if (!token || !account) throw Object.assign(new Error('Cloudflare API is not configured'), { statusCode: 503 });
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const json: any = await res.json().catch(() => ({}));
  return json;
}

export async function attachPagesDomain(env: Env, domain: string): Promise<{ ok: boolean; status: string; id?: string; error?: string }> {
  const { project } = config(env);
  try {
    const create = await cfFetch(env, `/pages/projects/${project}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    });
    if (create.success) {
      return { ok: true, status: create.result?.status || 'initializing', id: create.result?.id };
    }
    // Already attached: fetch its status instead.
    const existing = await cfFetch(env, `/pages/projects/${project}/domains/${encodeURIComponent(domain)}`);
    if (existing.success) {
      return { ok: true, status: existing.result?.status || 'initializing', id: existing.result?.id };
    }
    return { ok: false, status: 'error', error: create.errors?.[0]?.message || existing.errors?.[0]?.message || 'Could not attach domain' };
  } catch (e: any) {
    return { ok: false, status: 'error', error: e?.message || 'Could not attach domain' };
  }
}

export async function pagesDomainStatus(env: Env, domain: string): Promise<{ ok: boolean; status: string; id?: string; error?: string }> {
  const { project } = config(env);
  try {
    const res = await cfFetch(env, `/pages/projects/${project}/domains/${encodeURIComponent(domain)}`);
    if (!res.success) return { ok: false, status: 'error', error: res.errors?.[0]?.message || 'Domain not found' };
    return { ok: true, status: res.result?.status || 'pending', id: res.result?.id };
  } catch (e: any) {
    return { ok: false, status: 'error', error: e?.message || 'Status check failed' };
  }
}

export async function detachPagesDomain(env: Env, domain: string): Promise<boolean> {
  const { project } = config(env);
  try {
    const res = await cfFetch(env, `/pages/projects/${project}/domains/${encodeURIComponent(domain)}`, { method: 'DELETE' });
    return !!res.success;
  } catch {
    return false;
  }
}
