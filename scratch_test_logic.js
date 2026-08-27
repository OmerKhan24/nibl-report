const fs = require('fs');

const invoices = JSON.parse(fs.readFileSync('test_invs.json', 'utf8'));

try {
    const total       = invoices.length;
    const totalAmount = invoices.reduce((a, i) => a + i.amount_total, 0);

    const byState = (ps) => invoices.filter(i => i.payment_state === ps);
    const sumAmt  = (arr) => arr.reduce((a, i) => a + i.amount_total, 0);

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

    const outMap = new Map();
    [...notPaidInvs, ...partialInvs].forEach(inv => {
      if (!inv.partner_id) return;
      const pid = inv.partner_id[0];
      const pname = inv.partner_id[1];
      const residual = inv.amount_residual !== undefined ? inv.amount_residual : inv.amount_total;
      
      if (!outMap.has(pid)) {
        outMap.set(pid, { id: pid, name: pname, amountOutstanding: 0, invoiceCount: 0 });
      }
      const c = outMap.get(pid);
      c.amountOutstanding += residual;
      c.invoiceCount++;
    });

    const outstandingCustomers = Array.from(outMap.values())
      .filter(c => c.amountOutstanding > 0)
      .sort((a, b) => b.amountOutstanding - a.amountOutstanding)
      .slice(0, 50);

    console.log("Success! Customers:", outstandingCustomers.length);
} catch (e) {
    console.log("Error:", e);
}
