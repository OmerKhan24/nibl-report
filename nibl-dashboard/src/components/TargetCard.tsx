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
  let daysElapsed = 0;
  
  if (dateRange) {
    const fromDate = parseISO(dateRange.from);
    const toDate = parseISO(dateRange.to);
    const today = new Date();
    
    daysInPeriod = Math.max(1, differenceInDays(toDate, fromDate) + 1);
    
    // Calculate how many days have elapsed from 'from' to 'today'
    daysElapsed = differenceInDays(today, fromDate) + 1;
    if (daysElapsed < 0) daysElapsed = 0;
    if (daysElapsed > daysInPeriod) daysElapsed = daysInPeriod;
  }

  // The full target for the selected date range (e.g., whole month = 8.0M)
  const fullPeriodTarget = dateRange ? dailyTarget * daysInPeriod : 0;
  
  // The target we SHOULD have achieved by today
  const expectedTargetToDate = dateRange ? dailyTarget * daysElapsed : 0;

  const actualPctOfMonthly = monthlyTarget > 0 ? (actual / monthlyTarget) * 100 : 0;
  
  // Time-based expected percentage (e.g., 14 days / 30 days = ~46.6%)
  const expectedPctToDate = monthlyTarget > 0 ? (expectedTargetToDate / monthlyTarget) * 100 : 0;
  
  // Full target percentage (e.g., 30/30 = 100%)
  const fullPeriodPct = monthlyTarget > 0 ? (fullPeriodTarget / monthlyTarget) * 100 : 0;

  const pctDiff = actualPctOfMonthly - expectedPctToDate;
  const diff = actual - expectedTargetToDate;

  const pacingPercentage = expectedTargetToDate > 0 ? (actual / expectedTargetToDate) * 100 : 0;

  let statusColor = 'var(--muted)';
  let statusBg = 'var(--surface2)';
  let barColor = 'var(--muted)';

  if (expectedTargetToDate > 0) {
    if (pacingPercentage >= 100) {
      statusColor = 'var(--green)'; statusBg = 'var(--green-light)'; barColor = 'var(--green)';
    } else if (pacingPercentage >= 80) {
      statusColor = 'var(--amber)'; statusBg = 'var(--amber-light)'; barColor = 'var(--amber)';
    } else {
      statusColor = 'var(--red)'; statusBg = 'var(--red-light)'; barColor = 'var(--red)';
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

      {fullPeriodTarget > 0 ? (
        <>
          <div className={styles.mainMetric}>
            <div className={styles.percentage} style={{ color: statusColor, display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              {actualPctOfMonthly.toFixed(1)}% <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 'normal' }}>of month</span>
            </div>
          </div>

          <div className={styles.progressBar} style={{ position: 'relative' }}>
            <div className={styles.progressFill} style={{ width: `${Math.min(actualPctOfMonthly, 100)}%`, background: barColor }} />
            {expectedPctToDate > 0 && expectedPctToDate <= 100 && (
              <div 
                style={{
                  position: 'absolute',
                  top: '-4px',
                  bottom: '-4px',
                  left: `${expectedPctToDate}%`,
                  width: '2px',
                  background: 'var(--text-main)',
                  zIndex: 2,
                  boxShadow: '0 0 2px rgba(0,0,0,0.5)'
                }}
                title={`Should be at: ${expectedPctToDate.toFixed(1)}%`}
              />
            )}
          </div>

          <div className={styles.bottomRow}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Actual</span>
              <span className={styles.metaValue}>PKR {fmtK(actual)}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500, textTransform: 'uppercase' }}>
                Should be {expectedPctToDate.toFixed(0)}%
              </div>
              <div className={styles.statusBadge} style={{ color: statusColor, background: statusBg, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 10px', gap: '2px', lineHeight: '1.2' }}>
                <div style={{ fontWeight: 600 }}>{diff >= 0 ? '+' : ''}{fmtK(diff)}</div>
                <div style={{ fontSize: '0.85em', opacity: 0.85 }}>{pctDiff >= 0 ? '+' : ''}{pctDiff.toFixed(1)}%</div>
              </div>
            </div>

            <div className={styles.metaItem} style={{ textAlign: 'right' }}>
              <span className={styles.metaLabel}>Target ({fullPeriodPct.toFixed(0)}%)</span>
              <span className={styles.metaValue}>PKR {fmtK(fullPeriodTarget)}</span>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.noTarget}>Set a monthly target to track performance</div>
      )}
    </div>
  );
}
