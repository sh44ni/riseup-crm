import React, { useState } from 'react';
import { TwoOptionsEstimate } from '@/types/estimateContractTypes';
import { Download, Send, Check, FileText, Clock, User, MapPin } from 'lucide-react';
import { api, API_ORIGIN } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface StepProps {
  data: TwoOptionsEstimate;
  onDataChange: (updates: Partial<TwoOptionsEstimate>) => void;
}

export function ReviewSendStep({ data, onDataChange }: StepProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  const ensureEstimateSaved = async (): Promise<string | number | null> => {
    if (data.id) return data.id;
    try {
      const res: any = await api.request('/admin/estimates/two-options', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res?.estimate?.id) {
        onDataChange({ id: res.estimate.id, estimateNumber: res.estimate.estimate_number });
        return res.estimate.id;
      }
    } catch (err) {
      console.error('Failed to auto-save estimate before action:', err);
    }
    return null;
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const currentId = await ensureEstimateSaved();
      if (!currentId) {
        toast.warning("Estimate must be saved first. Please ensure client details are filled.");
        return;
      }
      const res = await api.request(`/admin/estimates/${currentId}/render-pdf`, { method: 'POST', timeoutMs: 60000 });
      const downloadPath = res.pdfUrl || res.url;
      if (downloadPath) {
        const fullUrl = downloadPath.startsWith('http') ? downloadPath : `${API_ORIGIN}${downloadPath}`;
        const a = document.createElement('a');
        a.href = fullUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Estimate proposal PDF downloading");
      } else {
        toast.error("Failed to render PDF: No download link returned.");
      }
    } catch (e: any) {
      console.error('PDF download error:', e);
      toast.error(`Failed to render PDF: ${e.message || e}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const currentId = await ensureEstimateSaved();
      if (!currentId) {
        toast.warning("Estimate must be saved first. Please ensure client details are filled.");
        return;
      }
      const res = await api.request(`/admin/estimates/${currentId}/send-estimate`, { 
        method: 'POST',
        timeoutMs: 60000, // PDF generation + email dispatch can take 20-40s
        body: JSON.stringify({
          customerEmail: data.client?.email || undefined,
          customerName: data.client?.name || undefined,
          leadId: data.client?.leadId || undefined,
        })
      });
      setSendSuccess(true);
      toast.success("Estimate sent to client successfully.");
      if (res?.message) {
        setSendFeedback(res.message);
      }
      onDataChange({ status: 'sent' });
    } catch (e: any) {
      console.error('Send estimate failed:', e);
      const msg = e.message || String(e);
      toast.error(`Failed to send estimate: ${msg}`);
    } finally {
      setIsSending(false);
    }
  };

  const minLockIn = Math.min(data.plans[0].price, data.plans[1].price);
  const maxStandard = Math.max(data.pricing.standardPrices[0], data.pricing.standardPrices[1]);

  return (
    <div className="space-y-8">
      {sendSuccess || data.status === 'sent' ? (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={24} strokeWidth={3} />
          </div>
          <h3 className="text-lg font-bold text-emerald-800">Estimate Sent!</h3>
          <p className="text-sm text-emerald-600 font-medium mt-1">
            {sendFeedback || `The proposal has been dispatched to ${data.client.email || 'the client'}.`}
          </p>
        </div>
      ) : null}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText size={16} className="text-[#1a5ba5]" /> 
            Proposal Summary
          </h3>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <Clock size={12} /> {data.pricing.lockInDays} Day Lock-in
          </div>
        </div>

        <div className="p-5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client</div>
              <div className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><User size={12}/> {data.client.name || 'Not provided'}</div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>{data.client.email || 'No email provided'}</span>
                {data.client?.email?.toLowerCase().includes('example.com') && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-semibold">Demo / Test</span>
                )}
              </div>
              <div className="text-xs text-slate-500">{data.client.phone}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Property</div>
              <div className="text-sm font-medium text-slate-800 flex items-start gap-1.5"><MapPin size={12} className="mt-0.5 shrink-0"/> {data.client.property || 'Not provided'}</div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Options Overview</div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-700">{data.plans[0].name || 'Plan A'}</span>
                <span className="font-bold text-[#1a5ba5]">${data.plans[0].price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-700">{data.plans[1].name || 'Plan B'}</span>
                <span className="font-bold text-[#1a5ba5]">${data.plans[1].price.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Add-ons</div>
            <div className="space-y-2">
              {data.addons.map((addon, i) => (
                addon.title && (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">{addon.title}</span>
                    <span className="text-slate-500 font-bold">{addon.pricePrefix}${addon.price.toLocaleString()}</span>
                  </div>
                )
              ))}
              {!data.addons[0].title && !data.addons[1].title && (
                <div className="text-xs text-slate-400 italic">No add-ons configured</div>
              )}
            </div>
          </div>

          <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Value Range</span>
            <span className="text-sm font-black text-[#1a5ba5]">
              ${minLockIn.toLocaleString()} &mdash; ${maxStandard.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-[#1a5ba5] text-[#1a5ba5] font-bold hover:bg-blue-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isDownloading ? (
            <div className="animate-pulse flex items-center gap-2">Rendering PDF...</div>
          ) : (
            <><Download size={18} /> Download PDF</>
          )}
        </button>
        <button
          onClick={handleSend}
          disabled={isSending || sendSuccess || data.status === 'sent'}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#1a5ba5] hover:bg-sky-600 text-white font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
        >
          {isSending ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating & Sending...
            </div>
          ) : (
            <><Send size={18} /> Save & Send</>
          )}
        </button>
      </div>
    </div>
  );
}
