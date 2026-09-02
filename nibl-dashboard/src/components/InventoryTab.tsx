import { useState, useMemo, useEffect } from 'react';
import type { InventoryApiResponse, SalesApiResponse, InventoryItem } from '@/lib/types';
import styles from './InventoryTab.module.css';

interface Props {
  data: InventoryApiResponse;
  sales: SalesApiResponse;
}

function getStatus(actual: number, target: number) {
  if (actual === target) return { color: 'green', msg: 'Best Green Zone', bg: '#ecfdf5', text: '#059669' };
  
  const diffPct = Math.abs(actual - target) / target;
  
  if (actual > target) {
    if (diffPct <= 0.20) return { color: 'green', msg: 'Green Zone (Over by < 20%)', bg: '#ecfdf5', text: '#059669' };
    if (diffPct <= 0.30) return { color: 'yellow', msg: 'See inventory', bg: '#fef3c7', text: '#d97706' };
    return { color: 'red', msg: 'Stop production', bg: '#fef2f2', text: '#dc2626' };
  } else {
    if (diffPct <= 0.10) return { color: 'green', msg: 'Green Zone', bg: '#ecfdf5', text: '#059669' };
    if (diffPct <= 0.30) return { color: 'yellow', msg: 'See productions and increase', bg: '#fef3c7', text: '#d97706' };
    return { color: 'red', msg: 'Do overtime double shift increase production drastically solve this issue in 24 hours', bg: '#fef2f2', text: '#dc2626' };
  }
}

export default function InventoryTab({ data, sales }: Props) {
  const [targetDoh, setTargetDoh] = useState<number>(7);
  const [targetStr, setTargetStr] = useState<string>('');

  useEffect(() => {
    setTargetStr(localStorage.getItem('nibl_sales_target') || '');
  }, []);

  const { growthPct, prevRev } = useMemo(() => {
    const monthlyTarget = parseInt(targetStr, 10) || 0;
    if (!monthlyTarget) return { growthPct: 0.20, prevRev: 0 };

    const prevMonthStr = data.prevMonthStart.substring(0, 7);
    const prevMonthData = sales.monthly.find(m => m.month === prevMonthStr);
    
    if (!prevMonthData) return { growthPct: 0.20, prevRev: 0 };
    
    const prevRev = prevMonthData.b2cRevenue + prevMonthData.b2bRevenue;
    if (prevRev === 0) return { growthPct: 0.20, prevRev: 0 };
    
    const growthPct = (monthlyTarget - prevRev) / prevRev;
    return { growthPct, prevRev };
  }, [targetStr, data.prevMonthStart, sales.monthly]);

  const tableData = useMemo(() => {
    return data.items.map(item => {
      const projSalesMonth = item.soldLastMonth * (1 + growthPct);
      const projSalesDay = projSalesMonth / 30;
      const actualDoh = projSalesDay > 0 ? item.currentStock / projSalesDay : item.currentStock > 0 ? 999 : 0;
      const requiredStock = projSalesDay * targetDoh;
      const requiredProduction = Math.max(0, projSalesMonth + requiredStock - item.currentStock);
      
      return {
        ...item,
        projSalesMonth,
        projSalesDay,
        actualDoh,
        requiredStock,
        requiredProduction,
        status: getStatus(actualDoh, targetDoh)
      };
    });
  }, [data.items, targetDoh, growthPct]);

  // Overall totals
  const totalStock = tableData.reduce((acc, curr) => acc + curr.currentStock, 0);
  const totalDaily = tableData.reduce((acc, curr) => acc + curr.projSalesDay, 0);
  const overallDoh = totalDaily > 0 ? totalStock / totalDaily : 0;
  const overallStatus = getStatus(overallDoh, targetDoh);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Production Plan & Inventory DOH</h2>
          <p className={styles.subtitle}>
            Projected sales based on {data.prevMonthStart} to {data.prevMonthEnd} 
            {targetStr ? ` (Target: PKR ${parseInt(targetStr, 10).toLocaleString()} → ${(growthPct * 100).toFixed(1)}% Growth)` : ' (+20% default growth factor)'}
          </p>
        </div>
        <div className={styles.controls}>
          <label className={styles.label}>Target DOH:</label>
          <input 
            type="number" 
            className={styles.input} 
            value={targetDoh} 
            onChange={(e) => setTargetDoh(Number(e.target.value) || 0)} 
            min="1"
            max="100"
          />
        </div>
      </div>

      <div className={styles.summaryCard} style={{ borderColor: overallStatus.text }}>
        <div className={styles.summaryTop}>
          <div>
            <div className={styles.summaryLabel}>Total Inventory</div>
            <div className={styles.summaryVal}>{Math.round(totalStock).toLocaleString()} units</div>
          </div>
          <div>
            <div className={styles.summaryLabel}>Projected Daily Sales</div>
            <div className={styles.summaryVal}>{totalDaily.toFixed(1)} units/day</div>
          </div>
          <div>
            <div className={styles.summaryLabel}>Overall Actual DOH</div>
            <div className={styles.summaryVal} style={{ color: overallStatus.text }}>
              {overallDoh.toFixed(1)} Days
            </div>
          </div>
        </div>
        <div className={styles.summaryStatus} style={{ background: overallStatus.bg, color: overallStatus.text }}>
          {overallStatus.msg}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thLeft}>Product</th>
                <th className={styles.thNum}>Units Sold (Prev Mo)</th>
                <th className={styles.thNum}>Proj. Monthly</th>
                <th className={styles.thNum}>Current Stock</th>
                <th className={styles.thNum}>Req. Production</th>
                <th className={styles.thNum}>Proj. Daily Sales</th>
                <th className={styles.thNum}>Target Stock (for {targetDoh} days)</th>
                <th className={styles.thNum}>Actual DOH</th>
                <th className={styles.thStatus}>Action / Status</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row) => (
                <tr key={row.id} className={styles.row}>
                  <td className={styles.tdLeft}>{row.name}</td>
                  <td className={styles.num}>{Math.round(row.soldLastMonth).toLocaleString()}</td>
                  <td className={styles.num} style={{ color: 'var(--b2b)', fontWeight: 600 }}>{Math.round(row.projSalesMonth).toLocaleString()}</td>
                  <td className={styles.num}>{Math.round(row.currentStock).toLocaleString()}</td>
                  <td className={styles.num} style={{ color: 'var(--blue)', fontWeight: 700 }}>{Math.round(row.requiredProduction).toLocaleString()}</td>
                  <td className={styles.num}>{row.projSalesDay.toFixed(1)}</td>
                  <td className={styles.num}>{Math.round(row.requiredStock).toLocaleString()}</td>
                  <td className={styles.num}>
                    <strong style={{ color: row.status.text }}>
                      {row.actualDoh > 990 ? '>999' : row.actualDoh.toFixed(1)}
                    </strong>
                  </td>
                  <td className={styles.tdStatus}>
                    <div className={styles.badge} style={{ background: row.status.bg, color: row.status.text }}>
                      {row.status.msg}
                    </div>
                  </td>
                </tr>
              ))}
              {tableData.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.empty}>No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
