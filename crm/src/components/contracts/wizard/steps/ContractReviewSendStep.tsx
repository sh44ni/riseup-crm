import React, { useState } from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { Check, Send, Download, Lock, AlertCircle, Loader2, ShieldCheck, Mail, Smartphone } from 'lucide-react';
import { buildContract, sendContract, sendContractSms } from '@/api/contractApi';
import { API_ORIGIN } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { buildContractPayload } from './review/payloadBuilder';
import { ContractSummaryOverview } from './review/ContractSummaryOverview';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractReviewSendStep({ data, onDataChange }: StepProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const isAlreadySent = Boolean(
    data.status &&
      ['sent', 'client_signed', 'signed', 'partially_signed', 'executed'].includes(
        data.status.toLowerCase()
      )
  );
  const [sendSuccess, setSendSuccess] = useState(isAlreadySent);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);
  const [contractId, setContractId] = useState<number | null>(data.id ? Number(data.id) : null);

  const hasContactInfo = Boolean(data.clientEmail?.trim() || data.clientPhone?.trim());

  // 1. ONE SEND BUTTON: Dispatches to both client email and client SMS (locked/non-editable)
  const handleSendContract = async () => {
    if (!hasContactInfo) {
      toast.warning('Please add the client email or phone number in Client 360 before sending.');
      return;
    }

    setIsSending(true);
    try {
      // Step A: Build & compile the contract in DB
      const payload = buildContractPayload(data, contractId);
      const buildRes = await buildContract(payload);
      const cId = buildRes.contract_id;
      setContractId(cId);

      const dispatchedChannels: string[] = [];

      // Step B: Send via Email if client email is present
      if (data.clientEmail?.trim()) {
        try {
          await sendContract(cId, data.clientEmail.trim());
          dispatchedChannels.push(`Email (${data.clientEmail})`);
        } catch (emailErr: unknown) {
          console.error('Email delivery error:', emailErr);
          toast.error(`Email dispatch failed: ${emailErr instanceof Error ? emailErr.message : 'Unknown'}`);
        }
      }

      // Step C: Send via SMS if client phone is present
      if (data.clientPhone?.trim()) {
        try {
          await sendContractSms(cId, data.clientPhone.trim());
          dispatchedChannels.push(`SMS (${data.clientPhone})`);
        } catch (smsErr: unknown) {
          console.error('SMS delivery error:', smsErr);
          toast.error(`SMS dispatch failed: ${smsErr instanceof Error ? smsErr.message : 'Unknown'}`);
        }
      }

      setSendSuccess(true);
      const channelsText = dispatchedChannels.join(' and ') || 'client communication channels';
      const feedbackMsg = `The contract and secure interactive signing link have been sent directly to ${data.clientName || 'the client'} via ${channelsText}. The deal has moved to "Contract Sent".`;
      setSendFeedback(feedbackMsg);
      toast.success(`Contract dispatched via ${channelsText}`);

      onDataChange({
        status: 'sent',
        id: String(cId),
        contractNumber: buildRes.contract_number,
        signingToken: buildRes.signing_token,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Send contract failed:', e);
      toast.error(`Failed to send contract: ${msg}`);
    } finally {
      setIsSending(false);
    }
  };

  // 2. ONE DOWNLOAD BUTTON: Generates the current PDF and downloads it
  const handleDownloadCurrentPdf = async () => {
    setIsDownloading(true);
    try {
      const payload = buildContractPayload(data, contractId);
      const res = await buildContract(payload);
      if (res?.contract_id) setContractId(res.contract_id);

      onDataChange({
        id: String(res.contract_id),
        contractNumber: res.contract_number,
        signingToken: res.signing_token,
      });

      if (res?.pdf_url) {
        const fullUrl = res.pdf_url.startsWith('http')
          ? res.pdf_url
          : `${API_ORIGIN}${res.pdf_url}`;

        // Fetch as blob so browser directly saves the file instead of navigating to a new tab
        const pdfResp = await fetch(fullUrl, { credentials: 'include' });
        if (!pdfResp.ok) {
          throw new Error(`Failed to fetch generated PDF (HTTP ${pdfResp.status})`);
        }
        const blob = await pdfResp.blob();
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `Contract-${(res.contract_number || 'Draft').replace(/\//g, '-')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        toast.success('Contract PDF generated and downloaded');
      } else {
        toast.error('Contract built, but no download URL returned.');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('PDF download error:', e);
      toast.error(`Failed to generate PDF: ${msg}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sent confirmation notification banner */}
      {sendSuccess || data.status === 'sent' ? (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center animate-in fade-in">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Check size={24} strokeWidth={3} />
          </div>
          <h3 className="text-lg font-bold text-emerald-800">Contract Dispatched to Client!</h3>
          <p className="text-sm text-emerald-600 font-medium mt-1 max-w-xl mx-auto">
            {sendFeedback ||
              `The contract has been dispatched directly to ${data.clientName || 'the client'} via Email and SMS.`}
          </p>
        </div>
      ) : null}

      {/* Contract terms, scope, and pricing summary */}
      <ContractSummaryOverview data={data} />

      {/* UNIFIED DISPATCH & DOCUMENT ACTIONS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <ShieldCheck size={18} className="text-[#1878B8]" />
              <span>Contract Delivery &amp; Export</span>
            </div>
            <p className="text-xs text-slate-500">
              Dispatches the contract to the client's verified communication channels or downloads the current high-res PDF.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200">
            CSLB Compliant
          </span>
        </div>

        {/* LOCKED CLIENT CONTACT INFORMATION (Non-editable) */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider">
            <span>Recipient Delivery Channels</span>
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 lowercase">
              <Lock size={11} className="text-slate-400" />
              <span>locked to client 360</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Email (Locked) */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#1878B8] flex items-center justify-center shrink-0">
                <Mail size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Client Email
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">
                  {data.clientEmail || (
                    <span className="text-amber-600 font-normal italic">Missing email (add in Client 360)</span>
                  )}
                </div>
              </div>
            </div>

            {/* SMS Phone (Locked) */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Smartphone size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  SMS Phone
                </div>
                <div className="text-xs font-bold text-slate-800 truncate">
                  {data.clientPhone || (
                    <span className="text-amber-600 font-normal italic">Missing phone (add in Client 360)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {!hasContactInfo && (
            <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
              <AlertCircle size={14} className="shrink-0 text-amber-600" />
              <span>Please add the client's email or phone number via Client 360 before sending.</span>
            </div>
          )}
        </div>

        {/* EXACTLY TWO BUTTONS: 1 SEND AND 1 DOWNLOAD PDF */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* BUTTON 1: SEND (Dispatches to Email & SMS) */}
          <button
            type="button"
            onClick={handleSendContract}
            disabled={isSending || !hasContactInfo}
            className={`py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              sendSuccess
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white hover:shadow-lg hover:scale-[1.01]'
            }`}
          >
            {isSending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Sending via Email &amp; SMS...</span>
              </>
            ) : sendSuccess ? (
              <>
                <Check size={16} strokeWidth={3} />
                <span>Re-Send Contract (Email &amp; SMS)</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Send Contract (Email &amp; SMS)</span>
              </>
            )}
          </button>

          {/* BUTTON 2: DOWNLOAD PDF (Generates current PDF) */}
          <button
            type="button"
            onClick={handleDownloadCurrentPdf}
            disabled={isDownloading}
            className="py-3.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
          >
            {isDownloading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Compiling Current PDF...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Download Contract PDF</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 text-center">
          Clicking Send dispatches the contract to the client's verified email and SMS with their secure signing link.
        </p>
      </div>
    </div>
  );
}

export default ContractReviewSendStep;
