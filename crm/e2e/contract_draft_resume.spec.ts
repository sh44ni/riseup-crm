import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Contract Draft 1-Draft-Per-Client & Resume Position', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('opening edit on a draft contract resumes from saved wizard step', async ({ page }) => {
    // Navigate to contracts table
    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    // Filter to Drafts tab on toolbar
    const draftTab = page.locator('button:has-text("Drafts (")').first();
    await expect(draftTab).toBeVisible({ timeout: 10000 });
    await draftTab.click();
    await page.waitForTimeout(600);

    // Locate the Edit button in the draft table row
    const editBtn = page.locator('tbody tr button[title="Open in Studio"]').first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();

    // Verify Contract Wizard Shell opened in studio mode with contract id
    await expect(page).toHaveURL(/mode=studio.*id=267/);

    // Verify that the wizard resumed directly at Step 4 (5/8) where it was saved!
    const progressText = page.locator('text=/\\d+\\/8/');
    await expect(progressText).toHaveText('5/8', { timeout: 10000 });
    console.log('Current wizard step progress on edit:', await progressText.textContent());

    // Verify Back and Next buttons are interactive
    const backBtn = page.locator('button:has-text("Back")');
    const nextBtn = page.locator('button:has-text("Next"), button:has-text("Save & Continue")').first();
    await expect(nextBtn).toBeVisible();

    // Step back to Step 3 (4/8)
    await backBtn.click();
    await page.waitForTimeout(800);
    await expect(progressText).toHaveText('4/8');

    // Wait for auto-save
    await page.waitForTimeout(1500);

    // Click Back to Contracts
    const backToContractsBtn = page.locator('button[title="Back to Contracts"]').first();
    await backToContractsBtn.click();
    await page.waitForURL(/\/contracts/);
    await page.waitForTimeout(500);

    // Click Edit on the draft contract again
    await editBtn.click();
    await page.waitForTimeout(1000);

    // Verify it resumed directly at Step 3 (4/8)!
    await expect(progressText).toHaveText('4/8', { timeout: 8000 });
    console.log('Successfully verified draft resumed at updated step 4/8!');

    // Advance back to Step 4 (5/8) for Test 2
    await nextBtn.click();
    await page.waitForTimeout(800);
    await expect(progressText).toHaveText('5/8');

    // Wait for auto-save
    await page.waitForTimeout(1500);

    // Click Back to Contracts
    await backToContractsBtn.click();
    await page.waitForURL(/\/contracts/);
    await page.waitForTimeout(500);

    // Click Edit on the draft contract again
    await editBtn.click();
    await page.waitForTimeout(1000);

    // Verify it resumed directly at Step 4 (5/8)!
    await expect(progressText).toHaveText('5/8', { timeout: 8000 });
    console.log('Successfully verified draft resumed at updated step 5/8!');

    // Take screenshot of resumed contract draft at advanced step
    await page.screenshot({ path: path.join(authDir, '..', '..', 'contract_draft_resumed.png'), fullPage: true });
  });

  test('selecting a client with existing draft resumes where it was left off', async ({ page }) => {
    // Open a blank new contract wizard
    await page.goto('/contracts?mode=studio');
    await page.waitForLoadState('networkidle');

    // Type in client search dropdown in Step 0 (Details Step)
    const clientSearchInput = page.locator('input[placeholder*="Search client by name"], input[placeholder*="Search"]').first();
    await expect(clientSearchInput).toBeVisible({ timeout: 8000 });
    await clientSearchInput.fill('Z');
    await page.waitForTimeout(600);

    // Locate and click lead Z (ID #35) from dropdown
    const leadOption = page.locator('div.cursor-pointer:has-text("Z")').first();
    await expect(leadOption).toBeVisible({ timeout: 5000 });
    await leadOption.click();

    // Verify that the existing draft was restored and wizard resumed directly at Step 4 (5/8)!
    const progressText = page.locator('text=/\\d+\\/8/');
    await expect(progressText).toHaveText('5/8', { timeout: 8000 });
    console.log('Successfully verified selecting client resumed directly at Step 4 (5/8)!');
  });
});
