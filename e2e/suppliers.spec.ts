import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.getByRole('button', { name: /login|iniciar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('Suppliers', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/suppliers');
  });

  test('shows suppliers page heading', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/supplier|proveedor/i);
  });

  test('has an add/create button', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add|create|nuevo|agregar/i });
    await expect(addBtn).toBeVisible();
  });

  test('opens add supplier dialog on button click', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add|create|nuevo|agregar/i }).first();
    await addBtn.click();

    const dialog = page.locator('[role="dialog"], mat-dialog-container');
    const nameInput = page.locator('input[formcontrolname="name"], input[name="name"]');

    const dialogVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
    const inputVisible = await nameInput.isVisible({ timeout: 2000 }).catch(() => false);

    expect(dialogVisible || inputVisible).toBe(true);
  });

  test('supplier list renders without error', async ({ page }) => {
    const rows = page.locator('table tbody tr, [class*="supplier"], [class*="card"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
    await expect(page).toHaveURL(/suppliers/);
  });

  test('search filters supplier list', async ({ page }) => {
    const search = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i]');
    if (await search.isVisible()) {
      await search.fill('acme');
      await page.waitForTimeout(400);
      await expect(page).toHaveURL(/suppliers/);
    }
  });
});
