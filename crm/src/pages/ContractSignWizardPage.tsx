import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Phone,
  Mail,
  Lock,
} from 'lucide-react';
import { PublicContractData, PublicSignContractPayload } from '@/types/contractStudioTypes';
import { getPublicContract, signPublicContract } from '@/api/contractApi';
import { API_ORIGIN } from '@/lib/api';
import { Step1OverviewScope } from '@/components/contracts/signing/Step1OverviewScope';
import { Step2PaymentMilestones } from '@/components/contracts/signing/Step2PaymentMilestones';
import { Step3LegalDisclosures } from '@/components/contracts/signing/Step3LegalDisclosures';
import { Step4SignatureCapture } from '@/components/contracts/signing/Step4SignatureCapture';
import { Step5SignedConfirmation } from '@/components/contracts/signing/Step5SignedConfirmation';

export function ContractSignWizardPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<PublicContractData | null>(null);

  // Wizard state (Steps 1 to 5)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Homeowner inputs
  const [initials, setInitials] = useState<string>('');
  const [agreeScope, setAgreeScope] = useState(false);
  const [agreeMilestones, setAgreeMilestones] = useState(false);
  const [agreeTermsRefund, setAgreeTermsRefund] = useState(false);
  const [agreeDisclosures, setAgreeDisclosures] = useState(false);
  const [agreeCancellation, setAgreeCancellation] = useState(false);
  const [isSeniorCitizen, setIsSeniorCitizen] = useState(false);

  // Signature state
  const [signatureName, setSignatureName] = useState('');
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [signatureData, setSignatureData] = useState('');
  const [isSignatureValid, setIsSignatureValid] = useState(false);
  const [agreeLegal, setAgreeLegal] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [signedAtDate, setSignedAtDate] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No contract link provided.');
      setLoading(false);
      return;
    }

    getPublicContract(token)
      .then((res) => {
        setContract(res.contract);
        if (res.contract.isSigned) {
          setCurrentStep(5);
          setSignedPdfUrl(res.contract.signedPdfUrl || null);
          setSignedAtDate(res.contract.signedAt || null);
        }
      })
      .catch((err) => {
        setError(err.message || 'Unable to load contract.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSignatureSubmit = async () => {
    setValidationError(null);
    if (!token || !contract) return;
    if (!initials.trim()) {
      setValidationError('Please provide your initials.');
      return;
    }
    if (!isSignatureValid) {
      setValidationError('Please provide your signature.');
      return;
    }
    if (!agreeScope || !agreeMilestones || !agreeTermsRefund || !agreeDisclosures || !agreeCancellation) {
      setValidationError('Please review all previous sections and complete all required initials.');
      return;
    }
    if (!agreeLegal) {
      setValidationError('Please check the acknowledgment box to authorize electronic signing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: PublicSignContractPayload = {
        client_initials: initials.trim().toUpperCase(),
        signature_name: signatureName.trim(),
        signature_type: signatureType,
        signature_data: signatureData,
        is_senior_citizen: isSeniorCitizen,
        agreed_terms: true,
        agreed_scope: agreeScope,
        agreed_milestones: agreeMilestones,
        agreed_refund: agreeTermsRefund,
        agreed_disclosures: agreeDisclosures,
        agreed_cancellation: agreeCancellation,
      };

      const res = await signPublicContract(token, payload);
      setSignedPdfUrl(res.signed_pdf_url);
      setSignedAtDate(res.signed_at);
      setCurrentStep(5);
    } catch (err: any) {
      console.error('Signature submit error:', err);
      setValidationError(`Submission failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadPdf = (url: string | null) => {
    if (!url) return;
    const full = url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
    const a = document.createElement('a');
    a.href = full;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-sm w-full space-y-4">
          <div className="w-12 h-12 border-4 border-[#1a5ba5] border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="font-bold text-slate-800 text-lg">Loading Contract...</h3>
          <p className="text-slate-500 text-xs">Securing digital execution documents</p>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center max-w-md w-full space-y-5">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Contract Link Unavailable</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            {error || 'This contract signing link is expired or could not be found. Please reach out to our team to request an updated copy.'}
          </p>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2 text-left">
            <div className="font-bold text-slate-800">Rise Up Roofing &amp; Construction, Inc.</div>
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-[#1a5ba5]" /> Tel: (442) 266-2443 ext. 2
            </div>
            <div className="flex items-center gap-2">
              <Mail size={13} className="text-[#1a5ba5]" /> Email: accountant@riseuprac.com
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepsList = [
    { num: 1, label: 'Overview & Scope' },
    { num: 2, label: 'Payment Schedule' },
    { num: 3, label: 'Legal Disclosures' },
    { num: 4, label: 'Sign Contract' },
    { num: 5, label: 'Completed' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-16">
      {/* Official Compliant Masthead */}
      <header className="bg-[#091b36] text-white border-b border-[#132b4f] sticky top-0 z-30 shadow-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-black text-sky-400 text-sm shrink-0">
              RU
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base tracking-wide flex items-center gap-2 flex-wrap">
                Rise Up Roofing and Construction, Inc.
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-400/30 font-bold">
                  Lic #1096492 (B/C39/C46)
                </span>
              </div>
              <div className="text-[11px] text-slate-300 flex items-center gap-2 flex-wrap">
                <span>2182 S El Camino Real, Suite 202, Oceanside, CA 92054</span>
                <span className="hidden sm:inline">&bull;</span>
                <span className="hidden sm:inline">Tel. (442) 266-2443 ext. 2</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300 shrink-0">
            <Lock size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">256-Bit Encrypted</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Validation Error Banner */}
        {validationError && (
          <div
            role="alert"
            className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-3 text-rose-800 text-sm font-semibold animate-in fade-in"
          >
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Step Progress Tracker */}
        {currentStep < 5 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1 bg-slate-100 z-0" />
              <div
                className="absolute top-1/2 left-0 -translate-y-1/2 h-1 bg-[#1a5ba5] transition-all duration-300 z-0"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />

              {stepsList.slice(0, 4).map((s) => {
                const isPassed = currentStep > s.num;
                const isCurrent = currentStep === s.num;
                return (
                  <div key={s.num} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isCurrent
                          ? 'bg-[#1a5ba5] text-white ring-4 ring-sky-100 shadow-sm'
                          : 'bg-white border-2 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 size={16} /> : s.num}
                    </div>
                    <span
                      className={`text-[11px] font-semibold mt-1.5 hidden sm:block ${
                        isCurrent ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1: Overview & Scope */}
        {currentStep === 1 && (
          <Step1OverviewScope
            contract={contract}
            agreeScope={agreeScope}
            onAgreeScopeChange={setAgreeScope}
            onContinue={() => {
              setValidationError(null);
              setCurrentStep(2);
            }}
          />
        )}

        {/* STEP 2: Payment Milestones & Refund Terms */}
        {currentStep === 2 && (
          <Step2PaymentMilestones
            contract={contract}
            initials={initials}
            onInitialsChange={setInitials}
            agreeMilestones={agreeMilestones}
            onAgreeMilestonesChange={setAgreeMilestones}
            agreeTermsRefund={agreeTermsRefund}
            onAgreeTermsRefundChange={setAgreeTermsRefund}
            onBack={() => setCurrentStep(1)}
            onContinue={() => {
              setValidationError(null);
              setCurrentStep(3);
            }}
          />
        )}

        {/* STEP 3: Legal Disclosures & Mechanics Lien Warning */}
        {currentStep === 3 && (
          <Step3LegalDisclosures
            contract={contract}
            initials={initials}
            agreeDisclosures={agreeDisclosures}
            onAgreeDisclosuresChange={setAgreeDisclosures}
            onBack={() => setCurrentStep(2)}
            onContinue={() => {
              setValidationError(null);
              setCurrentStep(4);
            }}
          />
        )}

        {/* STEP 4: Cancellation Rights & Electronic Signature */}
        {currentStep === 4 && (
          <Step4SignatureCapture
            contract={contract}
            initials={initials}
            isSeniorCitizen={isSeniorCitizen}
            onSeniorCitizenChange={setIsSeniorCitizen}
            agreeCancellation={agreeCancellation}
            onAgreeCancellationChange={setAgreeCancellation}
            signatureName={signatureName}
            onSignatureChange={(res) => {
              setSignatureName(res.signatureName);
              setSignatureType(res.signatureType);
              setSignatureData(res.signatureData);
              setIsSignatureValid(res.isValid);
            }}
            agreeLegal={agreeLegal}
            onAgreeLegalChange={setAgreeLegal}
            isSubmitting={isSubmitting}
            isSignatureValid={isSignatureValid}
            onBack={() => setCurrentStep(3)}
            onSubmit={handleSignatureSubmit}
          />
        )}

        {/* STEP 5: Success & Signed Confirmation */}
        {currentStep === 5 && (
          <Step5SignedConfirmation
            contract={contract}
            signedPdfUrl={signedPdfUrl}
            signedAtDate={signedAtDate}
            onDownloadPdf={downloadPdf}
          />
        )}
      </main>
    </div>
  );
}

export default ContractSignWizardPage;
