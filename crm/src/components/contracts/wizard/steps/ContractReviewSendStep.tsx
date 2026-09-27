import React, { useState, useEffect } from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import {
  Download,
  Send,
  Check,
  FileText,
  Clock,
  User,
  MapPin,
  Smartphone,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { buildContract, sendContract, sendContractSms } from '@/api/contractApi';
import { API_ORIGIN } from '@/lib/api';
import { useToast } from '@/context/ToastContext';

interface StepProps {
  data: ContractStudioData;
  onDataChange: (updates: Partial<ContractStudioData>) => void;
}

export function ContractReviewSendStep({ data, onDataChange }: StepProps) {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [recipientPhone, setRecipientPhone] = useState(data.clientPhone || '');
  const [copiedLink, setCopiedLink] = useState(false);
  const [signingUrl, setSigningUrl] = useState<string | null>(data.signingUrl || null);
  const [contractId, setContractId] = useState<number | null>(data.id ? Number(data.id) : null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const normalizeSigningUrl = (tokenOrUrl?: string | null): string => {
    if (!tokenOrUrl) return '';
    if (tokenOrUrl.includes('/contract/sign/')) {
      const parts = tokenOrUrl.split('/contract/sign/');
      const token = parts[1].split('?')[0].split('#')[0];
      return `${window.location.origin}/contract/sign/${token}`;
    }
    return `${window.location.origin}/contract/sign/${tokenOrUrl}`;
  };

  const getEffectiveSigningUrl = (): string => {
    if (signingUrl) return normalizeSigningUrl(signingUrl);
    if (data.signingUrl) return normalizeSigningUrl(data.signingUrl);
    if (data.signingToken) return normalizeSigningUrl(data.signingToken);
    return '';
  };

  const buildPayload = () => ({
    lead_id: Number(data.leadId) || (data.clientId ? Number(data.clientId) : 1),
    contract_id: contractId || (data.id ? Number(data.id) : undefined),
    contract_data: {
      project_address: data.projectAddress
        ? `${data.projectAddress}, ${data.city || 'Valley Center'}, ${data.state || 'CA'} ${data.zip || ''}`
        : '28663 Miller Road, Valley Center, CA',
      client_name: data.clientName || 'Valued Client',
      contractor_name: data.contractorName || 'Edith Guerrero',
      contractor_title: data.contractorTitle || 'Project Manager',
      salesperson_name: data.salespersonName || 'Marc Sarellano',
      contract_date: data.contractDate || 'September 22, 2026',
      contract_date_short: data.contractDateShort || 'Sep 22, 2026',
      scope_title: data.scopeTitle || 'Complete Roofing System Installation',
      scope_sections: (data.scopeSections || []).map((s) => ({ heading: s.heading, text: s.text })),
      start_date: data.approxStartDate || 'October 16th, 2026.',
      commencement_date: data.substantialCommencementDate || 'October 19th, 2026.',
      completion_date: data.approxCompletionDate || 'October 22th, 2026.',
      contract_price: `$${(data.contractPrice || 31000).toLocaleString()}`,
      finance_charge: data.financeCharge || 'N/A',
      downpayment: `$${(data.downpayment || 1000).toLocaleString()}`,
      payment_schedule: (data.paymentSchedule || []).map((p) => ({
        number: p.number,
        description: p.description,
        amount: `$${(Number(p.amount) || 0).toLocaleString()}`,
      })),
      payment_schedule_total: `$${(data.contractPrice || 31000).toLocaleString()}`,
      license_number: data.contractorLicense || '#1096492',
      cancellation_deadline: 'three business days from signing',
      // Explicitly empty for blank contract generation
      client_initials: '',
      insurance_carrier: data.insuranceCarrier || 'PACIFIC UNITED INSURANCE SERVICES',
      insurance_phone: data.insurancePhone || '(619) 274-8144',
      workers_comp_carrier: data.workersCompCarrier || 'PACIFIC UNITED INSURANCE SERVICES',
      cancellation_email: data.cancellationEmail || 'accountant@riseuprac.com',
    },
  });

  // Auto-generate or ensure signing link is ready upon arriving at Step 8
  const handleEnsureSigningLink = async (): Promise<string> => {
    const existing = getEffectiveSigningUrl();
    if (existing) return existing;

    if (isGeneratingLink) return '';

    setIsGeneratingLink(true);
    setLinkError(null);
    try {
      const res = await buildContract(buildPayload() as any);
      const url = normalizeSigningUrl(res.signing_url || res.signing_token);
      if (res.contract_id) setContractId(res.contract_id);
      if (url) setSigningUrl(url);

      onDataChange({
        id: String(res.contract_id),
        contractNumber: res.contract_number,
        signingToken: res.signing_token,
        signingUrl: url,
      });
      return url;
    } catch (e: any) {
      console.warn('Could not auto-generate signing link:', e);
      setLinkError(e.message || String(e));
      return '';
    } finally {
      setIsGeneratingLink(false);
    }
  };

  useEffect(() => {
    const existing = getEffectiveSigningUrl();
    if (!existing && (data.leadId || data.clientId || data.clientName)) {
      handleEnsureSigningLink();
    }
  }, [data.leadId, data.clientId, data.clientName]);

  const handleDownloadBlank = async () => {
    setIsDownloading(true);
    try {
      const res = await buildContract(buildPayload() as any);
      if (res?.contract_id) setContractId(res.contract_id);
      const normUrl = normalizeSigningUrl(res?.signing_url || res?.signing_token);
      if (normUrl) setSigningUrl(normUrl);

      onDataChange({
        id: String(res.contract_id),
        contractNumber: res.contract_number,
        signingToken: res.signing_token,
        signingUrl: normUrl,
      });

      if (res?.pdf_url) {
        const fullUrl = res.pdf_url.startsWith('http') ? res.pdf_url : `${API_ORIGIN}${res.pdf_url}`;
        const a = document.createElement('a');
        a.href = fullUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('Contract PDF generated and downloading');
      } else {
        toast.error('Contract built, but no download URL returned.');
      }
    } catch (e: any) {
      console.error('PDF download error:', e);
      toast.error(`Failed to render PDF: ${e.message || e}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadSigned = () => {
    const url = data.signedPdfUrl;
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
    const a = document.createElement('a');
    a.href = fullUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Downloading signed contract PDF');
  };

  const handleSendEmail = async () => {
    if (!data.clientEmail) {
      toast.warning('Please enter a recipient email address.');
      return;
    }
    setIsSending(true);
    try {
      const buildRes = await buildContract(buildPayload() as any);
      const cId = buildRes.contract_id;
      setContractId(cId);
      const normUrl = normalizeSigningUrl(buildRes.signing_url || buildRes.signing_token);
      if (normUrl) setSigningUrl(normUrl);

      const sendRes = await sendContract(cId, data.clientEmail, customMessage);
      const activeUrl = normalizeSigningUrl(sendRes.signing_url) || normUrl;
      if (activeUrl) setSigningUrl(activeUrl);

      setSendSuccess(true);
      toast.success(`Contract & interactive signing link emailed to ${data.clientEmail}`);
      setSendFeedback(
        `The blank contract & interactive signing link have been emailed to ${data.clientEmail}. The deal has been moved to "Contract Sent".`
      );
      onDataChange({
        status: 'sent',
        id: String(cId),
        contractNumber: buildRes.contract_number,
        signingToken: buildRes.signing_token,
        signingUrl: activeUrl,
      });
    } catch (e: any) {
      console.error('Send contract failed:', e);
      toast.error(`Failed to send contract: ${e.message || e}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendSms = async () => {
    if (!recipientPhone) {
      toast.warning('Please enter a valid phone number for SMS delivery.');
      return;
    }
    setIsSendingSms(true);
    try {
      let cId = contractId;
      let sUrl = getEffectiveSigningUrl();

      if (!cId || !sUrl) {
        sUrl = await handleEnsureSigningLink();
        cId = contractId;
      }

      if (!cId) {
        const buildRes = await buildContract(buildPayload() as any);
        cId = buildRes.contract_id;
        setContractId(cId);
        sUrl = normalizeSigningUrl(buildRes.signing_url || buildRes.signing_token);
        setSigningUrl(sUrl);
        onDataChange({
          id: String(cId),
          contractNumber: buildRes.contract_number,
          signingToken: buildRes.signing_token,
          signingUrl: sUrl,
        });
      }

      const res = await sendContractSms(cId, recipientPhone, customMessage);
      const activeSmsUrl = normalizeSigningUrl(res.signing_url) || sUrl;
      if (activeSmsUrl) setSigningUrl(activeSmsUrl);
      setSmsSuccess(true);
      toast.success(`Interactive signing link dispatched via SMS to ${recipientPhone}`);

      // Auto-copy link to clipboard
      if (activeSmsUrl && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(activeSmsUrl);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 3500);
        } catch (_) {}
      }
    } catch (e: any) {
      console.error('Send SMS failed:', e);
      toast.error(`Failed to dispatch SMS: ${e.message || e}`);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleCopyLink = async () => {
    if (isGeneratingLink) return;
    let url = getEffectiveSigningUrl();
    if (!url) {
      url = await handleEnsureSigningLink();
    }

    if (url) {
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(url);
          setCopiedLink(true);
          toast.success('Client signing link copied to clipboard');
          setTimeout(() => setCopiedLink(false), 3000);
          return;
        } catch (_) {}
      }
      toast.info(`Client signing link: ${url}`, 8000);
    } else {
      toast.error(`Could not generate signing link: ${linkError || 'Please click Retry to generate the link.'}`);
    }
  };

  const handleOpenWizard = async () => {
    if (isGeneratingLink) return;
    const existingUrl = getEffectiveSigningUrl();
    if (existingUrl) {
      window.open(existingUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    // Open target window immediately to prevent browser popup blockers during network await
    const win = window.open('about:blank', '_blank');
    try {
      const generatedUrl = await handleEnsureSigningLink();
      if (generatedUrl && win) {
        win.location.href = generatedUrl;
      } else if (generatedUrl) {
        window.open(generatedUrl, '_blank', 'noopener,noreferrer');
      } else if (win) {
        win.close();
        toast.error('Could not generate signing link. Please verify contract details and try again.');
      }
    } catch (err: any) {
      if (win) win.close();
      toast.error(`Could not open signing wizard: ${err.message || err}`);
    }
  };

  const activeSigningLink = getEffectiveSigningUrl();

  return (
    <div className="space-y-8">
      {/* Sent confirmation notification */}
      {sendSuccess || data.status === 'sent' ? (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check size={24} strokeWidth={3} />
          </div>
          <h3 className="text-lg font-bold text-emerald-800">Contract Dispatched!</h3>
          <p className="text-sm text-emerald-600 font-medium mt-1">
            {sendFeedback ||
              `The empty contract has been dispatched to ${data.clientEmail || 'the client'} with an interactive signing wizard link.`}
          </p>
        </div>
      ) : null}

      {/* Contract Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <FileText size={16} className="text-[#1a5ba5]" />
            Contract Summary &amp; Overview
          </h3>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            <Clock size={12} /> CSLB Compliant &bull; 6 Pages
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Client</div>
              <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <User size={13} className="text-slate-400" /> {data.clientName || 'Not selected'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{data.clientPhone || 'No phone'}</div>
              <div className="text-xs text-slate-500">{data.clientEmail || 'No email'}</div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Property Address</div>
              <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-400" /> {data.projectAddress || 'Not entered'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {data.city}, {data.state} {data.zip}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Contract Total</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                ${(data.contractPrice || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Downpayment</div>
              <div className="text-base font-bold text-amber-600 mt-0.5">
                ${(data.downpayment || 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Milestones</div>
              <div className="text-base font-bold text-slate-800 mt-0.5">
                {data.paymentSchedule?.length || 0} Payments
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Downloads Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Download size={16} className="text-[#1a5ba5]" />
            PDF Documents
          </div>
          <span className="text-xs text-slate-400">Playwright High-Res PDF</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleDownloadBlank}
            disabled={isDownloading}
            className="py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:border-slate-300"
          >
            <Download size={15} />
            <span>{isDownloading ? 'Compiling PDF...' : 'Download Blank Contract (PDF)'}</span>
          </button>

          {data.isSigned || data.status === 'signed' || data.signedPdfUrl ? (
            <button
              onClick={handleDownloadSigned}
              className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <CheckCircle2 size={15} />
              <span>Download Signed Contract (PDF)</span>
            </button>
          ) : (
            <div className="py-3 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2 text-center">
              Signed PDF generates once client completes signing
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-500">
          * Blank contract is generated with clean, empty lines and boxes ready for manual or electronic execution.
        </p>
      </div>

      {/* Client Signing Portal & Link Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-[#1a5ba5]">
              <ShieldCheck size={18} />
              Interactive Client Signing Portal
            </div>
            <p className="text-xs text-slate-600 max-w-xl">
              Clients access this mobile-friendly, branded wizard to review contract terms, initial required statutory
              clauses, and draw or type their legal signature.
            </p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full border border-blue-300">
            Self-Service Wizard
          </span>
        </div>

        <div className="bg-white border border-blue-200 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 flex items-center gap-2 min-w-0 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200/60">
            {isGeneratingLink ? (
              <span className="text-xs text-blue-600 font-medium flex items-center gap-2 animate-pulse py-1">
                <RefreshCw size={13} className="animate-spin text-blue-600" />
                Generating secure homeowner signing link...
              </span>
            ) : (
              <input
                type="text"
                readOnly
                value={activeSigningLink || 'Click Copy or Open to generate link...'}
                className="w-full bg-transparent border-none text-xs text-slate-700 font-mono focus:outline-none select-all truncate"
              />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              disabled={isGeneratingLink}
              className="px-3.5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              {copiedLink ? (
                <>
                  <Check size={13} strokeWidth={3} /> Copied!
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy Link
                </>
              )}
            </button>
            {activeSigningLink ? (
              <a
                href={activeSigningLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <ExternalLink size={13} /> Open Wizard
              </a>
            ) : (
              <button
                onClick={handleOpenWizard}
                disabled={isGeneratingLink}
                className="px-3.5 py-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                <ExternalLink size={13} /> Open Wizard
              </button>
            )}
          </div>
        </div>

        {linkError && (
          <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 animate-in fade-in">
            <span className="font-medium">Notice: {linkError}</span>
            <button
              type="button"
              onClick={() => handleEnsureSigningLink()}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Retry Generation
            </button>
          </div>
        )}
      </div>

      {/* Recipient Details & Dispatch Actions */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Delivery Channels</h3>

        {/* Email channel */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Send size={13} className="text-[#1a5ba5]" /> Recipient Email Address
            </label>
            <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Live &amp; Configured
            </span>
          </div>
          <input
            type="email"
            value={data.clientEmail}
            onChange={(e) => onDataChange({ clientEmail: e.target.value })}
            placeholder="client@example.com"
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
          />

          <div className="pt-1 space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Custom Message (Optional)
            </label>
            <textarea
              rows={2}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Hi Bryce, attached is your official Home Improvement Contract. Please review and sign using the link."
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5] resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={handleSendEmail}
              disabled={isSending || sendSuccess}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                sendSuccess
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-[#1a5ba5] hover:bg-[#154a87] text-white hover:shadow-lg cursor-pointer'
              }`}
            >
              {sendSuccess ? (
                <>
                  <Check size={16} strokeWidth={3} /> Dispatched via Email
                </>
              ) : (
                <>
                  <Send size={16} /> {isSending ? 'Sending Email...' : 'Send Contract via Email'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* SMS channel */}
        <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={13} className="text-amber-600" /> Recipient Phone (SMS Delivery)
            </label>
            <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Gateway Ready &bull; Copies Link
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="tel"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="(760) 555-0199"
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
            />
            <button
              onClick={handleSendSms}
              disabled={isSendingSms}
              className={`py-2.5 px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                smsSuccess
                  ? 'bg-emerald-600 text-white cursor-default'
                  : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
              }`}
            >
              {smsSuccess ? (
                <>
                  <Check size={15} strokeWidth={3} /> SMS Link Dispatched
                </>
              ) : (
                <>
                  <Smartphone size={15} /> {isSendingSms ? 'Sending SMS...' : 'Send via SMS'}
                </>
              )}
            </button>
          </div>
          {smsSuccess && (
            <p className="text-xs text-emerald-600 font-medium">
              SMS dispatched and signing link copied to clipboard for direct messaging!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContractReviewSendStep;
