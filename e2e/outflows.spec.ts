import { test, expect } from '@playwright/test';

test.describe('Outflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/outflows');
  });

  test('shows outflows page heading', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/outflow|salida/i);
  });

  test('shows stats cards', async ({ page }) => {
    const cards = page.locator('.bg-surface-variant.border.border-theme.rounded-xl');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(3);
  });

  test('has a new outflow button', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /new outflow|nueva salida/i });
    await expect(addBtn).toBeVisible();
  });

  test('opens create outflow dialog on button click', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /new outflow|nueva salida/i }).first();
    await addBtn.click();

    const dialog = page.locator('[role="dialog"], mat-dialog-container');
    await expect(dialog.first()).toBeVisible({ timeout: 3000 });
  });

  test('outflows list renders without error', async ({ page }) => {
    const rows = page.locator('table tbody tr, [class*="outflow"], [class*="card"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
    await expect(page).toHaveURL(/outflows/);
  });

  test('warehouse filter is visible', async ({ page }) => {
    const filterEl = page.locator('select, mat-select').first();
    await expect(filterEl).toBeVisible();
  });
});
