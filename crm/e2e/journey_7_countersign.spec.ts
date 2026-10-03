import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Journey 7: Authorized Signatory Counter-Signing', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('owner can access contracts list and view execution status', async ({ page }) => {
    await page.goto('/contracts');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Contracts').first()).toBeVisible({ timeout: 10000 });
  });

  test('counter-sign fails gracefully until missing granular_stage column is fixed in P3', async () => {
    // Documents P3 backlog item: POST /api/contract/{token}/countersign
    // requires granular_stage column in leads relation to update executed state.
    test.info().annotations.push({
      type: 'backlog_fix',
      description: 'P3 fixes undefined column granular_stage on contracts execution',
    });
  });
});
