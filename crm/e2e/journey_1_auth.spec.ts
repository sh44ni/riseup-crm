import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Journey 1: Authentication & Access Control', () => {
  test('unauthenticated access redirects immediately to /login', async ({ page }) => {
    // Clear cookies/localStorage to ensure unauthenticated state
    await page.context().clearCookies();
    await page.goto('/pipeline');
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('valid login lands on dashboard and persists session', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'e2e_owner@riseuprac.local');
    await page.fill('input[type="password"]', 'E2eTestPassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/', { timeout: 10000 });
    await expect(page.locator('a[href="/"]').first()).toBeVisible({ timeout: 10000 });

    // Reload page to verify session persists across refresh
    await page.reload();
    await expect(page.locator('a[href="/"]').first()).toBeVisible({ timeout: 10000 });
    expect(page.url()).not.toContain('/login');
  });

  test('invalid login shows clear error message', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'e2e_owner@riseuprac.local');
    await page.fill('input[type="password"]', 'WrongPassword!');
    await page.click('button[type="submit"]');

    await expect(
      page.locator('text=not authorized').or(page.locator('text=Authentication failed'))
    ).toBeVisible({ timeout: 5000 });
  });

  test.describe('Role permission boundaries', () => {
    test.use({ storageState: path.join(authDir, 'rep.json') });

    test('settings page shows access restricted for sales rep', async ({ page }) => {
      await page.goto('/settings');
      await expect(page.getByRole('heading', { name: 'Insufficient Role Privileges' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/sales rep.*does not have the required permission/i)).toBeVisible();
    });
  });
});
