import type { SalesApiResponse, InvoicesApiResponse } from '@/lib/types';
import styles from './KpiRow.module.css';
import { DollarSign, ShoppingCart, Building2, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { style: 'decimal', maximumFractionDigits: 0 }).format(n);
}

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
  accentLight: string;
}

function KpiCard({ label, value, sub, icon, accent, accentLight }: KpiCardProps) {
  return (
    <div className={styles.card} style={{ '--accent': accent, '--accent-light': accentLight } as React.CSSProperties}>
      <div className={styles.iconWrap}>{icon}</div>
      <div className={styles.content}>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>{value}</div>
        <div className={styles.sub}>{sub}</div>
      </div>
    </div>
  );
}

export default function KpiRow({ sales, invoices }: { sales: SalesApiResponse; invoices: InvoicesApiResponse }) {
  const totalRevenue = sales.total.revenue;
  const pct = (n: number) => totalRevenue ? `${(n / totalRevenue * 100).toFixed(1)}%` : '—';
  const colRate = `${invoices.collectionRate.toFixed(1)}%`;

  const grossRevenue = invoices.pnlRevenue + invoices.returnsAmount;

  return (
    <div className={styles.grid}>
      <KpiCard
        label="Gross P&L Revenue"
        value={`PKR ${fmt(grossRevenue)}`}
        sub="Total posted income"
        icon={<FileText size={22} />}
        accent="#2563eb"
        accentLight="#dbeafe"
      />
      <KpiCard
        label="Refunds & Returns"
        value={`- PKR ${fmt(invoices.returnsAmount)}`}
        sub={`${invoices.returnsCount} total return entries`}
        icon={<AlertCircle size={22} />}
        accent="#ec4899"
        accentLight="#fce7f3"
      />
      <KpiCard
        label="Net P&L Revenue"
        value={`PKR ${fmt(invoices.pnlRevenue)}`}
        sub="Gross Revenue minus Refunds"
        icon={<CheckCircle size={22} />}
        accent="#10b981"
        accentLight="#d1fae5"
      />
      <KpiCard
        label="Sales Order Revenue"
        value={`PKR ${fmt(totalRevenue)}`}
        sub={`${sales.total.orders} confirmed orders`}
        icon={<DollarSign size={22} />}
        accent="#8b5cf6"
        accentLight="#ede9fe"
      />
    </div>
  );
}
