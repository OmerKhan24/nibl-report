import { NextRequest, NextResponse } from 'next/server';
import { storageGet, storageSet } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const KEY = 'nibl:receivable-assignments';
type Assignments = Record<string, string>; // partner id -> assigned person

export async function GET() {
  const map = (await storageGet<Assignments>(KEY)) ?? {};
  return NextResponse.json(map, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  const { id, name } = await req.json() as { id: number | string; name: string };
  const map = (await storageGet<Assignments>(KEY)) ?? {};
  const clean = (name || '').trim().slice(0, 80);
  if (clean) map[String(id)] = clean;
  else delete map[String(id)];
  await storageSet(KEY, map);
  return NextResponse.json(map);
}
