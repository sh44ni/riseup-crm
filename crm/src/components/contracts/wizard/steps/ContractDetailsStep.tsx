import React, { useState, useEffect, useRef } from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { Calendar, Search, Lock, User, MapPin, Phone, Mail, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getDraftContractByLead } from '@/api/contractApi';
import { restoreFromContractData } from '../ContractWizardShell';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

// Contract-ready pipeline stages: Includes proposal sent, all active follow-up cadences, closing, and active pipeline stages
const STAGE_PRIORITY: Record<string, number> = {
  follow_up: 1,
  followup_2day: 1,
  followup_7day: 1,
  decision_followup: 1,
  future_followup: 1,
  estimate_sent: 1,
  est_sent: 1,
  proposal_sent: 1,
  stage_4_closing: 2,
  contract_sent: 2,
  stage_3_site_visit_estimate: 3,
  estimate_building: 3,
  estimate_scheduled: 4,
  initial_call: 5,
  cold_lead: 6,
};

export function ContractDetailsStep({ data, onDataChange }: StepProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ensure salesperson is automatically assigned to current logged-in user
  useEffect(() => {
    const currentUserName = user?.name || 'Marc Sarellano';
    if (!data.salespersonName || data.salespersonName !== currentUserName) {
      onDataChange({ salespersonName: currentUserName });
    }
  }, [user?.name]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setLeads([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.request(`/admin/leads?search=${encodeURIComponent(searchQuery)}&limit=30`);
        const allLeads = (res as any).leads || [];
        // Filter out explicitly lost/closed-lost leads so any active pipeline lead (including follow-up) is eligible
        const eligible = allLeads.filter((l: any) => {
          const stage = (l.pipeline_stage || '').toLowerCase();
          const status = (l.status || '').toLowerCase();
          if (status === 'lost' || stage === 'closed_lost') return false;
          return true;
        });

        // Prioritize follow-up and estimate sent leads at the top
        eligible.sort((a: any, b: any) => {
          const pA = STAGE_PRIORITY[a.pipeline_stage] ?? 10;
          const pB = STAGE_PRIORITY[b.pipeline_stage] ?? 10;
          return pA - pB;
        });

        setLeads(eligible);
      } catch (e) {
        console.error('Error searching leads:', e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLead = async (lead: any) => {
    // 1-Draft-Per-Lead: Check if this lead already has an unexecuted draft contract saved
    try {
      const draftRes = await getDraftContractByLead(lead.id);
      if (draftRes?.exists && draftRes.contract) {
        const restored = restoreFromContractData(draftRes.contract, data);
        onDataChange(restored);
        setSearchQuery('');
        setShowDropdown(false);
        return;
      }
    } catch (draftErr) {
      console.warn('Failed checking draft contract for lead:', draftErr);
    }

    const name = lead.full_name || lead.name || '';
    const address = lead.address || '';
    const city = lead.city || 'Oceanside';
    const state = lead.state || 'CA';
    const zip = lead.zip || '';
    let val = Number(lead.estimated_value) || 25000;
    let serviceTitle = lead.service_type ? `${lead.service_type} System Installation` : data.scopeTitle;

    // Check if there is an existing proposal/estimate for this lead to auto-import accurate pricing
    setLoadingEstimate(true);
    try {
      const estRes: any = await api.request(`/admin/estimates?lead_id=${lead.id}`);
      const estList = estRes?.estimates || (Array.isArray(estRes) ? estRes : []);
      if (estList.length > 0) {
        const primaryEst = estList[0];
        if (primaryEst.total_amount) {
          val = Number(primaryEst.total_amount);
        } else if (primaryEst.proposal_data) {
          const pd = typeof primaryEst.proposal_data === 'string' ? JSON.parse(primaryEst.proposal_data) : primaryEst.proposal_data;
          const planA = pd?.plans?.[0];
          if (planA?.price) val = Number(planA.price);
          if (planA?.name) serviceTitle = planA.name;
        }
      }
    } catch (err) {
      console.warn('No existing estimate found for lead, using lead value:', err);
    } finally {
      setLoadingEstimate(false);
    }

    // Downpayment cannot exceed $1,000 or 10% of contract price (California CSLB statutory rule)
    const dp = Math.min(1000, Math.round(val * 0.1));
    const remainder = Math.max(0, val - dp);
    const p1 = Math.round(remainder * 0.3);
    const p2 = Math.round(remainder * 0.3);
    const p3 = Math.max(0, val - dp - p1 - p2);

    onDataChange({
      leadId: String(lead.id),
      clientId: lead.client_id ? String(lead.client_id) : undefined,
      clientName: name,
      clientInitials: '',
      projectAddress: address,
      city,
      state,
      zip,
      clientPhone: lead.phone || '',
      clientEmail: lead.email || '',
      scopeTitle: serviceTitle,
      contractPrice: val,
      downpayment: dp,
      salespersonName: user?.name || data.salespersonName || 'Marc Sarellano',
      paymentSchedule: [
        { id: '1', number: '1.', description: 'Initial Downpayment (Contract execution / scheduling)', amount: dp },
        { id: '2', number: '2.', description: 'Progress Payment 1 (Teardown & delivery of materials)', amount: p1 },
        { id: '3', number: '3.', description: 'Progress Payment 2 (Underlayment & waterproofing complete)', amount: p2 },
        { id: '4', number: '4.', description: 'Final Payment (Installation complete & walkthrough)', amount: p3 },
      ],
    });

    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleClearLead = () => {
    onDataChange({
      leadId: undefined,
      clientId: undefined,
      clientName: '',
      projectAddress: '',
      clientPhone: '',
      clientEmail: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Date */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={14} className="text-[#1a5ba5]" /> Contract Date
        </label>
        <input
          type="text"
          value={data.contractDate}
          onChange={(e) =>
            onDataChange({
              contractDate: e.target.value,
              contractDateShort: e.target.value.split(',')[0],
            })
          }
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-[#1a5ba5] transition-colors"
          placeholder="September 22, 2026"
        />
      </div>

      {/* 2. Client Selection (Mandatory for Contract Building) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <User size={15} className="text-[#1a5ba5]" /> Client &amp; Property Details
          </h3>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Estimate &amp; Follow-Up Stages
          </span>
        </div>

        {/* Lead Search Bar */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by client name, phone number, or property address..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1a5ba5] focus:ring-2 focus:ring-[#1a5ba5]/20 transition-all"
            />
          </div>

          {showDropdown && searchQuery.trim() !== '' && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-64 overflow-auto">
              {isSearching ? (
                <div className="p-4 text-sm text-slate-500 text-center animate-pulse">Searching pipeline leads...</div>
              ) : leads.length > 0 ? (
                leads.map((lead) => {
                  const stage = (lead.pipeline_stage || lead.stage || '').toLowerCase();
                  const isFollowup = stage.includes('follow') || stage === 'follow_up';
                  const isEstimate = stage.includes('estimate') || stage.includes('proposal') || stage.includes('est_');
                  const isContract = stage.includes('contract');

                  const badgeClass = isFollowup
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : isEstimate
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isContract
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-sky-50 text-sky-700 border-sky-200';

                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm text-slate-900">{lead.full_name || lead.name}</div>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${badgeClass}`}>
                          {(lead.pipeline_stage || lead.stage || 'Lead').replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={11} className="text-slate-400" /> {lead.phone}
                          </span>
                        )}
                        {lead.address && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="text-slate-400" /> {lead.address}{lead.city ? `, ${lead.city}` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center">
                  <div className="text-sm font-semibold text-slate-700">No active leads found for "{searchQuery}".</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Make sure the client or lead exists in your CRM pipeline.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Lead Card (Locked Data) */}
        {data.leadId ? (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Active Lead Attached (ID #{data.leadId})
              </span>
              <button
                type="button"
                onClick={handleClearLead}
                className="text-[11px] font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer"
                title="Change or reselect lead"
              >
                <RotateCcw size={12} /> Change Lead
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                  Client Name <Lock size={10} className="text-slate-400" />
                </label>
                <div className="text-sm font-semibold text-slate-800 bg-white px-3 py-1.5 rounded-lg mt-1 truncate border border-slate-200">
                  {data.clientName || '—'}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                  Phone Number <Lock size={10} className="text-slate-400" />
                </label>
                <div className="text-sm font-semibold text-slate-800 bg-white px-3 py-1.5 rounded-lg mt-1 truncate border border-slate-200">
                  {data.clientPhone || '—'}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                Project Property Address <Lock size={10} className="text-slate-400" />
              </label>
              <div className="text-sm font-semibold text-slate-800 bg-white px-3 py-1.5 rounded-lg mt-1 truncate border border-slate-200">
                {data.projectAddress ? `${data.projectAddress}, ${data.city}, ${data.state} ${data.zip}` : '—'}
              </div>
            </div>

            {/* Email is editable so representative can verify where the contract will be sent */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                Recipient Email Address (For Delivery &amp; E-Signature)
              </label>
              <input
                type="email"
                value={data.clientEmail}
                onChange={(e) => onDataChange({ clientEmail: e.target.value })}
                placeholder="client@example.com"
                className="w-full text-sm font-medium text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg mt-1 focus:outline-none focus:border-[#1a5ba5]"
              />
            </div>
          </div>
        ) : (
          /* Empty state when no lead has been selected */
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 text-amber-800 font-bold text-xs">
              <AlertCircle size={15} /> Client Selection Required
            </div>
            <p className="text-xs text-amber-700 max-w-md mx-auto">
              A contract requires an active client from your pipeline. Search and select a client in <b>Follow-Up</b>, <b>Estimate Sent</b>, or active pipeline stages above.
            </p>
          </div>
        )}
      </div>

      {/* 3. Sales Representative (Automatic & Strictly Locked) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <User size={14} className="text-[#1a5ba5]" /> Sales Representative
          </span>
          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
            <Lock size={10} /> Auto-assigned to current user
          </span>
        </label>
        <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex items-center justify-between cursor-not-allowed select-none">
          <span>{data.salespersonName || user?.name || 'Marc Sarellano'}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
            Locked
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          The sales representative is automatically tied to your logged-in CRM profile and cannot be altered.
        </p>
      </div>
    </div>
  );
}

export default ContractDetailsStep;
