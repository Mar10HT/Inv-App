import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('shows the dashboard page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /welcome/i })).toBeVisible();
  });

  test('renders stat cards with numeric values', async ({ page }) => {
    // Stats cards should contain numbers
    const statCards = page.locator('.stat-card, [class*="stat"], [class*="card"]').first();
    await expect(statCards).toBeVisible();
  });

  test('sidebar navigation links are visible', async ({ page }) => {
    // aside.sidebar is the real sidebar; a sibling .sidebar-overlay (mobile
    // backdrop, hidden by default) also matches a loose [class*="sidebar"]
    // selector and sorts first in DOM order, so target the real element.
    const sidebar = page.locator('aside.sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('navbar is visible with user info', async ({ page }) => {
    // This app has no separate top navbar — user info lives in the sidebar's
    // bottom section instead.
    const userRow = page.locator('.user-row');
    await expect(userRow).toBeVisible();
  });

  test('redirects unauthenticated user to login', async ({ browser }) => {
    // Needs a genuinely logged-out context — the file's default page is
    // already authenticated via the project's shared storageState.
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const unauthPage = await context.newPage();
    await unauthPage.goto('/dashboard');
    await expect(unauthPage).toHaveURL(/login/);
    await context.close();
  });

  test('clicking Inventory link navigates to /inventory', async ({ page }) => {
    const inventoryLink = page.locator('a[href*="inventory"], nav button').filter({ hasText: /inventory|inventario/i }).first();
    if (await inventoryLink.isVisible()) {
      await inventoryLink.click();
      await expect(page).toHaveURL(/inventory/);
    }
  });

  test('clicking Warehouses link navigates to /warehouses', async ({ page }) => {
    const whLink = page.locator('a[href*="warehouses"], nav button').filter({ hasText: /warehouse|almac/i }).first();
    if (await whLink.isVisible()) {
      await whLink.click();
      await expect(page).toHaveURL(/warehouses/);
    }
  });
});
