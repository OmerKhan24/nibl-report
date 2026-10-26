import type { RepeatCustomers as RepeatData, RepeatWindow } from '@/lib/types';
import CountUp from './CountUp';
import styles from './RepeatCustomers.module.css';

interface CardProps {
  title: string;
  window: RepeatWindow;
  total: number;
  color: string;
}

function RepeatCard({ title, window: w, total, color }: CardProps) {
  return (
    <div className={styles.card} style={{ '--accent': color } as React.CSSProperties}>
      <div className={styles.top}>
        <div className={styles.title}>{title}</div>
        <div className={styles.tag}>Shopify</div>
      </div>
      <div className={styles.value}><CountUp value={w.count} /></div>
      <div className={styles.sub}>
        of {total} customers ordered again · <b><CountUp value={w.rate} format={n => `${n.toFixed(1)}%`} /></b>
      </div>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${Math.min(w.rate, 100)}%` }} />
      </div>
      {w.people.length > 0 && (
        <ul className={styles.list}>
          {w.people.map((p, i) => (
            <li key={`${p.name}-${i}`} className={styles.person}>
              <span className={styles.avatar}>{p.name.charAt(0).toUpperCase()}</span>
              <span className={styles.pname}>{p.name}</span>
              <span className={styles.pmeta}>{p.orders} orders · {p.gapDays}d gap</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function RepeatCustomers({ data }: { data: RepeatData }) {
  return (
    <div className={styles.grid}>
      <RepeatCard title="Repeat Customers · 30 Days" window={data.d30} total={data.customers} color="#0ea5e9" />
      <RepeatCard title="Repeat Customers · 60 Days" window={data.d60} total={data.customers} color="#7c3aed" />
    </div>
  );
}
