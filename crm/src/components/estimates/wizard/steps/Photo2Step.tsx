import React, { useState } from 'react';
import { TwoOptionsEstimate } from '@/types/estimateContractTypes';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { PhotoFrameEditor } from '../PhotoFrameEditor';
import { api, API_ORIGIN } from '@/lib/api';

const getImgSrc = (url?: string) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

interface StepProps {
  data: TwoOptionsEstimate;
  onDataChange: (updates: Partial<TwoOptionsEstimate>) => void;
}

export function Photo2Step({ data, onDataChange }: StepProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleModeToggle = (mode: 'reuse-photo1' | 'upload') => {
    onDataChange({
      photo2: { ...data.photo2, mode }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.request('/admin/estimates/upload-photo', {
        method: 'POST',
        body: formData,
      });
      if (res.url) {
        onDataChange({
          photo2: { 
            mode: 'upload',
            asset: {
              url: res.url,
              filename: file.name,
              x: 0,
              y: 0,
              zoom: 1.0,
              position: { x: 0, y: 0 },
              focalPoint: { x: 0.5, y: 0.5 },
            }
          }
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
        <p className="text-sm text-slate-700 font-medium">
          This photo appears in the top-right of page 2. By default, it reuses a cropped version of your cover photo.
        </p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => handleModeToggle('reuse-photo1')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            data.photo2.mode === 'reuse-photo1' ? 'bg-white text-[#1a5ba5] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Reuse Photo 1 (Auto-crop)
        </button>
        <button
          onClick={() => handleModeToggle('upload')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            data.photo2.mode === 'upload' ? 'bg-white text-[#1a5ba5] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Upload Different Photo
        </button>
      </div>

      {data.photo2.mode === 'reuse-photo1' ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 h-48">
          {data.photo1?.url ? (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-slate-300">
              <img src={getImgSrc(data.photo1.url)} alt="Cover Preview" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-4 border-2 border-dashed border-amber-400 bg-amber-400/10 rounded" />
              <div className="absolute bottom-1 w-full text-center text-[10px] font-bold text-slate-800 bg-white/80 py-0.5">
                Auto-cropped area
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-sm font-medium">No cover photo uploaded yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {!data.photo2.asset?.url ? (
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/60 cursor-pointer transition-colors relative">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-3 text-slate-400" />
                <p className="mb-2 text-sm text-slate-500 font-medium">
                  <span className="font-bold text-[#1a5ba5]">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-slate-400">JPG, PNG, WebP (Max 10MB)</p>
              </div>
              <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,image/heic" onChange={handleFileUpload} disabled={isUploading} />
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                  <div className="text-sm font-bold text-[#1a5ba5] animate-pulse">Uploading...</div>
                </div>
              )}
            </label>
          ) : (
            <PhotoFrameEditor
              photo={data.photo2.asset}
              onChange={(updated) => onDataChange({ photo2: { mode: 'upload', asset: updated } })}
              onRemove={() => onDataChange({ photo2: { mode: 'upload', asset: undefined } })}
              onReplace={handleFileUpload}
              isReplacing={isUploading}
              label="Page 2 Overview Photo"
              helperText="Drag to reposition and zoom to frame the overview photo on Page 2."
              aspectRatio={412 / 264}
            />
          )}
        </div>
      )}
    </div>
  );
}
