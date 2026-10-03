import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { scanPageA11y, A11yScanResult } from './a11yHelper';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

const APP_ROUTES = [
  '/',
  '/pipeline',
  '/leads',
  '/clients',
  '/estimates',
  '/contracts',
  '/jobs',
  '/calendar',
  '/finances',
  '/marketing',
  '/tasks',
  '/reports',
  '/warranties',
  '/settings',
];

test.describe('WP-2.10: Accessibility Scanning Baseline', () => {
  const allResults: A11yScanResult[] = [];

  test('scan unauthenticated /login route in light and dark mode', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Light mode scan
    const lightResult = await scanPageA11y(page, '/login', 'light');
    allResults.push(lightResult);

    // Dark mode scan
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await page.waitForLoadState('networkidle');
    const darkResult = await scanPageA11y(page, '/login', 'dark');
    allResults.push(darkResult);
  });

  test.describe('authenticated routes accessibility scanning', () => {
    test.use({ storageState: path.join(authDir, 'owner.json') });

    for (const route of APP_ROUTES) {
      test(`a11y scan ${route} (light and dark mode)`, async ({ page }) => {
        // Light mode
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const lightResult = await scanPageA11y(page, route, 'light');
        allResults.push(lightResult);

        // Dark mode
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.reload();
        await page.waitForLoadState('networkidle');
        const darkResult = await scanPageA11y(page, route, 'dark');
        allResults.push(darkResult);
      });
    }
  });

  test.afterAll(() => {
    const totalSeriousCritical = allResults.reduce(
      (sum, r) => sum + r.seriousAndCriticalCount,
      0
    );

    const reportPath = path.resolve(process.cwd(), 'axe-baseline.json');
    const summary = {
      timestamp: new Date().toISOString(),
      total_scans: allResults.length,
      total_serious_critical_violations: totalSeriousCritical,
      scans: allResults,
    };

    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`\n========================================`);
    console.log(`Axe Accessibility Baseline Generated`);
    console.log(`Routes scanned: ${APP_ROUTES.length + 1} (light + dark)`);
    console.log(`Total serious/critical violations: ${totalSeriousCritical}`);
    console.log(`Baseline saved to: ${reportPath}`);
    console.log(`========================================\n`);
  });
});
