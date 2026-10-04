import { test, expect } from '@playwright/test';
import path from 'path';

test('dashboard pipeline: List and Calendar views switch', async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: path.resolve(process.cwd(), 'playwright/.auth/owner.json') });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.getByRole('main').getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByTestId('dashboard-list-view')).toBeVisible();

  await page.getByRole('main').getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.getByTestId('dashboard-calendar-view')).toBeVisible();

  await page.getByRole('main').getByRole('button', { name: 'Kanban', exact: true }).click();
  await expect(page.getByTestId('dashboard-list-view')).toBeHidden();
  await ctx.close();
});
