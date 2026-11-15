import { test, expect } from '@playwright/test';

const courses = [
  ['beginner', 'backend-development-foundations-nodejs', 'Backend Development Foundations with Node.js'],
  ['intermediate', 'backend-apis-databases-nodejs', 'Backend APIs & Databases with Node.js'],
  ['advanced', 'advanced-backend-engineering-system-design', 'Advanced Backend Engineering & System Design'],
] as const;

for (const [level, slug, title] of courses) {
  test(`${level} course page is teachable and complete`, async ({ page }) => {
    await page.goto(`/courses/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toContainText(title);
    await expect(page.locator('body')).toContainText(/What you'll learn/i);
    await expect(page.locator('body')).not.toContainText(/Learning outcomes will be added soon/i);
    await expect(page.locator('body')).toContainText(/Start 7-day free trial/i);
    await expect(page.locator('body')).toContainText(/Curriculum/i);
    await expect(page.locator('body')).not.toContainText(/Course Instructor/i);
  });
}
