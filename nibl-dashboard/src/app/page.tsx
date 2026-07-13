'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SalesApiResponse, InvoicesApiResponse } from '@/lib/types';
import KpiRow from '@/components/KpiRow';
import ChannelCards from '@/components/ChannelCards';
import RevenueChart from '@/components/RevenueChart';
import MixDonut from '@/components/MixDonut';
import TopTable from '@/components/TopTable';
import InvoiceStatus from '@/components/InvoiceStatus';
import DateFilter from '@/components/DateFilter';
import CityChart from '@/components/CityChart';
import DeliveryChart from '@/components/DeliveryChart';
import CashTab from '@/components/CashTab';
import { CreditCard, BarChart2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { RefreshCw, TrendingUp, Wifi, WifiOff } from 'lucide-react';
import styles from './page.module.css';

export type DateRange = { from: string; to: string } | null;

function fmtDate(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

const PRESETS = [
  { label: 'This Month', getValue: () => ({ from: fmtDate(startOfMonth(new Date())), to: fmtDate(endOfMonth(new Date())) }) },
  { label: 'Last Month', getValue: () => { const lm = subMonths(new Date(), 1); return { from: fmtDate(startOfMonth(lm)), to: fmtDate(endOfMonth(lm)) }; } },
  { label: 'Last 3 Months', getValue: () => ({ from: fmtDate(startOfMonth(subMonths(new Date(), 2))), to: fmtDate(endOfMonth(new Date())) }) },
  { label: 'This Year', getValue: () => ({ from: fmtDate(startOfYear(new Date())), to: fmtDate(new Date()) }) },
  { label: 'All Time', getValue: () => null },
];

export default function DashboardPage() {
  const [dateRange, setDateRange]   = useState<DateRange>(PRESETS[3].getValue()); // default: This Year
  const [activePreset, setActivePreset] = useState(3);
  const [activeTab, setActiveTab]       = useState<'sales' | 'cash'>('sales');
  const [sales, setSales]               = useState<SalesApiResponse | null>(null);
  const [invoices, setInvoices]         = useState<InvoicesApiResponse | null>(null);
  const [cash, setCash]                 = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [isOnline, setIsOnline]     = useState(true);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildQuery = useCallback((range: DateRange) => {
    const params = new URLSearchParams();
    if (range) {
      params.set('from', range.from);
      params.set('to', range.to);
    }
    return params.toString() ? `?${params.toString()}` : '';
  }, []);

  const fetchData = useCallback(async (range: DateRange, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const q = buildQuery(range);
      const [salesRes, invRes, cashRes] = await Promise.all([
        fetch(`/api/sales${q}`),
        fetch(`/api/invoices${q}`),
        fetch(`/api/payments${q}`)
      ]);
      if (!salesRes.ok || !invRes.ok || !cashRes.ok) {
        throw new Error(`API error fetching data`);
      }
      const [salesData, invData, cashData] = await Promise.all([salesRes.json(), invRes.json(), cashRes.json()]);
      if (salesData.error) throw new Error(salesData.error);
      if (invData.error)   throw new Error(invData.error);
      if (cashData.error)  throw new Error(cashData.error);
      
      setSales(salesData);
      setInvoices(invData);
      setCash(cashData);
      setLastUpdated(new Date());
      setIsOnline(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
      setIsOnline(false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [buildQuery]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    fetchData(dateRange);
    const schedule = () => {
      refreshTimer.current = setTimeout(() => {
        fetchData(dateRange, true);
        schedule();
      }, 5 * 60 * 1000);
    };
    schedule();
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [dateRange, fetchData]);

  const handlePreset = (idx: number) => {
    setActivePreset(idx);
    setDateRange(PRESETS[idx].getValue());
  };

  const handleCustomRange = (range: { from: string; to: string }) => {
    setActivePreset(-1);
    setDateRange(range);
  };

  const handleRefresh = () => fetchData(dateRange);

  const now = new Date();
  const nowStr = format(now, 'EEEE, dd MMMM yyyy');
  const timeStr = format(now, 'hh:mm a');

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <TrendingUp size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className={styles.title}>NIBL Foods</h1>
            <p className={styles.subtitle}>COO Sales Performance Dashboard</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.dateTime}>
            <span className={styles.dateStr}>{nowStr}</span>
            <span className={styles.timeStr}>{timeStr}</span>
          </div>
          <div className={styles.statusRow}>
            {isOnline
              ? <span className={styles.online}><Wifi size={13}/> Live</span>
              : <span className={styles.offline}><WifiOff size={13}/> Offline</span>
            }
            {lastUpdated && (
              <span className={styles.updated}>
                Updated {format(lastUpdated, 'hh:mm a')}
              </span>
            )}
            <button className={styles.refreshBtn} onClick={handleRefresh} disabled={loading} title="Refresh data">
              <RefreshCw size={15} className={loading ? styles.spin : ''} />
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Filters ── */}
      <div className={styles.filterBar}>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'sales' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            <BarChart2 size={16} /> Sales Overview
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'cash' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('cash')}
          >
            <CreditCard size={16} /> Cash & Receivables
          </button>
        </div>

        <div className={styles.filterRight}>
          <div className={styles.presets}>
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                className={`${styles.presetBtn} ${activePreset === i ? styles.presetActive : ''}`}
                onClick={() => handlePreset(i)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <DateFilter value={dateRange} onChange={handleCustomRange} />
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className={styles.errorBanner}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Content ── */}
      <main className={styles.main}>
        {loading && !sales ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Loading data from Odoo…</p>
          </div>
        ) : sales && invoices && cash ? (
          <>
            {activeTab === 'sales' ? (
              <>
                <KpiRow sales={sales} invoices={invoices} />
                <ChannelCards sales={sales} />
                <div className={styles.tablesRow}>
                  <TopTable
                    title="Top B2C Channels"
                    subtitle="Shopify · Delivery Partners"
                    color="var(--b2c)"
                    colorLight="var(--b2c-light)"
                    rows={sales.topB2cChannels}
                    icon="🛒"
                  />
                  <TopTable
                    title="Top B2B Customers"
                    subtitle="Direct · Trade Accounts"
                    color="var(--b2b)"
                    colorLight="var(--b2b-light)"
                    rows={sales.topB2bCustomers}
                    icon="🏢"
                  />
                </div>
                <div className={styles.chartsRow}>
                  <div className={styles.chartMain}>
                    <RevenueChart data={sales.monthly} />
                  </div>
                  <div className={styles.chartSide}>
                    <MixDonut sales={sales} invoices={invoices} />
                  </div>
                </div>
                <CityChart data={sales.cityBreakdown} />
                <DeliveryChart data={sales.deliveryStatus} />
                <InvoiceStatus invoices={invoices} />
              </>
            ) : (
              <CashTab data={{ sales, invoices, cash, generatedAt: new Date().toISOString() }} />
            )}
          </>
        ) : null}
      </main>

      <footer className={styles.footer}>
        NIBL Foods · Data sourced from Odoo ERP (nibl.odoo.com) · Auto-refreshes every 5 minutes
      </footer>
    </div>
  );
}
