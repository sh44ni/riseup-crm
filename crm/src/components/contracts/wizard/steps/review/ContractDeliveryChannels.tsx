import React from 'react';
import { Send, Smartphone, Check } from 'lucide-react';

interface ContractDeliveryChannelsProps {
  clientEmail: string;
  recipientPhone: string;
  customMessage: string;
  isSending: boolean;
  isSendingSms: boolean;
  sendSuccess: boolean;
  smsSuccess: boolean;
  onEmailChange: (email: string) => void;
  onPhoneChange: (phone: string) => void;
  onCustomMessageChange: (msg: string) => void;
  onSendEmail: () => void;
  onSendSms: () => void;
}

export function ContractDeliveryChannels({
  clientEmail,
  recipientPhone,
  customMessage,
  isSending,
  isSendingSms,
  sendSuccess,
  smsSuccess,
  onEmailChange,
  onPhoneChange,
  onCustomMessageChange,
  onSendEmail,
  onSendSms,
}: ContractDeliveryChannelsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
        Delivery Channels
      </h3>

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
          value={clientEmail}
          onChange={(e) => onEmailChange(e.target.value)}
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
            onChange={(e) => onCustomMessageChange(e.target.value)}
            placeholder="Hi, attached is your official Home Improvement Contract. Please review and sign using the link."
            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5] resize-none"
          />
        </div>

        <div className="pt-2">
          <button
            onClick={onSendEmail}
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
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="(760) 555-0199"
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-[#1a5ba5]"
          />
          <button
            onClick={onSendSms}
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
  );
}
