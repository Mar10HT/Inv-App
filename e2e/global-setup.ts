import { chromium, type FullConfig } from '@playwright/test';
import { loginAsAdmin, AUTH_FILE } from './fixtures';
import path from 'path';
import fs from 'fs';

/**
 * Runs once before all tests.
 * Logs in as admin and saves the browser storage state so every spec
 * can reuse the session without repeating the login UI flow.
 */
async function globalSetup(config: FullConfig) {
  // Ensure the directory exists
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Global setup runs outside the test runner, so it doesn't automatically
  // inherit the `use.baseURL` from playwright.config.ts — page.goto('/login')
  // would otherwise try to navigate to the literal string "/login" and fail.
  const baseURL = config.projects[0]?.use?.baseURL;

  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await loginAsAdmin(page);
  await context.storageState({ path: AUTH_FILE });

  await browser.close();
}

export default globalSetup;
