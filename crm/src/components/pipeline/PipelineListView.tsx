import React, { useState, useMemo } from 'react';
import {
  Search,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  DollarSign,
  Filter,
  CheckCircle2,
  Users,
  Pencil,
  Plus,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { ColumnData, EnrichedDeal, enrichDeals } from './pipelineTypes';
import { useAuth } from '@/context/AuthContext';
import { leadsApi } from '@/api/leadsApi';
import { DealValueBadge } from '@/components/shared/DealValueBadge';
import { LeadSourceBadge } from '@/components/shared/LeadSourceBadge';

interface PipelineListViewProps {
  columns: ColumnData[];
  pipelineSearch: string;
  onSelectDeal: (deal: EnrichedDeal) => void;
  getServiceBadgeClass: (color: string) => string;
}

type SortField = 'name' | 'stage' | 'service' | 'value' | 'time' | 'location';

export function PipelineListView({
  columns,
  pipelineSearch,
  onSelectDeal,
  getServiceBadgeClass,
}: PipelineListViewProps) {
  const { can } = useAuth();
  const canViewFinances = can('finances.view');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Inline address editing state
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleStartEdit = (deal: EnrichedDeal, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDealId(deal.id);
    setStreet(deal.address || '');
    setCity(deal.city || 'Oceanside');
    setZip(deal.zip || '');
  };

  const handleCancelEdit = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.stopPropagation();
    setEditingDealId(null);
  };

  const handleSave = async (deal: EnrichedDeal, e?: React.MouseEvent | React.KeyboardEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (isSaving) return;
    setIsSaving(true);
    try {
      const cleanStreet = street.trim();
      const cleanCity = city.trim();
      const cleanZip = zip.trim();
      await leadsApi.updateLead(deal.id, {
        address: cleanStreet,
        city: cleanCity,
        zip: cleanZip,
      });
      // Fire event to notify all listeners (including pipeline store & dashboard)
      window.dispatchEvent(
        new CustomEvent('crm:lead-updated', {
          detail: { id: deal.id, address: cleanStreet, city: cleanCity, zip: cleanZip },
        })
      );
      setEditingDealId(null);
    } catch (err) {
      console.error('Failed to update address:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Flatten and enrich all deals
  const allDeals = useMemo(() => enrichDeals(columns), [columns]);

  // Stage options with counts
  const stageTabs = useMemo(() => {
    return [
      { id: 'all', title: 'All Stages', count: allDeals.length, accentColor: '#1878B8' },
      ...columns.map((c) => ({
        id: c.id,
        title: c.title,
        count: c.cards.length,
        accentColor: c.accentColor,
      })),
    ];
  }, [allDeals, columns]);

  // Filter & sort
  const filteredDeals = useMemo(() => {
    let list = allDeals;

    // Stage filter
    if (selectedStage !== 'all') {
      list = list.filter((d) => d.stageId === selectedStage);
    }

    // Search query
    if (pipelineSearch.trim()) {
      const q = pipelineSearch.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.service.toLowerCase().includes(q) ||
          d.stageTitle.toLowerCase().includes(q) ||
          d.phone.includes(q) ||
          d.email.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'stage':
          comparison = a.stageTitle.localeCompare(b.stageTitle);
          break;
        case 'service':
          comparison = a.service.localeCompare(b.service);
          break;
        case 'location':
          comparison = a.location.localeCompare(b.location);
          break;
        case 'value':
          comparison = a.value - b.value;
          break;
        case 'time':
          comparison = a.time.localeCompare(b.time);
          break;
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [allDeals, selectedStage, pipelineSearch, sortField, sortAsc]);

  // Total calculated value
  const totalValue = useMemo(() => {
    return filteredDeals.reduce((sum, d) => sum + d.value, 0);
  }, [filteredDeals]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown size={10} className="opacity-40" />;
    }
    return sortAsc ? <ChevronUp size={11} className="text-[#1878B8]" /> : <ChevronDown size={11} className="text-[#1878B8]" />;
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Stage Filter Pills Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {stageTabs.map((tab) => {
          const isActive = selectedStage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStage(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#1878B8] to-[#55C4F5] text-white shadow-xs scale-[1.02]'
                  : 'bg-white/60 dark:bg-slate-900/60 hover:bg-white/90 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-white/80 dark:border-white/10 shadow-2xs'
              }`}
            >
              <span>{tab.title}</span>
              <span
                className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-black/25 text-white' : 'bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Liquid Glass Table Panel */}
      <div className="rounded-2xl light-glass-panel border border-white/85 dark:border-white/10 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/60 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/70 dark:border-white/10 text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 py-2.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Customer / Deal</span>
                    {renderSortIndicator('name')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('stage')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Pipeline Stage</span>
                    {renderSortIndicator('stage')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('service')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Service</span>
                    {renderSortIndicator('service')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('location')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Location</span>
                    {renderSortIndicator('location')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('value')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Est. Value</span>
                    {renderSortIndicator('value')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('time')}
                  className="px-3 py-2.5 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Activity</span>
                    {renderSortIndicator('time')}
                  </div>
                </th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/70 dark:divide-white/5 text-xs">
              {filteredDeals.length > 0 ? (
                filteredDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => onSelectDeal(deal)}
                    style={{
                      borderLeftColor: deal.stageAccent,
                      borderLeftWidth: '3.5px',
                    }}
                    className="hover:bg-white/80 dark:hover:bg-slate-800/50 transition-all cursor-pointer group"
                  >
                    {/* Customer / Homeowner */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[11.5px] text-[#1F1F1F] dark:text-slate-100 group-hover:text-[#1878B8] dark:group-hover:text-[#55C4F5] transition-colors leading-snug">
                          {deal.name}
                        </span>
                        <LeadSourceBadge dealOrLead={deal} size="xs" />
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {deal.phone}
                      </div>
                    </td>

                    {/* Pipeline Stage */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-0.5 rounded-lg shadow-2xs ${deal.stagePillClass}`}
                        >
                          <span>{deal.stageTitle}</span>
                        </span>
                        {deal.isContractSigned && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8px] font-black bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-700/60 shadow-2xs shrink-0"
                            title="Contract Fully Signed"
                          >
                            <CheckCircle2 size={9} className="stroke-[2.5] text-emerald-600 dark:text-emerald-400" />
                            <span>Signed</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Service */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded-md inline-block ${getServiceBadgeClass(
                            deal.serviceColor
                          )}`}
                        >
                          {deal.service}
                        </span>
                        {Number(deal.roofSqf || (deal as any).roof_sqf || 0) > 0 && (
                          <span className="text-[9.5px] text-slate-400 dark:text-slate-500 font-medium">
                            {Number(deal.roofSqf || (deal as any).roof_sqf).toLocaleString()} sq ft
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300" onClick={(e) => e.stopPropagation()}>
                      {editingDealId === deal.id ? (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-[#1878B8]/40 shadow-md space-y-1 min-w-[200px]"
                        >
                          <input
                            type="text"
                            placeholder="Street Address"
                            value={street}
                            autoFocus
                            onChange={(e) => setStreet(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') handleSave(deal, e);
                              if (e.key === 'Escape') handleCancelEdit(e);
                            }}
                            className="w-full px-2 py-0.5 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#1878B8]"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="City"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleSave(deal, e);
                                if (e.key === 'Escape') handleCancelEdit(e);
                              }}
                              className="w-2/3 px-2 py-0.5 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#1878B8]"
                            />
                            <input
                              type="text"
                              placeholder="ZIP"
                              value={zip}
                              onChange={(e) => setZip(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Enter') handleSave(deal, e);
                                if (e.key === 'Escape') handleCancelEdit(e);
                              }}
                              className="w-1/3 px-2 py-0.5 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-[#1878B8]"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-1 pt-0.5">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={(e) => handleSave(deal, e)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-[#1878B8] hover:bg-[#146399] text-white rounded flex items-center gap-1 shadow-2xs cursor-pointer"
                            >
                              {isSaving ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                              <span>Save</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {deal.address ? (
                            <div
                              onClick={(e) => handleStartEdit(deal, e)}
                              title="Click to edit address in Client 360"
                              className="flex items-center gap-1 text-[11px] font-medium hover:text-[#1878B8] dark:hover:text-[#55C4F5] cursor-pointer group/loc transition-colors"
                            >
                              <MapPin size={10} className="text-[#1878B8] shrink-0" />
                              <span>{deal.location}</span>
                              <Pencil size={9} className="text-slate-400 opacity-0 group-hover/loc:opacity-100 ml-0.5 transition-opacity" />
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleStartEdit(deal, e)}
                              title="Add missing property address to Client 360"
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300/90 dark:border-amber-700/70 hover:bg-amber-200/90 transition-colors cursor-pointer shadow-2xs"
                            >
                              <Plus size={9} className="text-amber-700 dark:text-amber-400 shrink-0" />
                              <span>+ Add address</span>
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Estimated Value */}
                    <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-100 text-[11.5px]">
                      <DealValueBadge
                        contractValue={deal.contractValue ?? (deal as any).contract_value}
                        estimateTotal={deal.estimateTotal ?? (deal as any).estimate_total}
                        estimatedValue={deal.estimatedValue ?? (deal as any).raw_estimated_value ?? (deal as any).estimated_value}
                        roofSqf={deal.roofSqf ?? (deal as any).roof_sqf}
                        proposalSentAt={deal.proposalSentAt || (deal as any).proposalSentDate}
                        isUploadedEstimate={deal.isUploadedEstimate ?? (deal as any).is_uploaded_estimate}
                        estimateTemplateKey={deal.estimateTemplateKey ?? (deal as any).estimate_template_key}
                        isContractSigned={deal.isContractSigned}
                        stageId={deal.stageId}
                        canViewFinances={canViewFinances}
                        size="xs"
                      />
                    </td>

                    {/* Activity Recency */}
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 text-[10.5px]">
                        <Clock size={10} className="text-slate-400" />
                        <span>{deal.time}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`tel:${deal.phone}`}
                          title={`Call ${deal.phone}`}
                          className="p-1 rounded-md text-slate-400 hover:text-[#0284c7] hover:bg-sky-50 dark:hover:text-sky-400 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Phone size={12} />
                        </a>
                        <a
                          href={`mailto:${deal.email}`}
                          title={`Email ${deal.email}`}
                          className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Mail size={12} />
                        </a>
                        <button
                          onClick={() => onSelectDeal(deal)}
                          title="View Details"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-1">
                      <Search size={20} className="text-slate-300 dark:text-slate-600 mb-1" />
                      <div className="text-xs font-bold text-slate-600 dark:text-slate-300">No matching deals found</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                        Try adjusting your search query or stage filter
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="px-4 py-2 bg-white/40 dark:bg-slate-900/60 border-t border-slate-200/70 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-800 dark:text-slate-200 font-bold">{filteredDeals.length}</strong> of{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-bold">{allDeals.length}</strong> deals
            </span>
            {selectedStage !== 'all' && (
              <button
                onClick={() => setSelectedStage('all')}
                className="text-[10px] font-bold text-[#1878B8] hover:underline cursor-pointer"
              >
                Reset Stage Filter
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="text-slate-600 dark:text-slate-300">
              Total Active Value:{' '}
              <strong className="font-extrabold text-[#0284c7] dark:text-sky-400 text-xs">
                {canViewFinances ? `$${totalValue.toLocaleString()}` : 'Protected'}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
