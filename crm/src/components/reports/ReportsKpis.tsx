import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Award,
  PieChart,
  Zap,
} from 'lucide-react';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';
import { api } from '@/lib/api';

interface ReportKpis {
  bookedRevenue: number;
  bookedRevenueDelta: number | null;
  ytdBooked: number;
  avgTicket: number;
  winRate: number;
  wonCount: number;
  quotedCount: number;
  grossMargin: number;
  totalProfit: number;
  materialsCostPct: number;
  laborCostPct: number;
  avgSpeedToLead: number;
  slaCompliancePct: number;
  connectedPct: number;
}

function formatMoney(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${Math.round(val / 1000)}K`;
  return `$${Math.round(val)}`;
}

function dateRangeToDates(range?: string): { from?: string; to?: string } {
  const now = new Date();
  const year = now.getFullYear();
  switch (range) {
    case 'last_30_days': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return { from: `${year}-${String(q * 3 + 1).padStart(2, '0')}-01`, to: now.toISOString().slice(0, 10) };
    }
    case 'last_year':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    case 'ytd':
    default:
      return { from: `${year}-01-01`, to: now.toISOString().slice(0, 10) };
  }
}

export function ReportsKpis({ dateRange }: { dateRange?: string }) {
  const [kpis, setKpis] = useState<ReportKpis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { from, to } = dateRangeToDates(dateRange);
      const res = await api.getReportKpis(from, to);
      if (res?.ok && res.kpis) {
        setKpis(res.kpis);
      }
    } catch (err) {
      console.error('Failed to load report KPIs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
      {/* 1. Total Booked Revenue */}
      <UniversalStatCard
        label="Total Booked Revenue"
        value={kpis ? formatMoney(kpis.bookedRevenue) : '—'}
        delta={kpis?.bookedRevenueDelta}
        deltaLabel={kpis?.bookedRevenueDelta != null ? `${kpis.bookedRevenueDelta > 0 ? '+' : ''}${kpis.bookedRevenueDelta}% YoY` : undefined}
        icon={DollarSign}
        iconGradient="from-[#1878B8] to-[#38BDF8]"
        color="#0284c7"
        hoverBorderColor="hover:border-sky-400"
        blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
        footnoteLeft={kpis ? `YTD: ${formatMoney(kpis.ytdBooked)} Booked` : '—'}
        footnoteRight={kpis ? <span className="text-[#1878B8] font-bold">Avg Ticket: {formatMoney(kpis.avgTicket)}</span> : undefined}
        sharePct={kpis ? Math.min(100, Math.round((kpis.bookedRevenue / Math.max(kpis.ytdBooked, 1)) * 100)) : 0}
        shareLabel="Revenue share"
        stageLabel="Booked Business"
        isLoading={isLoading}
      />

      {/* 2. Pipeline Win Rate */}
      <UniversalStatCard
        label="Pipeline Win Rate"
        value={kpis ? `${kpis.winRate}%` : '—'}
        delta={null}
        icon={Award}
        iconGradient="from-amber-500 to-amber-400"
        color="#f59e0b"
        hoverBorderColor="hover:border-amber-400"
        blurColor="bg-amber-400/15 group-hover:bg-amber-400/25"
        footnoteLeft={kpis ? `${kpis.wonCount} Won / ${kpis.quotedCount} Quoted` : '—'}
        footnoteRight={<span className="text-amber-800 font-bold">Close rate</span>}
        sharePct={kpis ? Math.round(kpis.winRate) : 0}
        shareLabel="Close rate"
        stageLabel="Sales Efficiency"
        isLoading={isLoading}
      />

      {/* 3. Blended Gross Margin */}
      <UniversalStatCard
        label="Blended Gross Margin"
        value={kpis ? `${kpis.grossMargin}%` : '—'}
        delta={null}
        icon={PieChart}
        iconGradient="from-emerald-600 to-teal-400"
        color="#10b981"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
        footnoteLeft={kpis ? `Materials: ${kpis.materialsCostPct}% • Labor: ${kpis.laborCostPct}%` : '—'}
        footnoteRight={kpis ? <span className="text-emerald-700 font-bold">{formatMoney(kpis.totalProfit)} Net Profit</span> : undefined}
        sharePct={kpis ? Math.round(kpis.grossMargin) : 0}
        shareLabel="Margin share"
        stageLabel="Profitability"
        isLoading={isLoading}
      />

      {/* 4. Avg Speed to Lead */}
      <UniversalStatCard
        label="Avg Speed to Lead"
        value={kpis ? `${kpis.avgSpeedToLead} min` : '—'}
        delta={null}
        icon={Zap}
        iconGradient="from-purple-600 to-indigo-400"
        color="#8b5cf6"
        hoverBorderColor="hover:border-purple-400"
        blurColor="bg-purple-400/15 group-hover:bg-purple-400/25"
        footnoteLeft={kpis ? `${kpis.slaCompliancePct}% < 15 min SLA` : '—'}
        footnoteRight={kpis ? <span className="text-purple-700 font-bold">{kpis.connectedPct}% Connected</span> : undefined}
        sharePct={kpis ? Math.round(kpis.slaCompliancePct) : 0}
        shareLabel="SLA response"
        stageLabel="Inbound Velocity"
        isLoading={isLoading}
      />
    </div>
  );
}
