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
import ChannelChart from '@/components/ChannelChart';
import DeliveryChart from '@/components/DeliveryChart';
import CashTab from '@/components/CashTab';
import InventoryTab from '@/components/InventoryTab';
import TargetCard from '@/components/TargetCard';
import ClickUpTab from '@/components/ClickUpTab';
import { CreditCard, BarChart2, Package, CheckSquare } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
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
  const [dateRange, setDateRange] = useState<DateRange>(PRESETS[3].getValue()); // default: This Year
  const [activePreset, setActivePreset] = useState(3);
  const [activeTab, setActiveTab] = useState<'sales' | 'cash' | 'inventory' | 'clickup'>('sales');
  const [sales, setSales] = useState<SalesApiResponse | null>(null);
  const [invoices, setInvoices] = useState<InvoicesApiResponse | null>(null);
  const [cash, setCash] = useState<any>(null);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(true);
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
      const cb = Date.now();
      const qStr = q ? `${q}&_cb=${cb}` : `?_cb=${cb}`;

      // Fetch sequentially to prevent Odoo XML-RPC 503 Rate Limits
      const salesRes = await fetch(`/api/sales${qStr}`);
      if (!salesRes.ok) throw new Error(`Sales API Error: ${salesRes.status} ${await salesRes.text()}`);
      const salesData = await salesRes.json();
      if (salesData.error) throw new Error(salesData.error);

      const invRes = await fetch(`/api/invoices${qStr}`);
      if (!invRes.ok) throw new Error(`Invoices API Error: ${invRes.status} ${await invRes.text()}`);
      const invData = await invRes.json();
      if (invData.error) throw new Error(invData.error);

      const cashRes = await fetch(`/api/payments${qStr}`);
      if (!cashRes.ok) throw new Error(`Payments API Error: ${cashRes.status} ${await cashRes.text()}`);
      const cashData = await cashRes.json();
      if (cashData.error) throw new Error(cashData.error);

      const inventoryRes = await fetch('/api/inventory');
      if (!inventoryRes.ok) throw new Error(`Inventory API Error: ${inventoryRes.status} ${await inventoryRes.text()}`);
      const inventoryJson = await inventoryRes.json();
      if (inventoryJson.error) throw new Error(inventoryJson.error);

      setSales(salesData);
      setInvoices(invData);
      setCash(cashData);
      setInventoryData(inventoryJson);
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
  const nowStr = format(now, 'dd MMM yyyy');
  const timeStr = format(now, 'hh:mm a');

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://niblfoods.com/cdn/shop/files/ChatGPT_Image_Jul_4_2026_08_40_24_AM.png"
            alt="NIBL Foods"
            className={styles.logo}
          />
          <div className={styles.headerDivider} />
          <p className={styles.subtitle}>COO Sales Performance Dashboard</p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.dateTime}>{nowStr} · {timeStr}</div>
          <div className={styles.statusRow}>
            {isOnline
              ? <span className={styles.online}><Wifi size={13} /> Live</span>
              : <span className={styles.offline}><WifiOff size={13} /> Offline</span>
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

      {/* ── Tab Bar ── */}
      <div className={styles.tabBar}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'sales' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('sales')}
          >
            <BarChart2 size={15} /> Sales Overview
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'cash' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('cash')}
          >
            <CreditCard size={15} /> Cash & Receivables
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'inventory' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={15} /> Inventory DOH
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'clickup' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('clickup')}
          >
            <CheckSquare size={15} /> ClickUp Actions
          </button>
        </div>
      </div>

      {/* ── Date Filter Bar ── */}
      <div className={styles.dateBar}>
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
        <div className={styles.dateSep} />
        <DateFilter value={dateRange} onChange={handleCustomRange} />
      </div>

      {/* ── Error ── */}
      {error && (
        <div className={styles.errorBanner}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Content ── */}
      <main className={styles.main}>
        {activeTab === 'clickup' ? (
          <ClickUpTab />
        ) : loading && !sales ? (
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Loading data from Odoo…</p>
          </div>
        ) : sales && invoices && cash && inventoryData ? (
          <>
            {activeTab === 'sales' ? (
              <>
                <div className={styles.targetsGrid}>
                  <TargetCard
                    title="Overall Sales"
                    actual={sales.total.revenue}
                    dateRange={dateRange}
                    storageKey="nibl_sales_target"
                  />
                  <TargetCard
                    title="D2C Sales"
                    actual={sales.channelTargetsData.d2c.revenue}
                    dateRange={dateRange}
                    storageKey="nibl_d2c_target"
                  />
                  <TargetCard
                    title="Ecommerce Sales"
                    actual={sales.channelTargetsData.ecommerce.revenue}
                    dateRange={dateRange}
                    storageKey="nibl_ecommerce_target"
                  />
                  <TargetCard
                    title="Gyms Sales"
                    actual={sales.channelTargetsData.gyms.revenue}
                    dateRange={dateRange}
                    storageKey="nibl_gyms_target"
                  />
                  <TargetCard
                    title="Retail/Physical Sales"
                    actual={sales.channelTargetsData.retail.revenue}
                    dateRange={dateRange}
                    storageKey="nibl_retail_target"
                  />
                </div>
                <KpiRow sales={sales} invoices={invoices} />
                <ChannelCards sales={sales} />
                <div className={styles.tablesRow}>
                  <TopTable
                    title="All B2C Channels"
                    subtitle="Shopify · Delivery Partners"
                    color="var(--b2c)"
                    colorLight="var(--b2c-light)"
                    rows={sales.topB2cChannels}
                    icon="🛒"
                  />
                  <TopTable
                    title="All Retail Customers"
                    subtitle="Trade · Schools · Vending"
                    color="var(--b2b)"
                    colorLight="var(--b2b-light)"
                    rows={sales.topRetailCustomers}
                    icon="🏢"
                  />
                  <TopTable
                    title="All Gyms Customers"
                    subtitle="Health · Gyms"
                    color="var(--b2b)"
                    colorLight="var(--b2b-light)"
                    rows={sales.topGymsCustomers}
                    icon="🏋️"
                  />
                  <TopTable
                    title="All Ecommerce Customers"
                    subtitle="Pandamart · Kravemart"
                    color="var(--b2c)"
                    colorLight="var(--b2c-light)"
                    rows={sales.topEcommerceCustomers}
                    icon="📦"
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
                <ChannelChart data={sales.channelBreakdown} />
                <CityChart data={sales.cityBreakdown} />
                <DeliveryChart data={sales.deliveryStatus} />
                <InvoiceStatus invoices={invoices} />
              </>
            ) : activeTab === 'cash' ? (
              <CashTab data={{ sales, invoices, cash, generatedAt: new Date().toISOString() }} dateRange={dateRange} />
            ) : (
              <InventoryTab data={inventoryData} sales={sales} />
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
