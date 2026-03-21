import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.getByRole('button', { name: /login|iniciar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('Navigation guards', () => {
  test('unauthenticated GET /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated GET /inventory redirects to /login', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/login/);
  });

  test('unauthenticated GET /users redirects to /login', async ({ page }) => {
    await page.goto('/users');
    await expect(page).toHaveURL(/login/);
  });

  test('GET / redirects to /dashboard when authenticated', async ({ page }) => {
    await login(page);
    await page.goto('/');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('GET /login redirects to /dashboard when already authenticated', async ({ page }) => {
    await login(page);
    await page.goto('/login');
    // Login guard should send back to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });
  });
});

test.describe('Authenticated navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

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

  test('unknown route shows 404 or redirects', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    // Either stays on 404 page or redirects to dashboard
    const url = page.url();
    expect(url).toMatch(/this-does-not-exist|dashboard/);
  });
});
