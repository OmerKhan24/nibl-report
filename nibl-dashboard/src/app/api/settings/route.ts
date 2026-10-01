import { NextRequest, NextResponse } from 'next/server';
import { storageGet, storageSet } from '@/lib/storage';
import type { DashboardSettings, UsageTotals } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = (await storageGet<DashboardSettings>('nibl:settings')) ?? {};
  const usage = (await storageGet<UsageTotals>('nibl:usage:totals')) ?? {
    totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, sessionCount: 0,
  };
  return NextResponse.json({ settings, usage });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Partial<DashboardSettings>;
  const existing = (await storageGet<DashboardSettings>('nibl:settings')) ?? {};
  const updated = { ...existing, ...body };
  await storageSet('nibl:settings', updated);
  return NextResponse.json(updated);
}
