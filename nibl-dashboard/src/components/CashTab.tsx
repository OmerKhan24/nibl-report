'use client';

import type { DashboardData } from '@/lib/types';
import CashChart from './CashChart';
import ReceivablesTable from './ReceivablesTable';
import TargetCard from './TargetCard';
import styles from './CashTab.module.css';

interface Props {
  data: DashboardData;
  dateRange: { from: string; to: string } | null;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

export default function CashTab({ data, dateRange }: Props) {
  const { cash, invoices } = data;
  const totalCount = cash.sources.reduce((s, src) => s + src.count, 0);

  const totalReceivables90 = (invoices?.outstandingCustomers || []).reduce(
    (sum, c) => sum + (c.amountOutstanding || 0),
    0
  );

  return (
    <div className={styles.container}>

      {/* ── Summary banner ── */}
      <div className={styles.summaryBanner}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Cash Collected</span>
          <span className={styles.summaryValue}>PKR {fmt(cash.total)}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Transactions</span>
          <span className={styles.summaryValue}>{totalCount.toLocaleString()}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Avg per Transaction</span>
          <span className={styles.summaryValue}>PKR {totalCount ? fmt(Math.round(cash.total / totalCount)) : '—'}</span>
        </div>
        <div className={styles.summaryDivider} />
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>90 Days Account Receivables Total</span>
          <span className={styles.summaryValue}>PKR {fmt(totalReceivables90)}</span>
        </div>
      </div>

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
        <TargetCard 
          title="Institutions Collection" 
          actual={cash.channelTargetsData?.institutions || 0} 
          dateRange={dateRange} 
          storageKey="nibl_cash_institutions_target" 
        />
      </div>
      <div className={styles.grid} style={{ marginTop: '1.5rem' }}>
        <div className={styles.leftCol}>
          <CashChart
            sources={cash.channelSources}
            citySources={cash.sources}
            total={cash.total}
            title="Cash Collection"
            subtitle="Daily cash generation by sales channel and city"
          />
        </div>
        <div className={styles.rightCol}>
          <ReceivablesTable customers={invoices.outstandingCustomers} />
        </div>
      </div>
    </div>
  );
}
