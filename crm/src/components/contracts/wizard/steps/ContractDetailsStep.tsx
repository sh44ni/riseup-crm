import React, { useState, useEffect, useRef } from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import {
  Calendar,
  Search,
  Lock,
  User,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Upload,
  Image as ImageIcon,
  X,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getDraftContractByLead, getDraftContractByClient } from '@/api/contractApi';
import { restoreFromContractData, validateClientProfileForContract } from '../contractWizardData';
import { ClientEditContactModal } from '@/components/clients/ClientEditContactModal';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
  onStepChange?: (step: number) => void;
}

// Pipeline stages eligible for contracts (at or after the estimate stage)
const ELIGIBLE_PIPELINE_STAGES = new Set([
  'estimate_sent',
  'est_sent',
  'proposal_sent',
  'stage_3_site_visit_estimate',
  'stage_4_closing',
  'contract_sent',
  'follow_up',
  'followup_2day',
  'followup_7day',
  'decision_followup',
  'future_followup',
]);

const STAGE_PRIORITY: Record<string, number> = {
  estimate_sent: 1,
  est_sent: 1,
  proposal_sent: 1,
  follow_up: 2,
  followup_2day: 2,
  followup_7day: 2,
  decision_followup: 2,
  future_followup: 2,
  stage_4_closing: 3,
  contract_sent: 3,
  stage_3_site_visit_estimate: 4,
};

