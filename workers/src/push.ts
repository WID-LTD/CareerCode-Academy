import type { Env } from './env';
import { getDb } from './db';

// Web Push (RFC 8291 / aes128gcm) with VAPID (RFC 8292), implemented on Web
// Crypto so it runs inside Workers without Node APIs.

function b64uEncode(bytes: Uint8Array | ArrayBuffer): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64uDecode(value: string): Uint8Array {
  const s = value.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBufferLike> {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array<ArrayBufferLike>> {
  const cryptoKey = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data));
}

async function hkdf(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array<ArrayBufferLike>> {
  const prk = await hmac(salt, ikm);
  let previous: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
  const blocks: Uint8Array<ArrayBufferLike>[] = [];
  let produced = 0;
  let counter = 1;
  while (produced < length) {
    previous = await hmac(prk, concat(previous, info, new Uint8Array([counter++])));
    blocks.push(previous);
    produced += previous.length;
  }
  return concat(...blocks).slice(0, length);
}

function publicKeyFromEnv(env: Env): string {
  return env.VAPID_PUBLIC_KEY || '';
}

async function vapidHeaders(env: Env, endpoint: string): Promise<Record<string, string>> {
  const publicKey = publicKeyFromEnv(env);
  const privateD = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateD) throw new Error('VAPID keys are not configured');

  const raw = b64uDecode(publicKey);
  const x = b64uEncode(raw.slice(1, 33));
  const y = b64uEncode(raw.slice(33, 65));

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d: privateD, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const header = b64uEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = b64uEncode(new TextEncoder().encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT || 'mailto:contact@careercode.com.ng',
  })));
  const unsigned = new TextEncoder().encode(`${header}.${payload}`);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, unsigned);
  const jwt = `${header}.${payload}.${b64uEncode(signature)}`;

  return {
    Authorization: `vapid t=${jwt}, k=${publicKey}`,
    TTL: '86400',
  };
}

interface Subscription {
  id?: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function encryptPayload(sub: Subscription, payload: Uint8Array): Promise<Uint8Array<ArrayBufferLike>> {
  const uaPublic = b64uDecode(sub.p256dh);
  const authSecret = b64uDecode(sub.auth);

  const uaKey = await (crypto.subtle.importKey as any)(
    'jwk',
    {
      kty: 'EC', crv: 'P-256', ext: true,
      x: b64uEncode(uaPublic.slice(1, 33)),
      y: b64uEncode(uaPublic.slice(33, 65)),
    },
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  ) as CryptoKey;

  const eph = await (crypto.subtle.generateKey as any)({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPublic = new Uint8Array(await (crypto.subtle.exportKey as any)('raw', eph.publicKey));
  const ecdh = new Uint8Array(await (crypto.subtle.deriveBits as any)({ name: 'ECDH', public: uaKey }, eph.privateKey, 256));

  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const info = concat(new TextEncoder().encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(ecdh, authSecret, info, 32);
  const cek = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(ikm, salt, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const plaintext = concat(payload, new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext));

  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, 4096);
  return concat(salt, recordSize, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

export async function sendPush(env: Env, sub: Subscription, data: { title: string; body?: string; url?: string }): Promise<boolean> {
  try {
    const payload = new TextEncoder().encode(JSON.stringify(data));
    const body = await encryptPayload(sub, payload);
    const headers = await vapidHeaders(env, sub.endpoint);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
      },
      body,
    });
    if (res.status === 404 || res.status === 410) {
      if (sub.id) await getDb(env).query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]).catch(() => {});
      return false;
    }
    if (!res.ok) {
      console.log(JSON.stringify({ src: 'push', status: res.status, endpoint: sub.endpoint.slice(0, 60) }));
      return false;
    }
    return true;
  } catch (e: any) {
    console.log(JSON.stringify({ src: 'push', error: e?.message }));
    return false;
  }
}

export async function sendPushToUser(env: Env, userId: string, data: { title: string; body?: string; url?: string }): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  try {
    const { rows } = await getDb(env).query<any>(
      'SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    await Promise.all(rows.map((row) => sendPush(env, row, data)));
  } catch { /* best effort */ }
}
