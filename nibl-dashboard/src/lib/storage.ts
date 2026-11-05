/**
 * Storage layer — uses Vercel KV / Upstash Redis when its REST env vars are set
 * (under any of the common prefixes), otherwise falls back to an in-process Map
 * (local dev; resets on server restart and is NOT shared between serverless instances).
 */

type KvClient = ReturnType<typeof import('@vercel/kv').createClient>;

let kv: KvClient | null = null;

function kvCreds() {
  const e = process.env;
  const url = e.KV_REST_API_URL || e.STORAGE_KV_REST_API_URL || e.STORAGE_REST_API_URL || e.UPSTASH_REDIS_REST_URL;
  const token = e.KV_REST_API_TOKEN || e.STORAGE_KV_REST_API_TOKEN || e.STORAGE_REST_API_TOKEN || e.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function getKv() {
  if (kv) return kv;
  const creds = kvCreds();
  if (!creds) return null;
  const mod = await import('@vercel/kv');
  kv = mod.createClient(creds);
  return kv;
}

export async function storageMode(): Promise<'kv' | 'memory'> {
  return (await getKv()) ? 'kv' : 'memory';
}

// In-memory fallback
const mem = new Map<string, unknown>();

export async function storageGet<T>(key: string): Promise<T | null> {
  const client = await getKv();
  if (client) return client.get<T>(key);
  return (mem.get(key) as T) ?? null;
}

export async function storageSet(key: string, value: unknown): Promise<void> {
  const client = await getKv();
  if (client) { await client.set(key, value); return; }
  mem.set(key, value);
}

export async function storageDel(key: string): Promise<void> {
  const client = await getKv();
  if (client) { await client.del(key); return; }
  mem.delete(key);
}

// Hash helpers: one field per entry, so concurrent writers never overwrite each other.
export async function hashGetAll(key: string): Promise<Record<string, string>> {
  const client = await getKv();
  if (client) return (await client.hgetall<Record<string, string>>(key)) ?? {};
  return { ...((mem.get(key) as Record<string, string>) ?? {}) };
}

export async function hashSet(key: string, fields: Record<string, string>): Promise<void> {
  if (!Object.keys(fields).length) return;
  const client = await getKv();
  if (client) { await client.hset(key, fields); return; }
  mem.set(key, { ...((mem.get(key) as Record<string, string>) ?? {}), ...fields });
}

export async function hashDel(key: string, field: string): Promise<void> {
  const client = await getKv();
  if (client) { await client.hdel(key, field); return; }
  const cur = { ...((mem.get(key) as Record<string, string>) ?? {}) };
  delete cur[field];
  mem.set(key, cur);
}
