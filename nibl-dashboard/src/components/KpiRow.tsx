import type { SalesApiResponse, InvoicesApiResponse } from '@/lib/types';
import styles from './KpiRow.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { style: 'decimal', maximumFractionDigits: 0 }).format(n);
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
  const grossRevenue = invoices.invoiceGrossRevenue;
  const netRevenue = grossRevenue - invoices.returnsAmount;
  const pct = (n: number) => grossRevenue ? `${(n / grossRevenue * 100).toFixed(1)}% of total` : '—';

  return (
    <div className={styles.grid}>
      <KpiCard
        label="Gross Revenue"
        value={`PKR ${fmt(grossRevenue)}`}
        sub={`${invoices.total} posted invoices`}
        accent="#2563eb"
      />
      <KpiCard
        label="Refunds & Returns"
        value={`−PKR ${fmt(invoices.returnsAmount)}`}
        sub={`${invoices.returnsCount} return entries`}
        accent="#f87171"
      />
      <KpiCard
        label="Net Revenue"
        value={`PKR ${fmt(netRevenue)}`}
        sub="Invoice gross minus returns"
        accent="#34d399"
      />
      <KpiCard
        label="B2C · Shopify"
        value={`PKR ${fmt(sales.b2c.revenue)}`}
        sub={`${sales.b2c.orders} orders · ${pct(sales.b2c.revenue)}`}
        accent="var(--b2c)"
      />
      <KpiCard
        label="B2B · Direct Sales"
        value={`PKR ${fmt(sales.b2b.revenue)}`}
        sub={`${sales.b2b.orders} orders · ${pct(sales.b2b.revenue)}`}
        accent="var(--b2b)"
      />
    </div>
  );
}
