'use client';

import { useState, useEffect } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import styles from './TargetCard.module.css';

interface TargetCardProps {
  title: string;
  actual: number;
  dateRange: { from: string; to: string } | null;
  storageKey: string;
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

export default function TargetCard({ title, actual, dateRange, storageKey }: TargetCardProps) {
  const [monthlyTargetStr, setMonthlyTargetStr] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) setMonthlyTargetStr(saved);
  }, [storageKey]);

  const handleTargetChange = (raw: string) => {
    const val = raw.replace(/[^0-9]/g, '');
    setMonthlyTargetStr(val);
    localStorage.setItem(storageKey, val);
  };

  const monthlyTarget = parseInt(monthlyTargetStr, 10) || 0;
  const dailyTarget = Math.round(monthlyTarget / 30);

  let daysInPeriod = 0;
  if (dateRange) {
    daysInPeriod = Math.max(1, differenceInDays(parseISO(dateRange.to), parseISO(dateRange.from)) + 1);
  }

  const periodTarget = dateRange ? dailyTarget * daysInPeriod : 0;
  const percentage = periodTarget > 0 ? Math.min((actual / periodTarget) * 100, 999) : 0;
  const displayPct = periodTarget > 0 ? percentage : 0;
  const diff = actual - periodTarget;

  let statusColor = 'var(--muted)';
  let statusBg = 'var(--surface2)';
  let statusLabel = '—';
  let barColor = 'var(--muted)';

  if (periodTarget > 0) {
    if (percentage >= 100) {
      statusColor = 'var(--green)'; statusBg = 'var(--green-light)'; statusLabel = 'On Track'; barColor = 'var(--green)';
    } else if (percentage >= 80) {
      statusColor = 'var(--amber)'; statusBg = 'var(--amber-light)'; statusLabel = 'Near'; barColor = 'var(--amber)';
    } else {
      statusColor = 'var(--red)'; statusBg = 'var(--red-light)'; statusLabel = 'Behind'; barColor = 'var(--red)';
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <div className={styles.titleGroup}>
          <div className={styles.title}>{title}</div>
        </div>
        <div className={styles.inputWrapper}>
          <span className={styles.inputLabel}>Target</span>
          <input
            type="text"
            className={styles.targetInput}
            value={monthlyTargetStr ? fmt(parseInt(monthlyTargetStr, 10)) : ''}
            onChange={e => handleTargetChange(e.target.value.replace(/,/g, ''))}
            placeholder="Monthly"
          />
        </div>
      </div>

      {periodTarget > 0 ? (
        <>
          <div className={styles.mainMetric}>
            <div className={styles.percentage} style={{ color: statusColor }}>
              {displayPct.toFixed(0)}%
            </div>
          </div>

          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${Math.min(displayPct, 100)}%`, background: barColor }} />
          </div>

          <div className={styles.bottomRow}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Actual</span>
              <span className={styles.metaValue}>PKR {fmtK(actual)}</span>
            </div>
            <div className={styles.statusBadge} style={{ color: statusColor, background: statusBg }}>
              {diff >= 0 ? '+' : ''}{fmtK(diff)}
            </div>
            <div className={styles.metaItem} style={{ textAlign: 'right' }}>
              <span className={styles.metaLabel}>Target</span>
              <span className={styles.metaValue}>PKR {fmtK(periodTarget)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.noTarget}>Set a monthly target to track performance</div>
      )}
    </div>
  );
}
