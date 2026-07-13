import { NextRequest, NextResponse } from 'next/server';
import { odooQuery } from '@/lib/odoo';
import type { Payment, CashSource, CashApiResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');

    const domain: unknown[] = [['payment_type', '=', 'inbound'], ['state', '=', 'posted']];
    if (from) domain.push(['date', '>=', from]);
    if (to)   domain.push(['date', '<=', to]);

    const fields = ['name', 'amount', 'date', 'partner_id', 'journal_id', 'payment_type'];
    const payments = await odooQuery<Payment[]>('account.payment', 'search_read', [domain], { fields, limit: 5000 });

    // Helper functions (same logic as api/sales/route.ts)
    function isB2C(payment: Payment): boolean {
      const partnerName = (payment.partner_id ? payment.partner_id[1] : '').toLowerCase();
      if (partnerName.includes('trax') || partnerName.includes('payfast') || partnerName.includes('pay fast') || partnerName.includes('postex') || partnerName.includes('shopify')) {
        return true;
      }
      return false;
    }

    function inferCity(payment: Payment): string {
      const partnerName = payment.partner_id ? payment.partner_id[1] : '';
      const nameUpper = partnerName.toUpperCase();
      
      if (nameUpper.includes('KHI') || nameUpper.includes('KARACHI') || nameUpper.includes('DHA') || nameUpper.includes('CLIFTON') || nameUpper.includes('GULSHAN') || nameUpper.includes('TARIQ ROAD') || nameUpper.includes('BAHADURABAD')) {
        return 'Karachi';
      }
      
      if (nameUpper.includes('ISB') || nameUpper.includes('ISLAMABAD') || nameUpper.includes('ISL') || nameUpper.includes('G-10') || nameUpper.includes('F-7') || nameUpper.includes('BLUE AREA') || nameUpper.includes('JINNAH SUPER') || nameUpper.includes('F-11') || nameUpper.includes('G-9')) {
        return 'Islamabad';
      }
      
      return 'Other'; // Fallback
    }

    let b2cTotal = 0;
    let b2cCount = 0;
    let faysalKhi = 0, faysalKhiCount = 0;
    let faysalIsb = 0, faysalIsbCount = 0;
    let dubaiKhi = 0, dubaiKhiCount = 0;
    let dubaiIsb = 0, dubaiIsbCount = 0;
    let cashKhi = 0, cashKhiCount = 0;
    let cashIsb = 0, cashIsbCount = 0;

    for (const p of payments) {
      if (!p.journal_id) continue;
      const jId = p.journal_id[0];
      const amt = p.amount;

      if (isB2C(p)) {
        b2cTotal += amt;
        b2cCount++;
        continue; // B2C payments are isolated from KHI/ISB bank split
      }

      const city = inferCity(p);

      if (jId === 19) { // Faysal Bank
        if (city === 'Islamabad') { faysalIsb += amt; faysalIsbCount++; }
        else { faysalKhi += amt; faysalKhiCount++; }
      } 
      else if (jId === 16) { // Dubai Islamic
        if (city === 'Islamabad') { dubaiIsb += amt; dubaiIsbCount++; }
        else { dubaiKhi += amt; dubaiKhiCount++; }
      }
      else if (jId === 17) { // KHI Cash
        cashKhi += amt; cashKhiCount++;
      }
      else if (jId === 18) { // ISB Cash
        cashIsb += amt; cashIsbCount++;
      }
    }

    const sources: CashSource[] = [
      { name: 'B2C (Shopify/Trax/Postex)', amount: b2cTotal, count: b2cCount },
      { name: 'Faysal Bank (KHI)', amount: faysalKhi, count: faysalKhiCount },
      { name: 'Faysal Bank (ISB)', amount: faysalIsb, count: faysalIsbCount },
      { name: 'Dubai Islamic (KHI)', amount: dubaiKhi, count: dubaiKhiCount },
      { name: 'Dubai Islamic (ISB)', amount: dubaiIsb, count: dubaiIsbCount },
      { name: 'Cash in Hand (KHI)', amount: cashKhi, count: cashKhiCount },
      { name: 'Cash in Hand (ISB)', amount: cashIsb, count: cashIsbCount },
    ];

    const total = sources.reduce((acc, s) => acc + s.amount, 0);

    return NextResponse.json({ total, sources } as CashApiResponse);
  } catch (error: any) {
    console.error('Payments API error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
