'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SalesApiResponse, InvoicesApiResponse } from '@/lib/types';
import styles from './MixDonut.module.css';

function fmtK(n: number) {
  if (n >= 1_000_000) return `PKR ${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `PKR ${(n/1_000).toFixed(0)}K`;
  return `PKR ${n}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipLabel}>{p.name}</div>
      <div className={styles.tooltipVal}>{fmtK(p.value)}</div>
      <div className={styles.tooltipPct}>{p.payload.pct}% of total</div>
    </div>
  );
};

export default function MixDonut({ sales, invoices }: { sales: SalesApiResponse; invoices: InvoicesApiResponse }) {
  const total = sales.total.revenue || 1;
  const data = [
    { name: 'B2C (Shopify)', value: Math.round(sales.b2c.revenue), pct: (sales.b2c.revenue/total*100).toFixed(1), color: '#0ea5e9' },
    { name: 'B2B (Direct)',  value: Math.round(sales.b2b.revenue), pct: (sales.b2b.revenue/total*100).toFixed(1), color: '#7c3aed' },
  ];

  const invData = [
    { name: 'Paid',      value: Math.round(invoices.paidAmount),    color: '#059669' },
    { name: 'Partial',   value: Math.round(invoices.partialAmount), color: '#d97706' },
    { name: 'Unpaid',    value: Math.round(invoices.notPaidAmount), color: '#dc2626' },
  ].filter(d => d.value > 0);

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

      <div className={styles.divider} />

      <div className={styles.subTitle}>Invoice Collection</div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={invData}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={65}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {invData.map((entry, i) => (
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

      <div className={styles.collectionRate}>
        <span className={styles.crLabel}>Collection Rate</span>
        <span className={styles.crValue} style={{ color: invoices.collectionRate > 50 ? '#059669' : '#dc2626' }}>
          {invoices.collectionRate.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
