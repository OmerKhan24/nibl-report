'use client';

import { useState, useEffect } from 'react';
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

  const [cash90Total, setCash90Total] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date();
    const from90 = new Date(today);
    from90.setDate(from90.getDate() - 90);
    const toStr = today.toISOString().split('T')[0];
    const fromStr = from90.toISOString().split('T')[0];
    fetch(`/api/payments?from=${fromStr}&to=${toStr}`)
      .then(r => r.json())
      .then(d => { if (typeof d?.total === 'number') setCash90Total(d.total); })
      .catch(() => {});
  }, []);

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
          <span className={styles.summaryLabel}>Last 90 Days</span>
          <span className={styles.summaryValue}>{cash90Total !== null ? `PKR ${fmt(cash90Total)}` : '…'}</span>
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
            total={cash.total} 
            title="Cash Collection by Channel" 
            subtitle="Daily cash generation grouped by sales channels" 
            hideCitySummary={true} 
          />
          <div style={{ marginTop: '24px' }}>
            <CashChart 
              sources={cash.sources} 
              total={cash.total} 
              title="Cash Collection by Account" 
              subtitle="Daily cash generation by bank & city" 
            />
          </div>
        </div>
        <div className={styles.rightCol}>
          <ReceivablesTable customers={invoices.outstandingCustomers} />
        </div>
      </div>
    </div>
  );
}
