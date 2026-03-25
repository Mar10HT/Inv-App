import { chromium } from '@playwright/test';
import { loginAsAdmin, AUTH_FILE } from './fixtures';
import path from 'path';
import fs from 'fs';

/**
 * Runs once before all tests.
 * Logs in as admin and saves the browser storage state so every spec
 * can reuse the session without repeating the login UI flow.
 */
async function globalSetup() {
  // Ensure the directory exists
  const dir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await loginAsAdmin(page);
  await page.context().storageState({ path: AUTH_FILE });

  await browser.close();
}

export default globalSetup;
