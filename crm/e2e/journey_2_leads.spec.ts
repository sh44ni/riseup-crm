import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Journey 2: Lead Creation & Validation', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('create lead via Quick-Add / Full Intake modal with validation', async ({ page }) => {
    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    // Click "New Lead" or "Create Lead" button
    const createBtn = page.locator('button:has-text("Create Lead"), button:has-text("New Lead")').first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Verify modal is displayed
    const modalTitle = page.locator('text=Create New Lead');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Fill valid data
    const leadName = `E2E Lead ${Date.now()}`;
    await page.fill('input[placeholder*="Robert Johnson"]', leadName);
    await page.fill('input[placeholder*="(760) 000-0000"]', '7605550199');
    await page.fill('input[placeholder*="name@example.com"]', 'e2e_lead@example.com');

    // Submit lead
    const submitBtn = page.locator('button[type="submit"]:has-text("Create Lead")');
    await submitBtn.click();

    // Verify success or modal closes
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
  });
});
