import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');
const artifactDir = 'C:/Users/imzee/.gemini/antigravity/brain/4231ef9d-3916-4086-aaa4-acddb44d6ccf';

test.describe('Dashboard Tasks Widget with Custom Categories', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('renders custom categories on executive dashboard right-hand dock', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify Dashboard is loaded
    await expect(page.getByText('Review site permits and roof inspection details')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('ROOF REPAIRS').first()).toBeVisible();

    // Capture screenshot of Dashboard with custom categories on Tasks widget
    await page.screenshot({
      path: path.join(artifactDir, 'dashboard_tasks_widget_custom_categories.png'),
    });
  });
});
