import React, { useState, useEffect, useRef } from 'react';
import { TwoOptionsEstimate } from '@/types/estimateContractTypes';
import { ESTIMATE_FIELD_CAPS } from '@/shared/config/estimateConstants';
import { FieldWithCap } from '../FieldWithCap';
import { PhotoFrameEditor } from '../PhotoFrameEditor';
import { Calendar, Search, Upload, Lock, User, MapPin, Phone, Mail, Image, Check } from 'lucide-react';
import { api, API_ORIGIN } from '@/lib/api';
import { CrmDatePicker } from '@/components/common/CrmDatePicker';

const getImgSrc = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface StepProps {
  data: TwoOptionsEstimate;
  onDataChange: (updates: Partial<TwoOptionsEstimate>) => void;
}

export function DetailsStep({ data, onDataChange }: StepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Pipeline stages where estimate creation is prioritized
  const STAGE_PRIORITY: Record<string, number> = {
    est_scheduled: 1,
    estimate_scheduled: 1,
    inspection_scheduled: 1,
    inspection_completed: 1,
    estimate_building: 1,
    stage_3_site_visit_estimate: 1,
    estimate_sent: 2,
    follow_up: 2,
    initial_call: 3,
    cold_lead: 4,
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setLeads([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.request(
          `/admin/leads?search=${encodeURIComponent(searchQuery)}&limit=25`
        );
        const all = (res as any).leads || [];
        // Filter out explicitly lost leads
        const eligible = all.filter((l: any) => {
          const status = (l.status || '').toLowerCase();
          const stage = (l.pipeline_stage || '').toLowerCase();
          return status !== 'lost' && stage !== 'closed_lost';
        });

        eligible.sort((a: any, b: any) => {
          const pA = STAGE_PRIORITY[a.pipeline_stage] ?? 10;
          const pB = STAGE_PRIORITY[b.pipeline_stage] ?? 10;
          return pA - pB;
        });

        setLeads(eligible);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [addressError, setAddressError] = useState<string | null>(null);

  const handleSelectLead = async (lead: any) => {
    setAddressError(null);

    // 1-Draft-Per-Lead: Check if this lead already has an unexecuted draft estimate
    try {
      const res: any = await api.request(`/admin/estimates/draft-by-lead/${lead.id}`);
      if (res?.exists && res.estimate) {
        const est = res.estimate;
        if (est.proposal_data) {
          const pd = typeof est.proposal_data === 'string' ? JSON.parse(est.proposal_data) : est.proposal_data;
          onDataChange({
            ...pd,
            id: est.id,
            estimateNumber: est.estimate_number,
          });
        } else {
          onDataChange({
            id: est.id,
            estimateNumber: est.estimate_number,
          });
        }
        setSearchQuery('');
        setShowDropdown(false);
        return;
      }
    } catch (err) {
      console.warn('Failed checking draft estimate for lead:', err);
    }

    const name = lead.full_name || lead.name || '';

    // Prefer verified Client 360 profile address over lead-entry data
    const c360Address = lead.client_360_address || '';
    const c360City = lead.client_360_city || '';
    const c360Zip = lead.client_360_zip || '';

    const leadAddress = lead.address || '';
    const leadCity = lead.city || '';
    const leadZip = lead.zip || '';

    // Use Client 360 address if it exists, otherwise fall back to lead address
    const address = c360Address || leadAddress;
    const city = c360City || leadCity;
    const zip = c360Zip || leadZip;
    const property = [address, city, zip].filter(Boolean).join(', ');

    // Block if no property address at all — it's required for the estimate
    if (!address.trim()) {
      setAddressError(
        `No property address on file for ${name}. Please add a verified address to their Client 360 profile before creating an estimate.`
      );
      return;
    }

    onDataChange({
      client: {
        leadId: String(lead.id),
        name,
        property,
        addressSource: c360Address ? 'client_360' : 'lead',
        phone: lead.phone || '',
        email: lead.email || '',
      }
    });
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleDateChange = (val: string) => {
    if (!val) return;
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      onDataChange({ proposalDate: date.toISOString() });
    }
  };

  const formattedDate = data.proposalDate 
    ? new Date(data.proposalDate).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.request('/admin/estimates/upload-photo', {
        method: 'POST',
        body: formData,
      });
      if (res.url) {
        onDataChange({
          photo1: {
            url: res.url,
            filename: file.name,
            x: 0,
            y: 0,
            zoom: 1.0,
            position: { x: 0, y: 0 },
            focalPoint: { x: 0.5, y: 0.5 },
          }
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Date */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar size={14} /> Proposal Date
        </label>
        <CrmDatePicker 
          value={formattedDate}
          onChange={handleDateChange}
          placeholder="Select proposal date..."
        />
      </div>

      {/* Client */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Client Details</h3>
        
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search leads by name, phone, address..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#1a5ba5] focus:ring-2 focus:ring-[#1a5ba5]/20 transition-all"
            />
          </div>
          
          {showDropdown && (searchQuery.trim() !== '') && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-60 overflow-auto">
              {isSearching ? (
                <div className="p-3 text-sm text-slate-500 text-center">Searching...</div>
              ) : leads.length > 0 ? (
                leads.map(lead => (
                  <div 
                    key={lead.id} 
                    onClick={() => handleSelectLead(lead)}
                    className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-slate-800">{lead.full_name || lead.name}</div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold uppercase tracking-wider">
                        {(lead.pipeline_stage || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex gap-3 mt-1">
                      {lead.phone && <span className="flex items-center gap-0.5"><Phone size={10}/> {lead.phone}</span>}
                      {lead.address && <span className="flex items-center gap-0.5"><MapPin size={10}/> {lead.address}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center">
                  <div className="text-sm text-slate-500">No estimate-ready leads found.</div>
                  <div className="text-[10px] text-slate-400 mt-1">Only leads with a scheduled estimate/inspection appear here.</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Address missing error */}
        {addressError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="text-xs font-bold text-red-700">Property address required</p>
              <p className="text-xs text-red-600 mt-0.5 leading-relaxed">{addressError}</p>
            </div>
          </div>
        )}

        {data.client.leadId && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                  Name <Lock size={10} />
                </label>
                <div className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg mt-1 truncate">
                  {data.client.name}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                  Phone <Lock size={10} />
                </label>
                <div className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg mt-1 truncate">
                  {data.client.phone}
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  Property
                  {data.client.addressSource === 'client_360' ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase tracking-wide">
                      Client 360 ✓
                    </span>
                  ) : data.client.addressSource === 'lead' ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase tracking-wide">
                      Lead entry
                    </span>
                  ) : null}
                </span>
                <Lock size={10} />
              </label>
              <div className="text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg mt-1 truncate">
                {data.client.property}
              </div>
            </div>

            <FieldWithCap 
              label="Email Address"
              value={data.client.email}
              onChange={(val) => onDataChange({ client: { ...data.client, email: val } })}
              maxLength={ESTIMATE_FIELD_CAPS.clientEmail}
            />
          </div>
        )}
      </div>

      {/* Photo 1 */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Cover Photo (Photo 1)</h3>
        
        {!data.photo1?.url ? (
          <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors relative">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-3 text-slate-400" />
              <p className="mb-2 text-sm text-slate-500 font-medium">
                <span className="font-bold text-[#1a5ba5]">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-slate-400">JPG, PNG, WebP (Max 10MB)</p>
            </div>
            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/heic" onChange={handleFileUpload} disabled={isUploading} />
            {isUploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                <div className="text-sm font-bold text-[#1a5ba5] animate-pulse">Uploading...</div>
              </div>
            )}
          </label>
        ) : (
          <PhotoFrameEditor
            photo={data.photo1}
            onChange={(updated) => onDataChange({ photo1: updated })}
            onRemove={() => onDataChange({ photo1: undefined })}
            onReplace={handleFileUpload}
            isReplacing={isUploading}
            label="Cover Photo (Page 1)"
            helperText="Drag to reposition and zoom to frame the roofline for the estimate cover."
            aspectRatio={816 / 526}
          />
        )}
      </div>

    </div>
  );
}
