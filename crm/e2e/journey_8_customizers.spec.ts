import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const heroBackground = (page: import('@playwright/test').Page) =>
  page.locator('.group\\/hero > div').first();

test.describe('Customizer popups: per-user, persistent, empty by default', () => {
  test('hero image persists across reload and is private to the user', async ({ browser }) => {
    const ownerCtx = await browser.newContext({ storageState: path.join(authDir, 'owner.json') });
    const owner = await ownerCtx.newPage();
    await owner.goto('/leads');
    await owner.waitForLoadState('networkidle');

    await owner.locator('button[title^="Customize Banner"]').first().click({ force: true });
    await expect(owner.getByRole('heading', { name: 'Hero Banner' })).toBeVisible();
    await expect(owner.getByTestId('image-spec-hint').first()).toContainText('2400×600');

    await owner.getByTestId('image-upload-input').first().setInputFiles({
      name: 'hero.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    });
    await expect(owner.locator('img[alt="Selected"]')).toBeVisible();
    await owner.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(owner.getByRole('heading', { name: 'Hero Banner' })).toBeHidden();

    await expect(heroBackground(owner)).toHaveCSS('background-image', /static\/uploads\/customizations\//);

    // Survives reload and navigating away/back (no revert to a hardcoded image)
    await owner.reload();
    await owner.waitForLoadState('networkidle');
    await expect(heroBackground(owner)).toHaveCSS('background-image', /static\/uploads\/customizations\//);
    await owner.goto('/');
    await owner.goto('/leads');
    await expect(heroBackground(owner)).toHaveCSS('background-image', /static\/uploads\/customizations\//);

    // Another user sees nothing
    const repCtx = await browser.newContext({ storageState: path.join(authDir, 'rep.json') });
    const rep = await repCtx.newPage();
    await rep.goto('/');
    await rep.waitForLoadState('networkidle');
    await expect(heroBackground(rep)).toHaveCSS('background-image', 'none');

    // Cleanup: reset owner's hero for this page
    await owner.locator('button[title^="Customize Banner"]').first().click({ force: true });
    await owner.getByRole('button', { name: 'Reset this page' }).click();
    await owner.getByRole('button', { name: 'Reset this page' }).last().click();
    await ownerCtx.close();
    await repCtx.close();
  });
});
