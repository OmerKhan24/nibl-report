import type { CashSource } from '@/lib/types';
import styles from './CashChart.module.css';

interface Props {
  sources: CashSource[];
  total: number;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

const COLORS: Record<string, string> = {
  'B2C (Shopify/Trax/Postex)': 'var(--b2c)',
  'Faysal Bank (KHI)': 'var(--b2b)',
  'Faysal Bank (ISB)': 'var(--b2b-light)',
  'Dubai Islamic (KHI)': '#10b981', // emerald
  'Dubai Islamic (ISB)': '#34d399', // emerald light
  'Cash in Hand (KHI)': '#f59e0b', // amber
  'Cash in Hand (ISB)': '#fbbf24', // amber light
};

export default function CashChart({ sources, total }: Props) {
  const sorted = [...sources].sort((a, b) => b.amount - a.amount);
  
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Cash Collection Overview</h2>
        <p className={styles.subtitle}>Daily cash generation by source & city</p>
      </div>

      <div className={styles.totalRow}>
        <div className={styles.bigValue}>PKR {total.toLocaleString()}</div>
        <div className={styles.totalLabel}>Total Inbound Cash</div>
      </div>

      <div className={styles.citySummary} style={{ display: 'flex', gap: '16px', margin: '0 24px 20px', padding: '16px', background: 'var(--surface2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
        <div className={styles.cityBox} style={{ flex: 1 }}>
          <div className={styles.cityLabel} style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Karachi Total</div>
          <div className={styles.cityAmount} style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>PKR {fmt(
            sources.filter(s => s.name.includes('(KHI)')).reduce((a, b) => a + b.amount, 0)
          )}</div>
        </div>
        <div className={styles.cityBox} style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
          <div className={styles.cityLabel} style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Islamabad Total</div>
          <div className={styles.cityAmount} style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>PKR {fmt(
            sources.filter(s => s.name.includes('(ISB)')).reduce((a, b) => a + b.amount, 0)
          )}</div>
        </div>
        <div className={styles.cityBox} style={{ flex: 1, borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
          <div className={styles.cityLabel} style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>B2C Total</div>
          <div className={styles.cityAmount} style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>PKR {fmt(
            sources.find(s => s.name.includes('B2C'))?.amount || 0
          )}</div>
        </div>
      </div>

      <div className={styles.barWrap}>
        <div className={styles.bar}>
          {sorted.map(s => {
            if (s.amount <= 0) return null;
            const pct = (s.amount / total) * 100;
            return (
              <div
                key={s.name}
                className={styles.segment}
                style={{ width: `${pct}%`, backgroundColor: COLORS[s.name] || '#ccc' }}
                title={`${s.name}: PKR ${s.amount.toLocaleString()}`}
              />
            );
          })}
        </div>
      </div>

      <div className={styles.legend}>
        {sorted.map(s => {
          if (s.amount <= 0) return null;
          const pct = ((s.amount / total) * 100).toFixed(1);
          return (
            <div key={s.name} className={styles.legendItem}>
              <div className={styles.dot} style={{ backgroundColor: COLORS[s.name] || '#ccc' }} />
              <div className={styles.details}>
                <div className={styles.name}>{s.name}</div>
                <div className={styles.amountWrap}>
                  <span className={styles.amount}>PKR {fmt(s.amount)}</span>
                  <span className={styles.pct}>{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
