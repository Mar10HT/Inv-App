import { test as base, expect } from '@playwright/test';
import path from 'path';

// Path where the authenticated session state is stored
export const AUTH_FILE = path.join(__dirname, '../.playwright/auth.json');

/**
 * Extended test fixture that provides an already-authenticated page.
 * Uses storageState so the login UI flow runs only once (global setup),
 * not before every single test.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await use(page);
  },
});

export { expect };

/**
 * Perform a full UI login and return once the dashboard is visible.
 * Used in global-setup.ts to generate the saved session.
 */
export async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'password123');
  await page.getByRole('button', { name: /login|iniciar/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}
