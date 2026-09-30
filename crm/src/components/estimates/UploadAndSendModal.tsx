import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload,
  FileText,
  X,
  Mail,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  Paperclip,
  Search,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { CrmModal } from '@/components/common/CrmModal';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  zip?: string;
  pipeline_stage?: string;
  status?: string;
  client_360_address?: string;
  client_360_city?: string;
  client_360_zip?: string;
}

interface SelectedLead {
  id: number;
  name: string;
  phone: string;
  email: string;
  property: string;
  stage: string;
}

// Priority: estimate_scheduled comes first
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

const STAGE_LABELS: Record<string, string> = {
  estimate_scheduled: 'Estimate Scheduled',
  est_scheduled: 'Estimate Scheduled',
  inspection_scheduled: 'Inspection Scheduled',
  inspection_completed: 'Inspection Done',
  estimate_building: 'Building Estimate',
  estimate_sent: 'Estimate Sent',
  follow_up: 'Follow Up',
  initial_call: 'Initial Call',
  cold_lead: 'Cold Lead',
};

const stageLabel = (stage?: string) =>
  STAGE_LABELS[stage || ''] || (stage || '').replace(/_/g, ' ');

// ─── Props ───────────────────────────────────────────────────────────────────

interface UploadAndSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UploadAndSendModal({ isOpen, onClose, onSuccess }: UploadAndSendModalProps) {
  const { toast } = useToast();

  // Lead search
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Editable email (like studio — locked fields but email can be changed)
  const [email, setEmail] = useState('');

  // File
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optional message
  const [message, setMessage] = useState('');

  // Submission
  const [isSending, setIsSending] = useState(false);
  const [sentResult, setSentResult] = useState<{
    estimateNumber: string;
    simulated: boolean;
    message: string;
  } | null>(null);

