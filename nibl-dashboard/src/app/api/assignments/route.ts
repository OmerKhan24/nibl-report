import { NextRequest, NextResponse } from 'next/server';
import { hashGetAll, hashSet, hashDel, storageMode } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const KEY = 'nibl:receivable-assignments:v2';
// partner id -> assigned person, one hash field per customer

async function reply(map: Record<string, string>) {
  return NextResponse.json(map, { headers: { 'Cache-Control': 'no-store', 'x-storage': await storageMode() } });
}

export async function GET() {
  return reply(await hashGetAll(KEY));
}

// Single: { id, name }   Bulk (one-time import from a browser): { map: { id: name } }
export async function PUT(req: NextRequest) {
  const body = await req.json() as { id?: number | string; name?: string; map?: Record<string, string> };
  if (body.map) {
    const fields: Record<string, string> = {};
    for (const [id, name] of Object.entries(body.map)) {
      const clean = String(name || '').trim().slice(0, 80);
      if (clean) fields[String(id)] = clean;
    }
    await hashSet(KEY, fields);
  } else if (body.id !== undefined) {
    const clean = (body.name || '').trim().slice(0, 80);
    if (clean) await hashSet(KEY, { [String(body.id)]: clean });
    else await hashDel(KEY, String(body.id));
  }
  return reply(await hashGetAll(KEY));
}
