import React, { useEffect, useRef, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { CustomizerShell } from '@/components/common/CustomizerShell';
import { CustomizerBody } from '@/components/common/customizer/CustomizerParts';
import { IMAGE_SPECS, ImageUploadField } from '@/components/common/customizer/ImageUploadField';

interface SidebarPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPhoto: string;
  /** Resolves true when the server accepted the change. */
  onSave: (url: string) => Promise<boolean>;
  onReset: () => Promise<boolean>;
  isSaving?: boolean;
}

export function SidebarPhotoModal({
  isOpen,
  onClose,
  currentPhoto,
  onSave,
  onReset,
  isSaving = false,
}: SidebarPhotoModalProps) {
  const [photo, setPhoto] = useState(currentPhoto);
  const latest = useRef(currentPhoto);
  latest.current = currentPhoto;

  // Draft initialised once per open.
  useEffect(() => {
    if (isOpen) setPhoto(latest.current);
  }, [isOpen]);

  const handleSave = async () => {
    const ok = await onSave(photo);
    if (ok) onClose();
  };

  return (
    <CustomizerShell
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      icon={<ImageIcon size={18} />}
      title="Sidebar Photo"
      subtitle="Shown softly behind the navigation menu."
      onReset={() => void onReset()}
      resetLabel="Remove photo"
      resetConfirmTitle="Remove sidebar photo"
      resetConfirmMessage="Remove your sidebar photo?"
      onSave={handleSave}
      saveLabel="Save"
      isSaving={isSaving}
    >
      <div className="px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-100/60 dark:bg-[#060910] shrink-0 flex justify-center">
        <div className="relative w-24 h-44 rounded-xl overflow-hidden border border-white/10 bg-[#070C15]">
          {photo && (
            <div
              className="absolute bottom-0 inset-x-0 h-[75%] bg-cover bg-center opacity-60"
              style={{
                backgroundImage: `url('${photo}')`,
                WebkitMaskImage: 'linear-gradient(to top, #000 0%, #000 25%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.15) 75%, transparent 100%)',
                maskImage: 'linear-gradient(to top, #000 0%, #000 25%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.15) 75%, transparent 100%)',
              }}
            />
          )}
          {!photo && (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-500">No photo</div>
          )}
        </div>
      </div>
      <CustomizerBody>
        <ImageUploadField
          label="Sidebar photo"
          images={photo ? [photo] : []}
          onChange={(urls) => setPhoto(urls[0] ?? '')}
          spec={IMAGE_SPECS.sidebar}
        />
      </CustomizerBody>
    </CustomizerShell>
  );
}
