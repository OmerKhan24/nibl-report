import { NextRequest, NextResponse } from 'next/server';
import { storageGet, storageSet } from '@/lib/storage';
import { nanoid } from 'nanoid';
import type { SavedReport } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ids = (await storageGet<string[]>('nibl:reports:index')) ?? [];
  const reports: SavedReport[] = [];
  for (const id of ids) {
    const r = await storageGet<SavedReport>(`nibl:report:${id}`);
    if (r) reports.push(r);
  }
  reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json(reports);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<SavedReport, 'id' | 'createdAt'>;
  const id = nanoid(10);
  const report: SavedReport = { ...body, id, createdAt: new Date().toISOString() };

  await storageSet(`nibl:report:${id}`, report);
  const ids = (await storageGet<string[]>('nibl:reports:index')) ?? [];
  await storageSet('nibl:reports:index', [id, ...ids]);

  return NextResponse.json(report, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json() as { id: string };
  await storageSet(`nibl:report:${id}`, null);
  const ids = (await storageGet<string[]>('nibl:reports:index')) ?? [];
  await storageSet('nibl:reports:index', ids.filter(x => x !== id));
  return NextResponse.json({ ok: true });
}
