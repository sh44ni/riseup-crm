import { test, expect } from '@playwright/test';
import path from 'path';
import { generateContractHtml } from '../src/components/contracts/wizard/generateContractHtml';
import { DEFAULT_CONTRACT } from '../src/components/contracts/wizard/contractWizardData';
import type { ContractStudioData } from '../src/types/contractStudioTypes';

const artifactDir = 'C:/Users/imzee/.gemini/antigravity/brain/4231ef9d-3916-4086-aaa4-acddb44d6ccf';

const testContractData: ContractStudioData = {
  ...DEFAULT_CONTRACT,
  status: 'draft',
  clientName: 'Test Homeowner 35',
  clientPhone: '(760) 266-2443',
  clientEmail: 'homeowner35@example.com',
  projectAddress: '123 Solar Way, Oceanside, CA 92054',
  city: 'Oceanside',
  state: 'CA',
  zip: '92054',
  contractorName: 'Rise Up Roofing and Construction, Inc.',
  contractorTitle: 'Licensed General Contractor',
  contractorLicense: '1096492',
  salespersonName: 'Marc Sarellano',
  contractDate: 'October 5, 2026',
  contractDateShort: 'Oct 5, 2026',
  contractTitle: 'HOME IMPROVEMENT CONTRACT',
  preparedByName: 'Edith Guerrero',
  preparedByTitle: 'Project Manager',
  approxStartDate: 'October 16th, 2026',
  substantialCommencementDate: 'October 19th, 2026',
  approxCompletionDate: 'October 22th, 2026',
  scopeTitle: 'TILE ROOF LIFT & RELAY',
  scopeIntro: 'Rise Up Roofing & Construction, Inc. will complete the following roofing, preventative maintenance, exterior waterproofing, and interior repair work at the property:',
  contractPrice: 26870,
  downpayment: 1000,
  financeCharge: '0.00',
  cancellationDeadlineDays: 3,
  cancellationEmail: 'accountant@riseuprac.com',
  insuranceCarrier: 'PACIFIC UNITED INSURANCE SERVICES',
  insurancePhone: '(619) 274-8144',
  workersCompCarrier: 'PACIFIC UNITED INSURANCE SERVICES',
  workersCompPhone: '(619) 274-8144',
  isSigned: false,
  clientInitials: '',
  clientSignatureName: '',
  contractorSignatureName: '',
};

