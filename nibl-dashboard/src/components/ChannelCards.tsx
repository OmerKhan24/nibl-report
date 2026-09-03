import type { SalesApiResponse, ChannelStats } from '@/lib/types';
import styles from './ChannelCards.module.css';

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

interface ChannelCardProps {
  stats: ChannelStats;
  title: string;
  subtitle: string;
  color: string;
  lightBg: string;
  pct: number;
}

function ChannelCard({ stats, title, subtitle, color, lightBg, pct }: ChannelCardProps) {
  return (
    <div className={styles.card} style={{ '--accent': color } as React.CSSProperties}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color }} />
      <div className={styles.cardTop}>
        <div className={styles.channelInfo}>
          <div className={styles.dot} style={{ background: color }} />
          <div className={styles.channelName}>{title}</div>
          <div className={styles.channelTag} style={{ background: lightBg, color }}>
            {subtitle}
          </div>
        </div>
        <div className={styles.bigRevenue} style={{ color }}>
          PKR {fmtK(stats.revenue)}
        </div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Orders</div>
          <div className={styles.statVal} style={{ color }}>{stats.orders}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Avg Order</div>
          <div className={styles.statVal} style={{ color }}>PKR {fmtK(stats.avgOrder)}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Quotations</div>
          <div className={styles.statVal} style={{ color }}>{stats.drafts}</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Rev Share</div>
          <div className={styles.statVal} style={{ color }}>{pct.toFixed(1)}%</div>
        </div>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.shareLabel}>{pct.toFixed(1)}% of total revenue</div>
    </div>
  );
}

export default function ChannelCards({ sales }: { sales: SalesApiResponse }) {
  const total = sales.total.revenue || 1;
  const pct = (n: number) => (n / total) * 100;

  return (
    <div className={styles.grid}>
      <ChannelCard stats={sales.channelTargetsData.d2c}       title="B2C — Shopify"          subtitle="Online · Delivery"    color="#0ea5e9" lightBg="#e0f2fe" pct={pct(sales.channelTargetsData.d2c.revenue)} />
      <ChannelCard stats={sales.channelTargetsData.retail}    title="Retail — Physical"      subtitle="Trade · Schools"      color="#7c3aed" lightBg="#ede9fe" pct={pct(sales.channelTargetsData.retail.revenue)} />
      <ChannelCard stats={sales.channelTargetsData.gyms}      title="Gyms — Fitness"         subtitle="Health · Gyms"        color="#7c3aed" lightBg="#ede9fe" pct={pct(sales.channelTargetsData.gyms.revenue)} />
      <ChannelCard stats={sales.channelTargetsData.ecommerce} title="Ecommerce — Markets"    subtitle="Pandamart · Kravemart" color="#0ea5e9" lightBg="#e0f2fe" pct={pct(sales.channelTargetsData.ecommerce.revenue)} />
    </div>
  );
}
