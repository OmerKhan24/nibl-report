'use client';

import { useState } from 'react';
import type { RepeatCustomers as RepeatData, RepeatWindow } from '@/lib/types';
import CountUp from './CountUp';
import styles from './RepeatCustomers.module.css';

interface CardProps {
  title: string;
  tag: string;
  window: RepeatWindow;
  data: RepeatData;
  city: string;
  color: string;
}

function RepeatCard({ title, tag, window: w, data, city, color }: CardProps) {
  const people = city === 'ALL' ? w.people : w.people.filter(p => p.city === city);
  const total = city === 'ALL' ? data.customers : data.byCity[city] || 0;
  const rate = total ? (people.length / total) * 100 : 0;

  return (
    <div className={styles.card} style={{ '--accent': color } as React.CSSProperties}>
      <div className={styles.top}>
        <div className={styles.title}>{title}</div>
        <div className={styles.tag}>{tag}</div>
      </div>
      <div className={styles.value}><CountUp value={people.length} /></div>
      <div className={styles.sub}>
        of {total} customers ordered again · <b><CountUp value={rate} format={n => `${n.toFixed(1)}%`} /></b>
      </div>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      {people.length > 0 && (
        <ul className={styles.list}>
          {people.map((p, i) => (
            <li key={`${p.name}-${i}`} className={styles.person}>
              <span className={styles.avatar}>{p.name.charAt(0).toUpperCase()}</span>
              <span className={styles.pname}>{p.name}</span>
              <span className={styles.pcity}>{p.city}</span>
              <span className={styles.pmeta}>{p.orders} orders · {p.gapDays}d gap</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RepeatCustomers({ data, b2b }: { data: RepeatData; b2b: RepeatData }) {
  const [city, setCity] = useState('ALL');

  const counts: Record<string, number> = {};
  for (const src of [data.byCity, b2b.byCity]) {
    for (const [c, n] of Object.entries(src || {})) counts[c] = (counts[c] || 0) + n;
  }
  const cities = Object.keys(counts).sort((a, b) =>
    a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)
  );
  const active = city === 'ALL' || cities.includes(city) ? city : 'ALL';

  return (
    <div className={styles.wrap}>
      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>City</span>
        <button className={`${styles.chip} ${active === 'ALL' ? styles.chipActive : ''}`} onClick={() => setCity('ALL')}>
          All cities
        </button>
        {cities.map(c => (
          <button key={c} className={`${styles.chip} ${active === c ? styles.chipActive : ''}`} onClick={() => setCity(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        <RepeatCard title="Repeat Customers · 30 Days" tag="Shopify" window={data.d30} data={data} city={active} color="#0ea5e9" />
        <RepeatCard title="Repeat Customers · 31–60 Days" tag="Shopify" window={data.d60} data={data} city={active} color="#0284c7" />
        <RepeatCard title="Repeat Customers · 30 Days" tag="B2B" window={b2b.d30} data={b2b} city={active} color="#7c3aed" />
        <RepeatCard title="Repeat Customers · 31–60 Days" tag="B2B" window={b2b.d60} data={b2b} city={active} color="#6d28d9" />
      </div>
    </div>
  );
}
