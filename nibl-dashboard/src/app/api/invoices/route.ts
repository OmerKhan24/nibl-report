import { NextRequest, NextResponse } from 'next/server';
import { odooQuery } from '@/lib/odoo';
import type { Invoice, InvoicesApiResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');

    const dateDomain: unknown[] = [['move_type', '=', 'out_invoice'], ['state', '=', 'posted']];
    if (from) dateDomain.push(['invoice_date', '>=', from]);
    if (to)   dateDomain.push(['invoice_date', '<=', to]);

    const invoices = await odooQuery<Invoice[]>('account.move', 'search_read',
      [dateDomain],
      {
        fields: ['name', 'partner_id', 'amount_total', 'amount_untaxed',
                 'state', 'invoice_date', 'payment_state', 'invoice_origin', 'amount_residual'],
        limit: 5000,
        order: 'invoice_date desc',
      }
    );

    const total       = invoices.length;
    const totalAmount = invoices.reduce((a, i) => a + i.amount_total, 0);

    const byState = (ps: string) => invoices.filter(i => i.payment_state === ps);
    const sumAmt  = (arr: Invoice[]) => arr.reduce((a, i) => a + i.amount_total, 0);

    const paidInvs      = byState('paid');
    const partialInvs   = byState('partial');
    const notPaidInvs   = byState('not_paid');
    const inPaymentInvs = byState('in_payment');

    const paidAmount      = sumAmt(paidInvs);
    const partialAmount   = sumAmt(partialInvs);
    const notPaidAmount   = sumAmt(notPaidInvs);
    const inPaymentAmount = sumAmt(inPaymentInvs);

    const outstanding     = notPaidAmount + partialAmount;
    const collectionRate  = totalAmount > 0
      ? ((paidAmount + partialAmount * 0.5) / totalAmount) * 100
      : 0;

    // Build Outstanding Customers List
    const outMap = new Map<number, import('@/lib/types').OutstandingCustomer>();
    [...notPaidInvs, ...partialInvs].forEach(inv => {
      if (!inv.partner_id) return;
      const pid = inv.partner_id[0];
      const pname = inv.partner_id[1];
      // Fallback to amount_total if amount_residual is undefined
      const residual = (inv as any).amount_residual !== undefined ? (inv as any).amount_residual : inv.amount_total;
      
      if (!outMap.has(pid)) {
        outMap.set(pid, { id: pid, name: pname, amountOutstanding: 0, invoiceCount: 0 });
      }
      const c = outMap.get(pid)!;
      c.amountOutstanding += residual;
      c.invoiceCount++;
    });

    const outstandingCustomers = Array.from(outMap.values())
      .filter(c => c.amountOutstanding > 0)
      .sort((a, b) => b.amountOutstanding - a.amountOutstanding)
      .slice(0, 50); // top 50 outstanding

    const response: InvoicesApiResponse = {
      total,
      totalAmount,
      paid: paidInvs.length,
      paidAmount,
      partial: partialInvs.length,
      partialAmount,
      notPaid: notPaidInvs.length,
      notPaidAmount,
      inPayment: inPaymentInvs.length,
      inPaymentAmount,
      outstanding,
      collectionRate,
      outstandingCustomers,
    };

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/invoices]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
