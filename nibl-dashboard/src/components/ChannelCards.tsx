import type { SalesApiResponse } from '@/lib/types';
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
  const b2cPct = sales.b2c.revenue / total * 100;
  const b2bPct = sales.b2b.revenue / total * 100;

  return (
    <div className={styles.grid}>
      {/* B2C */}
      <div className={`${styles.card} ${styles.b2c}`}>
        <div className={styles.cardTop}>
          <div className={styles.channelInfo}>
            <span className={styles.channelEmoji}>🛒</span>
            <div>
              <div className={styles.channelName}>B2C — Shopify</div>
              <div className={styles.channelTag} style={{ background: 'var(--b2c-light)', color: 'var(--b2c)' }}>
                Online · Delivery Partners
              </div>
            </div>
          </div>
          <div className={styles.bigRevenue} style={{ color: 'var(--b2c)' }}>
            PKR {fmtK(sales.b2c.revenue)}
          </div>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Orders (Confirmed)</div>
            <div className={styles.statVal} style={{ color: 'var(--b2c)' }}>{sales.b2c.orders}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Avg. Order</div>
            <div className={styles.statVal} style={{ color: 'var(--b2c)' }}>PKR {fmtK(sales.b2c.avgOrder)}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Open Quotations</div>
            <div className={styles.statVal} style={{ color: 'var(--b2c)' }}>{sales.b2c.drafts}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Revenue Share</div>
            <div className={styles.statVal} style={{ color: 'var(--b2c)' }}>{b2cPct.toFixed(1)}%</div>
          </div>
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${b2cPct}%`, background: 'var(--b2c)' }}
            />
          </div>
        </div>
      </div>

      {/* B2B */}
      <div className={`${styles.card} ${styles.b2b}`}>
        <div className={styles.cardTop}>
          <div className={styles.channelInfo}>
            <span className={styles.channelEmoji}>🏢</span>
            <div>
              <div className={styles.channelName}>B2B — Direct Sales</div>
              <div className={styles.channelTag} style={{ background: 'var(--b2b-light)', color: 'var(--b2b)' }}>
                Trade · Business Accounts
              </div>
            </div>
          </div>
          <div className={styles.bigRevenue} style={{ color: 'var(--b2b)' }}>
            PKR {fmtK(sales.b2b.revenue)}
          </div>
        </div>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Orders (Confirmed)</div>
            <div className={styles.statVal} style={{ color: 'var(--b2b)' }}>{sales.b2b.orders}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Avg. Order</div>
            <div className={styles.statVal} style={{ color: 'var(--b2b)' }}>PKR {fmtK(sales.b2b.avgOrder)}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Open Quotations</div>
            <div className={styles.statVal} style={{ color: 'var(--b2b)' }}>{sales.b2b.drafts}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Revenue Share</div>
            <div className={styles.statVal} style={{ color: 'var(--b2b)' }}>{b2bPct.toFixed(1)}%</div>
          </div>
        </div>
        <div className={styles.progressWrap}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${b2bPct}%`, background: 'var(--b2b)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
