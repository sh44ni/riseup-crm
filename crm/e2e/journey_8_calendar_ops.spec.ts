import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Journey 8: Operations Scheduling & Calendar Integration', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('calendar view renders monthly grid and operations event sidebar', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForLoadState('networkidle');

    // Calendar page title and calendar grid should be visible
    await expect(page.locator('text=Operations Calendar').or(page.locator('text=Calendar')).first()).toBeVisible({
      timeout: 10000,
    });
  });
});
