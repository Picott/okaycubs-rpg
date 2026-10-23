// Minimal Upstash Redis REST client — no SDK needed.
// Works with the Vercel Marketplace integration (KV_REST_API_*) or a direct Upstash DB (UPSTASH_REDIS_REST_*).
// The Vercel integration may add a custom prefix (e.g. STORAGE_KV_REST_API_URL), so match by suffix.
function findCredentials(): { url: string; token: string } | null {
  const direct = {
    url:   process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  };
  if (direct.url && direct.token) return { url: direct.url, token: direct.token };
  for (const [key, value] of Object.entries(process.env)) {
    const m = key.match(/^(.*)(KV_REST_API_URL|UPSTASH_REDIS_REST_URL|REDIS_REST_URL)$/);
    if (!m || !value) continue;
    const token = process.env[`${m[1]}${m[2].replace(/_URL$/, '_TOKEN')}`];
    if (token) return { url: value, token };
  }
  return null;
}
const creds = findCredentials();
const URL = creds?.url, TOKEN = creds?.token;

export const kvConfigured = !!creds;
// Names only (never values) — lets /api/game/config explain a misconfiguration
export const kvEnvHints = Object.keys(process.env).filter(k => /REDIS|KV_|UPSTASH/i.test(k)).sort();

async function cmd<T>(...args: (string | number)[]): Promise<T> {
  if (!URL || !TOKEN) throw new Error('KV not configured');
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    cache: 'no-store',
  });
  const json = await res.json() as { result?: T; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result as T;
}

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await cmd<string | null>('GET', key);
    return raw == null ? null : JSON.parse(raw) as T;
  },
  set(key: string, value: unknown, ttlSec?: number) {
    return ttlSec
      ? cmd<string>('SET', key, JSON.stringify(value), 'EX', ttlSec)
      : cmd<string>('SET', key, JSON.stringify(value));
  },
  // true if the key was created, false if it already existed
  async setNX(key: string, value: unknown, ttlSec: number): Promise<boolean> {
    return (await cmd<string | null>('SET', key, JSON.stringify(value), 'EX', ttlSec, 'NX')) === 'OK';
  },
  del(key: string) { return cmd<number>('DEL', key); },
};

// Short per-wallet lock so two overlapping requests cannot both read-modify-write a profile
export async function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const key = `lock:${name}`;
  if (!(await kv.setNX(key, 1, 8))) throw new Error('busy');
  try { return await fn(); } finally { await kv.del(key).catch(() => {}); }
}