  // ── Reset on close ───────────────────────────────────────────────────────
  const resetAll = () => {
    setSearchQuery('');
    setLeads([]);
    setShowDropdown(false);
    setSelectedLead(null);
    setEmail('');
    setFile(null);
    setIsDragging(false);
    setMessage('');
    setIsSending(false);
    setSentResult(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ── Close dropdown on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Lead search debounce ─────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setLeads([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res: any = await api.request(
          `/admin/leads?search=${encodeURIComponent(searchQuery)}&limit=25`
        );
        const all: Lead[] = res.leads || [];
        // Filter out explicitly lost leads
        const eligible = all.filter(l => {
          const status = (l.status || '').toLowerCase();
          const stage = (l.pipeline_stage || '').toLowerCase();
          return status !== 'lost' && stage !== 'closed_lost';
        });
        // Sort by stage priority (estimate_scheduled first)
        eligible.sort((a, b) => {
          const pA = STAGE_PRIORITY[a.pipeline_stage || ''] ?? 10;
          const pB = STAGE_PRIORITY[b.pipeline_stage || ''] ?? 10;
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

  // ── Select a lead ────────────────────────────────────────────────────────
  const handleSelectLead = (lead: Lead) => {
    const name = lead.full_name || lead.name || '';
    const address = lead.client_360_address || lead.address || '';
    const city = lead.client_360_city || lead.city || '';
    const zip = lead.client_360_zip || lead.zip || '';
    const property = [address, city, zip].filter(Boolean).join(', ');

    setSelectedLead({
      id: lead.id,
      name,
      phone: lead.phone || '',
      email: lead.email || '',
      property,
      stage: lead.pipeline_stage || '',
    });
    setEmail(lead.email || '');
    setSearchQuery('');
    setShowDropdown(false);
    setLeads([]);
  };

  const clearLead = () => {
    setSelectedLead(null);
    setEmail('');
  };

  // ── File handling ────────────────────────────────────────────────────────
  const validateAndSetFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('PDF file exceeds the 50 MB size limit.');
      return;
    }
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) validateAndSetFile(picked);
    e.target.value = '';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  // ── Can send? ────────────────────────────────────────────────────────────
  const canSend = Boolean(selectedLead && file && email.trim());

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!selectedLead) { toast.warning('Please select a lead first.'); return; }
    if (!file) { toast.warning('Please select a PDF file to upload.'); return; }
    if (!email.trim()) { toast.warning('Client email is required.'); return; }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('customerEmail', email.trim());
      formData.append('customerName', selectedLead.name);
      formData.append('customerPhone', selectedLead.phone);
      formData.append('message', message.trim());
      formData.append('leadId', String(selectedLead.id));

      const res: any = await api.request('/admin/estimates/upload-and-send', {
        method: 'POST',
        body: formData,
        timeoutMs: 60000,
      });

      setSentResult({
        estimateNumber: res.estimateNumber || '',
        simulated: !!res.simulated,
        message: res.message || 'Estimate sent successfully.',
      });

      toast.success(
        res.simulated
          ? 'Estimate logged (simulated — test email detected).'
          : `Proposal sent to ${email.trim()}! Lead moved to Estimate Sent.`
      );
      onSuccess?.();
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message || String(err)}`);
    } finally {
      setIsSending(false);
    }
  };

  // ── Stage badge ──────────────────────────────────────────────────────────
  const stageBadgeClass = (stage: string) => {
    const p = STAGE_PRIORITY[stage] ?? 10;
    if (p === 1) return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
    if (p === 2) return 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/30';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10';
  };

  // ── Footer ───────────────────────────────────────────────────────────────
  const footer = sentResult ? (
    <button
      type="button"
      onClick={handleClose}
      className="px-5 py-2 rounded-xl bg-[#1878B8] text-white text-sm font-bold hover:bg-[#146399] transition-colors cursor-pointer shadow-xs"
    >
      Done
    </button>
  ) : (
    <div className="flex items-center gap-2 w-full">
      <button
        type="button"
        onClick={handleClose}
        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSend}
        disabled={isSending || !canSend}
        className="flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold shadow-md hover:brightness-105 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed cursor-pointer"
      >
        {isSending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Uploading &amp; Sending…
          </>
        ) : (
          <>
            <Send size={15} />
            Upload &amp; Send PDF
          </>
        )}
      </button>
    </div>
  );

  return (
    <CrmModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload &amp; Send Estimate"
      subtitle="Select a lead, upload your PDF, and send it directly to their email."
      icon={<Upload size={18} />}
      iconGradient="from-emerald-500 to-teal-400"
      maxWidth="lg"
      footer={footer}
    >
      {/* ── Success Screen ── */}
      {sentResult ? (
        <div className="py-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {sentResult.simulated ? 'Estimate Logged' : 'Estimate Sent!'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {sentResult.message}
            </p>
            {sentResult.estimateNumber && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                <FileText size={12} />
                {sentResult.estimateNumber}
              </div>
            )}
            {!sentResult.simulated && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                <ArrowRight size={12} />
                Lead pipeline advanced to <strong>Estimate Sent</strong>
              </div>
            )}
          </div>
          {sentResult.simulated && (
            <div className="flex items-start gap-2 text-left p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30">
              <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Email was <strong>not sent</strong> — test addresses are skipped. Use a real homeowner email for live delivery.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Step 1: Lead Selection ── */}
          <div>
            <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1878B8] text-white text-[9px] font-black flex items-center justify-center">1</span>
              Select Lead <span className="text-rose-500">*</span>
            </div>

            {/* Lead selected — locked display */}
            {selectedLead ? (
              <div className="p-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-3">
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <User size={14} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{selectedLead.name}</div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wider ${stageBadgeClass(selectedLead.stage)}`}>
                        {stageLabel(selectedLead.stage)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearLead}
                    className="w-7 h-7 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-all cursor-pointer"
                    title="Clear selection"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Locked fields grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                      Phone <Lock size={9} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg">
                      <Phone size={11} className="text-slate-400 shrink-0" />
                      {selectedLead.phone || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
                      Property <Lock size={9} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg truncate">
                      <MapPin size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">{selectedLead.property || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Email — editable (same as studio) */}
                <div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </div>
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Client email address"
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/15 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Lead search input + dropdown */
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search leads by name, phone, address…"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/15 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setLeads([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {showDropdown && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-[#0B1320] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-20 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                    {isSearching ? (
                      <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">Searching…</div>
                    ) : leads.length > 0 ? (
                      leads.map(lead => {
                        const name = lead.full_name || lead.name || '';
                        const stage = lead.pipeline_stage || '';
                        const isScheduled = STAGE_PRIORITY[stage] === 1;
                        return (
                          <div
                            key={lead.id}
                            onClick={() => handleSelectLead(lead)}
                            className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer border-b border-slate-100 dark:border-white/5 last:border-0 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-black uppercase tracking-wider shrink-0 ${stageBadgeClass(stage)}`}>
                                {stageLabel(stage)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {lead.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={10} /> {lead.phone}
                                </span>
                              )}
                              {lead.address && (
                                <span className="flex items-center gap-1 truncate">
                                  <MapPin size={10} /> {lead.address}
                                </span>
                              )}
                            </div>
                            {isScheduled && (
                              <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                                ✓ Ready for estimate
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">No leads found for &ldquo;{searchQuery}&rdquo;</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                          Try searching by name, phone, or address.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Hint */}
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                  Leads in <strong>Estimate Scheduled</strong> are shown first. All non-lost leads are searchable.
                </p>
              </div>
            )}
          </div>

          {/* ── Step 2: PDF Upload ── */}
          <div>
            <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-[#1878B8] text-white text-[9px] font-black flex items-center justify-center">2</span>
              PDF File <span className="text-rose-500">*</span>
            </div>

            {file ? (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Paperclip size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{file.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="w-7 h-7 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/40 hover:border-[#1878B8] hover:bg-sky-50/30 dark:hover:bg-sky-950/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  <Upload size={20} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {isDragging ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">or click to browse — PDF only, max 50 MB</p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>

          {/* ── Optional message ── */}
          <div>
            <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black flex items-center justify-center">3</span>
              Custom Message <span className="text-slate-400 font-semibold normal-case tracking-normal">(optional)</span>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Personal note to the client — appears in the email body…"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/15 outline-none transition-all resize-none"
            />
          </div>

          {/* Validation hint row */}
          {!canSend && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
              <AlertTriangle size={12} className="text-amber-500 shrink-0" />
              {!selectedLead
                ? 'Select a lead to continue.'
                : !file
                ? 'Attach a PDF to continue.'
                : 'Provide a valid email address.'}
            </div>
          )}
        </div>
      )}
    </CrmModal>
  );
}
