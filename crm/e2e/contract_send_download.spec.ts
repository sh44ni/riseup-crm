import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Contract Review & Deliver Step - Download and Send PDF', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('verifies official Rise Up SVG logo renders in preview and clicking Download Contract PDF triggers direct download', async ({ page }) => {
    // Navigate directly into Studio mode for draft contract 267
    await page.goto('/contracts?mode=studio&id=267');
    await page.waitForLoadState('networkidle');

    // Wait for the wizard to hydrate
    const progressText = page.locator('text=/\\d+\\/8/');
    await expect(progressText).toBeVisible({ timeout: 10000 });

    // Check preview iframe on Page 1
    const previewFrame = page.frameLocator('iframe[title="Contract Document Preview"]');
    // Ensure official Rise Up SVG logo is present
    const officialLogo = previewFrame.locator('#riseup_logo_primary');
    await expect(officialLogo).toBeVisible({ timeout: 5000 });

    // Ensure fake hand-drawn circle is NOT in the SVG
    const fakeCircle = previewFrame.locator('circle[cx="92"]');
    await expect(fakeCircle).toHaveCount(0);

    // Switch preview to Page 2 to check letterhead logo
    const page2Btn = page.locator('button:has-text("2")').last();
    if (await page2Btn.isVisible()) {
      await page2Btn.click();
      await page.waitForTimeout(500);
      const whiteLogo = previewFrame.locator('#riseup_logo_white');
      await expect(whiteLogo).toBeVisible({ timeout: 5000 });
    }

    // Switch back to Page 1
    const page1Btn = page.locator('button:has-text("1")').first();
    if (await page1Btn.isVisible()) {
      await page1Btn.click();
      await page.waitForTimeout(300);
    }

    // Navigate to Step 7 (8/8 · Review & Deliver)
    // Keep clicking Next until we reach 8/8
    while ((await progressText.textContent()) !== '8/8') {
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Save & Continue")').first();
      await nextBtn.click();
      await page.waitForTimeout(600);
    }

    await expect(progressText).toHaveText('8/8');
    await expect(page.locator('text=Contract Delivery & Export')).toBeVisible();

    // Verify Download button is visible
    const downloadBtn = page.locator('button:has-text("Download Contract PDF")');
    await expect(downloadBtn).toBeVisible();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });

    // Click Download Contract PDF
    await downloadBtn.click();

    // Wait for download or success toast
    const download = await downloadPromise;
    console.log('Downloaded file:', download.suggestedFilename());
    expect(download.suggestedFilename()).toContain('.pdf');

    // Verify toast confirms successful generation
    const toast = page.locator('text=Contract PDF generated and downloaded');
    await expect(toast).toBeVisible({ timeout: 5000 });

    // Take screenshot of download success state
    await page.screenshot({ path: 'contract_download_success.png' });
  });

  test('clicking Send Contract (Email & SMS) compiles PDF and dispatches contract', async ({ page }) => {
    // Navigate directly into Studio mode for draft contract 267
    await page.goto('/contracts?mode=studio&id=267');
    await page.waitForLoadState('networkidle');

    const progressText = page.locator('text=/\\d+\\/8/');
    await expect(progressText).toBeVisible({ timeout: 10000 });

    // Navigate to Step 7 (8/8 · Review & Deliver)
    while ((await progressText.textContent()) !== '8/8') {
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Save & Continue")').first();
      await nextBtn.click();
      await page.waitForTimeout(600);
    }

    await expect(progressText).toHaveText('8/8');
    const sendBtn = page.locator('button:has-text("Send Contract (Email & SMS)")');
    await expect(sendBtn).toBeVisible();

    // Click Send Contract
    await sendBtn.click();

    // Verify it transitions to Sent state and displays confirmation
    const confirmationBanner = page.locator('text=Contract Dispatched to Client!');
    await expect(confirmationBanner).toBeVisible({ timeout: 15000 });

    // Take screenshot of dispatched state
    await page.screenshot({ path: 'contract_send_success.png' });
  });
});
