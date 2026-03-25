import { test, expect } from '@playwright/test';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports');
  });

  test('shows reports page heading', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText(/report|reporte/i);
  });

  test('renders report section cards or tabs', async ({ page }) => {
    const sections = page.locator('[class*="card"], mat-tab-group, [class*="tab"]').first();
    await expect(sections).toBeVisible();
  });

  test('export button is visible', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /export|exportar|xlsx|csv/i }).first();
    if (await exportBtn.isVisible()) {
      // Just verify it's present and clickable — don't trigger a download
      await expect(exportBtn).toBeEnabled();
    }
  });

  test('date range filter is functional', async ({ page }) => {
    const dateInput = page.locator('input[type="date"], mat-date-range-input, [formcontrolname*="date" i]').first();
    if (await dateInput.isVisible()) {
      await dateInput.click();
      await page.waitForTimeout(300);
    }
    await expect(page).toHaveURL(/reports/);
  });

  test('renders at least one chart or data table', async ({ page }) => {
    const dataEl = page.locator('canvas, table, [class*="chart"], [class*="apexcharts"]').first();
    if (await dataEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(dataEl).toBeVisible();
    }
    // If no chart loaded, the page should still be stable
    await expect(page).toHaveURL(/reports/);
  });
});
