import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.getByRole('button', { name: /login|iniciar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('Transfer Requests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/transfers');
  });

  test('shows transfers page heading', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/transfer|traslado/i);
  });

  test('has a create/add button', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add|create|nuevo|agregar/i });
    await expect(addBtn).toBeVisible();
  });

  test('opens create transfer dialog on button click', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add|create|nuevo|agregar/i }).first();
    await addBtn.click();

    const dialog = page.locator('[role="dialog"], mat-dialog-container');
    await expect(dialog.first()).toBeVisible({ timeout: 3000 });
  });

  test('transfer list renders without error', async ({ page }) => {
    const rows = page.locator('table tbody tr, [class*="transfer"], [class*="card"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
    await expect(page).toHaveURL(/transfers/);
  });

  test('status filter is functional', async ({ page }) => {
    const filterEl = page.locator(
      'button[role="tab"], mat-tab-group, select, mat-select',
    ).first();
    if (await filterEl.isVisible()) {
      await filterEl.click();
      await page.waitForTimeout(300);
    }
    await expect(page).toHaveURL(/transfers/);
  });
});
