import React, { useState } from 'react';
import { TwoOptionsEstimate, EstimateAddon } from '@/types/estimateContractTypes';
import { ESTIMATE_FIELD_CAPS } from '@/shared/config/estimateConstants';
import { FieldWithCap } from '../FieldWithCap';
import { Upload, Image as ImageIcon, Grid } from 'lucide-react';
import { api } from '@/lib/api';

interface StepProps {
  data: TwoOptionsEstimate;
  onDataChange: (updates: Partial<TwoOptionsEstimate>) => void;
}

const BUILTIN_ICONS = [
  { id: 'underlayment', label: 'Underlayment' },
  { id: 'pressure_washer', label: 'Pressure Washer' },
  { id: 'gutters', label: 'Gutters' },
  { id: 'skylight', label: 'Skylight' },
  { id: 'solar', label: 'Solar' },
  { id: 'ventilation', label: 'Ventilation' },
  { id: 'chimney', label: 'Chimney' },
  { id: 'repair', label: 'Repair' },
];

export function AddonsStep({ data, onDataChange }: StepProps) {
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [isUploading, setIsUploading] = useState(false);

  const currentAddon = data.addons[activeTab];

  const handleUpdate = (updates: Partial<EstimateAddon>) => {
    const newAddons = [...data.addons] as [EstimateAddon, EstimateAddon];
    newAddons[activeTab] = { ...currentAddon, ...updates };
    onDataChange({ addons: newAddons });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(rawVal, 10);
    handleUpdate({ price: isNaN(num) ? 0 : num });
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
        handleUpdate({
          iconMode: 'upload',
          uploadedImage: { url: res.url, filename: file.name }
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
      <div className="flex bg-slate-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab(0)}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 0 ? 'bg-white text-[#1a5ba5] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Add-on 1
        </button>
        <button
          onClick={() => setActiveTab(1)}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 1 ? 'bg-white text-[#1a5ba5] shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Add-on 2
        </button>
      </div>

      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-200" key={activeTab}>
        
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1 flex items-center gap-1.5">
            <ImageIcon size={14} /> Icon or Image
          </label>
          <div className="flex bg-slate-100 p-1 rounded-xl w-64 mb-3">
            <button
              onClick={() => handleUpdate({ iconMode: 'builtin' })}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                currentAddon.iconMode === 'builtin' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Built-in Icon
            </button>
            <button
              onClick={() => handleUpdate({ iconMode: 'upload' })}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                currentAddon.iconMode === 'upload' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Upload Image
            </button>
          </div>

          {currentAddon.iconMode === 'builtin' ? (
            <div className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {BUILTIN_ICONS.map(icon => (
                <div
                  key={icon.id}
                  onClick={() => handleUpdate({ builtinIconId: icon.id })}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl cursor-pointer transition-all border-2 ${
                    currentAddon.builtinIconId === icon.id 
                      ? 'border-[#1a5ba5] bg-blue-50/50 text-[#1a5ba5]' 
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-500'
                  }`}
                >
                  <Grid size={24} className="mb-2" />
                  <span className="text-[10px] font-bold text-center">{icon.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {!currentAddon.uploadedImage?.url ? (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors relative">
                  <div className="flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 mb-2 text-slate-400" />
                    <p className="text-xs text-slate-500 font-medium">Click to upload image</p>
                    <p className="text-[10px] text-slate-400 mt-1">Recommended: 200×160px or similar (renders at 52×42px)</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl backdrop-blur-sm">
                      <div className="text-sm font-bold text-[#1a5ba5] animate-pulse">Uploading...</div>
                    </div>
                  )}
                </label>
              ) : (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-slate-200">
                  <img src={currentAddon.uploadedImage.url} alt="Addon" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => handleUpdate({ uploadedImage: undefined })}
                    className="absolute top-1 right-1 bg-white/90 p-1 rounded text-red-500 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <FieldWithCap
              label="Title"
              value={currentAddon.title}
              onChange={(val) => handleUpdate({ title: val })}
              maxLength={ESTIMATE_FIELD_CAPS.addonTitle}
              placeholder="e.g. SKYLIGHT INSTALLATION"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
              Price Display
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleUpdate({ pricePrefix: '+' })}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  currentAddon.pricePrefix === '+' ? 'border-[#1a5ba5] bg-blue-50 text-[#1a5ba5]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                + $
              </button>
              <button
                onClick={() => handleUpdate({ pricePrefix: '' })}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  currentAddon.pricePrefix === '' ? 'border-[#1a5ba5] bg-blue-50 text-[#1a5ba5]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                $
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <FieldWithCap
              label="Description"
              value={currentAddon.description}
              onChange={(val) => handleUpdate({ description: val })}
              maxLength={ESTIMATE_FIELD_CAPS.addonDescription}
              multiline
              rows={3}
              placeholder="Describe the optional upgrade..."
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider pl-1">
              Price
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
              <input
                type="text"
                value={currentAddon.price === 0 ? '' : currentAddon.price.toLocaleString('en-US')}
                onChange={handlePriceChange}
                className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
