import React from 'react';
import type { CompanySignatureType } from '@/types/companySignatureTypes';

interface SignatureGlyphProps {
  signatureType: CompanySignatureType | string | null | undefined;
  signatureData: string | null | undefined;
  /** Used for alt text and as the typed fallback when no data is present. */
  signerName?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const IMG_SIZES: Record<NonNullable<SignatureGlyphProps['size']>, string> = {
  sm: 'max-h-10 max-w-[180px]',
  md: 'max-h-14 max-w-[240px]',
  lg: 'max-h-20 max-w-[320px]',
};

const TEXT_SIZES: Record<NonNullable<SignatureGlyphProps['size']>, string> = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
};

/** True when the payload is a drawn PNG data-URL that can be rendered as an image. */
export function isDrawnSignatureImage(
  signatureType: SignatureGlyphProps['signatureType'],
  signatureData: SignatureGlyphProps['signatureData']
): boolean {
  return signatureType === 'drawn' && typeof signatureData === 'string' && signatureData.startsWith('data:image');
}

/**
 * Renders a company signature either as a hand-drawn image or as typed calligraphy.
 * Shared by the Settings tab, the history timeline and the counter-sign modal.
 */
export function SignatureGlyph({
  signatureType,
  signatureData,
  signerName,
  size = 'md',
  className = '',
}: SignatureGlyphProps) {
  if (isDrawnSignatureImage(signatureType, signatureData)) {
    return (
      <img
        src={signatureData as string}
        alt={`${signerName || 'Company'} signature`}
        className={`${IMG_SIZES[size]} object-contain ${className}`}
      />
    );
  }

  return (
    <div
      data-testid="typed-signature"
      className={`${TEXT_SIZES[size]} text-sky-950 dark:text-sky-200 select-none font-semibold tracking-wide italic font-serif ${className}`}
    >
      {signatureData || signerName || '—'}
    </div>
  );
}
