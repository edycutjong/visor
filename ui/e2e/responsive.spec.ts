import { test, expect } from '@playwright/test';

const viewports = [
  { width: 375, height: 667, name: 'Mobile (iPhone SE)' },
  { width: 768, height: 1024, name: 'Tablet (iPad Mini)' },
  { width: 1440, height: 900, name: 'Desktop (1080p)' }
];

test.describe('Visor Responsive Layout Checks', () => {
  for (const vp of viewports) {
    test(`should render correctly on ${vp.name}`, async ({ page }) => {
      // Set viewport size
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Navigate
      await page.goto('/');

      // Check header title is visible
      await expect(page.getByText("Maria's Secure Booking Console")).toBeVisible();

      // Verify page layout doesn't overflow horizontally
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(overflow).toBe(false);

      // Verify the footer status bar or main layout components are accessible
      await expect(page.locator('body')).toBeVisible();
    });
  }
});
