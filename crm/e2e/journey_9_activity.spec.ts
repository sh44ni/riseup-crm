import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Analytics: Activity tab', () => {
  test('owner sees the activity feed and can filter it', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: path.join(authDir, 'owner.json') });
    const page = await ctx.newPage();
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/analytics\/activity/);
    await expect(page.getByTestId('activity-tab')).toBeVisible();
    await expect(page.getByTestId('activity-stats')).toContainText('Total Events');
    await expect(page.getByTestId('analytics-tab-soon-lead-sources')).toContainText('Soon');
    await expect(page.getByTestId('analytics-tab-soon-conversion')).toBeVisible();
    await expect(page.getByTestId('activity-row').first()).toBeVisible();

    await page.getByLabel('Action').selectOption('security');
    await expect(page).toHaveURL(/action=security/);
    await expect(page.getByTestId('activity-row').first()).toBeVisible();
    await expect(page.getByTestId('activity-row').first()).toContainText(/security/i);

    await page.getByTestId('activity-row').first().click();
    await expect(page.getByRole('dialog', { name: 'Activity details' })).toBeVisible();
    await ctx.close();
  });

  test('legacy /reports redirects to analytics', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: path.join(authDir, 'owner.json') });
    const page = await ctx.newPage();
    await page.goto('/reports');
    await expect(page).toHaveURL(/\/analytics\/activity/);
    await ctx.close();
  });

  test('sales rep cannot open the activity log', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: path.join(authDir, 'rep.json') });
    const page = await ctx.newPage();
    await page.goto('/analytics/activity');
    await expect(page.getByText('Access Restricted')).toBeVisible();
    await ctx.close();
  });
});
