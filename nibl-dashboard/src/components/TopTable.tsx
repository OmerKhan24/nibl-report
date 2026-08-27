import { useState } from 'react';
import type { PartnerRevenue } from '@/lib/types';
import styles from './TopTable.module.css';

function fmt(n: number) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(n);
}

interface Props {
  title: string;
  subtitle: string;
  color: string;
  colorLight: string;
  rows: PartnerRevenue[];
  icon: string;
}

export default function TopTable({ title, subtitle, color, colorLight, rows, icon }: Props) {
  const [sortBy, setSortBy] = useState<'revenue' | 'dateAdded'>('revenue');

  const max = rows[0]?.revenue || 1;
  const sortedRows = [...rows].sort((a, b) => {
    if (sortBy === 'revenue') return b.revenue - a.revenue;
    const dateA = a.firstOrderDate ? new Date(a.firstOrderDate).getTime() : 0;
    const dateB = b.firstOrderDate ? new Date(b.firstOrderDate).getTime() : 0;
    return dateB - dateA; // Newest first
  });

  return (
    <div className={styles.card} style={{ '--accent': color, '--accent-light': colorLight } as React.CSSProperties}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.icon}>{icon}</span>
          <div>
            <div className={styles.title}>{title}</div>
            <div className={styles.subtitle}>{subtitle}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <select 
            className={styles.sortSelect} 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value as 'revenue' | 'dateAdded')}
          >
            <option value="revenue">Biggest Order to Least</option>
            <option value="dateAdded">Dates Added</option>
          </select>
          <span className={styles.badge}>{rows.length} accounts</span>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.thRank}>#</th>
            <th className={styles.thName}>Name</th>
            <th className={styles.thNum}>Orders</th>
            <th className={styles.thNum}>Revenue</th>
            <th className={styles.thNum}>Share</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r, i) => (
            <tr key={r.name} className={styles.row}>
              <td className={styles.rank}>{i + 1}</td>
              <td className={styles.name}>
                <div className={styles.nameText}>{r.name}</div>
                <div
                  className={styles.barWrap}
                  title={`PKR ${fmt(r.revenue)}`}
                >
                  <div
                    className={styles.barFill}
                    style={{ width: `${(r.revenue / max) * 100}%` }}
                  />
                </div>
              </td>
              <td className={styles.num}>{r.orders}</td>
              <td className={styles.num}><strong>PKR {fmt(r.revenue)}</strong></td>
              <td className={styles.num}>
                <span className={styles.pill}>{r.share.toFixed(1)}%</span>
              </td>
            </tr>
          ))}
          {sortedRows.length === 0 && (
            <tr>
              <td colSpan={5} className={styles.empty}>No data for selected period</td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
