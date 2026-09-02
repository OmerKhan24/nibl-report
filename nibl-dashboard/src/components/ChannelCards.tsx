import type { SalesApiResponse, ChannelStats } from '@/lib/types';
import styles from './ChannelCards.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return fmt(n);
}

export default function ChannelCards({ sales }: { sales: SalesApiResponse }) {
  const total = sales.total.revenue || 1;

  const renderCard = (
    key: string,
    stats: ChannelStats,
    emoji: string,
    title: string,
    subtitle: string,
    colorVar: string,
    lightBgVar: string
  ) => {
    const pct = (stats.revenue / total) * 100;
    return (
      <div key={key} className={styles.card} style={{ borderTop: `4px solid var(${colorVar})` }}>
        <div className={styles.cardTop}>
          <div className={styles.channelInfo}>
            <span className={styles.channelEmoji}>{emoji}</span>
            <div>
              <div className={styles.channelName}>{title}</div>
              <div className={styles.channelTag} style={{ background: `var(${lightBgVar})`, color: `var(${colorVar})` }}>
                {subtitle}
              </div>
            </div>
          </div>
          <div className={styles.bigRevenue} style={{ color: `var(${colorVar})` }}>
            PKR {fmtK(stats.revenue)}
          </div>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Orders (Confirmed)</div>
            <div className={styles.statVal} style={{ color: `var(${colorVar})` }}>{stats.orders}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Avg. Order</div>
            <div className={styles.statVal} style={{ color: `var(${colorVar})` }}>PKR {fmtK(stats.avgOrder)}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Open Quotations</div>
            <div className={styles.statVal} style={{ color: `var(${colorVar})` }}>{stats.drafts}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Revenue Share</div>
            <div className={styles.statVal} style={{ color: `var(${colorVar})` }}>{pct.toFixed(1)}%</div>
          </div>
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${pct}%`, background: `var(${colorVar})` }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.grid}>
      {renderCard('d2c', sales.channelTargetsData.d2c, '🛒', 'B2C — Shopify', 'Online · Delivery Partners', '--b2c', '--b2c-light')}
      {renderCard('retail', sales.channelTargetsData.retail, '🏢', 'Retail — Physical', 'Trade · Schools · Vending', '--b2b', '--b2b-light')}
      {renderCard('gyms', sales.channelTargetsData.gyms, '🏋️', 'Gyms — Fitness', 'Health · Gyms', '--b2b', '--b2b-light')}
      {renderCard('ecommerce', sales.channelTargetsData.ecommerce, '📦', 'Ecommerce — Marketplaces', 'Pandamart · Kravemart', '--b2c', '--b2c-light')}
    </div>
  );
}
