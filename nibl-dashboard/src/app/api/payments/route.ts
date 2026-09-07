import { NextRequest, NextResponse } from 'next/server';
import { odooQuery } from '@/lib/odoo';
import type { CashSource } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CashEntry {
  amount: number;
  partner_id: [number, string] | false;
  journal_id: [number, string] | false;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // ── Source 1: Registered payments (PBNK / PCSH entries via payment wizard) ──────
    const payDomain: unknown[] = [
      ['payment_type', '=', 'inbound'],
      ['state', 'in', ['posted', 'paid', 'reconciled']],
      ['company_id', '=', 1],
    ];
    if (from) payDomain.push(['date', '>=', from]);
    if (to) payDomain.push(['date', '<=', to]);

    const payments = await odooQuery<{ amount: number; partner_id: [number, string] | false; journal_id: [number, string] | false }[]>(
      'account.payment', 'search_read',
      [payDomain],
      { fields: ['amount', 'partner_id', 'journal_id'], limit: 5000 }
    );

    // ── Source 2: MISC journal entries (ISB Daily Sales, KHI Daily Sales, manual cash) ──
    // Captures credit entries on Receivable account that are NOT linked to account.payment.
    // payment_id = false prevents double-counting entries already in source 1.
    const miscDomain: unknown[] = [
      ['account_id.code', '=', '1121001'], // 1121001 Receivable from Customers
      ['credit', '>', 0],
      ['parent_state', '=', 'posted'],
      ['company_id', '=', 1],
      ['payment_id', '=', false],
    ];
    if (from) miscDomain.push(['date', '>=', from]);
    if (to) miscDomain.push(['date', '<=', to]);

    let miscEntries: CashEntry[] = [];
    try {
      const miscLines = await odooQuery<{ id: number; credit: number; partner_id: [number, string] | false; journal_id: [number, string] | false; move_id: [number, string] }[]>(
        'account.move.line', 'search_read',
        [miscDomain],
        { fields: ['credit', 'partner_id', 'journal_id', 'move_id'], limit: 5000 }
      );

      if (miscLines.length > 0) {
        // Exclude reversal moves and moves that have been reversed to avoid counting cancelled payments.
        // A reversal move has reversed_entry_id set (pointing to the original it reverses).
        const moveIds = [...new Set(miscLines.map(l => l.move_id[0]))];
        const moves = await odooQuery<{ id: number; reversed_entry_id: [number, string] | false }[]>(
          'account.move', 'search_read',
          [[['id', 'in', moveIds]]],
          { fields: ['id', 'reversed_entry_id'], limit: moveIds.length + 100 }
        );

        // reversed_entry_id is set on the REVERSAL move, not the original.
        // Since reversal moves have debit entries they won't appear in miscLines,
        // so we must search the OTHER direction: find moves whose reversed_entry_id
        // points at one of our move IDs, then exclude both.
        const excludeIds = new Set<number>();
        for (const m of moves) {
          if (m.reversed_entry_id) {
            // m itself is a reversal (shouldn't be in miscLines but exclude to be safe)
            excludeIds.add(m.id);
            excludeIds.add(m.reversed_entry_id[0]);
          }
        }
        // Also find any move (not in our list) that reverses one of our moves
        const reversalsOfOurs = await odooQuery<{ id: number; reversed_entry_id: [number, string] }[]>(
          'account.move', 'search_read',
          [[['reversed_entry_id', 'in', moveIds]]],
          { fields: ['id', 'reversed_entry_id'], limit: 1000 }
        );
        for (const r of reversalsOfOurs) {
          excludeIds.add(r.reversed_entry_id[0]); // the original that was reversed
        }

        // Filter 2: only keep moves that have a debit on a cash/bank account.
        // This separates genuine cash receipts (Dr Cash / Cr Receivable) from
        // non-cash credits like sales returns or discounts (Dr Sales / Cr Receivable).
        const cashDebitLines = await odooQuery<{ move_id: [number, string] }[]>(
          'account.move.line', 'search_read',
          [[
            ['move_id', 'in', moveIds],
            ['debit', '>', 0],
            ['account_id.account_type', 'in', ['asset_cash', 'liquidity']], // bank & cash (Odoo 16 / 14-15)
          ]],
          { fields: ['move_id'], limit: 5000 }
        );
        const movesWithCashDebit = new Set(cashDebitLines.map(l => l.move_id[0]));

        miscEntries = miscLines
          .filter(l => !excludeIds.has(l.move_id[0]) && movesWithCashDebit.has(l.move_id[0]))
          .map(l => ({ amount: l.credit, partner_id: l.partner_id, journal_id: l.journal_id }));
      }
    } catch (e) {
      console.warn('[payments] MISC query failed, falling back to account.payment only:', e);
    }

    // ── Combine both sources ──────────────────────────────────────────────────────────
    const allEntries: CashEntry[] = [
      ...payments.map(p => ({ amount: p.amount, partner_id: p.partner_id, journal_id: p.journal_id })),
      ...miscEntries,
    ];

    // ── Partner lookup: city and channel ─────────────────────────────────────────────
    const partnerIds = [...new Set(allEntries.filter(e => e.partner_id).map(e => (e.partner_id as [number, string])[0]))];
    interface OdooPartner { id: number; city: string | false; x_studio_channel?: [number, string] | false }
    const partnerRecords = partnerIds.length > 0
      ? await odooQuery<OdooPartner[]>('res.partner', 'search_read',
          [[['id', 'in', partnerIds]]],
          { fields: ['id', 'city', 'x_studio_channel'], limit: 5000 }
        )
      : [];

    const partnerCityMap = new Map<number, string | false>();
    const partnerChannelMap = new Map<number, string>();
    for (const p of partnerRecords) {
      partnerCityMap.set(p.id, p.city);
      if (p.x_studio_channel && Array.isArray(p.x_studio_channel)) {
        partnerChannelMap.set(p.id, p.x_studio_channel[1]);
      }
    }

    function isB2C(e: CashEntry): boolean {
      const name = (e.partner_id ? e.partner_id[1] : '').toLowerCase();
      return name.includes('trax') || name.includes('payfast') || name.includes('pay fast') || name.includes('postex') || name.includes('shopify');
    }

    function getCityCategory(e: CashEntry): string {
      const partnerName = e.partner_id ? e.partner_id[1] : '';
      const partnerId = e.partner_id ? (e.partner_id as [number, string])[0] : 0;
      const odooCity = (partnerCityMap.get(partnerId) || '') as string;

      const cityUpper = odooCity.toUpperCase();
      if (cityUpper.includes('KARACHI') || cityUpper.includes('KHI')) return 'Karachi';
      if (cityUpper.includes('ISLAMABAD') || cityUpper.includes('ISB')) return 'Islamabad';
      if (cityUpper.includes('LAHORE') || cityUpper.includes('LHE')) return 'Lahore';

      const combined = `${partnerName} ${odooCity}`.toUpperCase();
      if (combined.includes('ISB') || combined.includes('ISLAMABAD') || combined.includes('ISL') || combined.includes('G-10') || combined.includes('F-7') || combined.includes('BLUE AREA') || combined.includes('JINNAH SUPER') || combined.includes('F-11') || combined.includes('G-9') || combined.includes('G-15')) return 'Islamabad';
      if (combined.includes('LHE') || combined.includes('LAHORE') || combined.includes('GULBERG') || combined.includes('JOHAR TOWN') || combined.includes('MODEL TOWN') || combined.includes('DEFENCE LHE')) return 'Lahore';
      if (combined.includes('KHI') || combined.includes('KARACHI') || combined.includes('DHA') || combined.includes('CLIFTON') || combined.includes('GULSHAN') || combined.includes('TARIQ ROAD') || combined.includes('BAHADURABAD')) return 'Karachi';
      return 'Other';
    }

    // ── Accumulate by category ────────────────────────────────────────────────────────
    let b2cTotal = 0, b2cCount = 0;
    let faysalKhi = 0, faysalKhiCount = 0;
    let faysalIsb = 0, faysalIsbCount = 0;
    let faysalLhe = 0, faysalLheCount = 0;
    let faysalOther = 0, faysalOtherCount = 0;
    let dubaiKhi = 0, dubaiKhiCount = 0;
    let dubaiIsb = 0, dubaiIsbCount = 0;
    let dubaiLhe = 0, dubaiLheCount = 0;
    let dubaiOther = 0, dubaiOtherCount = 0;
    let cashKhi = 0, cashKhiCount = 0;
    let cashIsb = 0, cashIsbCount = 0;
    let cashLhe = 0, cashLheCount = 0;
    let cashOther = 0, cashOtherCount = 0;
    let d2cCash = 0, d2cCount = 0;
    let ecommerceCash = 0, ecommerceCount = 0;
    let gymsCash = 0, gymsCount = 0;
    let retailCash = 0, retailCount = 0;

    for (const entry of allEntries) {
      const jId = entry.journal_id ? entry.journal_id[0] : 0;
      const amt = entry.amount;

      // Channel bucket
      const cName = entry.partner_id ? (partnerChannelMap.get((entry.partner_id as [number, string])[0]) || 'Other') : 'Other';
      if (isB2C(entry) || cName === 'Web') { d2cCash += amt; d2cCount++; }
      else if (cName === 'Online Market Place') { ecommerceCash += amt; ecommerceCount++; }
      else if (cName === 'GYM') { gymsCash += amt; gymsCount++; }
      else { retailCash += amt; retailCount++; }

      // Bank/cash bucket
      if (isB2C(entry)) {
        b2cTotal += amt; b2cCount++;
        continue;
      }

      const city = getCityCategory(entry);

      if (jId === 19) { // Faysal Bank
        if (city === 'Islamabad') { faysalIsb += amt; faysalIsbCount++; }
        else if (city === 'Lahore') { faysalLhe += amt; faysalLheCount++; }
        else if (city === 'Karachi') { faysalKhi += amt; faysalKhiCount++; }
        else { faysalOther += amt; faysalOtherCount++; }
      } else if (jId === 16) { // Dubai Islamic
        if (city === 'Islamabad') { dubaiIsb += amt; dubaiIsbCount++; }
        else if (city === 'Lahore') { dubaiLhe += amt; dubaiLheCount++; }
        else if (city === 'Karachi') { dubaiKhi += amt; dubaiKhiCount++; }
        else { dubaiOther += amt; dubaiOtherCount++; }
      } else if (jId === 17) { // KHI Cash in Hand
        cashKhi += amt; cashKhiCount++;
      } else if (jId === 18) { // ISB Cash in Hand
        cashIsb += amt; cashIsbCount++;
      } else {
        // Other journals (MISC, etc.) — route by city detection
        // "ISB Daily Sales" partner name → Islamabad → cashIsb
        // "KHI Daily Sales" partner name → Karachi → cashKhi
        if (city === 'Lahore') { cashLhe += amt; cashLheCount++; }
        else if (city === 'Islamabad') { cashIsb += amt; cashIsbCount++; }
        else if (city === 'Karachi') { cashKhi += amt; cashKhiCount++; }
        else { cashOther += amt; cashOtherCount++; }
      }
    }

    const sources: CashSource[] = [
      { name: 'B2C (Shopify/Trax/Postex)', amount: b2cTotal, count: b2cCount },
      { name: 'Faysal Bank (KHI)', amount: faysalKhi, count: faysalKhiCount },
      { name: 'Faysal Bank (ISB)', amount: faysalIsb, count: faysalIsbCount },
      { name: 'Faysal Bank (LHE)', amount: faysalLhe, count: faysalLheCount },
      { name: 'Faysal Bank (Other)', amount: faysalOther, count: faysalOtherCount },
      { name: 'Dubai Islamic (KHI)', amount: dubaiKhi, count: dubaiKhiCount },
      { name: 'Dubai Islamic (ISB)', amount: dubaiIsb, count: dubaiIsbCount },
      { name: 'Dubai Islamic (LHE)', amount: dubaiLhe, count: dubaiLheCount },
      { name: 'Dubai Islamic (Other)', amount: dubaiOther, count: dubaiOtherCount },
      { name: 'Cash in Hand (KHI)', amount: cashKhi, count: cashKhiCount },
      { name: 'Cash in Hand (ISB)', amount: cashIsb, count: cashIsbCount },
      { name: 'Cash in Hand (LHE)', amount: cashLhe, count: cashLheCount },
      { name: 'Other Channels', amount: cashOther, count: cashOtherCount },
    ];

    const channelSources: CashSource[] = [
      { name: 'D2C — Shopify / Web', amount: d2cCash, count: d2cCount },
      { name: 'Ecommerce — Pandamart / Kravemart', amount: ecommerceCash, count: ecommerceCount },
      { name: 'Gyms — Health', amount: gymsCash, count: gymsCount },
      { name: 'Retail — Physical / Other', amount: retailCash, count: retailCount },
    ];

    const total = sources.reduce((acc, s) => acc + s.amount, 0);

    return NextResponse.json({
      total,
      sources,
      channelSources,
      channelTargetsData: { d2c: d2cCash, ecommerce: ecommerceCash, gyms: gymsCash, retail: retailCash },
    } as any, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('Payments API error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
