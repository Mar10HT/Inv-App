import { test, expect } from '@playwright/test';

// Auth tests verify the login flow itself — they need a fresh unauthenticated context
test.use({ storageState: undefined });

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /login|iniciar/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.getByRole('button', { name: /login|iniciar/i }).click();

    await expect(page.locator('.mat-snack-bar-container, [role="alert"]')).toBeVisible({ timeout: 5000 });
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.getByRole('button', { name: /login|iniciar/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page).toHaveURL(/login/);
  });
});
