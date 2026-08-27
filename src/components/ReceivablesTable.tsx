import type { OutstandingCustomer } from '@/lib/types';
import styles from './ReceivablesTable.module.css';
import { AlertCircle } from 'lucide-react';

interface Props {
  customers: OutstandingCustomer[];
}

export default function ReceivablesTable({ customers }: Props) {
  if (!customers || customers.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Accounts Receivable (90 Days)</h2>
          <p className={styles.subtitle}>Top outstanding balances</p>
        </div>
        <div className={styles.empty}>
          All caught up! No outstanding balances in this period.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Accounts Receivable</h2>
          <span className={styles.badge}>{customers.length} Customers</span>
        </div>
        <p className={styles.subtitle}>Outstanding balances from invoices in this period</p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Unpaid Invoices</th>
              <th className={styles.right}>Amount Owed</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td className={styles.nameCell}>
                  <div className={styles.customerName}>{c.name}</div>
                </td>
                <td>
                  <span className={styles.countBadge}>{c.invoiceCount}</span>
                </td>
                <td className={styles.right}>
                  <div className={styles.amountWrap}>
                    <AlertCircle size={14} className={styles.alertIcon} />
                    <span className={styles.amount}>PKR {c.amountOutstanding.toLocaleString()}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
