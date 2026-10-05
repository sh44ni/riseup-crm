import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Official logo capture', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('capture official logo in contract preview', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/contracts?mode=studio&id=267');
    await page.waitForLoadState('networkidle');

    const previewFrame = page.frameLocator('iframe[title="Contract Document Preview"]');
    await expect(previewFrame.locator('#riseup_logo_primary')).toBeVisible({ timeout: 10000 });

    // Take screenshot of the contract studio with cover page logo
    await page.screenshot({ path: 'contract_official_logo_page1.png', fullPage: false });

    // Switch to Page 2
    const page2Btn = page.locator('button:has-text("2")').last();
    if (await page2Btn.isVisible()) {
      await page2Btn.click();
      await page.waitForTimeout(600);
      await expect(previewFrame.locator('#riseup_logo_white')).toBeVisible({ timeout: 10000 });
      await page.screenshot({ path: 'contract_official_logo_page2.png', fullPage: false });
    }
  });
});