test.describe('Contract PDF & Print 7-Page Layout Verification', () => {
  test('verifies all 7 pages one by one for proper positioning, zero cropping, and balanced space', async ({ page }) => {
    // Generate full 7-page contract HTML
    const fullHtml = generateContractHtml(testContractData, 'all');

    await page.setViewportSize({ width: 794, height: 1123 });
    await page.setContent(fullHtml, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const pages = page.locator('section.page');
    await expect(pages).toHaveCount(7);

    // Verify each page individually
    for (let i = 0; i < 7; i++) {
      const p = pages.nth(i);
      const pageNum = i + 1;

      // Ensure page exists and is visible
      await expect(p).toBeVisible();

      // Verify page box dimensions
      const box = await p.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeCloseTo(794, -1);
      expect(box!.height).toBeCloseTo(1122, -1);

      // Verify footer is at the bottom and has the correct page number
      const foot = p.locator('.foot');
      if (pageNum > 1) {
        await expect(foot).toBeVisible();
        await expect(foot).toContainText(`Page ${pageNum} of 7`);
      }

      // Check specific page content & cropping invariants
      if (pageNum === 2) {
        // Page 2: Agreement & Scope
        const lastScopeItem = p.locator('.cols').last();
        await expect(lastScopeItem).toBeVisible();

        const jobsiteNote = p.getByText('Jobsite Protection & Standards Note:');
        await expect(jobsiteNote).toBeVisible();

        // Verify jobsiteNote bottom is ABOVE the footer (not cropped or hidden behind it)
        const jobsiteBox = await jobsiteNote.boundingBox();
        const footBox = await foot.boundingBox();
        expect(jobsiteBox!.y + jobsiteBox!.height).toBeLessThan(footBox!.y);
      }

      if (pageNum === 3) {
        // Page 3: Milestones & Timetable
        await expect(p.getByText('PROJECT TIMETABLE • CHANGE ORDERS • CONTRACT PRICING')).toBeVisible();
        await expect(p.getByText('k. Schedule of Progress Payments:')).toBeVisible();
        await expect(p.locator('table')).toBeVisible();
        await expect(p.getByText('CLIENT INITIAL: I HAVE READ AND AGREE TO THE PAYMENT MILESTONES SCHEDULE')).toBeVisible();

        const initBox = p.locator('.init').last();
        const initBoxPos = await initBox.boundingBox();
        const footBox = await foot.boundingBox();
        expect(initBoxPos!.y + initBoxPos!.height).toBeLessThan(footBox!.y);
      }

      if (pageNum === 4) {
        // Page 4: Payment Terms, Insurance, Liens, CSLB (no longer empty!)
        await expect(p.getByText('PAYMENT TERMS • INSURANCE COVERAGE • LIENS & CONSUMER DISCLOSURES')).toBeVisible();
        await expect(p.getByText('Payment Terms, Invoicing Provisions & Refund Policy:')).toBeVisible();
        await expect(p.getByText('CLIENT INITIAL: I HAVE READ AND UNDERSTOOD THE PAYMENT TERMS & REFUND POLICY')).toBeVisible();
        await expect(p.getByText('E. MECHANICS LIEN WARNING:')).toBeVisible();
        await expect(p.getByText('CLIENT INITIAL: I HAVE READ AND UNDERSTOOD THE MECHANICS LIEN WARNING')).toBeVisible();
        await expect(p.getByText('F. Information about the Contractors’ State License Board (CSLB):')).toBeVisible();

        // Verify CSLB contact columns are well-positioned and not crowded
        const cslbCols = p.locator('.cols.three');
        await expect(cslbCols).toBeVisible();
        const cslbBox = await cslbCols.boundingBox();
        const footBox = await foot.boundingBox();
        expect(cslbBox!.y + cslbBox!.height).toBeLessThan(footBox!.y);
        // And verify page 4 has substantial content (not empty void: height of content > 500px)
        const bodyBox = await p.locator('.body').boundingBox();
        expect(bodyBox!.height).toBeGreaterThan(500);
      }

      if (pageNum === 5) {
        // Page 5: Representations, Execution Signatures, Right to Cancel Addendum
        await expect(p.getByText('REPRESENTATIONS & GENERAL CONTRACT PROVISIONS')).toBeVisible();
        await expect(p.getByText('EXECUTION OF AGREEMENT')).toBeVisible();
        await expect(p.getByText('RIGHT TO CANCEL ADDENDUM')).toBeVisible();
        await expect(p.getByText('CLIENT INITIAL: I ACKNOWLEDGE RECEIPT OF THE THREE-DAY RIGHT TO CANCEL NOTICE')).toBeVisible();
        await expect(p.getByText('CLIENT INITIAL: I ACKNOWLEDGE RECEIPT OF THE FIVE-DAY RIGHT TO CANCEL NOTICE (IF APPLICABLE)')).toBeVisible();
      }

      if (pageNum === 6) {
        // Page 6: 3-Day Notice of Cancellation + Detachable Exhibit A form
        await expect(p.getByRole('heading', { name: 'Notice of the Three-day Right to Cancel' })).toBeVisible();
        await expect(p.getByRole('heading', { name: 'EXHIBIT A • NOTICE OF CANCELLATION (THREE DAYS)' })).toBeVisible();

        // Invariants: Delivery method, Contractor Acknowledgment, and company footer MUST BE VISIBLE and NOT CROPPED!
        const deliveryMethod = p.getByText(/Delivery Method:.*Delivered In Person/);
        await expect(deliveryMethod).toBeVisible();

        const contractorAck = p.getByText(/Contractor Acknowledgment of Receipt:/);
        await expect(contractorAck).toBeVisible();

        const companyFooter = p.locator('.cancel .ctr');
        await expect(companyFooter).toBeVisible();

        // Verify companyFooter is completely ABOVE the page footer
        const companyFootBox = await companyFooter.boundingBox();
        const footBox = await foot.boundingBox();
        expect(companyFootBox!.y + companyFootBox!.height).toBeLessThan(footBox!.y);
      }

      if (pageNum === 7) {
        // Page 7: 5-Day Notice of Cancellation (Senior Citizens) + Detachable Exhibit A (2) form
        await expect(p.getByRole('heading', { name: 'Notice of the Five-day Right to Cancel' })).toBeVisible();
        await expect(p.getByRole('heading', { name: 'EXHIBIT A (2) • NOTICE OF CANCELLATION (FIVE DAYS)' })).toBeVisible();

        const deliveryMethod = p.getByText(/Delivery Method:.*Delivered In Person/);
        await expect(deliveryMethod).toBeVisible();

        const contractorAck = p.getByText(/Contractor Acknowledgment of Receipt:/);
        await expect(contractorAck).toBeVisible();

        const companyFooter = p.locator('.cancel .ctr');
        await expect(companyFooter).toBeVisible();

        const companyFootBox = await companyFooter.boundingBox();
        const footBox = await foot.boundingBox();
        expect(companyFootBox!.y + companyFootBox!.height).toBeLessThan(footBox!.y);
      }

      // Capture high-resolution screenshot of this page for artifact proof
      await p.screenshot({
        path: path.join(artifactDir, `contract_verified_page_${pageNum}.png`),
      });
    }
  });
});
