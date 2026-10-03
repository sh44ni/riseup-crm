import React, { useState, useEffect } from 'react';
import { ContractStudioData } from '@/types/contractStudioTypes';
import { Check } from 'lucide-react';
import { buildContract, sendContract, sendContractSms } from '@/api/contractApi';
import { API_ORIGIN } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { buildContractPayload } from './review/payloadBuilder';
import { ContractSummaryOverview } from './review/ContractSummaryOverview';
import { ContractPdfActions } from './review/ContractPdfActions';
import { ContractSigningPortalCard } from './review/ContractSigningPortalCard';
import { ContractDeliveryChannels } from './review/ContractDeliveryChannels';

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

  const handleEnsureSigningLink = async (): Promise<string> => {
    const existing = getEffectiveSigningUrl();
    if (existing) return existing;

    if (isGeneratingLink) return '';

    setIsGeneratingLink(true);
    setLinkError(null);
    try {
      const payload = buildContractPayload(data, contractId);
      const res = await buildContract(payload);
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Could not auto-generate signing link:', e);
      setLinkError(msg);
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
      const payload = buildContractPayload(data, contractId);
      const res = await buildContract(payload);
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
        const fullUrl = res.pdf_url.startsWith('http')
          ? res.pdf_url
          : `${API_ORIGIN}${res.pdf_url}`;
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('PDF download error:', e);
      toast.error(`Failed to render PDF: ${msg}`);
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
      const payload = buildContractPayload(data, contractId);
      const buildRes = await buildContract(payload);
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Send contract failed:', e);
      toast.error(`Failed to send contract: ${msg}`);
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
        const payload = buildContractPayload(data, contractId);
        const buildRes = await buildContract(payload);
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

      if (activeSmsUrl && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(activeSmsUrl);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 3500);
        } catch (_) {}
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      console.error('Send SMS failed:', e);
      toast.error(`Failed to dispatch SMS: ${msg}`);
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
      toast.error(
        `Could not generate signing link: ${linkError || 'Please click Retry to generate the link.'}`
      );
    }
  };

  const handleOpenWizard = async () => {
    if (isGeneratingLink) return;
    const existingUrl = getEffectiveSigningUrl();
    if (existingUrl) {
      window.open(existingUrl, '_blank', 'noopener,noreferrer');
      return;
    }

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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (win) win.close();
      toast.error(`Could not open signing wizard: ${msg}`);
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

      <ContractSummaryOverview data={data} />

      <ContractPdfActions
        isDownloading={isDownloading}
        isSigned={Boolean(data.isSigned || data.status === 'signed' || data.signedPdfUrl)}
        onDownloadBlank={handleDownloadBlank}
        onDownloadSigned={handleDownloadSigned}
      />

      <ContractSigningPortalCard
        isGeneratingLink={isGeneratingLink}
        activeSigningLink={activeSigningLink}
        copiedLink={copiedLink}
        linkError={linkError}
        onCopyLink={handleCopyLink}
        onOpenWizard={handleOpenWizard}
        onRetryLink={() => handleEnsureSigningLink()}
      />

      <ContractDeliveryChannels
        clientEmail={data.clientEmail || ''}
        recipientPhone={recipientPhone}
        customMessage={customMessage}
        isSending={isSending}
        isSendingSms={isSendingSms}
        sendSuccess={sendSuccess}
        smsSuccess={smsSuccess}
        onEmailChange={(clientEmail) => onDataChange({ clientEmail })}
        onPhoneChange={setRecipientPhone}
        onCustomMessageChange={setCustomMessage}
        onSendEmail={handleSendEmail}
        onSendSms={handleSendSms}
      />
    </div>
  );
}

export default ContractReviewSendStep;
