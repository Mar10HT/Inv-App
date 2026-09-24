import { test, expect } from '@playwright/test';

// Guards tests need a fresh context WITHOUT the saved auth session
test.describe('Navigation guards', () => {
  test('unauthenticated GET /dashboard redirects to /login', async ({ browser: b }) => {
    const ctx = await b.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
    await ctx.close();
  });

  test('unauthenticated GET /inventory redirects to /login', async ({ browser: b }) => {
    const ctx = await b.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto('/inventory');
    await expect(page).toHaveURL(/login/);
    await ctx.close();
  });

  test('unauthenticated GET /users redirects to /login', async ({ browser: b }) => {
    const ctx = await b.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    await page.goto('/users');
    await expect(page).toHaveURL(/login/);
    await ctx.close();
  });

  // These use the authenticated storageState inherited from config
  test('GET / redirects to /dashboard when authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('GET /login redirects to /dashboard when already authenticated', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });
});

test.describe('Authenticated navigation', () => {
  test('navigates to /inventory', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/inventory/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigates to /warehouses', async ({ page }) => {
    await page.goto('/warehouses');
    await expect(page).toHaveURL(/warehouses/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigates to /categories', async ({ page }) => {
    await page.goto('/categories');
    await expect(page).toHaveURL(/categories/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigates to /suppliers', async ({ page }) => {
    await page.goto('/suppliers');
    await expect(page).toHaveURL(/suppliers/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigates to /loans', async ({ page }) => {
    await page.goto('/loans');
    await expect(page).toHaveURL(/loans/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigates to /transfers', async ({ page }) => {
    await page.goto('/transfers');
    await expect(page).toHaveURL(/transfers/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigates to /reports', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/reports/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('navigates to /profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/profile/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('an unknown route shows the not found page', async ({ page }) => {
    await page.goto('/this-does-not-exist');

    await expect(page.locator('h1')).toHaveText('404');
  });
});
