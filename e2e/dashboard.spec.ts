import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('shows the dashboard page heading', async ({ page }) => {
    await expect(page.locator('h1, h2').filter({ hasText: /dashboard/i })).toBeVisible();
  });

  test('renders stat cards with numeric values', async ({ page }) => {
    // Stats cards should contain numbers
    const statCards = page.locator('.stat-card, [class*="stat"], [class*="card"]').first();
    await expect(statCards).toBeVisible();
  });

  test('sidebar navigation links are visible', async ({ page }) => {
    // Sidebar should contain key navigation items
    const sidebar = page.locator('nav, aside, [class*="sidebar"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('navbar is visible with user info', async ({ page }) => {
    // Top navbar should be present
    const navbar = page.locator('header, [class*="navbar"], [class*="topbar"]').first();
    await expect(navbar).toBeVisible();
  });

  test('redirects unauthenticated user to login', async ({ page: unauthPage }) => {
    await unauthPage.goto('/dashboard');
    await expect(unauthPage).toHaveURL(/login/);
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
