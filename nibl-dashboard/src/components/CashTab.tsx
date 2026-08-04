import type { DashboardData } from '@/lib/types';
import CashChart from './CashChart';
import ReceivablesTable from './ReceivablesTable';
import TargetCard from './TargetCard';
import styles from './CashTab.module.css';

interface Props {
  data: DashboardData;
  dateRange: { from: string; to: string } | null;
}

export default function CashTab({ data, dateRange }: Props) {
  const { cash, invoices } = data;

  return (
    <div className={styles.container}>
      <TargetCard 
        title="Cash Collection" 
        actual={cash.total} 
        dateRange={dateRange} 
        storageKey="nibl_cash_target" 
      />
      <div className={styles.grid} style={{ marginTop: '1.5rem' }}>
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
