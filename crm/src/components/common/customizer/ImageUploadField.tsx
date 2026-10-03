import React, { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, TriangleAlert, Trash2, Upload } from 'lucide-react';
import { uploadCustomizationImage } from '@/api/customizationsApi';
import { useToast } from '@/context/ToastContext';

export interface ImageSpec {
  /** Recommended pixel size shown to the user. */
  width: number;
  height: number;
  /** Below this the upload is accepted but a soft warning is shown. */
  minWidth: number;
  minHeight: number;
  /** Human aspect hint, e.g. "4:1 wide banner". */
  aspectLabel: string;
}

export const IMAGE_SPECS = {
  hero: { width: 2400, height: 600, minWidth: 1600, minHeight: 400, aspectLabel: '4:1 wide banner' },
  quote: { width: 800, height: 400, minWidth: 560, minHeight: 280, aspectLabel: '2:1 landscape' },
  weather: { width: 800, height: 480, minWidth: 560, minHeight: 330, aspectLabel: '5:3 landscape' },
  sidebar: { width: 600, height: 1600, minWidth: 400, minHeight: 1000, aspectLabel: 'tall portrait' },
} as const satisfies Record<string, ImageSpec>;

export const MAX_UPLOAD_MB = 8;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';
const ALLOWED = new Set(ACCEPT.split(','));

export function describeSpec(spec: ImageSpec): string {
  return `Recommended ${spec.width}×${spec.height} px (${spec.aspectLabel}) · minimum ${spec.minWidth}×${spec.minHeight} · JPG, PNG, WebP or AVIF · max ${MAX_UPLOAD_MB} MB`;
}

export interface ImageUploadFieldProps {
  label: string;
  images: string[];
  onChange: (urls: string[]) => void;
  spec: ImageSpec;
  multiple?: boolean;
  maxImages?: number;
  /** Optional "paste a link" input (default on). */
  allowUrl?: boolean;
}

