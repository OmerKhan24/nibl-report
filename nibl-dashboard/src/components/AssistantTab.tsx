'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Bot, User, Loader2, Settings, X, ChevronDown } from 'lucide-react';
import { nanoid } from 'nanoid';
import type { ChatMessage, UsageTotals, DashboardSettings, ChartSpec } from '@/lib/types';
import ChartRenderer from './ChartRenderer';
import styles from './AssistantTab.module.css';

const SESSION_ID = typeof window !== 'undefined'
  ? (localStorage.getItem('nibl_chat_session') ?? (() => { const id = nanoid(8); localStorage.setItem('nibl_chat_session', id); return id; })())
  : 'ssr';

const MODEL_LABELS: Record<string, string> = {
  auto: 'Auto (recommended)',
  'claude-sonnet-4-6': 'Sonnet 4.6 — complex reports',
  'claude-haiku-4-5-20251001': 'Haiku 4.5 — fast & cheap',
};

// ── Inline markdown renderer ─────────────────────────────────────────────────
function stripMd(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').trim();
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function MarkdownContent({ text, isUser }: { text: string; isUser: boolean }) {
  if (!text) return null;
  if (isUser) return <p className={styles.mdP}>{text}</p>;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trimStart().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(<pre key={`code-${i}`} className={styles.mdCode}><code>{codeLines.join('\n')}</code></pre>);
      i++;
      continue;
    }

    // Markdown table
    if (line.trim().startsWith('|') && i + 1 < lines.length && lines[i + 1].replace(/[\s|:-]/g, '') === '') {
      const headers = line.split('|').map(h => stripMd(h)).filter(Boolean);
      const dataStart = i + 2;
      const tableRows: string[][] = [];
      let j = dataStart;
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableRows.push(lines[j].split('|').map(c => stripMd(c)).filter(Boolean));
        j++;
      }
      elements.push(
        <div key={`tbl-${i}`} className={styles.mdTableWrap}>
          <table className={styles.mdTable}>
            <thead><tr>{headers.map((h, hi) => <th key={hi}>{renderInline(h)}</th>)}</tr></thead>
            <tbody>
              {tableRows.map((cells, ri) => (
                <tr key={ri}>{headers.map((_, ci) => <td key={ci}>{renderInline(cells[ci] ?? '')}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      i = j;
      continue;
    }

    // Skip lone separator lines
    if (/^\|[-| :]+\|$/.test(line.trim())) { i++; continue; }

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className={styles.mdH3}>{renderInline(line.slice(4))}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className={styles.mdH2}>{renderInline(line.slice(3))}</h3>);
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className={styles.mdH1}>{renderInline(line.slice(2))}</h2>);
    } else if (line === '---' || line === '***') {
      elements.push(<hr key={i} className={styles.mdHr} />);
    } else if (line.trim() === '') {
      // natural spacing
    } else {
      elements.push(<p key={i} className={styles.mdP}>{renderInline(line)}</p>);
    }
    i++;
  }

  return <>{elements}</>;
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleBot}`}>
      <div className={styles.bubbleIcon}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={styles.bubbleBody}>
        <div className={styles.bubbleText}>
          <MarkdownContent text={msg.content} isUser={isUser} />
        </div>
        {msg.chartSpecs?.map((spec, i) => (
          <ChartRenderer key={i} spec={spec as ChartSpec} />
        ))}
        <div className={styles.bubbleMeta}>
          <span>{new Date(msg.timestamp).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</span>
          {msg.model && <span className={styles.modelTag}>{msg.model.includes('haiku') ? 'Haiku' : 'Sonnet'}</span>}
          {msg.costUsd !== undefined && <span>${msg.costUsd.toFixed(4)}</span>}
        </div>
      </div>
    </div>
  );
}

function UsagePanel({ usage, settings, onSaveBalance }: {
  usage: UsageTotals;
  settings: DashboardSettings;
  onSaveBalance: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(settings.apiBalance ?? ''));

  const spent = usage.totalCostUsd;
  const balance = settings.apiBalance;
  const remaining = balance !== undefined ? balance - spent : null;
  const pct = balance ? Math.min((spent / balance) * 100, 100) : 0;

  return (
    <div className={styles.usagePanel}>
      <div className={styles.usageRow}>
        <span className={styles.usageLabel}>API Spend</span>
        <span className={styles.usageValue}>${spent.toFixed(4)}</span>
      </div>
      {remaining !== null && (
        <>
          <div className={styles.progressBg}>
            <div className={styles.progressBar} style={{ width: `${pct}%`, background: pct > 80 ? '#ef4444' : '#3b82f6' }} />
          </div>
          <div className={styles.usageRow}>
            <span className={styles.usageLabel}>Balance remaining</span>
            <span className={styles.usageValue} style={{ color: remaining < 5 ? '#ef4444' : '#10b981' }}>
              ${remaining.toFixed(2)}
            </span>
          </div>
        </>
      )}
      <div className={styles.usageRow}>
        <span className={styles.usageLabel}>Tokens used</span>
        <span className={styles.usageValue}>{(usage.totalInputTokens + usage.totalOutputTokens).toLocaleString()}</span>
      </div>
      <div className={styles.usageRow}>
        <span className={styles.usageLabel}>Queries</span>
        <span className={styles.usageValue}>{usage.sessionCount}</span>
      </div>
      {editing ? (
        <div className={styles.balanceEdit}>
          <input
            className={styles.balanceInput}
            type="number"
            placeholder="Enter current balance ($)"
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
          />
          <button className={styles.balanceSave} onClick={() => { onSaveBalance(parseFloat(val)); setEditing(false); }}>
            Save
          </button>
          <button className={styles.balanceCancel} onClick={() => setEditing(false)}><X size={12} /></button>
        </div>
      ) : (
        <button className={styles.balanceSetBtn} onClick={() => setEditing(true)}>
          <Settings size={12} /> {balance !== undefined ? 'Update balance' : 'Set current balance'}
        </button>
      )}
    </div>
  );
}

export default function AssistantTab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState('auto');
  const [usage, setUsage] = useState<UsageTotals>({ totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0, sessionCount: 0 });
  const [settings, setSettings] = useState<DashboardSettings>({});
  const [showUsage, setShowUsage] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => {
      setSettings(d.settings ?? {});
      setUsage(d.usage ?? usage);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || sending) return;
    const userMsg: ChatMessage = { id: nanoid(), role: 'user', content: input.trim(), timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          model: model === 'auto' ? undefined : model,
          sessionId: SESSION_ID,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const botMsg: ChatMessage = {
        id: nanoid(),
        role: 'assistant',
        content: data.text ?? '(No response)',
        chartSpecs: data.chartSpecs,
        model: data.model,
        costUsd: data.usage?.costUsd,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);
      if (data.usageTotals) setUsage(data.usageTotals);
    } catch (e) {
      const errMsg: ChatMessage = {
        id: nanoid(), role: 'assistant',
        content: `Error: ${e instanceof Error ? e.message : 'Something went wrong'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, messages, model]);

  async function saveBalance(val: number) {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiBalance: val, balanceSetAt: new Date().toISOString() }),
    });
    const updated = await res.json();
    setSettings(updated);
  }

  return (
    <div className={styles.root}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        <div className={styles.modelPicker}>
          <Bot size={14} />
          <select className={styles.modelSelect} value={model} onChange={e => setModel(e.target.value)}>
            {Object.entries(MODEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown size={12} />
        </div>

        <button className={styles.usageToggle} onClick={() => setShowUsage(p => !p)}>
          ${usage.totalCostUsd.toFixed(3)} spent
          {settings.apiBalance !== undefined && (
            <span style={{ color: '#10b981', marginLeft: 6 }}>
              · ${Math.max(settings.apiBalance - usage.totalCostUsd, 0).toFixed(2)} left
            </span>
          )}
          <ChevronDown size={12} style={{ transform: showUsage ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
      </div>

      {showUsage && (
        <UsagePanel usage={usage} settings={settings} onSaveBalance={saveBalance} />
      )}

      {/* ── Message thread ── */}
      <div className={styles.thread}>
        {messages.length === 0 && (
          <div className={styles.welcome}>
            <Bot size={32} />
            <h3>NIBL AI Assistant</h3>
            <p>Ask anything about your Odoo data — sales, cash, inventory, customers.</p>
            <div className={styles.suggestions}>
              {[
                'Top 10 customers by revenue this month',
                'Cash collected by journal for September',
                'SKU-wise sales with city breakdown',
                'Outstanding receivables by customer',
              ].map(s => (
                <button key={s} className={styles.suggestion} onClick={() => { setInput(s); inputRef.current?.focus(); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {sending && (
          <div className={`${styles.bubble} ${styles.bubbleBot}`}>
            <div className={styles.bubbleIcon}><Bot size={14} /></div>
            <div className={styles.bubbleBody}>
              <div className={styles.typing}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className={styles.inputArea}>
        <textarea
          ref={inputRef}
          className={styles.input}
          placeholder="Ask about sales, cash, inventory, customers…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={2}
          disabled={sending}
        />
        <button className={styles.sendBtn} onClick={send} disabled={sending || !input.trim()}>
          {sending ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
