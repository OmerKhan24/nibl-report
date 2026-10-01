import { NextRequest, NextResponse } from 'next/server';
import { generateExcel, type ExcelColumn } from '@/lib/excel';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { title, rows, columns } = await req.json() as {
    title: string;
    rows: Record<string, unknown>[];
    columns: ExcelColumn[];
  };

  const buffer = await generateExcel(title, rows, columns);
  const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
