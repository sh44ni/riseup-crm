import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  User,
  Phone,
  Mail,
  MapPin,
  Check,
  ChevronDown,
  UserPlus,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useClients360 } from '@/lib/client360Store';
import { CRM_LEAD_PRESETS, LeadPreset } from '@/data/estimateData';

export interface UnifiedClientOption {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  squares?: number;
  pitch?: string;
  stories?: string;
  source: 'client_360' | 'lead_preset';
  statusLabel?: string;
}

interface EstimateClientSearchSelectProps {
  selectedClientName: string;
  onSelectClient: (client: UnifiedClientOption) => void;
  onManualEditToggle?: () => void;
}

export function EstimateClientSearchSelect({
  selectedClientName,
  onSelectClient,
  onManualEditToggle,
}: EstimateClientSearchSelectProps) {
  const { clients } = useClients360();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Merge clients from Client 360 and CRM Leads
  const unifiedClients: UnifiedClientOption[] = useMemo(() => {
    const map = new Map<string, UnifiedClientOption>();

    // 1. Leads
    CRM_LEAD_PRESETS.forEach((lead) => {
      map.set(lead.name.toLowerCase(), {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: `${lead.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
        address: lead.address,
        city: lead.city,
        squares: lead.squares,
        pitch: lead.pitch,
        stories: lead.stories,
        source: 'lead_preset',
        statusLabel: 'CRM Lead • Ready for Quote',
      });
    });

    // 2. Client 360 Store (Overwrites or adds)
    clients.forEach((c) => {
      map.set(c.name.toLowerCase(), {
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        address: c.address,
        city: c.city,
        squares: c.roofSpecs?.roofSquares,
        pitch: c.roofSpecs?.pitch,
        stories: c.roofSpecs?.stories,
        source: 'client_360',
        statusLabel: c.statusLabel || 'Client 360 Record',
      });
    });

    return Array.from(map.values());
  }, [clients]);

  // Reactive Multi-Field Search (Name, Phone, Email, Address)
  const filteredClients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return unifiedClients;

    return unifiedClients.filter((c) => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchPhone = c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '')) || c.phone.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchAddress = c.address.toLowerCase().includes(q) || c.city.toLowerCase().includes(q);
      return matchName || matchPhone || matchEmail || matchAddress;
    });
  }, [unifiedClients, searchQuery]);

  // Find currently selected client
  const activeSelected = useMemo(() => {
    return unifiedClients.find(
      (c) => c.name.toLowerCase() === selectedClientName.trim().toLowerCase()
    );
  }, [unifiedClients, selectedClientName]);

  const handleSelect = (client: UnifiedClientOption) => {
    onSelectClient(client);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Selected Client Display Button */}
      <div
        onClick={() => {
          setIsOpen(!isOpen);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full p-2.5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 shadow-2xs hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-3 group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/15 to-sky-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold shrink-0">
            <User size={15} />
          </div>
          <div className="min-w-0 text-left">
            <div className="text-xs font-black text-slate-900 truncate flex items-center gap-2">
              <span>{activeSelected ? activeSelected.name : selectedClientName || 'Select Client...'}</span>
              {activeSelected && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[9px] font-black uppercase">
                  {activeSelected.source === 'client_360' ? 'Client 360' : 'CRM Lead'}
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
              <span>{activeSelected?.address || 'Search across names, phones, emails, streets...'}</span>
              {activeSelected?.city && <span>&bull; {activeSelected.city}</span>}
              {activeSelected?.squares && (
                <span className="font-bold text-sky-700">&bull; {activeSelected.squares} SQ</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-slate-400 group-hover:text-slate-700">
          <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Floating Dropdown Modal */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl p-2.5 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Live Search Input Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Phone, Email, or Street..."
              className="w-full pl-8.5 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Quick Counter */}
          <div className="flex items-center justify-between px-1 text-[10px] font-bold text-slate-400">
            <span>{filteredClients.length} matching client records</span>
            {onManualEditToggle && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onManualEditToggle();
                }}
                className="text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer font-black"
              >
                <UserPlus size={11} />
                <span>+ Custom / Manual Client</span>
              </button>
            )}
          </div>

          {/* Client List */}
          <div className="max-h-64 overflow-y-auto space-y-1 pr-0.5 custom-scrollbar">
            {filteredClients.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching clients found for &quot;{searchQuery}&quot;.
                {onManualEditToggle && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onManualEditToggle();
                    }}
                    className="block mx-auto mt-2 text-xs font-bold text-sky-600 hover:underline cursor-pointer"
                  >
                    Enter client information manually
                  </button>
                )}
              </div>
            ) : (
              filteredClients.map((client) => {
                const isSelected = client.name.toLowerCase() === selectedClientName.trim().toLowerCase();
                return (
                  <div
                    key={client.id}
                    onClick={() => handleSelect(client)}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/10 border border-amber-500/40 text-amber-900'
                        : 'hover:bg-slate-50 border border-transparent text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{client.name}</span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {client.source === 'client_360' ? 'Client 360' : 'Lead'}
                        </span>
                        {client.squares && (
                          <span className="text-[9px] font-bold text-sky-700">
                            {client.squares} SQ ({client.pitch || '4:12'})
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 mt-1 text-[10.5px] text-slate-500">
                        <div className="flex items-center gap-1 truncate">
                          <MapPin size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate">{client.address}, {client.city}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <Phone size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate">{client.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate col-span-2 text-[10px] text-slate-400">
                          <Mail size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check size={12} className="stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
