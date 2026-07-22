import { NextRequest, NextResponse } from 'next/server';
import { odooQuery } from '@/lib/odoo';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';
import type { InventoryItem, InventoryApiResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Always use previous month
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const fromStr = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
    const toStr = format(endOfMonth(lastMonth), 'yyyy-MM-dd');

    // 1. Fetch sales grouped by product
    const domain = [
      ['state', 'in', ['sale', 'done']],
      ['date', '>=', `${fromStr} 00:00:00`],
      ['date', '<=', `${toStr} 23:59:59`]
    ];

    const reports = await odooQuery<any[]>('sale.report', 'search_read', [domain], {
      fields: ['product_id', 'product_uom_qty'],
      limit: 5000
    });

    const salesMap = new Map<number, { name: string, qtySold: number }>();
    
    for (const r of reports) {
      if (!r.product_id) continue;
      const pid = r.product_id[0];
      const pname = r.product_id[1];
      const qty = r.product_uom_qty || 0;
      
      const existing = salesMap.get(pid);
      if (existing) {
        existing.qtySold += qty;
      } else {
        salesMap.set(pid, { name: pname, qtySold: qty });
      }
    }

    if (salesMap.size === 0) {
      return NextResponse.json({ items: [], prevMonthStart: fromStr, prevMonthEnd: toStr } as InventoryApiResponse);
    }

    // 2. Fetch product inventory
    const pids = Array.from(salesMap.keys());
    const products = await odooQuery<any[]>('product.product', 'search_read', [[['id', 'in', pids]]], {
      fields: ['name', 'qty_available', 'type'],
      limit: 5000
    });

    const items: InventoryItem[] = [];

    for (const p of products) {
      // Exclude services (like Discount, Shipping, Standard delivery)
      if (p.type === 'service') continue;

      const pid = p.id;
      const sold = salesMap.get(pid)?.qtySold || 0;
      
      items.push({
        id: pid,
        name: p.name,
        soldLastMonth: sold,
        currentStock: p.qty_available || 0
      });
    }

    // Sort by most sold
    items.sort((a, b) => b.soldLastMonth - a.soldLastMonth);

    return NextResponse.json({
      items,
      prevMonthStart: fromStr,
      prevMonthEnd: toStr
    } as InventoryApiResponse, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('Inventory API error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
