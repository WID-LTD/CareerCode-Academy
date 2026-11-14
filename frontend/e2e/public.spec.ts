import { test, expect } from '@playwright/test';

test('home page loads with the brand', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CareerCode/i);
  await expect(page.locator('body')).toContainText(/CareerCode/i);
});

test('course catalogue loads', async ({ page }) => {
  await page.goto('/courses');
  await expect(page.locator('body')).toContainText(/courses/i);
  await expect(page.locator('a[href*="/courses/"]').first()).toBeVisible();
});

test('trial campaign page loads', async ({ page }) => {
  await page.goto('/trial');
  await expect(page.locator('body')).toContainText(/trial/i);
});

test('community page loads', async ({ page }) => {
  await page.goto('/community');
  await expect(page.locator('body')).toContainText(/community/i);
});

test('contact page has a form', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('form')).toBeVisible();
  await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
});

test('API health is reachable', async ({ request }) => {
  const response = await request.get('https://api.careercode.com.ng/health');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
});
