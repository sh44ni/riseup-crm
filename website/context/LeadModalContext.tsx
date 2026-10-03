'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type LeadModalSource =
  | 'storm_promo'
  | 'estimator'
  | 'contact'
  | 'service_area'
  | 'header_nav';

export interface LeadModalPrefill {
  fullName?: string;
  phone?: string;
  email?: string;
  serviceType?: string;
  address?: string;
  city?: string;
  sqft?: number;
  estimatedLow?: number;
  estimatedHigh?: number;
  notes?: string;
  discountAmount?: number;
}

export interface OpenLeadModalOptions {
  source: LeadModalSource;
  title?: string;
  subtitle?: string;
  prefill?: LeadModalPrefill;
  discountAmount?: number;
}

interface LeadModalContextType {
  isOpen: boolean;
  options: OpenLeadModalOptions | null;
  openLeadModal: (options: OpenLeadModalOptions) => void;
  closeLeadModal: () => void;
}

const LeadModalContext = createContext<LeadModalContextType | undefined>(undefined);

export function LeadModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<OpenLeadModalOptions | null>(null);

  const openLeadModal = useCallback((opts: OpenLeadModalOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeLeadModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <LeadModalContext.Provider
      value={{
        isOpen,
        options,
        openLeadModal,
        closeLeadModal,
      }}
    >
      {children}
    </LeadModalContext.Provider>
  );
}

export function useLeadModal() {
  const context = useContext(LeadModalContext);
  if (!context) {
    throw new Error('useLeadModal must be used within a LeadModalProvider');
  }
  return context;
}
