import { NextRequest, NextResponse } from 'next/server';
import { odooQuery } from '@/lib/odoo';
import type { SaleOrder, SalesApiResponse, MonthlyData, PartnerRevenue } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from'); // YYYY-MM-DD
    const to   = searchParams.get('to');   // YYYY-MM-DD

    // Build date domain filters
    const dateDomain: unknown[] = [];
    if (from) dateDomain.push(['date_order', '>=', `${from} 00:00:00`]);
    if (to)   dateDomain.push(['date_order', '<=', `${to} 23:59:59`]);

    // Confirmed orders
    const confirmedDomain = [['state', 'in', ['sale', 'done']], ...dateDomain];
    // Draft/quotation orders
    const draftDomain = [['state', 'in', ['draft', 'sent']], ...dateDomain];

    const fields = [
      'name', 'partner_id', 'amount_total', 'amount_untaxed',
      'state', 'date_order', 'client_order_ref', 'invoice_status',
    ];

    // Fetch all confirmed + draft orders in parallel
    const [allConfirmed, allDraft] = await Promise.all([
      odooQuery<SaleOrder[]>('sale.order', 'search_read', [confirmedDomain], { fields, limit: 5000 }),
      odooQuery<SaleOrder[]>('sale.order', 'search_read', [draftDomain],     { fields: ['name', 'partner_id', 'amount_total', 'client_order_ref', 'date_order'], limit: 5000 }),
    ]);

    // B2C = has client_order_ref (Shopify order number via TRAX)
    // B2B = no client_order_ref (direct business customers)
    const b2cConfirmed = allConfirmed.filter(o => !!o.client_order_ref);
    const b2bConfirmed = allConfirmed.filter(o => !o.client_order_ref);
    const b2cDraft     = allDraft.filter(o => !!o.client_order_ref);
    const b2bDraft     = allDraft.filter(o => !o.client_order_ref);

    const sum = (orders: SaleOrder[]) => orders.reduce((a, o) => a + o.amount_total, 0);

    const b2cRevenue = sum(b2cConfirmed);
    const b2bRevenue = sum(b2bConfirmed);

    // ── Monthly breakdown ──────────────────────────────────────
    const monthlyMap = new Map<string, MonthlyData>();
    const getMonth = (dateStr: string) => dateStr.substring(0, 7); // YYYY-MM

    for (const o of b2cConfirmed) {
      const m = getMonth(o.date_order);
      const entry = monthlyMap.get(m) ?? { month: m, b2cOrders: 0, b2cRevenue: 0, b2bOrders: 0, b2bRevenue: 0 };
      entry.b2cOrders++;
      entry.b2cRevenue += o.amount_total;
      monthlyMap.set(m, entry);
    }
    for (const o of b2bConfirmed) {
      const m = getMonth(o.date_order);
      const entry = monthlyMap.get(m) ?? { month: m, b2cOrders: 0, b2cRevenue: 0, b2bOrders: 0, b2bRevenue: 0 };
      entry.b2bOrders++;
      entry.b2bRevenue += o.amount_total;
      monthlyMap.set(m, entry);
    }
    const monthly = Array.from(monthlyMap.values())
      .sort((a, b) => a.month.localeCompare(b.month));

    // ── Top channels/customers ─────────────────────────────────
    function topPartners(orders: SaleOrder[], totalRevenue: number, n = 10): PartnerRevenue[] {
      const map = new Map<string, { orders: number; revenue: number }>();
      for (const o of orders) {
        const name = o.partner_id ? o.partner_id[1] : 'Unknown';
        const entry = map.get(name) ?? { orders: 0, revenue: 0 };
        entry.orders++;
        entry.revenue += o.amount_total;
        map.set(name, entry);
      }
      return Array.from(map.entries())
        .map(([name, d]) => ({ name, orders: d.orders, revenue: d.revenue, share: totalRevenue ? d.revenue / totalRevenue * 100 : 0 }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, n);
    }

    const response: SalesApiResponse = {
      b2c: {
        orders: b2cConfirmed.length,
        revenue: b2cRevenue,
        avgOrder: b2cConfirmed.length ? b2cRevenue / b2cConfirmed.length : 0,
        drafts: b2cDraft.length,
      },
      b2b: {
        orders: b2bConfirmed.length,
        revenue: b2bRevenue,
        avgOrder: b2bConfirmed.length ? b2bRevenue / b2bConfirmed.length : 0,
        drafts: b2bDraft.length,
      },
      total: {
        orders: allConfirmed.length,
        revenue: b2cRevenue + b2bRevenue,
      },
      monthly,
      topB2cChannels: topPartners(b2cConfirmed, b2cRevenue),
      topB2bCustomers: topPartners(b2bConfirmed, b2bRevenue),
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/sales]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
