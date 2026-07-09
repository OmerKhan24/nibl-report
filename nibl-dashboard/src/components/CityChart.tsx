'use client';

import type { CityRevenue } from '@/lib/types';
import styles from './CityChart.module.css';

interface Props {
  data: CityRevenue[];
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

// Assign a consistent accent colour per city based on index
const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#a855f7', '#06b6d4', '#84cc16',
];

export default function CityChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.icon}>🏙️</span>
            <div>
              <div className={styles.title}>City-wise B2B Revenue</div>
              <div className={styles.subtitle}>Field Sales · Area Breakdown</div>
            </div>
          </div>
        </div>
        <div className={styles.empty}>No city data available for selected period</div>
      </div>
    );
  }

  const maxRevenue = data[0]?.revenue || 1;
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon}>🏙️</span>
          <div>
            <div className={styles.title}>City-wise B2B Revenue</div>
            <div className={styles.subtitle}>Field Sales · Area Breakdown</div>
          </div>
        </div>
        <div className={styles.summary}>
          <span className={styles.badge}>{data.length} cities</span>
          <span className={styles.total}>PKR {fmt(totalRevenue)} total</span>
        </div>
      </div>

      <div className={styles.grid}>
        {data.map((row, i) => {
          const color = PALETTE[i % PALETTE.length];
          const barPct = (row.revenue / maxRevenue) * 100;
          return (
            <div key={row.city} className={styles.rowItem}>
              <div className={styles.rowTop}>
                <div className={styles.rowLeft}>
                  <span className={styles.dot} style={{ background: color }} />
                  <span className={styles.cityName}>{row.city}</span>
                  <span className={styles.orderCount}>{row.orders} order{row.orders !== 1 ? 's' : ''}</span>
                </div>
                <div className={styles.rowRight}>
                  <span className={styles.revenue}>PKR {fmt(row.revenue)}</span>
                  <span className={styles.share} style={{ color }}>
                    {row.share.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className={styles.barTrack}>
                <div
                  className={styles.barFill}
                  style={{ width: `${barPct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
