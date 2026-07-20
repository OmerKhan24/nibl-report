'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';
import type { MonthlyData } from '@/lib/types';
import styles from './RevenueChart.module.css';
import { format, parseISO } from 'date-fns';

function formatMonth(m: string) {
  try { return format(parseISO(`${m}-01`), 'MMM yy'); }
  catch { return m; }
}

function fmtExact(v: number) {
  return new Intl.NumberFormat('en-PK').format(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: { value: number }) => s + p.value, 0);
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{label}</div>
      {payload.map((p: { color: string; name: string; value: number }) => (
        <div key={p.name} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: p.color }} />
          <span>{p.name}:</span>
          <strong>PKR {new Intl.NumberFormat('en-PK').format(p.value)}</strong>
        </div>
      ))}
      <div className={styles.tooltipTotal}>
        Total: <strong>PKR {new Intl.NumberFormat('en-PK').format(total)}</strong>
      </div>
    </div>
  );
};

export default function RevenueChart({ data }: { data: MonthlyData[] }) {
  const chartData = data.map(d => ({
    month: formatMonth(d.month),
    'B2C (Shopify)': Math.round(d.b2cRevenue),
    'B2B (Direct)':  Math.round(d.b2bRevenue),
  }));

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.title}>📈 Monthly Revenue — B2C vs B2B</div>
        <div className={styles.subtitle}>Confirmed orders only</div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} margin={{ top: 24, right: 16, left: 16, bottom: 4 }} barGap={3}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="0" />
          <XAxis
            dataKey="month"
            tick={{ fill: '#64748b', fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500 }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tickFormatter={fmtExact}
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Inter, sans-serif' }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(203,213,225,0.3)' }} />
          <Legend
            wrapperStyle={{ fontSize: '13px', fontFamily: 'Inter, sans-serif', fontWeight: 600, paddingTop: '12px' }}
            iconType="circle"
            iconSize={10}
          />
          <Bar dataKey="B2C (Shopify)" fill="#0ea5e9" radius={[5, 5, 0, 0]} maxBarSize={48}>
            <LabelList dataKey="B2C (Shopify)" position="top" formatter={fmtExact} style={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} />
          </Bar>
          <Bar dataKey="B2B (Direct)"  fill="#7c3aed" radius={[5, 5, 0, 0]} maxBarSize={48}>
            <LabelList dataKey="B2B (Direct)" position="top" formatter={fmtExact} style={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
