import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { CompanySignatureType } from '@/types/companySignatureTypes';

export interface CompanySignaturePreview {
  isLoading: boolean;
  error: string | null;
  configured: boolean;
  signerName: string;
  signerTitle: string;
  /** Only present for users with `view` access (the status endpoint has no image). */
  signatureType: CompanySignatureType | null;
  signatureData: string | null;
  version: number | null;
}

const EMPTY: CompanySignaturePreview = {
  isLoading: true,
  error: null,
  configured: false,
  signerName: '',
  signerTitle: '',
  signatureType: null,
  signatureData: null,
  version: null,
};

/**
 * Loads the company contractor signature while `enabled` is true.
 * Users with `view` access get the full signature (incl. image); everyone else gets the
 * lightweight status (configured + signer name/title only).
 */
export function useCompanySignaturePreview(enabled: boolean): CompanySignaturePreview {
  const { canSignature } = useAuth();
  const canView = canSignature('view');
  const [state, setState] = useState<CompanySignaturePreview>(EMPTY);

  useEffect(() => {
    if (!enabled) return;
    let isMounted = true;
    setState(EMPTY);

    const load = async (): Promise<CompanySignaturePreview> => {
      if (canView) {
        const res = await api.getCompanySignature();
        const sig = res.configured ? res.signature : null;
        return {
          isLoading: false,
          error: null,
          configured: Boolean(sig),
          signerName: sig?.signer_name || '',
          signerTitle: sig?.signer_title || '',
          signatureType: sig?.signature_type || null,
          signatureData: sig?.signature_data || null,
          version: sig?.version ?? null,
        };
      }
      const status = await api.getCompanySignatureStatus();
      return {
        isLoading: false,
        error: null,
        configured: Boolean(status.configured),
        signerName: status.signer_name || '',
        signerTitle: status.signer_title || '',
        signatureType: null,
        signatureData: null,
        version: status.version ?? null,
      };
    };

    load()
      .then((next) => {
        if (isMounted) setState(next);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setState({
          ...EMPTY,
          isLoading: false,
          error: (err as Error | null)?.message || 'Could not load the company signature.',
        });
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, canView]);

  return state;
}
