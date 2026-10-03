import React, { useRef, useState, useCallback } from 'react';
import { Upload, Paperclip, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface UploadPdfDropzoneProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function UploadPdfDropzone({ file, onFileChange }: UploadPdfDropzoneProps) {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf') && f.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      toast.error('PDF file exceeds the 50 MB size limit.');
      return;
    }
    onFileChange(f);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) validateAndSetFile(dropped);
    },
    []
  );

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

  return (
    <div>
      <div className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-[#1878B8] text-white text-[9px] font-black flex items-center justify-center">
          2
        </span>
        PDF File <span className="text-rose-500">*</span>
      </div>

      {file ? (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Paperclip size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {file.name}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</div>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
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
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
              isDragging
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
          >
            <Upload size={20} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {isDragging ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              or click to browse — PDF only, max 50 MB
            </p>
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
  );
}
