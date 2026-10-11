import React from 'react';
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import type { ContractStudioData } from '@/types/contractStudioTypes';
import { ContractSignaturesStep, type WizardSignatureStatus } from '../steps/ContractSignaturesStep';

const baseData = { clientName: 'Jane Smith' } as ContractStudioData;

const notConfigured: WizardSignatureStatus = {
  loading: false,
  configured: false,
  signerName: '',
  signerTitle: '',
  error: null,
};

const configured: WizardSignatureStatus = {
  loading: false,
  configured: true,
  signerName: 'Edith Guerrero',
  signerTitle: 'President',
  error: null,
};

const salesRep = {
  id: 9,
  email: 'rep@test.local',
  name: 'Sam Rep',
  role: 'sales_rep',
  permissions: {},
  signature_access: 'none' as const,
};

describe('ContractSignaturesStep — company signature lock', () => {
  it('shows the locked card with a set-up action for editors when not configured', () => {
    renderWithProviders(
      <ContractSignaturesStep data={baseData} onDataChange={() => {}} signatureStatus={notConfigured} />
    );
    expect(screen.getByTestId('contract-signature-locked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /set up now/i })).toBeInTheDocument();
  });

  it('tells users without edit access to ask an admin', () => {
    renderWithProviders(
      <ContractSignaturesStep data={baseData} onDataChange={() => {}} signatureStatus={notConfigured} />,
      { user: salesRep }
    );
    expect(screen.getByTestId('contract-signature-locked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /set up now/i })).not.toBeInTheDocument();
    expect(screen.getByText(/ask an admin with edit access/i)).toBeInTheDocument();
  });

  it('shows the company signatory and no lock once configured', () => {
    renderWithProviders(
      <ContractSignaturesStep data={baseData} onDataChange={() => {}} signatureStatus={configured} />
    );
    expect(screen.queryByTestId('contract-signature-locked')).not.toBeInTheDocument();
    expect(screen.getByText('Edith Guerrero')).toBeInTheDocument();
    expect(screen.getByText('President')).toBeInTheDocument();
  });
});
