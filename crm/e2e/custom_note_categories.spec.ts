import { test, expect } from '@playwright/test';
import path from 'path';

const authDir = path.resolve(process.cwd(), 'playwright/.auth');
const artifactDir = 'C:/Users/imzee/.gemini/antigravity/brain/4231ef9d-3916-4086-aaa4-acddb44d6ccf';

test.describe('Custom Personal Note Categories', () => {
  test.use({ storageState: path.join(authDir, 'owner.json') });

  test('displays empty category slots with + button, allows adding up to 3 custom labels, and assigns to notes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to personal notes tab
    await page.goto('/tasks?tab=personal_notes');
    await page.waitForLoadState('networkidle');

    // Clear any previous custom categories from localStorage to test clean state
    await page.evaluate(() => {
      Object.keys(localStorage).forEach((key) => {
        if (key.includes('custom_note_categories')) {
          localStorage.removeItem(key);
        }
      });
      window.dispatchEvent(new Event('riseup_custom_note_categories_updated'));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Click "New Sticky Note" button
    const newNoteBtn = page.getByRole('button', { name: /New Sticky Note/i });
    await expect(newNoteBtn).toBeVisible({ timeout: 10000 });
    await newNoteBtn.click();

    // Verify modal is open
    const modalTitle = page.getByText('New Sticky Note / To-Do');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Verify the empty category slots
    const addLabelBtn = page.getByRole('button', { name: /Add Label/i });
    await expect(addLabelBtn).toBeVisible();

    const emptySlots = page.getByRole('button', { name: /Empty/i });
    await expect(emptySlots.first()).toBeVisible();

    // Capture screenshot of empty categories state matching user requirement
    await page.screenshot({
      path: path.join(artifactDir, 'personal_notes_empty_categories.png'),
    });

    // 1. Add first category: "Estimates"
    await addLabelBtn.click();
    const labelInput = page.getByPlaceholder('Label name...');
    await expect(labelInput).toBeVisible();
    await labelInput.fill('Estimates');
    await labelInput.press('Enter');

    // Verify "Estimates" chip is visible in modal
    await expect(page.getByTitle('Estimates', { exact: true })).toBeVisible();

    // 2. Add second category: "Site Visits"
    const addSecondLabelBtn = page.getByRole('button', { name: /Add Label/i });
    await addSecondLabelBtn.click();
    const labelInput2 = page.getByPlaceholder('Label name...');
    await labelInput2.fill('Site Visits');
    await labelInput2.press('Enter');

    await expect(page.getByTitle('Site Visits', { exact: true })).toBeVisible();

    // 3. Add third category: "Roof Repairs"
    const addThirdLabelBtn = page.getByRole('button', { name: /Add Label/i });
    await addThirdLabelBtn.click();
    const labelInput3 = page.getByPlaceholder('Label name...');
    await labelInput3.fill('Roof Repairs');
    await labelInput3.press('Enter');

    await expect(page.getByTitle('Roof Repairs', { exact: true })).toBeVisible();

    // Now all 3 slots are filled, "+ Add Label" should no longer be shown in modal
    await expect(page.getByRole('button', { name: /Add Label/i })).toHaveCount(0);

    // Capture screenshot of modal with 3 custom categories
    await page.screenshot({
      path: path.join(artifactDir, 'personal_notes_custom_categories_modal.png'),
    });

    // Select "Roof Repairs" as the active category for this note
    await page.getByTitle('Roof Repairs', { exact: true }).click();

    // Fill note title and submit
    const noteDescInput = page.getByPlaceholder(/Call HOA property manager/i);
    await noteDescInput.fill('Review site permits and roof inspection details');

    // Click "Add Sticky Note"
    const submitBtn = page.getByRole('button', { name: /Add Sticky Note/i });
    await submitBtn.click();

    // Modal should close
    await expect(modalTitle).not.toBeVisible({ timeout: 5000 });

    // Verify the new note appears on the board with the "Roof Repairs" badge
    await expect(page.getByText('Review site permits and roof inspection details')).toBeVisible({ timeout: 8000 });

    // Verify category filter pill in header
    const filterStrip = page.locator('.overflow-x-auto');
    await expect(filterStrip.getByRole('button', { name: /Estimates/i })).toBeVisible();
    await expect(filterStrip.getByRole('button', { name: /Site Visits/i })).toBeVisible();
    await expect(filterStrip.getByRole('button', { name: /Roof Repairs/i })).toBeVisible();

    // Capture screenshot of the sticky notes board with custom categories
    await page.screenshot({
      path: path.join(artifactDir, 'personal_notes_board_custom_categories.png'),
    });
  });
});