export function ImageUploadField({
  label,
  images,
  onChange,
  spec,
  multiple = false,
  maxImages = 20,
  allowUrl = true,
}: ImageUploadFieldProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [linkValue, setLinkValue] = useState('');

  const canAddMore = multiple ? images.length < maxImages : true;

  const handleFiles = async (files: FileList | File[] | null) => {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    const queue = multiple ? list.slice(0, Math.max(0, maxImages - images.length)) : list.slice(0, 1);
    setBusy(true);
    let next = [...images];
    try {
      for (const file of queue) {
        if (!ALLOWED.has(file.type)) {
          toast.error(`${file.name}: use a JPG, PNG, WebP or AVIF image.`);
          continue;
        }
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
          toast.error(`${file.name} is larger than ${MAX_UPLOAD_MB} MB.`);
          continue;
        }
        try {
          const up = await uploadCustomizationImage(file);
          if (up.width && up.height && (up.width < spec.minWidth || up.height < spec.minHeight)) {
            setWarnings((w) => ({
              ...w,
              [up.url]: `${up.width}×${up.height} px is small for this spot and may look blurry.`,
            }));
          }
          next = multiple ? [...next, up.url] : [up.url];
        } catch (err) {
          toast.error(err instanceof Error && err.message ? err.message : `Could not upload ${file.name}.`);
        }
      }
      onChange(next);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const applyLink = () => {
    const url = linkValue.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast.error('Enter a link starting with http:// or https://');
      return;
    }
    onChange(multiple ? [...images, url] : [url]);
    setLinkValue('');
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  };

  const remove = (index: number) => onChange(images.filter((_, i) => i !== index));

  const dropzone = (compact: boolean) => (
    <button
      type="button"
      disabled={busy || !canAddMore}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void handleFiles(e.dataTransfer.files);
      }}
      className={`w-full rounded-2xl border-2 border-dashed transition-colors flex ${
        compact ? 'flex-col items-center justify-center gap-1 aspect-video p-2' : 'flex-col items-center justify-center gap-2 py-8 px-4'
      } ${
        dragOver
          ? 'border-[#1878B8] bg-sky-50 dark:bg-sky-500/10'
          : 'border-slate-300 hover:border-[#1878B8] dark:border-white/20 dark:hover:border-sky-400/60 bg-slate-50/70 dark:bg-white/[0.02]'
      } ${busy ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
    >
      {busy ? (
        <Loader2 size={compact ? 16 : 22} className="animate-spin text-[#1878B8] dark:text-sky-400" />
      ) : compact ? (
        <ImagePlus size={16} className="text-[#1878B8] dark:text-sky-400" />
      ) : (
        <Upload size={22} className="text-[#1878B8] dark:text-sky-400" />
      )}
      <span className={`font-bold text-slate-800 dark:text-white ${compact ? 'text-[11px]' : 'text-sm'}`}>
        {busy ? 'Uploading…' : compact ? 'Add image' : multiple ? 'Drop images here or click to upload' : 'Drop an image here or click to upload'}
      </span>
    </button>
  );

  return (
    <div className="space-y-2.5" data-testid="image-upload-field">
      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">{label}</div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="hidden"
        data-testid="image-upload-input"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {images.length === 0 ? (
        dropzone(false)
      ) : multiple ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {images.map((url, i) => (
            <div key={`${url}-${i}`} className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/15 bg-slate-100 dark:bg-slate-900 aspect-video">
              <img src={url} alt={`Image ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 p-1 bg-black/55 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <div className="flex gap-1">
                  <button type="button" aria-label="Move left" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 rounded bg-white/15 text-white disabled:opacity-30 cursor-pointer"><ArrowLeft size={12} /></button>
                  <button type="button" aria-label="Move right" disabled={i === images.length - 1} onClick={() => move(i, 1)} className="p-1 rounded bg-white/15 text-white disabled:opacity-30 cursor-pointer"><ArrowRight size={12} /></button>
                </div>
                <button type="button" aria-label="Remove image" onClick={() => remove(i)} className="p-1 rounded bg-rose-500/80 text-white cursor-pointer"><Trash2 size={12} /></button>
              </div>
              {warnings[url] && (
                <span title={warnings[url]} className="absolute top-1 left-1 p-1 rounded bg-amber-500 text-white"><TriangleAlert size={11} /></span>
              )}
            </div>
          ))}
          {canAddMore && dropzone(true)}
        </div>
      ) : (
        <div className="flex items-center gap-3 p-2.5 rounded-2xl border border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-white/[0.02]">
          <img src={images[0]} alt="Selected" className="w-24 h-14 rounded-lg object-cover bg-slate-200 dark:bg-slate-900 shrink-0" />
          <div className="flex-1 min-w-0 text-[11px] text-slate-500 dark:text-slate-400 truncate">{images[0].split('/').pop()}</div>
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="px-3 py-1.5 rounded-lg bg-[#1878B8] hover:bg-[#14649a] text-white text-xs font-bold cursor-pointer disabled:opacity-50">
            {busy ? 'Uploading…' : 'Replace'}
          </button>
          <button type="button" aria-label="Remove image" onClick={() => remove(0)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-white/5 text-rose-500 border border-slate-200 dark:border-white/10 cursor-pointer"><Trash2 size={14} /></button>
        </div>
      )}

      {images.some((u) => warnings[u]) && (
        <div className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
          <TriangleAlert size={12} className="mt-0.5 shrink-0" />
          <span>{images.map((u) => warnings[u]).find(Boolean)}</span>
        </div>
      )}

      <p className="text-[11px] text-slate-500 dark:text-slate-400" data-testid="image-spec-hint">{describeSpec(spec)}</p>

      {allowUrl && canAddMore && (
        <div className="flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 dark:border-white/15 bg-slate-50/70 dark:bg-white/[0.02]">
          <Link2 size={13} className="ml-1.5 text-slate-400 shrink-0" />
          <input
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyLink();
              }
            }}
            placeholder="…or paste an image link (https://)"
            className="flex-1 min-w-0 bg-transparent px-1 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button type="button" onClick={applyLink} disabled={!linkValue.trim()} className="px-3 py-1 rounded-lg bg-slate-800 dark:bg-white/10 text-white text-xs font-bold disabled:opacity-40 cursor-pointer">
            Use link
          </button>
        </div>
      )}
    </div>
  );
}

export default ImageUploadField;
