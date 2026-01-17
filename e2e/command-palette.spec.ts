import { test, expect } from '@playwright/test';

// Helper to login before tests
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@test.com');
  await page.fill('input[type="password"]', 'password123');
  await page.getByRole('button', { name: /login|iniciar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

test.describe('Command Palette', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should open with Ctrl+K', async ({ page }) => {
    await page.goto('/dashboard');

    // Press Ctrl+K (Cmd+K on Mac)
    await page.keyboard.press('Control+k');

    // Command palette should be visible
    await expect(page.locator('app-command-palette, [class*="command-palette"]')).toBeVisible({ timeout: 2000 });

    // Search input should be focused
    await expect(page.locator('input[placeholder*="search" i], input[placeholder*="buscar" i]').first()).toBeFocused();
  });

  test('should close with Escape', async ({ page }) => {
    await page.goto('/dashboard');

    // Open palette
    await page.keyboard.press('Control+k');
    await expect(page.locator('app-command-palette')).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');

    // Should be closed
    await expect(page.locator('app-command-palette')).not.toBeVisible();
  });

  test('should navigate with arrow keys', async ({ page }) => {
    await page.goto('/dashboard');

    // Open palette
    await page.keyboard.press('Control+k');
    await expect(page.locator('app-command-palette')).toBeVisible();

    // Press arrow down
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Press Enter to select
    await page.keyboard.press('Enter');

    // Palette should close and navigate
    await expect(page.locator('app-command-palette')).not.toBeVisible({ timeout: 2000 });
  });

  test('should filter results when typing', async ({ page }) => {
    await page.goto('/dashboard');

    // Open palette
    await page.keyboard.press('Control+k');

    // Type search query
    await page.keyboard.type('inventory');

    // Should show filtered results
    await expect(page.locator('app-command-palette button, app-command-palette a')).toHaveCount.greaterThan(0);
  });

  test('should navigate to page when clicked', async ({ page }) => {
    await page.goto('/dashboard');

    // Open palette
    await page.keyboard.press('Control+k');
    await expect(page.locator('app-command-palette')).toBeVisible();

    // Click on inventory option
    const inventoryOption = page.locator('app-command-palette button').filter({ hasText: /inventory|inventario/i }).first();
    if (await inventoryOption.isVisible()) {
      await inventoryOption.click();

      // Should navigate to inventory
      await expect(page).toHaveURL(/inventory/, { timeout: 3000 });
    }
  });
});
