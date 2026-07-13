import type { DashboardData } from '@/lib/types';
import CashChart from './CashChart';
import ReceivablesTable from './ReceivablesTable';
import styles from './CashTab.module.css';

interface Props {
  data: DashboardData;
}

export default function CashTab({ data }: Props) {
  const { cash, invoices } = data;

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <CashChart sources={cash.sources} total={cash.total} />
        </div>
        <div className={styles.rightCol}>
          <ReceivablesTable customers={invoices.outstandingCustomers} />
        </div>
      </div>
    </div>
  );
}
