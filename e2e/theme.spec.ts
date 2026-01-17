import { test, expect } from '@playwright/test';

// Helper to login before tests
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.getByRole('button', { name: /login|iniciar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should have theme toggle in navigation', async ({ page }) => {
    await page.goto('/dashboard');

    // Should have a theme toggle button
    const themeToggle = page.locator('button').filter({ has: page.locator('mat-icon:has-text("dark_mode"), mat-icon:has-text("light_mode")') });
    await expect(themeToggle.first()).toBeVisible();
  });

  test('should switch from dark to light theme', async ({ page }) => {
    await page.goto('/dashboard');

    // Get current theme
    const initialTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    // Click theme toggle
    const themeToggle = page.locator('button').filter({ has: page.locator('mat-icon:has-text("dark_mode"), mat-icon:has-text("light_mode")') }).first();
    await themeToggle.click();

    // Theme should have changed
    const newTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(newTheme).not.toBe(initialTheme);
  });

  test('should persist theme after page reload', async ({ page }) => {
    await page.goto('/dashboard');

    // Set light theme
    await page.evaluate(() => {
      localStorage.setItem('theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    });

    // Reload page
    await page.reload();

    // Theme should still be light
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');
  });

  test('should apply correct styles for dark theme', async ({ page }) => {
    await page.goto('/dashboard');

    // Set dark theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
    });

    // Check background color is dark
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim();
    });

    // Dark theme surface should be dark color
    expect(bgColor).toMatch(/#0a0a0a|rgb\(10,\s*10,\s*10\)/i);
  });

  test('should apply correct styles for light theme', async ({ page }) => {
    await page.goto('/dashboard');

    // Set light theme
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    // Check background color is light
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim();
    });

    // Light theme surface should be light color
    expect(bgColor).toMatch(/#f8fafc|rgb\(248,\s*250,\s*252\)/i);
  });
});
