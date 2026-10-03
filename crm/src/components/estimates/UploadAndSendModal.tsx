import React, { useState, useRef, useEffect } from 'react';
import { Upload, AlertTriangle, Send } from 'lucide-react';
import { CrmModal } from '@/components/common/CrmModal';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Lead, SelectedLead, SentResult, STAGE_PRIORITY } from './upload/types';
import { UploadLeadSelector } from './upload/UploadLeadSelector';
import { UploadPdfDropzone } from './upload/UploadPdfDropzone';
import { UploadSuccessView } from './upload/UploadSuccessView';

interface UploadAndSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadAndSendModal({ isOpen, onClose, onSuccess }: UploadAndSendModalProps) {
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<SelectedLead | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [sentResult, setSentResult] = useState<SentResult | null>(null);

  const resetAll = () => {
    setSearchQuery('');
    setLeads([]);
    setShowDropdown(false);
    setSelectedLead(null);
    setEmail('');
    setFile(null);
    setMessage('');
    setIsSending(false);
    setSentResult(null);
  };

  const handleClose = () => {
    resetAll();
    onClose();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setLeads([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = (await api.request(
          `/admin/leads?search=${encodeURIComponent(searchQuery)}&limit=25`
        )) as { leads?: Lead[] };
        const all: Lead[] = res.leads || [];
        const eligible = all.filter((l) => {
          const status = (l.status || '').toLowerCase();
          const stage = (l.pipeline_stage || '').toLowerCase();
          return status !== 'lost' && stage !== 'closed_lost';
        });
        eligible.sort((a, b) => {
          const pA = STAGE_PRIORITY[a.pipeline_stage || ''] ?? 10;
          const pB = STAGE_PRIORITY[b.pipeline_stage || ''] ?? 10;
          return pA - pB;
        });
        setLeads(eligible);
      } catch (e: unknown) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const canSend = Boolean(selectedLead && file && email.trim());

  const handleSend = async () => {
    if (!selectedLead) {
      toast.warning('Please select a lead first.');
      return;
    }
    if (!file) {
      toast.warning('Please select a PDF file to upload.');
      return;
    }
    if (!email.trim()) {
      toast.warning('Client email is required.');
      return;
    }

    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      formData.append('customerEmail', email.trim());
      formData.append('customerName', selectedLead.name);
      formData.append('customerPhone', selectedLead.phone);
      formData.append('message', message.trim());
      formData.append('leadId', String(selectedLead.id));

      const res = (await api.request('/admin/estimates/upload-and-send', {
        method: 'POST',
        body: formData,
        timeoutMs: 60000,
      })) as { estimateNumber?: string; simulated?: boolean; message?: string };

      setSentResult({
        estimateNumber: res.estimateNumber || '',
        simulated: Boolean(res.simulated),
        message: res.message || 'Estimate sent successfully.',
      });

      toast.success(
        res.simulated
          ? 'Estimate logged (simulated — test email detected).'
          : `Proposal sent to ${email.trim()}! Lead moved to Estimate Sent.`
      );
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to send: ${msg}`);
    } finally {
      setIsSending(false);
    }
  };

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
      {sentResult ? (
        <UploadSuccessView result={sentResult} />
      ) : (
        <div className="space-y-5">
          <UploadLeadSelector
            selectedLead={selectedLead}
            email={email}
            searchQuery={searchQuery}
            leads={leads}
            isSearching={isSearching}
            showDropdown={showDropdown}
            dropdownRef={dropdownRef}
            onSearchQueryChange={setSearchQuery}
            onShowDropdownChange={setShowDropdown}
            onSelectLead={handleSelectLead}
            onClearLead={clearLead}
            onEmailChange={setEmail}
          />

          <UploadPdfDropzone file={file} onFileChange={setFile} />

          <div>
            <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black flex items-center justify-center">
                3
              </span>
              Custom Message{' '}
              <span className="text-slate-400 font-semibold normal-case tracking-normal">
                (optional)
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Personal note to the client — appears in the email body…"
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#1878B8] focus:ring-2 focus:ring-[#1878B8]/15 outline-none transition-all resize-none"
            />
          </div>

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

export default UploadAndSendModal;
