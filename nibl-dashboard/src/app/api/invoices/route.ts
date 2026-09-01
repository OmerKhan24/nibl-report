import { NextRequest, NextResponse } from 'next/server';
import { odooQuery } from '@/lib/odoo';
import type { Invoice, InvoicesApiResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dateDomain: unknown[] = [['move_type', '=', 'out_invoice'], ['state', '=', 'posted'], ['company_id', '=', 1]];
    if (from) dateDomain.push(['invoice_date', '>=', from]);
    if (to) dateDomain.push(['invoice_date', '<=', to]);

    const invoices = await odooQuery<Invoice[]>('account.move', 'search_read',
      [dateDomain],
      {
        fields: ['name', 'partner_id', 'amount_total', 'amount_untaxed',
          'state', 'invoice_date', 'payment_state', 'invoice_origin', 'amount_residual'],
        limit: 5000,
        order: 'invoice_date desc',
      }
    );

    // ── Returns from Account 31005 (Sale Return) ────────────────
    let returnsAmount = 0;
    let returnsCount = 0;
    const returnAccs = await odooQuery<number[]>('account.account', 'search', [[['code', '=', '31005']]]);
    if (returnAccs.length > 0) {
      const returnDomain: unknown[] = [
        ['parent_state', '=', 'posted'],
        ['company_id', '=', 1],
        ['account_id', 'in', returnAccs]
      ];
      if (from) returnDomain.push(['date', '>=', from]);
      if (to) returnDomain.push(['date', '<=', to]);

      const returnLines = await odooQuery<{ balance: number }[]>('account.move.line', 'search_read',
        [returnDomain],
        { fields: ['balance'], limit: 5000 }
      );
      // Debit balances on income accounts are positive. P&L displays them as negative.
      returnsAmount = returnLines.reduce((acc, line) => acc + line.balance, 0);
      returnsCount = returnLines.length;
    }

    // ── P&L Revenue (Accounting) ─────────────────────────────
    const pnlDomain: unknown[] = [
      ['parent_state', '=', 'posted'],
      ['company_id', '=', 1],
      ['account_type', 'in', ['income', 'income_other']]
    ];
    if (from) pnlDomain.push(['date', '>=', from]);
    if (to) pnlDomain.push(['date', '<=', to]);

    const pnlLines = await odooQuery<{ balance: number }[]>('account.move.line', 'search_read',
      [pnlDomain],
      { fields: ['balance'], limit: 10000 }
    );
    const pnlRevenue = pnlLines.reduce((acc, line) => acc + (-line.balance), 0);

    const total = invoices.length;
    const totalAmount = invoices.reduce((a, i) => a + i.amount_total, 0);

    const byState = (ps: string) => invoices.filter(i => i.payment_state === ps);
    const sumAmt = (arr: Invoice[]) => arr.reduce((a, i) => a + i.amount_total, 0);

    const paidInvs = byState('paid');
    const partialInvs = byState('partial');
    const notPaidInvs = byState('not_paid');
    const inPaymentInvs = byState('in_payment');

    const paidAmount = sumAmt(paidInvs);
    const partialAmount = sumAmt(partialInvs);
    const notPaidAmount = sumAmt(notPaidInvs);
    const inPaymentAmount = sumAmt(inPaymentInvs);

    const outstanding = notPaidAmount + partialAmount;
    const collectionRate = totalAmount > 0
      ? ((paidAmount + partialAmount * 0.5) / totalAmount) * 100
      : 0;

    // Build Outstanding Customers List (90 Days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString().split('T')[0];

    const outstandingDomain: unknown[] = [
      ['move_type', '=', 'out_invoice'],
      ['state', '=', 'posted'],
      ['company_id', '=', 1],
      ['payment_state', 'in', ['not_paid', 'partial']],
      ['invoice_date', '>=', ninetyDaysAgoStr]
    ];

    const outstandingInvoices = await odooQuery<Invoice[]>('account.move', 'search_read',
      [outstandingDomain],
      {
        fields: ['partner_id', 'amount_total', 'amount_residual'],
        limit: 5000,
        order: 'invoice_date desc',
      }
    );

    const outMap = new Map<number, import('@/lib/types').OutstandingCustomer>();
    outstandingInvoices.forEach(inv => {
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
      returnsAmount,
      returnsCount,
      pnlRevenue,
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
