'use client';

import { useEffect, useState } from 'react';
import type { OutstandingCustomer } from '@/lib/types';
import styles from './ReceivablesTable.module.css';
import { AlertCircle, Download } from 'lucide-react';

interface Props {
  customers: OutstandingCustomer[];
}

const LS_KEY = 'nibl_receivable_assignments';

export default function ReceivablesTable({ customers }: Props) {
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  // Local copy first (instant, survives if the server store is not persistent), then the shared copy wins.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setAssigned(JSON.parse(raw));
    } catch { /* ignore */ }
    fetch('/api/assignments')
      .then(r => (r.ok ? r.json() : null))
      .then(remote => {
        if (remote && Object.keys(remote).length) {
          setAssigned(prev => {
            const merged = { ...prev, ...remote };
            try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  const saveAssignment = (id: number, name: string) => {
    const clean = name.trim();
    if ((assigned[String(id)] || '') === clean) return;
    const next = { ...assigned };
    if (clean) next[String(id)] = clean; else delete next[String(id)];
    setAssigned(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    fetch('/api/assignments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: clean }),
    }).catch(() => {});
  };

  const downloadExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Receivables 90 Days',
          columns: [
            { key: 'customer', header: 'Customer', width: 40 },
            { key: 'invoices', header: 'Unpaid Invoices', width: 16 },
            { key: 'amount', header: 'Amount Owed', width: 20, currency: true },
            { key: 'assignedTo', header: 'Assigned To', width: 26 },
          ],
          rows: customers.map(c => ({
            customer: c.name,
            invoices: c.invoiceCount,
            amount: c.amountOutstanding,
            assignedTo: assigned[String(c.id)] || '',
          })),
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receivables_90_Days_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (!customers || customers.length === 0) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>Accounts Receivable (90 Days)</h2>
          <p className={styles.subtitle}>Top outstanding balances</p>
        </div>
        <div className={styles.empty}>
          All caught up! No outstanding balances over 90 days old.
        </div>
      </div>
    );
  }

  const totalOwed = customers.reduce((sum, c) => sum + (c.amountOutstanding || 0), 0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>Accounts Receivable (90 Days)</h2>
          <span className={styles.badge}>{customers.length} Customers</span>
          <button className={styles.exportBtn} onClick={downloadExcel} disabled={exporting}>
            <Download size={14} /> {exporting ? 'Preparing…' : 'Download Excel'}
          </button>
        </div>
        <p className={styles.subtitle}>Outstanding balances older than 90 days</p>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Unpaid Invoices</th>
              <th className={styles.right}>Amount Owed</th>
              <th>Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td className={styles.nameCell}>
                  <div className={styles.customerName}>{c.name}</div>
                </td>
                <td>
                  <span className={styles.countBadge}>{c.invoiceCount}</span>
                </td>
                <td className={styles.right}>
                  <div className={styles.amountWrap}>
                    <AlertCircle size={14} className={styles.alertIcon} />
                    <span className={styles.amount}>PKR {c.amountOutstanding.toLocaleString()}</span>
                  </div>
                </td>
                <td>
                  <input
                    key={`${c.id}-${assigned[String(c.id)] || ''}`}
                    className={styles.assignInput}
                    defaultValue={assigned[String(c.id)] || ''}
                    placeholder="Assign person…"
                    maxLength={80}
                    onBlur={e => saveAssignment(c.id, e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className={styles.totalRow}>
              <td colSpan={2} className={styles.totalLabel}>
                Total Outstanding
              </td>
              <td className={styles.right}>
                <span className={styles.totalAmount}>
                  PKR {totalOwed.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
