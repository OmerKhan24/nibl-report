import type { SalesApiResponse, InvoicesApiResponse } from '@/lib/types';
import CountUp from './CountUp';
import styles from './KpiRow.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { style: 'decimal', maximumFractionDigits: 0 }).format(n);
}

interface KpiCardProps {
  label: string;
  value: number;
  prefix: string;
  sub: string;
  accent: string;
}

function KpiCard({ label, value, prefix, sub, accent }: KpiCardProps) {
  return (
    <div className={styles.card} style={{ '--accent': accent } as React.CSSProperties}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{prefix}<CountUp value={value} format={fmt} /></div>
      <div className={styles.sub}>{sub}</div>
    </div>
  );
}

export default function KpiRow({ sales, invoices }: { sales: SalesApiResponse; invoices: InvoicesApiResponse }) {
  // Gross = B2B invoices (courier partners excluded to avoid double-counting D2C) + Shopify D2C
  const grossRevenue = invoices.invoiceGrossRevenue + sales.b2c.revenue;
  const netRevenue = grossRevenue - invoices.returnsAmount;
  const pct = (n: number) => grossRevenue ? `${(n / grossRevenue * 100).toFixed(1)}% of total` : '—';

  return (
    <div className={styles.grid}>
      <KpiCard
        label="Gross Revenue"
        value={grossRevenue} prefix="PKR "
        sub={`B2B invoices + Shopify D2C`}
        accent="#2563eb"
      />
      <KpiCard
        label="Refunds & Returns"
        value={invoices.returnsAmount} prefix="−PKR "
        sub={`${invoices.returnsCount} return entries`}
        accent="#f87171"
      />
      <KpiCard
        label="Net Revenue"
        value={netRevenue} prefix="PKR "
        sub="Invoice gross minus returns"
        accent="#34d399"
      />
      <KpiCard
        label="B2C · Shopify"
        value={sales.b2c.revenue} prefix="PKR "
        sub={`${sales.b2c.orders} orders · ${pct(sales.b2c.revenue)}`}
        accent="var(--b2c)"
      />
      <KpiCard
        label="B2B · Direct Sales"
        value={invoices.invoiceGrossRevenue} prefix="PKR "
        sub={`${invoices.total} invoices · ${pct(invoices.invoiceGrossRevenue)}`}
        accent="var(--b2b)"
      />
    </div>
  );
}
