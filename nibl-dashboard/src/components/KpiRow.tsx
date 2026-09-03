import type { SalesApiResponse, InvoicesApiResponse } from '@/lib/types';
import styles from './KpiRow.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { style: 'decimal', maximumFractionDigits: 0 }).format(n);
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
}

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
}

function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div className={styles.card} style={{ '--accent': accent } as React.CSSProperties}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      <div className={styles.sub}>{sub}</div>
    </div>
  );
}

export default function KpiRow({ sales, invoices }: { sales: SalesApiResponse; invoices: InvoicesApiResponse }) {
  const totalRevenue = sales.total.revenue;
  const pct = (n: number) => totalRevenue ? `${(n / totalRevenue * 100).toFixed(1)}% of total` : '—';
  const grossRevenue = totalRevenue;
  const netRevenue = grossRevenue - invoices.returnsAmount;

  return (
    <div className={styles.grid}>
      <KpiCard
        label="Gross Revenue"
        value={`PKR ${fmtK(grossRevenue)}`}
        sub={`${sales.total.orders} confirmed orders`}
        accent="#2563eb"
      />
      <KpiCard
        label="Refunds & Returns"
        value={`−PKR ${fmtK(invoices.returnsAmount)}`}
        sub={`${invoices.returnsCount} return entries`}
        accent="#f87171"
      />
      <KpiCard
        label="Net Revenue"
        value={`PKR ${fmtK(netRevenue)}`}
        sub="Gross minus refunds"
        accent="#34d399"
      />
      <KpiCard
        label="B2C · Shopify"
        value={`PKR ${fmtK(sales.b2c.revenue)}`}
        sub={`${sales.b2c.orders} orders · ${pct(sales.b2c.revenue)}`}
        accent="var(--b2c)"
      />
      <KpiCard
        label="B2B · Direct Sales"
        value={`PKR ${fmtK(sales.b2b.revenue)}`}
        sub={`${sales.b2b.orders} orders · ${pct(sales.b2b.revenue)}`}
        accent="var(--b2b)"
      />
    </div>
  );
}
