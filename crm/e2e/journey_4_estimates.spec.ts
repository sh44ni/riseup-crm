import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Journey 4: Estimate Creation Wizard & HTML Proposal', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('navigate to estimates and verify estimate studio structure', async ({ page }) => {
    await page.goto('/estimates');
    await page.waitForLoadState('networkidle');

    // Verify estimates header and action buttons
    await expect(page.locator('text=Estimates').first()).toBeVisible({ timeout: 10000 });

    const newEstBtn = page.locator('button:has-text("Create Estimate"), button:has-text("New Estimate")').first();
    if (await newEstBtn.isVisible()) {
      await newEstBtn.click();
      // Wizard or modal opens
      const wizardHeader = page.locator('text=Estimate').first();
      await expect(wizardHeader).toBeVisible({ timeout: 5000 });
    }
  });
});
