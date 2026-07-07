import type { InvoicesApiResponse } from '@/lib/types';
import styles from './InvoiceStatus.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

function pct(a: number, b: number) {
  return b > 0 ? `${(a / b * 100).toFixed(1)}%` : '—';
}

const ROWS = [
  { key: 'paid',      label: 'Paid',             color: '#059669', bg: '#d1fae5', countKey: 'paid'      as const, amtKey: 'paidAmount'      as const },
  { key: 'partial',   label: 'Partially Paid',   color: '#d97706', bg: '#fef3c7', countKey: 'partial'   as const, amtKey: 'partialAmount'   as const },
  { key: 'inPayment', label: 'In Payment',        color: '#2563eb', bg: '#dbeafe', countKey: 'inPayment' as const, amtKey: 'inPaymentAmount' as const },
  { key: 'notPaid',   label: 'Unpaid',            color: '#dc2626', bg: '#fee2e2', countKey: 'notPaid'   as const, amtKey: 'notPaidAmount'   as const },
];

export default function InvoiceStatus({ invoices }: { invoices: InvoicesApiResponse }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon}>🧾</span>
          <div>
            <div className={styles.title}>Accounts Receivable</div>
            <div className={styles.subtitle}>Invoice payment status breakdown</div>
          </div>
        </div>
        <div className={styles.totals}>
          <div className={styles.totalItem}>
            <div className={styles.totalLabel}>Total Invoiced</div>
            <div className={styles.totalVal}>PKR {fmt(invoices.totalAmount)}</div>
          </div>
          <div className={styles.totalItem}>
            <div className={styles.totalLabel}>Outstanding A/R</div>
            <div className={styles.totalVal} style={{ color: '#dc2626' }}>PKR {fmt(invoices.outstanding)}</div>
          </div>
          <div className={styles.totalItem}>
            <div className={styles.totalLabel}>Collection Rate</div>
            <div className={styles.totalVal} style={{ color: invoices.collectionRate >= 50 ? '#059669' : '#dc2626' }}>
              {invoices.collectionRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Visual bar */}
      <div className={styles.stackBar}>
        {ROWS.map(r => {
          const amt = invoices[r.amtKey];
          const w = invoices.totalAmount > 0 ? (amt / invoices.totalAmount) * 100 : 0;
          return w > 0 ? (
            <div
              key={r.key}
              className={styles.stackSegment}
              style={{ width: `${w}%`, background: r.color }}
              title={`${r.label}: PKR ${fmt(amt)} (${pct(amt, invoices.totalAmount)})`}
            />
          ) : null;
        })}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Payment Status</th>
              <th className={styles.thNum}>Count</th>
              <th className={styles.thNum}>Amount</th>
              <th className={styles.thNum}>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(r => {
              const count = invoices[r.countKey];
              const amt   = invoices[r.amtKey];
              if (count === 0 && amt === 0) return null;
              return (
                <tr key={r.key} className={styles.row}>
                  <td className={styles.td}>
                    <span
                      className={styles.badge}
                      style={{ background: r.bg, color: r.color, border: `1px solid ${r.color}33` }}
                    >
                      {r.label}
                    </span>
                  </td>
                  <td className={styles.tdNum}>{count}</td>
                  <td className={styles.tdNum}><strong>PKR {fmt(amt)}</strong></td>
                  <td className={styles.tdNum}>{pct(amt, invoices.totalAmount)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className={styles.footRow}>
              <td className={styles.footCell}><strong>TOTAL</strong></td>
              <td className={styles.footNum}><strong>{invoices.total}</strong></td>
              <td className={styles.footNum}><strong>PKR {fmt(invoices.totalAmount)}</strong></td>
              <td className={styles.footNum}><strong>100%</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
