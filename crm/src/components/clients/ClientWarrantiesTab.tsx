import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, ShieldCheck, Award, Camera, CheckCircle2, AlertTriangle, ExternalLink, Printer, X } from 'lucide-react';
import { WarrantySummary, RoofSpecs, WarrantyCertificate } from '@/types/client360Types';

interface ClientWarrantiesTabProps {
  warranty: WarrantySummary;
  specs: RoofSpecs;
}

export function ClientWarrantiesTab({ warranty, specs }: ClientWarrantiesTabProps) {
  const [selectedCert, setSelectedCert] = useState<WarrantyCertificate | null>(null);
  const photos = warranty.inspectionPhotos || [];

  // Lock body scroll and listen for Escape key when certificate modal is open
  useEffect(() => {
    if (!selectedCert) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedCert(null);
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedCert]);

  const handlePrintCertificate = (cert: WarrantyCertificate) => {
    setSelectedCert(cert);
  };

  return (
    <div className="space-y-6">
      {/* Warranty Certificate Section */}
      <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-teal-600 dark:text-teal-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Warranty Certificates & System Guarantee</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {warranty.certificates.length} Active Certificate{warranty.certificates.length === 1 ? '' : 's'}
          </span>
        </div>

        {warranty.certificates.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <Shield size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-1" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No Official Warranty Issued Yet</div>
            <p className="text-slate-400 dark:text-slate-500 max-w-md mx-auto">
              Warranty certificates are automatically generated upon final job inspection and permit sign-off by the City.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warranty.certificates.map((cert) => (
              <div
                key={cert.id}
                className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-sky-50/30 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-sky-950/20 border border-emerald-200/90 dark:border-emerald-500/30 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{cert.type}</h4>
                      <p className="text-xs text-teal-700 dark:text-teal-400 font-medium">Issuer: {cert.issuer}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                    {cert.termYears}-Year Term
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Certificate #:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{cert.certNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Coverage:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{cert.coverage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Valid Through:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{cert.validUntil}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Manufacturer Registered</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintCertificate(cert)}
                    className="text-[#0284C7] dark:text-sky-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Certificate</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Inspection Evidence & Photos */}
      <div className="bg-white/90 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-white/10 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-[#0284C7] dark:text-sky-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Roof Inspection Photographic Evidence</h3>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {photos.length} Photo{photos.length === 1 ? '' : 's'} on Record
          </span>
        </div>

        {photos.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <Camera size={28} className="text-slate-300 dark:text-slate-600 mx-auto mb-1" />
            <div className="font-semibold text-slate-700 dark:text-slate-300">No Inspection Photos Uploaded Yet</div>
            <p className="text-slate-400 dark:text-slate-500 max-w-md mx-auto">
              Drone inspection imagery and roof health documentation will appear here once conducted by field estimators.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.id} className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 group bg-slate-50 dark:bg-slate-900/40">
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-medium backdrop-blur-sm">
                    {photo.severity}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">{photo.title}</div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{specs.address}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificate Print / View Modal */}
      {selectedCert &&
        createPortal(
          <div
            onClick={() => setSelectedCert(null)}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white/95 dark:bg-[#0B1320]/95 backdrop-blur-2xl rounded-3xl border border-white/60 dark:border-white/10 w-full max-w-lg shadow-[0_25px_80px_rgba(15,23,42,0.35)] dark:shadow-[0_25px_80px_rgba(0,0,0,0.85)] overflow-hidden my-auto p-6 space-y-5 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-teal-600 dark:text-teal-400" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">Warranty Certificate</h3>
                </div>
                <button
                  onClick={() => setSelectedCert(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-3 text-xs">
                <div className="text-center pb-2 border-b border-slate-200 dark:border-white/10">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Official Warranty Certificate</div>
                  <div className="text-base font-black text-slate-900 dark:text-white mt-1">{selectedCert.type}</div>
                  <div className="text-xs text-teal-700 dark:text-teal-400 font-semibold">{selectedCert.issuer}</div>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Certificate Number:</span><span className="font-mono font-bold text-slate-900 dark:text-white">{selectedCert.certNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Property Address:</span><span className="font-semibold text-slate-900 dark:text-white">{specs.address}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Coverage Term:</span><span className="font-semibold text-slate-900 dark:text-white">{selectedCert.termYears} Years ({selectedCert.coverage})</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-slate-400">Expiration Date:</span><span className="font-bold text-emerald-700 dark:text-emerald-400">{selectedCert.validUntil}</span></div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCert(null)}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
