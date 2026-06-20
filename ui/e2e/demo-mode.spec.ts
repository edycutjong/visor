import { test, expect } from '@playwright/test';

test.describe('Visor Smoke Tests (Demo Mode)', () => {
  test('should load the dashboard and verify key layout elements', async ({ page }) => {
    // 1. Visit the home page
    await page.goto('/');

    // 2. Check title
    await expect(page).toHaveTitle(/Visor/);

    // 3. Check for main booking console heading
    await expect(page.getByText("Maria's Secure Booking Console")).toBeVisible();

    // 4. Check that Sandbox Simulator mode is active by default or toggleable
    await expect(page.getByText("SANDBOX SIMULATOR")).toBeVisible();

    // 5. Check template items are loaded
    await expect(page.getByText("Clinical Intake Agent")).toBeVisible();
    await expect(page.getByText("Job Application ATS Agent")).toBeVisible();
  });
});
