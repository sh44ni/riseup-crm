import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Clients 360 Directory Sorting', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('sort control sorts clients, persists across Cards and Table views, and saves per user', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    // Wait for the directory to load cards
    const sortDropdownBtn = page.locator('[data-testid="client-sort-dropdown-btn"]');
    await expect(sortDropdownBtn).toBeVisible({ timeout: 10000 });

    const sortDirBtn = page.locator('[data-testid="client-sort-direction-btn"]');
    await expect(sortDirBtn).toBeVisible();

    // Verify initial sort text
    await expect(sortDropdownBtn).toContainText('Homeowner Name');
    await expect(sortDirBtn).toContainText('A → Z');

    // Get initial client names in Cards view
    const cardTitles = page.locator('.light-glass-card h3');
    await expect(cardTitles.first()).toBeVisible({ timeout: 10000 });
    const initialFirstCard = await cardTitles.first().textContent();

    // 1. Toggle Direction to Descending (Z → A)
    await sortDirBtn.click();
    await expect(sortDirBtn).toContainText('Z → A');
    await page.waitForTimeout(400);

    const descFirstCard = await cardTitles.first().textContent();
    console.log('Ascending first card:', initialFirstCard, 'Descending first card:', descFirstCard);

    // 2. Switch to Table View and verify sorting stays active
    const tableViewBtn = page.locator('button[title*="Table View"]');
    await tableViewBtn.click();
    await page.waitForTimeout(400);

    // In Table view, verify table rows match descending sort
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows.first()).toBeVisible();
    const tableFirstRowName = await tableRows.first().locator('td').first().locator('.font-bold').first().textContent();
    expect(tableFirstRowName?.trim()).toBe(descFirstCard?.trim());

    // 3. Click Table Column Header to sort by Assigned Rep
    const repHeader = page.locator('th:has-text("Assigned Rep")');
    await repHeader.click();
    await page.waitForTimeout(400);

    // Toolbar sort dropdown should now reflect "Assigned Rep"
    await expect(sortDropdownBtn).toContainText('Assigned Rep');

    // 4. Switch back to Cards View and verify sorting remains "Assigned Rep"
    const cardsViewBtn = page.locator('button[title*="Cards View"]');
    await cardsViewBtn.click();
    await page.waitForTimeout(400);
    await expect(sortDropdownBtn).toContainText('Assigned Rep');

    // 5. Select another field from Sort dropdown (e.g. City / Location)
    await sortDropdownBtn.click();
    const cityOpt = page.locator('[data-testid="client-sort-opt-city"]');
    await expect(cityOpt).toBeVisible();
    await cityOpt.click();
    await expect(sortDropdownBtn).toContainText('City / Location');

    // Take screenshot of Cards view sorted by City
    await page.screenshot({ path: 'clients_directory_sorted_cards.png' });

    // Switch to Table view and take screenshot
    await tableViewBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: 'clients_directory_sorted_table.png' });

    // 6. Test persistence across page reloads (simulating user returning to page)
    await page.reload();
    await page.waitForLoadState('networkidle');

    const reloadedSortBtn = page.locator('[data-testid="client-sort-dropdown-btn"]');
    await expect(reloadedSortBtn).toBeVisible({ timeout: 10000 });
    // Should still be City / Location from localStorage
    await expect(reloadedSortBtn).toContainText('City / Location');
  });
});
