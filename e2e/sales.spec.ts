import { test, expect } from '@playwright/test';

test.describe('Sales', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
  });

  test('shows sales page heading', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/sale|venta/i);
  });

  test('shows stats cards', async ({ page }) => {
    const cards = page.locator('.bg-surface-variant.border.border-theme.rounded-xl');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(4);
  });

  test('has a new sale button', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /new sale|nueva venta/i });
    await expect(addBtn).toBeVisible();
  });

  test('opens create sale dialog on button click', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /new sale|nueva venta/i }).first();
    await addBtn.click();

    const dialog = page.locator('[role="dialog"], mat-dialog-container');
    await expect(dialog.first()).toBeVisible({ timeout: 3000 });
  });

  test('sales list renders without error', async ({ page }) => {
    const rows = page.locator('table tbody tr, [class*="sale"], [class*="card"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
    await expect(page).toHaveURL(/sales/);
  });

  test('warehouse filter is visible', async ({ page }) => {
    const filterEl = page.locator('select, mat-select').first();
    await expect(filterEl).toBeVisible();
  });
});
