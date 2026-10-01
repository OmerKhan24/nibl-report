'use client';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ChartSpec } from '@/lib/types';

const FALLBACK_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899'];

function fmt(v: unknown, currency?: boolean) {
  if (typeof v !== 'number') return String(v ?? '');
  if (currency) return `PKR ${v.toLocaleString()}`;
  return v.toLocaleString();
}

export default function ChartRenderer({ spec }: { spec: ChartSpec }) {
  const { type, title, data, xKey, series, currency } = spec;

  const tooltip = <Tooltip formatter={(v: unknown) => [fmt(v, currency), '']} />;

  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--text, #1e293b)' }}>{title}</p>
      <ResponsiveContainer width="100%" height={280}>
        {type === 'pie' ? (
          <PieChart>
            {tooltip}
            <Legend />
            <Pie data={data} dataKey={series[0]?.key ?? 'value'} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(1)}%`}>
              {data.map((_, i) => <Cell key={i} fill={series[i]?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />)}
            </Pie>
          </PieChart>
        ) : type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => currency ? `${(v/1000).toFixed(0)}K` : String(v)} />
            {tooltip}
            <Legend />
            {series.map((s, i) => <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color ?? FALLBACK_COLORS[i]} name={s.name} strokeWidth={2} dot={false} />)}
          </LineChart>
        ) : type === 'area' ? (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => currency ? `${(v/1000).toFixed(0)}K` : String(v)} />
            {tooltip}
            <Legend />
            {series.map((s, i) => <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color ?? FALLBACK_COLORS[i]} fill={s.color ?? FALLBACK_COLORS[i]} fillOpacity={0.15} name={s.name} />)}
          </AreaChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e2e8f0)" />
            <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => currency ? `${(v/1000).toFixed(0)}K` : String(v)} />
            {tooltip}
            <Legend />
            {series.map((s, i) => <Bar key={s.key} dataKey={s.key} fill={s.color ?? FALLBACK_COLORS[i]} name={s.name} radius={[4, 4, 0, 0]} />)}
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
