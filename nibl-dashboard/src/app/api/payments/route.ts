import { NextRequest, NextResponse } from 'next/server';
import { odooQuery } from '@/lib/odoo';
import type { Payment, CashSource, CashApiResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');

    const domain: unknown[] = [['payment_type', '=', 'inbound'], ['state', 'in', ['posted', 'paid', 'reconciled']], ['company_id', '=', 1]];
    if (from) domain.push(['date', '>=', from]);
    if (to)   domain.push(['date', '<=', to]);

    const fields = ['name', 'amount', 'date', 'partner_id', 'journal_id', 'payment_type'];
    const payments = await odooQuery<Payment[]>('account.payment', 'search_read', [domain], { fields, limit: 5000 });

    // Step 1: Collect unique partner IDs
    const partnerIds = [...new Set(payments.filter(p => p.partner_id).map(p => (p.partner_id as [number, string])[0]))];

    // Step 2: Fetch city from res.partner
    interface OdooPartner { id: number; name: string; city: string | false; }
    const partnerRecords = partnerIds.length > 0
      ? await odooQuery<OdooPartner[]>(
          'res.partner', 'search_read',
          [[['id', 'in', partnerIds]]],
          { fields: ['id', 'name', 'city'], limit: 5000 }
        )
      : [];

    const partnerCityMap = new Map<number, string | false>();
    for (const p of partnerRecords) {
      partnerCityMap.set(p.id, p.city);
    }

    // Helper functions
    function isB2C(payment: Payment): boolean {
      const partnerName = (payment.partner_id ? payment.partner_id[1] : '').toLowerCase();
      if (partnerName.includes('trax') || partnerName.includes('payfast') || partnerName.includes('pay fast') || partnerName.includes('postex') || partnerName.includes('shopify')) {
        return true;
      }
      return false;
    }

    function getCityCategory(payment: Payment): string {
      const partnerName = payment.partner_id ? payment.partner_id[1] : '';
      const partnerId = payment.partner_id ? (payment.partner_id as [number, string])[0] : 0;
      const odooCity = partnerCityMap.get(partnerId) || '';
      
      const combinedStr = `${partnerName} ${odooCity}`.toUpperCase();
      
      if (combinedStr.includes('KHI') || combinedStr.includes('KARACHI') || combinedStr.includes('DHA') || combinedStr.includes('CLIFTON') || combinedStr.includes('GULSHAN') || combinedStr.includes('TARIQ ROAD') || combinedStr.includes('BAHADURABAD')) {
        return 'Karachi';
      }
      if (combinedStr.includes('ISB') || combinedStr.includes('ISLAMABAD') || combinedStr.includes('ISL') || combinedStr.includes('G-10') || combinedStr.includes('F-7') || combinedStr.includes('BLUE AREA') || combinedStr.includes('JINNAH SUPER') || combinedStr.includes('F-11') || combinedStr.includes('G-9') || combinedStr.includes('G-15')) {
        return 'Islamabad';
      }
      if (combinedStr.includes('LHE') || combinedStr.includes('LAHORE') || combinedStr.includes('GULBERG') || combinedStr.includes('JOHAR TOWN') || combinedStr.includes('MODEL TOWN') || combinedStr.includes('DEFENCE LHE')) {
        return 'Lahore';
      }
      return 'Other'; // Fallback
    }

    let b2cTotal = 0;
    let b2cCount = 0;
    
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

    for (const p of payments) {
      if (!p.journal_id) continue;
      const jId = p.journal_id[0];
      const amt = p.amount;

      if (isB2C(p)) {
        b2cTotal += amt;
        b2cCount++;
        continue; // B2C payments are isolated from KHI/ISB bank split
      }

      const city = getCityCategory(p);

      if (jId === 19) { // Faysal Bank
        if (city === 'Islamabad') { faysalIsb += amt; faysalIsbCount++; }
        else if (city === 'Lahore') { faysalLhe += amt; faysalLheCount++; }
        else if (city === 'Karachi') { faysalKhi += amt; faysalKhiCount++; }
        else { faysalOther += amt; faysalOtherCount++; }
      } 
      else if (jId === 16) { // Dubai Islamic
        if (city === 'Islamabad') { dubaiIsb += amt; dubaiIsbCount++; }
        else if (city === 'Lahore') { dubaiLhe += amt; dubaiLheCount++; }
        else if (city === 'Karachi') { dubaiKhi += amt; dubaiKhiCount++; }
        else { dubaiOther += amt; dubaiOtherCount++; }
      }
      else if (jId === 17) { // KHI Cash
        cashKhi += amt; cashKhiCount++;
      }
      else if (jId === 18) { // ISB Cash
        cashIsb += amt; cashIsbCount++;
      }
      else if (p.payment_type === 'inbound') {
        // Fallback for any other cash/bank journals
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

    const total = sources.reduce((acc, s) => acc + s.amount, 0);

    return NextResponse.json({ total, sources } as CashApiResponse, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('Payments API error:', error);
    return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
  }
}
