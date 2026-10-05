import { test, expect } from '@playwright/test';
import path from 'path';
import { execSync } from 'child_process';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');
const artifactDir = 'C:/Users/imzee/.gemini/antigravity/brain/4231ef9d-3916-4086-aaa4-acddb44d6ccf';

test.describe('Contract Wizard Last Page Finish Button Control', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test.beforeEach(async () => {
    try {
      execSync('docker exec -i riseup_postgres psql -U postgres -d riseup_db -c "UPDATE contracts SET status=\'draft\' WHERE id=267;"', {
        stdio: 'ignore',
      });
    } catch (err) {
      console.warn('Could not reset contract status via docker:', err);
    }
  });

  test('greys out the Finish button on the last page until the contract is sent, then enables finish', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Open existing draft contract in studio mode
    await page.goto('/contracts?mode=studio&id=267');
    await page.waitForLoadState('networkidle');

    // Wait for wizard progress
    const progressText = page.locator('text=/\\d+\\/8/');
    await expect(progressText).toBeVisible({ timeout: 10000 });

    // Advance to Step 8/8 (Review & Deliver)
    while ((await progressText.textContent()) !== '8/8') {
      const nextBtn = page.getByRole('button', { name: /Next Step/i });
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(400);
      } else {
        break;
      }
    }

    await expect(progressText).toHaveText('8/8');
    await expect(page.getByText('Contract Delivery & Export')).toBeVisible({ timeout: 5000 });

    // Locate the Finish button
    const finishBtn = page.getByTestId('wizard-finish-btn');
    await expect(finishBtn).toBeVisible();

    // 1. Verify Finish button is initially disabled / greyed out
    await expect(finishBtn).toBeDisabled();
    await expect(finishBtn).toHaveClass(/cursor-not-allowed/);
    await expect(page.getByText('Send contract to client before finishing →')).toBeVisible();

    // Capture screenshot showing greyed out Finish button and helper warning
    await page.screenshot({
      path: path.join(artifactDir, 'contract_wizard_finish_disabled_before_send.png'),
    });

    // 2. Click "Send Contract (Email & SMS)"
    const sendBtn = page.getByRole('button', { name: /Send Contract \(Email & SMS\)|Re-Send Contract/i });
    await expect(sendBtn).toBeVisible();
    await sendBtn.click();

    // Wait for dispatched notification banner
    await expect(page.getByText(/Contract Dispatched to Client/i)).toBeVisible({ timeout: 12000 });

    // 3. Verify Finish button is now ENABLED, colored, and clickable
    await expect(finishBtn).toBeEnabled();
    await expect(finishBtn).toHaveClass(/cursor-pointer/);
    await expect(page.getByText('Send contract to client before finishing →')).not.toBeVisible();

    // Capture screenshot showing enabled Finish button
    await page.screenshot({
      path: path.join(artifactDir, 'contract_wizard_finish_enabled_after_send.png'),
    });

    // 4. Click Finish and verify wizard completes and closes
    await finishBtn.click();
    await page.waitForTimeout(1000);

    // Verify wizard is closed and user is back on contracts page
    await expect(progressText).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'HOME IMPROVEMENT CONTRACTS' })).toBeVisible();
  });
});
