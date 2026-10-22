'use client';

import type { DeliveryBreakdown, DeliveryStats } from '@/lib/types';
import styles from './DeliveryChart.module.css';

interface Props {
  data?: DeliveryBreakdown;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

const STATUSES = [
  {
    key: 'delivered'     as const,
    revenueKey: 'deliveredRevenue'      as const,
    label: 'Delivered',
    icon: '✅',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
  },
  {
    key: 'beingDelivered' as const,
    revenueKey: 'beingDeliveredRevenue' as const,
    label: 'Being Delivered',
    icon: '🚚',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
  },
  {
    key: 'notStarted'   as const,
    revenueKey: 'notStartedRevenue'     as const,
    label: 'Not Started',
    icon: '⏸',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
  },
] as const;

function Segment({ stats, label, color }: { stats: DeliveryStats; label: string; color: string }) {
  const total = stats.delivered + stats.beingDelivered + stats.notStarted;

  return (
    <div className={styles.segment}>
      {/* Segment header */}
      <div className={styles.segHeader}>
        <span className={styles.segLabel} style={{ color }}>{label}</span>
        <span className={styles.segTotal}>{total} orders</span>
      </div>

      {/* Stacked progress bar */}
      <div className={styles.stackBar}>
        {total > 0 && STATUSES.map(s => {
          const pct = (stats[s.key] / total) * 100;
          return pct > 0 ? (
            <div
              key={s.key}
              className={styles.stackSlice}
              style={{ width: `${pct}%`, background: s.color }}
              title={`${s.label}: ${stats[s.key]} orders (${pct.toFixed(1)}%)`}
            />
          ) : null;
        })}
        {total === 0 && <div className={styles.stackSlice} style={{ width: '100%', background: 'rgba(255,255,255,0.06)' }} />}
      </div>

      {/* Status rows */}
      <div className={styles.statusList}>
        {STATUSES.map(s => {
          const count = stats[s.key];
          const rev = stats[s.revenueKey];
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={s.key} className={styles.statusRow}>
              <div className={styles.statusLeft}>
                <span className={styles.statusDot} style={{ background: s.color }} />
                <span className={styles.statusIcon}>{s.icon}</span>
                <span className={styles.statusLabel}>{s.label}</span>
              </div>
              <div className={styles.statusRight}>
                <span className={styles.statusCount}
                  style={{ background: s.bg, color: s.color }}>
                  {count}
                </span>
                <span className={styles.statusPct}>{pct.toFixed(0)}%</span>
                <span className={styles.statusRev}>PKR {fmt(rev)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DeliveryChart({ data }: Props) {
  // Guard: data may be undefined if the API deployment is ahead of the frontend
  if (!data || !data.b2c || !data.b2b) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            <span className={styles.icon}>📦</span>
            <div>
              <div className={styles.title}>Delivery Status</div>
              <div className={styles.subtitle}>Based on invoice status · Confirmed orders only</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 0', fontSize: '0.85rem' }}>
          Delivery data loading — please refresh in a moment
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon}>📦</span>
          <div>
            <div className={styles.title}>Delivery Status</div>
            <div className={styles.subtitle}>Based on invoice status · Confirmed orders only</div>
          </div>
        </div>
        <div className={styles.legend}>
          {STATUSES.map(s => (
            <span key={s.key} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        <Segment stats={data.b2c} label="B2C (Shopify / Delivery)" color="#6366f1" />
        <Segment stats={data.b2b} label="B2B (Field Sales / Trade)" color="#8b5cf6" />
      </div>
    </div>
  );
}
