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
  contractorLicense: '#1096492',
  salespersonName: 'Carlos Rivera',
  contractDate: 'October 15, 2026',
  contractDateShort: '10/15/2026',
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
  it('generates complete multi-page contract HTML containing real client and scope data', () => {
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
  });

  it('matches HTML snapshot structure for complete contract', () => {
    const html = generateContractHtml(completeContractData, 1);
    // Verifies Page 1 header and summary section
    expect(html).toContain('Page 1 of 6');
    expect(html).toContain('HOME IMPROVEMENT CONTRACT');
    expect(html).toContain('Jane Smith');
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
