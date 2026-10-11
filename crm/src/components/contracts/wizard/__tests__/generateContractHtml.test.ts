import { describe, it, expect } from 'vitest';
import { generateContractHtml, ContractValidationError } from '../generateContractHtml';
import type { ContractStudioData } from '@/types/contractStudioTypes';

const completeContractData: ContractStudioData = {
  status: 'draft',
  clientName: 'Jane Smith',
  clientPhone: '(760) 555-0199',
  clientEmail: 'jane.smith@example.com',
  projectAddress: '1234 Ocean View Drive',
  city: 'Carlsbad',
  state: 'CA',
  zip: '92008',
  contractorName: 'Rise Up Roofing & Construction, Inc.',
  contractorTitle: 'Licensed General Roofing Contractor',
  contractorLicense: '1096492',
  salespersonName: 'Carlos Rivera',
  contractDate: 'October 15, 2026',
  contractDateShort: '10/15/2026',
  contractTitle: 'HOME IMPROVEMENT CONTRACT',
  preparedByName: 'Maria Lopez',
  preparedByTitle: 'Project Manager',
  contractorSignatoryName: 'Edith Guerrero',
  contractorSignatoryTitle: 'President',
  approxStartDate: 'November 1, 2026',
  substantialCommencementDate: 'November 4, 2026',
  approxCompletionDate: 'November 10, 2026',
  scopeTitle: 'Premium Architectural Shingle Roof Replacement',
  scopeIntro: 'Rise Up Roofing & Construction, Inc. agrees to furnish all materials and labor for the full replacement:',
  scopeSections: [
    {
      id: 's1',
      heading: 'Tear-Off & Deck Inspection',
      text: 'Remove existing composition shingles down to wood decking. Inspect decking for dry rot.',
    },
    {
      id: 's2',
      heading: 'Underlayment & Shingle Installation',
      text: 'Install synthetic underlayment and Owens Corning Duration shingles in Estate Gray.',
    },
  ],
  contractPrice: 24500,
  downpayment: 1000,
  financeCharge: '0.00',
  paymentSchedule: [
    { id: 'p1', number: '1.', description: 'Deposit upon signing', amount: 1000 },
    { id: 'p2', number: '2.', description: 'Delivery of materials', amount: 11000 },
    { id: 'p3', number: '3.', description: 'Final inspection and completion', amount: 12500 },
  ],
  cancellationDeadlineDays: 3,
  cancellationEmail: 'notices@riseuprac.com',
  insuranceCarrier: 'State Compensation Insurance Fund',
  insurancePhone: '(888) 782-8338',
  workersCompCarrier: 'State Compensation Insurance Fund',
  workersCompPhone: '(888) 782-8338',
  isSigned: false,
  clientInitials: '',
  clientSignatureName: '',
  contractorSignatureName: '',
};

describe('generateContractHtml', () => {
  it('generates complete 7-page contract HTML containing real client and scope data', () => {
    const html = generateContractHtml(completeContractData, 'all');

    expect(html).toContain('Jane Smith');
    expect(html).toContain('1234 Ocean View Drive, Carlsbad, CA 92008');
    expect(html).toContain('Carlos Rivera');
    expect(html).toContain('Premium Architectural Shingle Roof Replacement');
    expect(html).toContain('Tear-Off &amp; Deck Inspection');
    expect(html).toContain('Owens Corning Duration shingles');
    expect(html).toContain('$24,500');
    expect(html).toContain('$1,000');
    expect(html).toContain('$11,000');
    expect(html).toContain('$12,500');
    expect(html).toContain('notices@riseuprac.com');

    // Verify all continuation page numbers (Pages 2 through 7 of 7)
    expect(html).toContain('Page 2 of 7');
    expect(html).toContain('Page 3 of 7');
    expect(html).toContain('Page 4 of 7');
    expect(html).toContain('Page 5 of 7');
    expect(html).toContain('Page 6 of 7');
    expect(html).toContain('Page 7 of 7');
  });

  it('renders Page 1 Cover cleanly with title, status badge, and prepared by/for fields', () => {
    const html = generateContractHtml(completeContractData, 1);
    expect(html).toContain('section class="page cover"');
    expect(html).toContain('Jane Smith');
    expect(html).toContain('Maria Lopez');
    expect(html).toContain('CONTRACT DATE');
    expect(html).toContain('October 15, 2026');
    expect(html).toContain('cover-status-badge draft');
    expect(html).toContain('DRAFT');

    // Test partially executed
    const partiallyHtml = generateContractHtml({ ...completeContractData, isSigned: true }, 1);
    expect(partiallyHtml).toContain('cover-status-badge partially-executed');
    expect(partiallyHtml).toContain('PARTIALLY EXECUTED');

    // Test fully executed
    const fullyHtml = generateContractHtml({ ...completeContractData, isSigned: true, isCounterSigned: true }, 1);
    expect(fullyHtml).toContain('cover-status-badge fully-executed');
    expect(fullyHtml).toContain('FULLY EXECUTED');
  });

  it('names the company signature signer as the Contractor signatory', () => {
    const html = generateContractHtml(completeContractData, 'all');
    expect(html).toContain('Rise Up Roofing and Construction, Inc. Edith Guerrero (the “Contractor”)');
    expect(html).toContain('By: Edith Guerrero • Title: President');
    // Not counter-signed yet → no contractor signature image
    expect(html).not.toContain('alt="Contractor Signature"');
  });

  it('leaves the signatory blank when no company signer is known', () => {
    const html = generateContractHtml(
      { ...completeContractData, contractorSignatoryName: '', contractorSignatoryTitle: '' },
      'all'
    );
    expect(html).toContain('Rise Up Roofing and Construction, Inc. (the “Contractor”)');
    expect(html).toContain('By: ____________________ • Title: ____________________');
    expect(html).not.toContain('By: Maria Lopez');
  });

  it('renders Page 2 Scope with Page 2 of 7 footer', () => {
    const html = generateContractHtml(completeContractData, 2);
    expect(html).toContain('Page 2 of 7');
    expect(html).toContain('AGREEMENT');
    expect(html).toContain('Premium Architectural Shingle Roof Replacement');
  });

  it('renders Page 6 Three-Day and Page 7 Five-Day Cancellation Notices', () => {
    const p6 = generateContractHtml(completeContractData, 6);
    expect(p6).toContain('Page 6 of 7');
    expect(p6).toContain('Notice of the Three-day Right to Cancel');
    expect(p6).toContain('EXHIBIT A • NOTICE OF CANCELLATION (THREE DAYS)');

    const p7 = generateContractHtml(completeContractData, 7);
    expect(p7).toContain('Page 7 of 7');
    expect(p7).toContain('Notice of the Five-day Right to Cancel');
    expect(p7).toContain('EXHIBIT A (2) • NOTICE OF CANCELLATION (FIVE DAYS)');
  });

  it('throws validation error when passed empty data instead of demo defaults', () => {
    expect(() => generateContractHtml({} as any)).toThrow(ContractValidationError);
  });

  it('reports missing required fields in validation error message', () => {
    expect(() => generateContractHtml({} as any)).toThrow(
      /Contract validation failed: missing required field/
    );
  });
});
