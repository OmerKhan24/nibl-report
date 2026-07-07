'use client';

import { useState } from 'react';
import styles from './DateFilter.module.css';
import { CalendarDays } from 'lucide-react';

interface Props {
  value: { from: string; to: string } | null;
  onChange: (range: { from: string; to: string }) => void;
}

export default function DateFilter({ value, onChange }: Props) {
  const [from, setFrom] = useState(value?.from ?? '');
  const [to,   setTo]   = useState(value?.to   ?? '');

  const apply = () => {
    if (from && to) onChange({ from, to });
  };

  return (
    <div className={styles.wrap}>
      <CalendarDays size={15} color="var(--muted)" />
      <label className={styles.label} htmlFor="filter-from">Custom:</label>
      <input
        id="filter-from"
        type="date"
        className={styles.input}
        value={from}
        max={to || undefined}
        onChange={e => setFrom(e.target.value)}
      />
      <span className={styles.sep}>→</span>
      <input
        id="filter-to"
        type="date"
        className={styles.input}
        value={to}
        min={from || undefined}
        onChange={e => setTo(e.target.value)}
      />
      <button
        className={styles.applyBtn}
        onClick={apply}
        disabled={!from || !to}
      >
        Apply
      </button>
    </div>
  );
}
