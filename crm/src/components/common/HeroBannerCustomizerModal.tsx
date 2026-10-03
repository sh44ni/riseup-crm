import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sliders, Image as ImageIcon, Type } from 'lucide-react';
import { ActiveHeroBanner, DefaultBannerText, HeroSaveParams } from '@/lib/heroBannerStore';
import { CustomizerShell } from './CustomizerShell';
import { CustomizerBody, CustomizerTabs } from './customizer/CustomizerParts';
import { HeroBannerPreview } from './hero-banner/HeroBannerPreview';
import { HeroBannerImageTab } from './hero-banner/HeroBannerImageTab';
import { HeroBannerTextTab } from './hero-banner/HeroBannerTextTab';

export interface HeroBannerCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  activeBanner: ActiveHeroBanner;
  defaultText: DefaultBannerText;
  /** Resolves true when the server accepted the change. */
  onSave: (params: HeroSaveParams) => Promise<boolean>;
  onResetPage: () => Promise<boolean>;
  isSaving?: boolean;
}

export function HeroBannerCustomizerModal({
  isOpen,
  onClose,
  pageId,
  activeBanner,
  defaultText,
  onSave,
  onResetPage,
  isSaving = false,
}: HeroBannerCustomizerModalProps) {
  const [activeTab, setActiveTab] = useState<'image' | 'text'>('image');

  // Draft is initialised ONCE when the popup opens. Background refetches of the saved
  // banner must never overwrite what the user is editing.
  const [imageUrl, setImageUrl] = useState(activeBanner.imageUrl);
  const [zoom, setZoom] = useState(activeBanner.zoom);
  const [positionX, setPositionX] = useState(activeBanner.positionX);
  const [positionY, setPositionY] = useState(activeBanner.positionY);
  const [opacity, setOpacity] = useState(activeBanner.opacity);
  const [overlayStrength, setOverlayStrength] = useState(activeBanner.overlayStrength);
  const [applyGlobally, setApplyGlobally] = useState(true);
  const [eyebrow, setEyebrow] = useState(activeBanner.eyebrow || '');
  const [title, setTitle] = useState(activeBanner.title || '');
  const [subtitle, setSubtitle] = useState(activeBanner.subtitle || '');

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initPosX: 0, initPosY: 0 });
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const latestBanner = useRef(activeBanner);
  latestBanner.current = activeBanner;

  useEffect(() => {
    if (!isOpen) return;
    const b = latestBanner.current;
    setImageUrl(b.imageUrl);
    setZoom(b.zoom);
    setPositionX(b.positionX);
    setPositionY(b.positionY);
    setOpacity(b.opacity);
    setOverlayStrength(b.overlayStrength);
    setEyebrow(b.eyebrow || '');
    setTitle(b.title || '');
    setSubtitle(b.subtitle || '');
    setApplyGlobally(true);
    setActiveTab('image');
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, initPosX: positionX, initPosY: positionY };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const start = dragStartRef.current;
    const dx = ((e.clientX - start.startX) / rect.width) * 100;
    const dy = ((e.clientY - start.startY) / rect.height) * 100;
    setPositionX(Math.max(0, Math.min(100, Math.round(start.initPosX - dx))));
    setPositionY(Math.max(0, Math.min(100, Math.round(start.initPosY - dy))));
  }, []);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  useEffect(() => {
    if (!isDragging) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleSave = async () => {
    const ok = await onSave({
      applyGlobally,
      imageUrl,
      zoom,
      positionX,
      positionY,
      opacity,
      overlayStrength,
      eyebrow,
      title,
      subtitle,
    });
    if (ok) onClose();
  };

  const handleReset = async () => {
    await onResetPage();
  };

  return (
    <CustomizerShell
      isOpen={isOpen}
      onClose={onClose}
      icon={<Sliders size={18} className="stroke-[2.5]" />}
      title="Hero Banner"
      subtitle={`Customize the banner for ${pageId} — image, framing and text.`}
      onReset={handleReset}
      resetLabel="Reset this page"
      resetConfirmTitle="Reset hero banner"
      resetConfirmMessage="Remove your image and text for this page?"
      onSave={handleSave}
      saveLabel="Save"
      isSaving={isSaving}
      onMouseUp={handleMouseUp}
    >
      <HeroBannerPreview
        previewContainerRef={previewContainerRef}
        isDragging={isDragging}
        onMouseDown={handleMouseDown}
        imageUrl={imageUrl}
        zoom={zoom}
        positionX={positionX}
        positionY={positionY}
        opacity={opacity}
        overlayStrength={overlayStrength}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        defaultText={defaultText}
      />

      <CustomizerTabs
        tabs={[
          { id: 'image', label: 'Image & framing', icon: <ImageIcon size={14} /> },
          { id: 'text', label: 'Text', icon: <Type size={14} /> },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      <CustomizerBody>
        {activeTab === 'image' ? (
          <HeroBannerImageTab
            imageUrl={imageUrl}
            setImageUrl={setImageUrl}
            zoom={zoom}
            setZoom={setZoom}
            positionX={positionX}
            setPositionX={setPositionX}
            positionY={positionY}
            setPositionY={setPositionY}
            opacity={opacity}
            setOpacity={setOpacity}
            overlayStrength={overlayStrength}
            setOverlayStrength={setOverlayStrength}
            applyGlobally={applyGlobally}
            setApplyGlobally={setApplyGlobally}
          />
        ) : (
          <HeroBannerTextTab
            eyebrow={eyebrow}
            setEyebrow={setEyebrow}
            title={title}
            setTitle={setTitle}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            defaultText={defaultText}
          />
        )}
      </CustomizerBody>
    </CustomizerShell>
  );
}

export default HeroBannerCustomizerModal;
