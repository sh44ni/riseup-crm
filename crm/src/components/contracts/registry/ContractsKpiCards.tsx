import React from 'react';
import { FileText, Award, PenTool, Clock, DollarSign } from 'lucide-react';
import { UniversalStatCard } from '@/components/common/UniversalStatCard';
import { ContractsSummary } from '@/api/contractApi';

interface ContractsKpiCardsProps {
  summary: ContractsSummary;
}

export function ContractsKpiCards({ summary }: ContractsKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <UniversalStatCard
        label="Total Contracts"
        value={String(summary.totalCount)}
        icon={FileText}
        iconGradient="from-[#1878B8] to-[#55C4F5]"
        color="#0284c7"
        hoverBorderColor="hover:border-sky-400"
        blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
        footnoteLeft="All records"
        footnoteRight={`${summary.totalCount} generated`}
        sharePct={100}
        shareLabel="Portfolio"
        stageLabel="Contracts"
      />

      <UniversalStatCard
        label="Signed / Executed"
        value={String(summary.signedCount)}
        deltaLabel="🎉 Closed Won"
        icon={Award}
        iconGradient="from-[#059669] to-[#10b981]"
        color="#10b981"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
        footnoteLeft="Fully signed"
        footnoteRight="Ready for production"
        sharePct={summary.totalCount > 0 ? Math.round((summary.signedCount / summary.totalCount) * 100) : 0}
        shareLabel="Signing rate"
        stageLabel="Executed"
      />

      <UniversalStatCard
        label="1-Party Signed"
        value={String(summary.clientSignedCount || 0)}
        deltaLabel={summary.clientSignedCount ? 'Action Required' : 'Up to date'}
        icon={PenTool}
        iconGradient="from-[#d97706] to-[#f59e0b]"
        color="#f59e0b"
        hoverBorderColor="hover:border-amber-400"
        blurColor="bg-amber-400/15 group-hover:bg-amber-400/25"
        footnoteLeft="Client signed"
        footnoteRight="Needs counter-sign"
        sharePct={
          summary.totalCount > 0
            ? Math.round(((summary.clientSignedCount || 0) / summary.totalCount) * 100)
            : 0
        }
        shareLabel="Pending execution"
        stageLabel="Counter-signature"
      />

      <UniversalStatCard
        label="Sent (Awaiting Sign)"
        value={String(summary.sentCount)}
        deltaLabel="Pending"
        icon={Clock}
        iconGradient="from-[#0284c7] to-[#38bdf8]"
        color="#0284c7"
        hoverBorderColor="hover:border-sky-400"
        blurColor="bg-sky-400/15 group-hover:bg-sky-400/25"
        footnoteLeft="Delivered to client"
        footnoteRight="Review window"
        sharePct={summary.totalCount > 0 ? Math.round((summary.sentCount / summary.totalCount) * 100) : 0}
        shareLabel="Pending share"
        stageLabel="Out for signature"
      />

      <UniversalStatCard
        label="Signed Revenue"
        value={summary.signedValue > 0 ? `$${(summary.signedValue / 1000).toFixed(1)}k` : '$0'}
        deltaLabel="Locked In"
        icon={DollarSign}
        iconGradient="from-[#059669] to-[#34d399]"
        color="#10b981"
        hoverBorderColor="hover:border-emerald-400"
        blurColor="bg-emerald-400/15 group-hover:bg-emerald-400/25"
        footnoteLeft="Executed value"
        footnoteRight="Sold jobs"
        sharePct={summary.totalValue > 0 ? Math.round((summary.signedValue / summary.totalValue) * 100) : 0}
        shareLabel="Realized %"
        stageLabel="Signed revenue"
      />
    </div>
  );
}
