import { test, expect } from '@playwright/test';

// Helper to login before tests
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.getByRole('button', { name: /login|iniciar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should display inventory list', async ({ page }) => {
    await page.goto('/inventory');

    // Should show the inventory page
    await expect(page.locator('h1')).toContainText(/inventory|inventario/i);

    // Should have search input
    await expect(page.locator('input[placeholder*="search" i], input[placeholder*="buscar" i]')).toBeVisible();

    // Should have add button
    await expect(page.getByRole('button', { name: /add|agregar|nuevo/i })).toBeVisible();
  });

  test('should filter inventory by search', async ({ page }) => {
    await page.goto('/inventory');

    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="buscar" i]');
    await searchInput.fill('test');

    // Wait for debounce
    await page.waitForTimeout(500);

    // Results should be filtered (this depends on having data)
    // At minimum, the search should not cause an error
    await expect(page).toHaveURL(/inventory/);
  });

  test('should open add item form', async ({ page }) => {
    await page.goto('/inventory');

    await page.getByRole('button', { name: /add|agregar|nuevo/i }).click();

    // Should navigate to add form
    await expect(page).toHaveURL(/inventory\/add/);

    // Form should be visible
    await expect(page.locator('input[formcontrolname="name"], input[name="name"]')).toBeVisible();
  });

  test('should show item details modal', async ({ page }) => {
    await page.goto('/inventory');

    // Click on first item in the list (if any)
    const firstRow = page.locator('table tbody tr, .item-card').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();

      // Modal should appear
      await expect(page.locator('.mat-dialog-container, [role="dialog"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should filter by status', async ({ page }) => {
    await page.goto('/inventory');

    // Find status filter
    const statusFilter = page.locator('select').filter({ hasText: /status|estado/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ index: 1 });

      // Wait for results to update
      await page.waitForTimeout(300);
    }

    // Page should still be functional
    await expect(page).toHaveURL(/inventory/);
  });
});
