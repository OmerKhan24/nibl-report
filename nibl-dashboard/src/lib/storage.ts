/**
 * Storage layer — uses Vercel KV when KV_REST_API_URL is set, otherwise falls
 * back to an in-process Map (local dev; resets on server restart).
 */

let kv: typeof import('@vercel/kv').kv | null = null;

async function getKv() {
  if (kv) return kv;
  if (process.env.KV_REST_API_URL) {
    const mod = await import('@vercel/kv');
    kv = mod.kv;
    return kv;
  }
  return null;
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
