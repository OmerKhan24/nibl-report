'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SalesApiResponse, InvoicesApiResponse } from '@/lib/types';
import styles from './MixDonut.module.css';

function fmtExact(n: number) {
  return `PKR ${new Intl.NumberFormat('en-PK').format(n)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{p.name}</div>
      <div className={styles.tooltipVal}>{fmtExact(p.value)}</div>
      <div className={styles.tooltipPct}>{p.payload.pct}% of total</div>
    </div>
  );
};

export default function MixDonut({ sales }: { sales: SalesApiResponse; invoices?: InvoicesApiResponse }) {
  const total = sales.total.revenue || 1;
  const data = [
    { name: 'B2C (Shopify)', value: Math.round(sales.b2c.revenue), pct: (sales.b2c.revenue/total*100).toFixed(1), color: '#0ea5e9' },
    { name: 'B2B (Direct)',  value: Math.round(sales.b2b.revenue), pct: (sales.b2b.revenue/total*100).toFixed(1), color: '#7c3aed' },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.title}>Revenue Mix</div>

      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={78}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={9}
            wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter', fontWeight: 600 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
