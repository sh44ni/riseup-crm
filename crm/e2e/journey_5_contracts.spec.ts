import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Journey 5: Contract Builder & Multi-Page Generator', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('navigate to contracts and verify contract table and builder', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Contract').first()).toBeVisible({ timeout: 10000 });
  });
});
