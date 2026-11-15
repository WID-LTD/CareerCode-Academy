import { test, expect } from '@playwright/test';

// Visual gates for the public surfaces. Baselines are generated with:
//   npx playwright test e2e/visual.spec.ts --update-snapshots
// CI runs without --update-snapshots and fails on unexpected layout changes.
for (const [name, path] of [
  ['home', '/'],
  ['courses', '/courses'],
  ['trial', '/trial'],
  ['contact', '/contact'],
] as const) {
  test(`visual: ${name}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    if (path === '/courses') {
      await page.locator('a[href*="/courses/"]').first().waitFor({ timeout: 20000 });
    }
    await page.waitForTimeout(1200);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      animations: 'disabled',
      timeout: 20000,
    });
  });
}