export function ContractDetailsStep({ data, onDataChange, onStepChange }: StepProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default preparedByName and salespersonName to current logged-in user
  useEffect(() => {
    const currentUserName = user?.name || 'Project Manager';
    const updates: Partial<ContractStudioData> = {};
    if (!data.salespersonName) {
      updates.salespersonName = currentUserName;
    }
    if (!data.preparedByName) {
      updates.preparedByName = currentUserName;
    }
    if (Object.keys(updates).length > 0) {
      onDataChange(updates);
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

  // Search pipeline leads
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
        
        // Filter strictly to clients in pipeline at or after estimate
        const eligible = allLeads.filter((l: any) => {
          const stage = (l.pipeline_stage || l.stage || '').toLowerCase();
          const status = (l.status || '').toLowerCase();
          if (status === 'lost' || stage === 'closed_lost' || stage === 'cold_lead' || stage === 'initial_call') {
            return false;
          }
          return ELIGIBLE_PIPELINE_STAGES.has(stage) || stage.includes('estimate') || stage.includes('proposal') || stage.includes('follow');
        });

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

  // Client completeness validation check
  const clientValidation = validateClientProfileForContract({
    address: data.projectAddress,
    phone: data.clientPhone,
    email: data.clientEmail,
  });

  const handleSelectLead = async (lead: any) => {
    // 1-Draft-Per-Lead/Client: Check if this lead or client already has an unexecuted draft contract saved
    try {
      let draftRes = await getDraftContractByLead(lead.id);
      if ((!draftRes?.exists || !draftRes.contract) && lead.client_id) {
        draftRes = await getDraftContractByClient(lead.client_id);
      }
      if (draftRes?.exists && draftRes.contract) {
        const restored = restoreFromContractData(draftRes.contract, data);
        onDataChange(restored);
        setSearchQuery('');
        setShowDropdown(false);
        if (typeof restored.wizardStep === 'number' && restored.wizardStep > 0 && onStepChange) {
          onStepChange(restored.wizardStep);
        }
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
      salespersonName: lead.assigned_to_name || user?.name || data.salespersonName || 'Rise Up Representative',
      preparedByName: user?.name || data.preparedByName || 'Rise Up Representative',
      preparedByTitle: user?.role === 'owner' ? 'General Contractor / Owner' : 'Project Manager',
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

  // Property photo handler for Cover Page (Callout 3)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onDataChange({ propertyPhotoUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    onDataChange({ propertyPhotoUrl: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* 1. Contract Title & Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={14} className="text-[#1a5ba5]" /> Contract Document Title
          </label>
          <input
            type="text"
            value={data.contractTitle || 'HOME IMPROVEMENT CONTRACT'}
            onChange={(e) => onDataChange({ contractTitle: e.target.value })}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#1a5ba5] transition-colors"
            placeholder="HOME IMPROVEMENT CONTRACT"
          />
          <p className="text-[11px] text-slate-400">
            Displays on Cover Page and Header of continuation pages.
          </p>
        </div>

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
            placeholder="October 1, 2026"
          />
          <p className="text-[11px] text-slate-400">
            Dynamic: updates to full execution date upon completion.
          </p>
        </div>
      </div>

      {/* 2. Client Selection (Mandatory Pipeline Rule) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <User size={15} className="text-[#1a5ba5]" /> Client &amp; Property Information
          </h3>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Pipeline After Estimate
          </span>
        </div>

        {/* Lead Search Bar */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search client by name, phone, or address..."
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
                <div className="p-4 text-sm text-slate-500 text-center animate-pulse">Searching pipeline clients...</div>
              ) : leads.length > 0 ? (
                leads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-slate-900">{lead.full_name || lead.name}</div>
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {(lead.pipeline_stage || lead.stage || 'Estimate Sent').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone size={11} className="text-slate-400" /> {lead.phone || 'No phone'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-slate-400" /> {lead.address ? `${lead.address}, ${lead.city || ''}` : 'No address'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center">
                  <div className="text-sm font-semibold text-slate-700">No eligible clients found for "{searchQuery}".</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Only clients in the pipeline at or after the estimate stage can be selected for contracts.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Missing Contact Info Warning Banner (Strict Rule) */}
        {data.clientName && !clientValidation.isValid && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-2 text-red-900 shadow-sm animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
              <div className="space-y-1 flex-1">
                <div className="font-bold text-sm text-red-800">
                  Incomplete Client Profile: Missing Required Contact Data
                </div>
                <p className="text-xs text-red-700 leading-relaxed">
                  {clientValidation.errorMessage}
                </p>
                <div className="pt-1.5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditContactModalOpen(true)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <ExternalLink size={13} /> Add Missing Info via Client 360
                  </button>
                  <span className="text-[11px] text-red-600 font-medium">
                    (Cannot proceed to scope or generate PDF until complete)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Selected Client Card (Locked Throughout Contract) */}
        {data.clientName ? (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                Client Locked from Pipeline (ID #{data.leadId || data.clientId || '—'})
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditContactModalOpen(true)}
                  className="text-[11px] font-semibold text-[#1a5ba5] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
                  title="Edit client contact information in Client 360"
                >
                  <ExternalLink size={12} /> Edit in Client 360
                </button>
                <button
                  type="button"
                  onClick={handleClearLead}
                  className="text-[11px] font-semibold text-slate-500 hover:text-red-600 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Change or reselect client"
                >
                  <RotateCcw size={12} /> Change Client
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  Client Full Name <Lock size={11} className="text-slate-400" />
                </label>
                <div className="text-sm font-semibold text-slate-800 bg-white px-3 py-2 rounded-lg mt-1 truncate border border-slate-200">
                  {data.clientName || '—'}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                  Phone Number <Lock size={11} className="text-slate-400" />
                </label>
                <div className={`text-sm font-semibold px-3 py-2 rounded-lg mt-1 truncate border ${data.clientPhone ? 'bg-white text-slate-800 border-slate-200' : 'bg-red-50 text-red-600 border-red-200 font-bold'}`}>
                  {data.clientPhone || 'Missing — Add in Client 360'}
                </div>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                Project Street Address <Lock size={11} className="text-slate-400" />
              </label>
              <div className={`text-sm font-semibold px-3 py-2 rounded-lg mt-1 truncate border ${data.projectAddress ? 'bg-white text-slate-800 border-slate-200' : 'bg-red-50 text-red-600 border-red-200 font-bold'}`}>
                {data.projectAddress ? `${data.projectAddress}, ${data.city || 'Oceanside'}, ${data.state || 'CA'} ${data.zip || ''}` : 'Missing — Add in Client 360'}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center justify-between">
                Email Address <Lock size={11} className="text-slate-400" />
              </label>
              <div className={`text-sm font-semibold px-3 py-2 rounded-lg mt-1 truncate border ${data.clientEmail ? 'bg-white text-slate-800 border-slate-200' : 'bg-red-50 text-red-600 border-red-200 font-bold'}`}>
                {data.clientEmail || 'Missing — Add in Client 360'}
              </div>
            </div>

            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
              <Lock size={11} /> Client information is locked throughout the contract to maintain data integrity. To make changes, use Client 360.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-center space-y-1.5">
            <div className="flex items-center justify-center gap-1.5 text-amber-800 font-bold text-xs">
              <AlertCircle size={15} /> Client Selection Required
            </div>
            <p className="text-xs text-amber-700 max-w-md mx-auto">
              Please search and select a client from the pipeline (at or after the estimate stage).
            </p>
          </div>
        )}
      </div>

      {/* 3. Cover Property Photo (Callout 3: Stays empty if not uploaded) */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ImageIcon size={14} className="text-[#1a5ba5]" /> Cover Page Property Photo (Optional)
          </span>
          <span className="text-[11px] text-slate-400 font-normal">
            Stays empty if no photo is uploaded
          </span>
        </label>

        {data.propertyPhotoUrl ? (
          <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-900 group max-h-48 flex items-center justify-center">
            <img
              src={data.propertyPhotoUrl}
              alt="Property"
              className="w-full h-48 object-cover opacity-90"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute top-3 right-3 px-2.5 py-1.5 bg-red-600/90 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md transition-colors cursor-pointer"
            >
              <X size={13} /> Remove Photo
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-[#1a5ba5] rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-sky-50/30"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Upload size={22} className="mx-auto text-slate-400 mb-1.5" />
            <div className="text-xs font-bold text-slate-700">Click to upload property photo</div>
            <div className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WEBP (Displays in the angled cover banner)</div>
          </div>
        )}
      </div>

      {/* 4. Prepared By & Sales Representative (Dynamic - Locked to Representative) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-[#1a5ba5]" /> Prepared By (Cover Page)
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Lock size={10} /> Locked to Representative
            </span>
          </label>
          <div className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex items-center justify-between select-none">
            <span>{data.preparedByName || user?.name || 'Rise Up Representative'}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
              Locked
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Locked to the representative creating the contract.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <User size={14} className="text-[#1a5ba5]" /> Sales Representative
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Lock size={10} /> Auto-Assigned
            </span>
          </label>
          <div className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 flex items-center justify-between select-none">
            <span>{data.salespersonName || user?.name || 'Rise Up Representative'}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
              Locked
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Assigned to project manager / estimator handling this account.
          </p>
        </div>
      </div>

      {/* Client Edit Contact Modal (Opens Client 360 in-place!) */}
      {isEditContactModalOpen && (
        <ClientEditContactModal
          isOpen={isEditContactModalOpen}
          onClose={() => setIsEditContactModalOpen(false)}
          clientName={data.clientName}
          clientId={data.clientId ? Number(data.clientId) : (data.leadId ? Number(data.leadId) : undefined)}
          initialData={{
            name: data.clientName,
            email: data.clientEmail,
            phone: data.clientPhone,
            address: data.projectAddress,
            city: data.city,
            zip: data.zip,
          }}
          onSave={async (updatedContact) => {
            onDataChange({
              clientName: updatedContact.name || data.clientName,
              clientPhone: updatedContact.phone || '',
              clientEmail: updatedContact.email || '',
              projectAddress: updatedContact.address || '',
              city: updatedContact.city || data.city,
              zip: updatedContact.zip || data.zip,
            });
            setIsEditContactModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default ContractDetailsStep;
