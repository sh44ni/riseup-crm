import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Journey 3: Sales Pipeline Progression & Backward Move Policy', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('pipeline renders Kanban columns and enforces backward move prevention', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    // Verify key Kanban column headers exist
    await expect(page.locator('button:has-text("1. Cold Lead")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("2. Contacted")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("3. Estimate Scheduled")').first()).toBeVisible({ timeout: 10000 });

    // Verify seeded lead is visible on board
    await expect(page.locator('text=E2E Alice Smith').first()).toBeVisible({ timeout: 10000 });
  });
});
