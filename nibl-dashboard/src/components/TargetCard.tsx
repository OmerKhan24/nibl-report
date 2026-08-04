'use client';

import { useState, useEffect } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { Target } from 'lucide-react';
import styles from './TargetCard.module.css';

interface TargetCardProps {
  title: string;
  actual: number;
  dateRange: { from: string; to: string } | null;
  storageKey: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { style: 'decimal', maximumFractionDigits: 0 }).format(n);
}

export default function TargetCard({ title, actual, dateRange, storageKey }: TargetCardProps) {
  const [monthlyTargetStr, setMonthlyTargetStr] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setMonthlyTargetStr(saved);
    }
  }, [storageKey]);

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // only allow numbers
    const val = e.target.value.replace(/[^0-9]/g, '');
    setMonthlyTargetStr(val);
    localStorage.setItem(storageKey, val);
  };

  const monthlyTarget = parseInt(monthlyTargetStr, 10) || 0;
  const dailyTarget = Math.round(monthlyTarget / 30);
  const weeklyTarget = dailyTarget * 7;

  // Calculate period target based on selected date range
  let daysInPeriod = 0;
  if (dateRange) {
    const from = parseISO(dateRange.from);
    const to = parseISO(dateRange.to);
    // +1 to include both start and end days
    daysInPeriod = Math.max(1, differenceInDays(to, from) + 1);
  }

  const periodTarget = dateRange ? dailyTarget * daysInPeriod : 0;
  
  let percentage = 0;
  if (periodTarget > 0) {
    percentage = (actual / periodTarget) * 100;
  }

  // RAG Status calculation
  let statusClass = '';
  if (dateRange && periodTarget > 0) {
    if (percentage >= 100) {
      statusClass = styles.statusGreen;
    } else if (percentage >= 80) {
      statusClass = styles.statusYellow;
    } else {
      statusClass = styles.statusRed;
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            <Target size={20} className={styles.highlight} />
            {title} Target Tracking
          </div>
          <div className={styles.subtitle}>
            {dateRange 
              ? `Tracking performance for selected ${daysInPeriod} day(s)` 
              : 'Select a date range to view period performance'}
          </div>
        </div>

        <div className={styles.targetInputWrapper}>
          <label className={styles.inputLabel}>Monthly Target (PKR)</label>
          <input
            type="text"
            className={styles.targetInput}
            value={monthlyTargetStr ? fmt(parseInt(monthlyTargetStr, 10)) : ''}
            onChange={(e) => {
              // Strip commas for parsing
              const raw = e.target.value.replace(/,/g, '');
              const eMock = { target: { value: raw } } as React.ChangeEvent<HTMLInputElement>;
              handleTargetChange(eMock);
            }}
            placeholder="e.g. 100,000"
          />
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricBox}>
          <div className={styles.metricLabel}>Daily Target</div>
          <div className={styles.metricValue}>PKR {fmt(dailyTarget)}</div>
        </div>
        <div className={styles.metricBox}>
          <div className={styles.metricLabel}>Weekly Target</div>
          <div className={styles.metricValue}>PKR {fmt(weeklyTarget)}</div>
        </div>
        
        {dateRange && (
          <>
            <div className={styles.metricBox}>
              <div className={styles.metricLabel}>Period Target ({daysInPeriod} Days)</div>
              <div className={styles.metricValue}>PKR {fmt(periodTarget)}</div>
            </div>
            
            <div className={`${styles.metricBox} ${statusClass}`}>
              <div className={styles.metricLabel}>
                Actual vs Target
              </div>
              <div className={styles.metricValue}>
                {percentage.toFixed(1)}%
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px', opacity: 0.8 }}>
                Diff: PKR {fmt(actual - periodTarget)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
