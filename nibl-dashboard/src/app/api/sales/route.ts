import { NextRequest, NextResponse } from 'next/server';
import { odooQuery } from '@/lib/odoo';
import type { SaleOrder, SalesApiResponse, MonthlyData, PartnerRevenue, CityRevenue } from '@/lib/types';

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

    // Helper to classify B2C vs B2B based on partner name and order reference
    function isB2C(order: SaleOrder): boolean {
      const partnerName = (order.partner_id ? order.partner_id[1] : '').toLowerCase();
      
      // Explicit B2C delivery partners (even if they have no client_order_ref)
      if (partnerName.includes('trax') || partnerName.includes('payfast') || partnerName.includes('pay fast') || partnerName.includes('postex') || partnerName.includes('shopify')) {
        return true;
      }
      
      // Explicit B2B partners (even if they DO have a client_order_ref like a PO number)
      if (partnerName.includes('pandamart') || partnerName.includes('pharma') || partnerName.includes('mart') || partnerName.includes('store') || partnerName.includes('supermarket') || partnerName.includes('esajee')) {
        return false;
      }

      // B2B field sales orders have client_order_ref starting with "ST Inv", "St Inv", "INV", "S INV" etc.
      // These are physical invoice numbers — NOT Shopify orders.
      const ref = (order.client_order_ref ?? '').trim().toLowerCase();
      if (ref.startsWith('st inv') || ref.startsWith('s inv') || ref.startsWith('inv') || ref.startsWith('st-inv')) {
        return false; // B2B field sale
      }

      // Default fallback: if there's a client_order_ref it's likely a Shopify order
      return !!order.client_order_ref;
    }

    const b2cConfirmed = allConfirmed.filter(isB2C);
    const b2bConfirmed = allConfirmed.filter(o => !isB2C(o));
    const b2cDraft     = allDraft.filter(isB2C);
    const b2bDraft     = allDraft.filter(o => !isB2C(o));

    const allB2cOrders = [...b2cConfirmed, ...b2cDraft];

    const sum = (orders: SaleOrder[]) => orders.reduce((a, o) => a + o.amount_total, 0);

    const b2cRevenue = sum(allB2cOrders);
    const b2bRevenue = sum(b2bConfirmed);

    // ── Monthly breakdown ──────────────────────────────────────
    const monthlyMap = new Map<string, MonthlyData>();
    const getMonth = (dateStr: string) => dateStr.substring(0, 7); // YYYY-MM

    for (const o of allB2cOrders) {
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
    function topPartners(orders: SaleOrder[], totalRevenue: number, n = 1000): PartnerRevenue[] {
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

    // ── City breakdown (B2B orders) ────────────────────────────
    // Step 1: collect unique partner IDs from B2B confirmed orders
    const b2bPartnerIds = [...new Set(b2bConfirmed.map(o => o.partner_id[0]))];

    // Step 2: fetch city from res.partner for those IDs
    interface OdooPartner { id: number; name: string; city: string | false; }
    const partnerRecords = b2bPartnerIds.length > 0
      ? await odooQuery<OdooPartner[]>(
          'res.partner', 'search_read',
          [[['id', 'in', b2bPartnerIds]]],
          { fields: ['id', 'name', 'city'], limit: 5000 }
        )
      : [];

    // Step 3: build a partnerId → city lookup map
    // If city is blank in Odoo, try to extract an area code from the partner name
    // e.g. "Bakeman G-10" → "G-10", "D.Watson Haidri Saidpur" → "Saidpur"
    function inferCity(name: string, odooCity: string | false): string {
      if (odooCity && odooCity.trim()) return odooCity.trim();
      // Try to match area codes like G-10, F-7, I-8, DHA, etc.
      const areaMatch = name.match(/\b([A-Z]-?\d+(?:\/\d+)?|DHA|PWD|Bahria|Gulberg|Johar|Clifton|Defence|Gulshan|Nazimabad|PECHS|North Karachi|Saddar|Korangi|Malir|Orangi|Liaquatabad|Site|Landhi|F\d|G\d|H\d|I\d|E\d|D\d)\b/i);
      if (areaMatch) return areaMatch[1].toUpperCase();
      // Last word as fallback (often the area/city)
      const words = name.trim().split(/\s+/);
      return words[words.length - 1] || 'Other';
    }

    const partnerCityMap = new Map<number, string>();
    for (const p of partnerRecords) {
      partnerCityMap.set(p.id, inferCity(p.name, p.city));
    }

    // Step 4: aggregate revenue + orders per city (B2B confirmed only)
    const cityMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of b2bConfirmed) {
      const city = partnerCityMap.get(o.partner_id[0]) ?? 'Other';
      const entry = cityMap.get(city) ?? { orders: 0, revenue: 0 };
      entry.orders++;
      entry.revenue += o.amount_total;
      cityMap.set(city, entry);
    }

    const cityBreakdown: CityRevenue[] = Array.from(cityMap.entries())
      .map(([city, d]) => ({
        city,
        orders: d.orders,
        revenue: d.revenue,
        share: b2bRevenue ? (d.revenue / b2bRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const response: SalesApiResponse = {
      b2c: {
        orders: allB2cOrders.length,
        revenue: b2cRevenue,
        avgOrder: allB2cOrders.length ? b2cRevenue / allB2cOrders.length : 0,
        drafts: b2cDraft.length,
      },
      b2b: {
        orders: b2bConfirmed.length,
        revenue: b2bRevenue,
        avgOrder: b2bConfirmed.length ? b2bRevenue / b2bConfirmed.length : 0,
        drafts: b2bDraft.length,
      },
      total: {
        orders: allB2cOrders.length + b2bConfirmed.length,
        revenue: b2cRevenue + b2bRevenue,
      },
      monthly,
      topB2cChannels: topPartners(allB2cOrders, b2cRevenue),
      topB2bCustomers: topPartners(b2bConfirmed, b2bRevenue),
      cityBreakdown,
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
