import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

setup('authenticate as owner and sales_rep', async ({ browser }) => {
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // 1. Authenticate as owner
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto('/login');
  await ownerPage.fill('input[type="email"]', 'e2e_owner@riseuprac.local');
  await ownerPage.fill('input[type="password"]', 'E2eTestPassword123!');
  await ownerPage.click('button[type="submit"]');
  await expect(ownerPage.locator('a[href="/"]').first()).toBeVisible({ timeout: 10000 });
  await ownerContext.storageState({ path: path.join(authDir, 'owner.json') });
  await ownerContext.close();

  // 2. Authenticate as sales_rep
  const repContext = await browser.newContext();
  const repPage = await repContext.newPage();
  await repPage.goto('/login');
  await repPage.fill('input[type="email"]', 'e2e_rep@riseuprac.local');
  await repPage.fill('input[type="password"]', 'E2eTestPassword123!');
  await repPage.click('button[type="submit"]');
  await expect(repPage.locator('a[href="/"]').first()).toBeVisible({ timeout: 10000 });
  await repContext.storageState({ path: path.join(authDir, 'rep.json') });
  await repContext.close();
});
