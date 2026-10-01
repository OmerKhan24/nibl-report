'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Download, ArrowLeft, Send, RefreshCw, Loader2, Pencil, Check, X } from 'lucide-react';
import type { SavedReport, ChartSpec, ReportTableColumn } from '@/lib/types';
import ChartRenderer from './ChartRenderer';
import styles from './ReportsTab.module.css';

// ── Simple markdown renderer ─────────────────────────────────────────────────
function MarkdownNarrative({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip fenced code blocks
    if (line.trimStart().startsWith('```')) {
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) i++;
      i++;
      continue;
    }

    // Skip markdown table lines (rendered separately as DataTable)
    if (line.trim().startsWith('|')) {
      while (i < lines.length && lines[i].trim().startsWith('|')) i++;
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className={styles.mdH3}>{renderInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className={styles.mdH2}>{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className={styles.mdH1}>{renderInline(line.slice(2))}</h2>);
    } else if (line === '---' || line === '***') {
      elements.push(<hr key={i} className={styles.mdHr} />);
    } else if (line.trim() === '') {
      // blank — natural spacing
    } else {
      elements.push(<p key={i} className={styles.mdP}>{renderInline(line)}</p>);
    }
    i++;
  }

  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

// ── Report list card ─────────────────────────────────────────────────────────
function ReportCard({ report, onOpen, onDelete }: {
  report: SavedReport;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={styles.card} onClick={onOpen}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>{report.title}</span>
        <button className={styles.deleteBtn} onClick={e => { e.stopPropagation(); onDelete(); }} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
      <p className={styles.cardQuery}>{report.query}</p>
      <div className={styles.cardMeta}>
        <span>{new Date(report.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        <span className={styles.modelBadge}>{report.model.includes('haiku') ? 'Haiku' : 'Sonnet'}</span>
        <span>{report.tableData.length} rows</span>
      </div>
    </div>
  );
}

// ── Data table ───────────────────────────────────────────────────────────────
function DataTable({ columns, rows }: { columns: ReportTableColumn[]; rows: Record<string, unknown>[] }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{columns.map(c => <th key={c.key}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c.key} style={{ textAlign: c.currency ? 'right' : 'left' }}>
                  {c.currency && typeof row[c.key] === 'number'
                    ? `PKR ${Number(row[c.key]).toLocaleString()}`
                    : String(row[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function ReportsTab() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<SavedReport | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [renamingTitle, setRenamingTitle] = useState('');
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { fetchReports(); }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      setReports(await res.json());
    } finally {
      setLoading(false);
    }
  }

  async function generate(userPrompt: string, existingReport?: SavedReport) {
    const messages = existingReport
      ? [
          { role: 'user' as const, content: existingReport.query },
          { role: 'assistant' as const, content: existingReport.narrative },
          { role: 'user' as const, content: userPrompt },
        ]
      : [{ role: 'user' as const, content: userPrompt }];

    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  }

  // Parse table from JSON block first, then fall back to markdown table
  function parseTableFromText(text: string): { rows: Record<string, unknown>[]; columns: ReportTableColumn[] } | null {
    // 1. Try JSON block
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const keys = Object.keys(parsed[0]);
          return {
            rows: parsed,
            columns: keys.map(k => ({
              key: k,
              header: k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              currency: /amount|revenue|value|price|total|pkr/i.test(k),
            })),
          };
        }
      } catch { /* not valid JSON */ }
    }

    // 2. Fall back: parse markdown table
    return parseMarkdownTable(text);
  }

  function parseMarkdownTable(text: string): { rows: Record<string, unknown>[]; columns: ReportTableColumn[] } | null {
    const lines = text.split('\n');
    let headerIdx = -1;

    for (let i = 0; i < lines.length - 2; i++) {
      const cur = lines[i].trim();
      const next = lines[i + 1].trim();
      if (cur.startsWith('|') && next.replace(/[\s|:-]/g, '') === '') {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) return null;

    const rawHeaders = lines[headerIdx].split('|').map(h => h.trim()).filter(Boolean);
    const dataStart = headerIdx + 2;
    const rows: Record<string, unknown>[] = [];

    for (let i = dataStart; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.startsWith('|')) break;
      const cells = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length === 0) break;
      const row: Record<string, unknown> = {};
      rawHeaders.forEach((h, idx) => {
        const val = (cells[idx] ?? '').replace(/^—$/, '');
        const num = parseFloat(val.replace(/,/g, ''));
        row[h] = !isNaN(num) && val !== '' ? num : val;
      });
      rows.push(row);
    }

    if (rows.length === 0) return null;

    const columns: ReportTableColumn[] = rawHeaders.map(h => ({
      key: h,
      header: h,
      currency: /revenue|pkr|amount|value|price|total/i.test(h),
    }));

    return { rows, columns };
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const data = await generate(prompt);
      const tableResult = parseTableFromText(data.text);
      const report: Omit<SavedReport, 'id' | 'createdAt'> = {
        title: prompt.slice(0, 80),
        query: prompt,
        narrative: data.text,
        tableData: tableResult?.rows ?? [],
        tableColumns: tableResult?.columns ?? [],
        chartSpecs: data.chartSpecs ?? [],
        model: data.model,
      };
      const saveRes = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      const saved: SavedReport = await saveRes.json();
      setReports(prev => [saved, ...prev]);
      setActiveReport(saved);
      setShowNew(false);
      setPrompt('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
    }
  }

  async function handleEdit() {
    if (!editPrompt.trim() || !activeReport) return;
    setEditLoading(true);
    try {
      const data = await generate(editPrompt, activeReport);
      const tableResult = parseTableFromText(data.text);
      const updated: SavedReport = {
        ...activeReport,
        narrative: data.text,
        tableData: tableResult?.rows ?? activeReport.tableData,
        tableColumns: tableResult?.columns ?? activeReport.tableColumns,
        chartSpecs: data.chartSpecs?.length ? data.chartSpecs : activeReport.chartSpecs,
        model: data.model,
      };
      await fetch('/api/reports', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activeReport.id }) });
      const saveRes = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      const saved: SavedReport = await saveRes.json();
      setActiveReport(saved);
      setReports(prev => [saved, ...prev.filter(r => r.id !== activeReport.id)]);
      setEditPrompt('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update report');
    } finally {
      setEditLoading(false);
    }
  }

  async function handleRename() {
    if (!renamingTitle.trim() || !activeReport) return;
    const updated: SavedReport = { ...activeReport, title: renamingTitle.trim() };
    await fetch('/api/reports', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activeReport.id }) });
    const saveRes = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    const saved: SavedReport = await saveRes.json();
    setActiveReport(saved);
    setReports(prev => [saved, ...prev.filter(r => r.id !== activeReport.id)]);
    setRenaming(false);
  }

  async function handleExport() {
    if (!activeReport) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export/excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: activeReport.title, rows: activeReport.tableData, columns: activeReport.tableColumns }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ?? 'report.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch('/api/reports', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setReports(prev => prev.filter(r => r.id !== id));
    if (activeReport?.id === id) setActiveReport(null);
  }

  // ── Report viewer ──────────────────────────────────────────────────────────
  if (activeReport) {
    return (
      <div className={styles.viewer}>
        <div className={styles.viewerHeader}>
          <button className={styles.backBtn} onClick={() => setActiveReport(null)}>
            <ArrowLeft size={15} /> All Reports
          </button>

          {renaming ? (
            <div className={styles.renameRow}>
              <input
                className={styles.renameInput}
                value={renamingTitle}
                onChange={e => setRenamingTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                autoFocus
              />
              <button className={styles.renameOk} onClick={handleRename} title="Save"><Check size={14} /></button>
              <button className={styles.renameCancel} onClick={() => setRenaming(false)} title="Cancel"><X size={14} /></button>
            </div>
          ) : (
            <div className={styles.titleRow}>
              <h2 className={styles.viewerTitle}>{activeReport.title}</h2>
              <button className={styles.renameBtn} onClick={() => { setRenamingTitle(activeReport.title); setRenaming(true); }} title="Rename">
                <Pencil size={13} />
              </button>
            </div>
          )}

          <div className={styles.viewerActions}>
            <span className={styles.modelBadge}>{activeReport.model.includes('haiku') ? 'Haiku' : 'Sonnet'}</span>
            <button className={styles.exportBtn} onClick={handleExport} disabled={exporting || !activeReport.tableData.length}>
              {exporting ? <Loader2 size={14} className={styles.spin} /> : <Download size={14} />}
              Export Excel
            </button>
          </div>
        </div>

        {/* AI Narrative */}
        <div className={styles.narrative}>
          <MarkdownNarrative text={activeReport.narrative} />
        </div>

        {/* Charts */}
        {activeReport.chartSpecs.map((spec, i) => (
          <ChartRenderer key={i} spec={spec as ChartSpec} />
        ))}

        {/* Table */}
        {activeReport.tableColumns.length > 0 && (
          <DataTable columns={activeReport.tableColumns} rows={activeReport.tableData} />
        )}

        {/* Inline edit */}
        <div className={styles.editBox}>
          <p className={styles.editLabel}>Refine this report with AI</p>
          <div className={styles.editRow}>
            <input
              className={styles.editInput}
              placeholder='e.g. "break down by city too" or "add a forecast for next month"'
              value={editPrompt}
              onChange={e => setEditPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !editLoading && handleEdit()}
              disabled={editLoading}
            />
            <button className={styles.editSend} onClick={handleEdit} disabled={editLoading || !editPrompt.trim()}>
              {editLoading ? <Loader2 size={14} className={styles.spin} /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Report list ────────────────────────────────────────────────────────────
  return (
    <div className={styles.root}>
      <div className={styles.listHeader}>
        <div>
          <h2 className={styles.listTitle}>AI Reports</h2>
          <p className={styles.listSub}>Generate, save, and refine reports from Odoo data</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshList} onClick={fetchReports} title="Refresh"><RefreshCw size={14} /></button>
          <button className={styles.newBtn} onClick={() => setShowNew(true)}><Plus size={15} /> New Report</button>
        </div>
      </div>

      {showNew && (
        <div className={styles.newBox}>
          <p className={styles.newLabel}>What report do you need?</p>
          <textarea
            ref={inputRef}
            className={styles.newInput}
            placeholder="e.g. SKU-wise city-wise sales for September 2026 with revenue and quantity"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className={styles.newActions}>
            <button className={styles.cancelBtn} onClick={() => { setShowNew(false); setPrompt(''); }}>Cancel</button>
            <button className={styles.generateBtn} onClick={handleGenerate} disabled={generating || !prompt.trim()}>
              {generating ? <><Loader2 size={14} className={styles.spin} /> Generating…</> : <><Plus size={14} /> Generate Report</>}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className={styles.loadState}><Loader2 size={24} className={styles.spin} /> Loading reports…</div>
      ) : reports.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No reports yet.</p>
          <p>Click <strong>New Report</strong> and describe what you need in plain English.</p>
          <p className={styles.examples}>
            Examples: "Top 20 customers by revenue this month" · "Cash collected by city for Sep" · "SKU stock vs sales last 30 days"
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {reports.map(r => (
            <ReportCard key={r.id} report={r} onOpen={() => setActiveReport(r)} onDelete={() => handleDelete(r.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
