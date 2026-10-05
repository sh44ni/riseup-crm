import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');

test.describe('Clients 360 Lost Client Filtering and Details Access', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('excludes lost clients from All Records, displays them under Closed Lost chip, and preserves full details/history access', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/clients');
    await page.waitForLoadState('networkidle');

    // 1. Wait for toolbar to mount
    const sortDropdownBtn = page.locator('[data-testid="client-sort-dropdown-btn"]');
    await expect(sortDropdownBtn).toBeVisible({ timeout: 15000 });

    const allRecordsChip = page.locator('button:has-text("All Records")');
    const closedLostChip = page.locator('button:has-text("Closed Lost")');

    await expect(allRecordsChip).toBeVisible();
    await expect(closedLostChip).toBeVisible();

    // Verify chip text
    await expect(allRecordsChip).toContainText('All Records');
    await expect(closedLostChip).toContainText('Closed Lost');

    // Get count badges
    const allRecordsCountText = await allRecordsChip.locator('span').nth(1).textContent();
    const closedLostCountText = await closedLostChip.locator('span').nth(1).textContent();

    const allCount = parseInt(allRecordsCountText?.trim() || '0', 10);
    const lostCount = parseInt(closedLostCountText?.trim() || '0', 10);

    console.log(`All Records count: ${allCount}, Closed Lost count: ${lostCount}`);
    expect(allCount).toBeGreaterThan(0);
    expect(lostCount).toBeGreaterThan(0);

    // 2. In "All Records" view, ensure NO client has "Closed Lost" badge
    const visibleCardsAll = page.locator('.light-glass-card:has(h3)');
    await expect(visibleCardsAll.first()).toBeVisible({ timeout: 10000 });
    const cardsCountAll = await visibleCardsAll.count();
    expect(cardsCountAll).toBe(allCount);

    // Ensure none of the cards in All Records show "Closed Lost"
    const lostBadgesInAll = page.locator('.light-glass-card:has(h3):has-text("Closed Lost")');
    await expect(lostBadgesInAll).toHaveCount(0);

    // Screenshot of "All Records" view without lost clients
    await page.screenshot({
      path: path.resolve(
        process.env.USERPROFILE || 'C:/Users/imzee',
        '.gemini/antigravity/brain/4231ef9d-3916-4086-aaa4-acddb44d6ccf/clients_all_records_no_lost.png'
      ),
    });

    // 3. Click "Closed Lost" chip
    await closedLostChip.click();
    await page.waitForTimeout(400);

    // Verify only lost clients are displayed
    const lostCards = page.locator('.light-glass-card:has(h3)');
    await expect(lostCards.first()).toBeVisible({ timeout: 10000 });
    const cardsCountLost = await lostCards.count();
    expect(cardsCountLost).toBe(lostCount);

    // Each card in Closed Lost tab should display "Closed Lost"
    for (let i = 0; i < cardsCountLost; i++) {
      await expect(lostCards.nth(i)).toContainText('Closed Lost');
    }

    // Verify "Lost Reason" is rendered on the lost client card
    await expect(lostCards.first().locator(':text("Lost Reason:")')).toBeVisible();

    // Screenshot of "Closed Lost" view
    await page.screenshot({
      path: path.resolve(
        process.env.USERPROFILE || 'C:/Users/imzee',
        '.gemini/antigravity/brain/4231ef9d-3916-4086-aaa4-acddb44d6ccf/clients_closed_lost_view.png'
      ),
    });

    // 4. Switch to Table view while on Closed Lost tab
    const tableViewBtn = page.locator('button[title*="Table View"]');
    await tableViewBtn.click();
    await page.waitForTimeout(400);

    const lostTableRows = page.locator('table tbody tr');
    await expect(lostTableRows).toHaveCount(lostCount);
    await expect(lostTableRows.first()).toContainText('Closed Lost');

    // 5. Click on the first lost client to open 360 profile
    await lostTableRows.first().click();
    await page.waitForTimeout(600);

    // Verify 360 Profile loaded with full details and history
    const overviewTab = page.locator('button:has-text("360° Overview")');
    const timelineTab = page.locator('button:has-text("Timeline")');
    await expect(overviewTab).toBeVisible();
    await expect(timelineTab).toBeVisible();

    // Should display the Reactivate button for lost client
    const reactivateBtn = page.getByRole('button', { name: 'Reactivate', exact: true });
    await expect(reactivateBtn).toBeVisible();

    // Check Timeline / History tab
    await timelineTab.click();
    await page.waitForTimeout(400);
    const logActivityBtn = page.getByRole('button', { name: 'Log Activity' });
    await expect(logActivityBtn).toBeVisible();

    // Screenshot of Lost Client 360 Profile
    await page.screenshot({
      path: path.resolve(
        process.env.USERPROFILE || 'C:/Users/imzee',
        '.gemini/antigravity/brain/4231ef9d-3916-4086-aaa4-acddb44d6ccf/client_lost_profile_details.png'
      ),
    });

    // 6. Return back to directory
    const backBtn = page.locator('button:has-text("All Clients")');
    await backBtn.click();
    await page.waitForTimeout(400);

    // Verify we are back in directory with filter intact
    await expect(allRecordsChip).toBeVisible();
  });
});
