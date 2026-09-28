import { test, expect, Page } from '@playwright/test';

const API = process.env.API_URL || 'https://api.careercode.com.ng/api/v1';
const EMAIL = process.env.GUIDED_EMAIL;
const PASSWORD = process.env.GUIDED_PASSWORD;

test.describe('Guided Mode — deployed', () => {
  test.skip(!EMAIL || !PASSWORD, 'Set GUIDED_EMAIL and GUIDED_PASSWORD to run this suite.');
  test.setTimeout(180000);

  async function dismissTours(page: Page) {
    for (let i = 0; i < 5; i++) {
      if (!(await page.getByRole('dialog').count())) break;
      const skip = page.getByRole('dialog').getByRole('button', { name: 'Skip' }).last();
      if (!(await skip.count())) break;
      await skip.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }

  async function login(page: Page) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#email', { timeout: 30000 });
    await dismissTours(page);
    await page.fill('#email', EMAIL!);
    await page.fill('#password', PASSWORD!);
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/student\/dashboard/, { timeout: 90000 });
    await dismissTours(page);
  }

  function extractSlugs(groups: any[]): string[] {
    const slugs: string[] = [];
    for (const g of groups || []) {
      const zones = g?.zones || {};
      for (const level of ['beginner', 'intermediate', 'advanced']) {
        const slug = zones?.[level]?.path?.slug;
        if (slug) slugs.push(slug);
      }
    }
    return slugs;
  }

  test('#1 — path-list page renders a real Start target (BUG CHECK)', async ({ page }) => {
    await login(page);
    await page.goto('/student/guided/', { waitUntil: 'domcontentloaded' });
    await dismissTours(page);

    await expect(page.getByRole('heading', { name: 'Guided Mode' })).toBeVisible({ timeout: 60000 });

    const startButtons = page.getByRole('button', { name: /Start/i });
    const startCount = await startButtons.count();
    console.log(`[guided] Start buttons rendered: ${startCount}`);
    expect(startCount, 'path list should render at least one Start button').toBeGreaterThan(0);

    await startButtons.first().click();
    await page.waitForTimeout(3000);
    const url = page.url();
    console.log(`[guided] URL after clicking first Start: ${url}`);
    expect(url, 'Start button must navigate to a real slug, not "undefined"').not.toContain('/guided/undefined');
  });

  test('#2 — full guided loop via a real slug', async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('requestfailed', (r) => failedRequests.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`));

    await login(page);

    let groupedJson: any = null;
    for (let attempt = 0; attempt < 3 && !groupedJson; attempt++) {
      try {
        const groupedRes = await page.request.get(`${API}/learning-paths/grouped-by-school`, { timeout: 60000 });
        groupedJson = await groupedRes.json().catch(() => null);
      } catch (e: any) {
        console.log(`[guided] grouped-by-school attempt ${attempt + 1} failed: ${e?.message || e}`);
        await page.waitForTimeout(5000);
      }
    }
    const slugs = extractSlugs(groupedJson?.data || []);
    console.log(`[guided] discovered ${slugs.length} slug(s): ${slugs.join(', ') || 'none'}`);
    test.skip(slugs.length === 0, 'No learning paths available to run the guided loop.');

    const slug = slugs[0];
    console.log(`[guided] entering loop with slug: ${slug}`);
    await page.goto(`/student/guided/${slug}`, { waitUntil: 'domcontentloaded' });
    await dismissTours(page);

    const complete = page.getByText(/Pathway complete!/i);
    const dayText = page.getByText(/Day \d+ of \d+/);
    await expect(dayText.or(complete).first()).toBeVisible({ timeout: 90000 });
    if (await complete.isVisible().catch(() => false)) {
      console.log('[guided] path already complete — nothing to mark.');
      return;
    }
    console.log(`[guided] progress: ${(await dayText.first().innerText()).match(/Day \d+ of \d+/)?.[0]}`);

    // Course + lessons render
    await expect(page.locator('h2').first()).toBeVisible({ timeout: 30000 });

    // Mark a lesson done (if any remain)
    const done = page.getByRole('button', { name: 'Done' });
    const doneCount = await done.count();
    console.log(`[guided] lessons with "Done" remaining: ${doneCount}`);
    if (doneCount > 0) {
      await done.first().click();
      await page.waitForTimeout(3000);
      console.log('[guided] clicked first "Done" lesson');
      await expect(
        dayText.or(page.getByText(/Pathway complete!/i)).first()
      ).toBeVisible({ timeout: 30000 });
    }

    // Daily check-in
    if (await page.getByText('Checked in today').first().isVisible().catch(() => false)) {
      console.log('[guided] already checked in today — skipping form.');
    } else {
      await page.getByRole('spinbutton', { name: 'Blocks completed today' }).fill('4');
      await page.getByRole('combobox', { name: 'Productivity' }).selectOption({ label: '4 / 5' });
      await page.getByRole('combobox', { name: 'Energy' }).selectOption({ label: '4 / 5' });
      const checkinBtn = page.getByRole('button', { name: 'Check-in' });
      for (let attempt = 0; attempt < 4; attempt++) {
        const checkinRespProm = page.waitForResponse((r) => r.url().includes('/guided/checkin'));
        await checkinBtn.click();
        const checkinResp = await checkinRespProm.catch(() => null);
        const body = checkinResp ? await checkinResp.json().catch(() => null) : null;
        console.log(`[guided] checkin attempt ${attempt + 1} — status ${checkinResp?.status} body ${JSON.stringify(body)}`);
        if (body?.message && String(body.message).toLowerCase().includes('initializing')) {
          await page.waitForTimeout(10000);
          continue;
        }
        break;
      }
      const checkinVisible = await expect(
        page.getByText(/Checked in today/).or(page.getByText(/Logged!/)).first()
      ).toBeVisible({ timeout: 30000 }).then(() => true).catch(() => false);
      expect.soft(checkinVisible, 'daily check-in should succeed on the deployed app').toBe(true);
      console.log(`[guided] check-in ${checkinVisible ? 'OK' : 'FAILED (503 schema bug)'}`);
    }

    // Pause / Resume
    const pauseBtn = page.getByRole('button', { name: 'Pause' });
    if (await pauseBtn.isVisible().catch(() => false)) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await pauseBtn.click();
        try {
          await expect(page.getByText('Guided Mode is paused')).toBeVisible({ timeout: 15000 });
          break;
        } catch {
          console.log(`[guided] pause attempt ${attempt + 1} — retrying`);
          await page.waitForTimeout(10000);
        }
      }
      console.log('[guided] paused OK');
      await page.getByRole('button', { name: 'Resume' }).click();
      await expect(page.getByText('Guided Mode is paused')).toBeHidden({ timeout: 20000 });
      console.log('[guided] resumed OK');
    }

    // Gate quiz (if present)
    const takeQuiz = page.getByRole('button', { name: 'Take Quiz' });
    if (await takeQuiz.isVisible().catch(() => false)) {
      await takeQuiz.click();
      await page.waitForURL(/\/student\/quiz\//, { timeout: 30000 });
      console.log(`[guided] gate quiz opened: ${page.url()}`);
    }

    console.log(`[guided] console errors: ${consoleErrors.length}`);
    consoleErrors.forEach((e) => console.log(`  [console-error] ${e}`));
    console.log(`[guided] failed requests: ${failedRequests.length}`);
    failedRequests.forEach((e) => console.log(`  [request-failed] ${e}`));
  });
});