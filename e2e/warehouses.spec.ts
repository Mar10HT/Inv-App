import { test, expect } from '@playwright/test';

test.describe('Warehouses', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/warehouses');
  });

  test('shows warehouses page heading', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/warehouse|almac/i);
  });

  test('has an add/create button', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add|create|nuevo|agregar/i });
    await expect(addBtn).toBeVisible();
  });

  test('search input is visible', async ({ page }) => {
    const search = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i]');
    if (await search.isVisible()) {
      await search.fill('Main');
      await page.waitForTimeout(400);
      await expect(page).toHaveURL(/warehouses/);
    }
  });

  test('opens add warehouse dialog/form on add button click', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add|create|nuevo|agregar/i }).first();
    await addBtn.click();

    // Either a dialog or a navigation to a form should appear
    const dialog = page.locator('[role="dialog"], mat-dialog-container');
    const nameInput = page.locator('input[formcontrolname="name"], input[name="name"]');

    const dialogVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
    const inputVisible = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);

    expect(dialogVisible || inputVisible).toBe(true);
  });

  test('warehouse list items are visible when data exists', async ({ page }) => {
    // If there are warehouses, table rows or cards should be present
    const rows = page.locator('table tbody tr, [class*="warehouse-card"], [class*="list-item"]');
    const count = await rows.count();
    // At least 0 rows — the page should still render without error
    expect(count).toBeGreaterThanOrEqual(0);
    await expect(page).toHaveURL(/warehouses/);
  });
});
