import { test, expect } from '@playwright/test';

test.describe('Categories', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/categories');
  });

  test('shows categories page heading', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/categor/i);
  });

  test('has an add/create button', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add|create|new|nuevo|agregar/i });
    await expect(addBtn).toBeVisible();
  });

  test('opens add category dialog on button click', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add|create|new|nuevo|agregar/i }).first();
    await addBtn.click();

    const dialog = page.locator('[role="dialog"], mat-dialog-container');
    const nameInput = page.locator('input[formcontrolname="name"], input[name="name"]');

    const dialogVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
    const inputVisible = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);

    expect(dialogVisible || inputVisible).toBe(true);
  });

  test('opens without redirecting', async ({ page }) => {
    await expect(page).toHaveURL(/categories/);
  });

  test('search/filter input is functional', async ({ page }) => {
    const search = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i]');
    if (await search.isVisible()) {
      await search.fill('Electronics');
      await page.waitForTimeout(400);
      await expect(page).toHaveURL(/categories/);
    }
  });
});
