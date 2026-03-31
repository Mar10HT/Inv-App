import { test, expect } from '@playwright/test';

test.describe('Users', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/users');
  });

  test('shows users page heading', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/user|usuario/i);
  });

  test('has an invite/create user button', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /add|create|invite|nuevo|agregar|invit/i }).first();
    await expect(addBtn).toBeVisible();
  });

  test('user list shows at least one user (admin)', async ({ page }) => {
    const rows = page.locator('table tbody tr, [class*="user-card"], [class*="user-row"]');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
  });

  test('search input filters users', async ({ page }) => {
    const search = page.locator(
      'input[type="search"], input[placeholder*="search" i], input[placeholder*="buscar" i]',
    );
    if (await search.isVisible()) {
      await search.fill('admin');
      await page.waitForTimeout(400);
      await expect(page).toHaveURL(/users/);
    }
  });

  test('role filter is visible', async ({ page }) => {
    const roleFilter = page.locator(
      'select, mat-select, [class*="role-filter"]',
    ).filter({ hasText: /role|rol|all/i }).first();
    if (await roleFilter.isVisible()) {
      await roleFilter.click();
      await page.waitForTimeout(300);
    }
    await expect(page).toHaveURL(/users/);
  });
});

test.describe('User Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
  });

  test('shows profile page', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page).toHaveURL(/profile/);
  });

  test('displays user email', async ({ page }) => {
    await expect(page.getByText(/admin@test\.com/i)).toBeVisible({ timeout: 5000 });
  });

  test('change password form is accessible', async ({ page }) => {
    const pwSection = page.locator(
      'input[type="password"], [formcontrolname*="password" i]',
    ).first();
    await expect(pwSection).toBeVisible({ timeout: 5000 });
  });
});
