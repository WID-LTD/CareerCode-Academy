import type { Env } from './env';

// ── Cloudflare Realtime (Calls SFU) adapter ─────────────────────────────
// ALL provider REST calls live here so path/shape changes touch one file.
// Verified 2026-09-29: namespaces `calls/apps` + `calls/turn_keys` exist
// (API token needs Calls:Read/Edit or calls return code 10000).
// VERIFY-BEFORE-LIVE (docs/REALTIME-VERIFY.md): exact session create/token
// shapes against developers.cloudflare.com/realtime once token perms land.

const API = 'https://api.cloudflare.com/client/v4';

export interface RealtimeSession {
  providerSessionId: string;
  whipUrl?: string;
  whepUrl?: string;
  token?: string;
  raw?: any;
}

async function cf(env: Env, path: string, init?: RequestInit): Promise<any> {
  const token = (env as any).CLOUDFLARE_API_TOKEN as string | undefined;
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN is not configured');
  const account = (env as any).CLOUDFLARE_ACCOUNT_ID as string | undefined;
  if (!account) throw new Error('CLOUDFLARE_ACCOUNT_ID is not configured');
  const resp = await fetch(`${API}/accounts/${account}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const data: any = await resp.json().catch(() => ({}));
  if (!data.success) {
    const first = data.errors?.[0];
    const err: any = new Error(first?.message || `Realtime API error: ${resp.status}`);
    err.code = first?.code;
    err.status = resp.status;
    throw err;
  }
  return data.result;
}

function pickSession(payload: any): RealtimeSession {
  // Tolerant extraction across Sessions API shapes; throws with the raw
  // payload attached when nothing matches (caught by verify script).
  const s = payload?.session ?? payload;
  const id = s?.id ?? s?.sessionId ?? s?.uid ?? payload?.id;
  if (!id) {
    const err: any = new Error('Unrecognized session shape from Realtime API');
    err.raw = payload;
    throw err;
  }
  return {
    providerSessionId: String(id),
    whipUrl: s?.whipUrl ?? s?.whip_url ?? payload?.whipUrl,
    whepUrl: s?.whepUrl ?? s?.whep_url ?? payload?.whepUrl,
    token: s?.token ?? payload?.token,
    raw: payload,
  };
}

export async function createRealtimeSession(env: Env, title: string): Promise<RealtimeSession> {
  // New Sessions API; falls back to legacy app-scoped session if needed.
  try {
    const payload = await cf(env, '/realtime/sessions', {
      method: 'POST',
      body: JSON.stringify({ sessionDescription: title }),
    });
    return pickSession(payload);
  } catch (e: any) {
    if (e?.code === 7003 || /no route/i.test(e?.message || '')) {
      const payload = await cf(env, '/calls/sfu/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionDescription: title }),
      });
      return pickSession(payload);
    }
    throw e;
  }
}

export async function closeRealtimeSession(env: Env, providerSessionId: string): Promise<void> {
  for (const path of [
    `/realtime/sessions/${encodeURIComponent(providerSessionId)}`,
    `/calls/sfu/sessions/${encodeURIComponent(providerSessionId)}`,
  ]) {
    try {
      await cf(env, path, { method: 'DELETE' });
      return;
    } catch (e: any) {
      if (/no route/i.test(e?.message || '')) continue;
      throw e;
    }
  }
}

export async function mintParticipantToken(
  env: Env,
  providerSessionId: string,
  userId: string,
  role: 'host' | 'cohost' | 'student'
): Promise<{ token: string; whipUrl?: string; whepUrl?: string }> {
  // Participant-scoped credential for WHIP publish / WHEP subscribe.
  for (const path of [
    `/realtime/sessions/${encodeURIComponent(providerSessionId)}/participants`,
    `/calls/sfu/sessions/${encodeURIComponent(providerSessionId)}/participants`,
  ]) {
    try {
      const payload: any = await cf(env, path, {
        method: 'POST',
        body: JSON.stringify({ userId, role }),
      });
      const p = payload?.participant ?? payload;
      const token = p?.token ?? payload?.token;
      if (!token) {
        const err: any = new Error('Participant token missing in Realtime response');
        err.raw = payload;
        throw err;
      }
      return {
        token: String(token),
        whipUrl: p?.whipUrl ?? payload?.whipUrl,
        whepUrl: p?.whepUrl ?? payload?.whepUrl,
      };
    } catch (e: any) {
      if (/no route/i.test(e?.message || '')) continue;
      throw e;
    }
  }
  throw new Error('No participant endpoint matched');
}

// ── TURN (verified live 2026-09-30): key created once via API, per-join
// credentials minted here. iceServers drop straight into RTCPeerConnection.
export interface IceServers {
  urls: string[];
  username: string;
  credential: string;
}

export async function issueTurnCredentials(env: Env, ttlSeconds = 86400): Promise<IceServers | null> {
  const keyId = (env as any).TURN_KEY_ID as string | undefined;
  const keySecret = (env as any).TURN_KEY_SECRET as string | undefined;
  if (!keyId || !keySecret) return null;
  try {
    const resp = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${keyId}/credentials/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${keySecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: Math.min(Math.max(ttlSeconds, 300), 86400) }),
    });
    const data: any = await resp.json().catch(() => ({}));
    const ice = data?.iceServers;
    if (!ice?.urls?.length || !ice?.username || !ice?.credential) return null;
    return { urls: ice.urls, username: ice.username, credential: ice.credential };
  } catch {
    return null;
  }
}

// Probe used by `npm run verify:realtime` (docs/REALTIME-VERIFY.md).
export async function probeRealtime(env: Env): Promise<Array<{ check: string; ok: boolean; detail: string }>> {
  const out: Array<{ check: string; ok: boolean; detail: string }> = [];
  const push = async (check: string, fn: () => Promise<any>) => {
    try {
      const r = await fn();
      out.push({ check, ok: true, detail: typeof r === 'string' ? r : 'ok' });
    } catch (e: any) {
      out.push({ check, ok: false, detail: `${e?.code || ''} ${e?.message || e}`.trim() });
    }
  };
  await push('token-auth', async () => {
    const token = (env as any).CLOUDFLARE_API_TOKEN as string | undefined;
    if (!token) throw new Error('CLOUDFLARE_API_TOKEN missing');
    const r = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d: any = await r.json().catch(() => ({}));
    if (!d.success) throw new Error(d.errors?.[0]?.message || `status ${r.status}`);
    return `authenticated (${(d.result?.status || 'active')})`;
  });
  await push('sfu-namespace', () => cf(env, '/calls/apps', { method: 'GET' }).then(() => 'reachable'));
  await push('session-create', () =>
    createRealtimeSession(env, 'verify-probe').then(async (s) => {
      await closeRealtimeSession(env, s.providerSessionId).catch(() => {});
      return `session ${s.providerSessionId.slice(0, 8)}… created+closed`;
    })
  );
  return out;
}
