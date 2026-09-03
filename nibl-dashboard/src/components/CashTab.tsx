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
      <div className={styles.targetsGrid}>
        <TargetCard 
          title="Overall Cash Collection" 
          actual={cash.total} 
          dateRange={dateRange} 
          storageKey="nibl_cash_target" 
        />
        <TargetCard 
          title="D2C Collection" 
          actual={cash.channelTargetsData?.d2c || 0} 
          dateRange={dateRange} 
          storageKey="nibl_cash_d2c_target" 
        />
        <TargetCard 
          title="Ecommerce Collection" 
          actual={cash.channelTargetsData?.ecommerce || 0} 
          dateRange={dateRange} 
          storageKey="nibl_cash_ecommerce_target" 
        />
        <TargetCard 
          title="Gyms Collection" 
          actual={cash.channelTargetsData?.gyms || 0} 
          dateRange={dateRange} 
          storageKey="nibl_cash_gyms_target" 
        />
        <TargetCard 
          title="Retail/Physical Collection" 
          actual={cash.channelTargetsData?.retail || 0} 
          dateRange={dateRange} 
          storageKey="nibl_cash_retail_target" 
        />
      </div>
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
