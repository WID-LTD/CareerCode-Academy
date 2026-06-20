import { test, expect, Page } from '@playwright/test';

const API = process.env.API_URL || 'http://localhost:5000/api/v1';

// ─── Mocks for browser APIs that can't run in test ───
async function mockBrowserApis(page: Page) {
  // Mock getUserMedia (camera) — return a fake MediaStream from a canvas
  await page.addInitScript(() => {
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
      if (constraints?.video) {
        const canvas = Object.assign(document.createElement('canvas'), { width: 320, height: 240 });
        const stream = canvas.captureStream(30);
        return stream;
      }
      return origGetUserMedia(constraints);
    };

    // Mock getDisplayMedia (screen share)
    navigator.mediaDevices.getDisplayMedia = async () => {
      const canvas = Object.assign(document.createElement('canvas'), { width: 1280, height: 720 });
      const stream = canvas.captureStream(10);
      return stream;
    };

    // Mock Fullscreen API
    document.documentElement.requestFullscreen = async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => document.documentElement,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    };

    document.exitFullscreen = async () => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        get: () => null,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    };

    // Mock Picture-in-Picture
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      configurable: true,
      get: () => true,
    });
    HTMLVideoElement.prototype.requestPictureInPicture = async function () {
      // no-op — cannot create real PiP window in test
    };

    // Prevent FaceLandmarker WASM from loading (too slow / not available)
    // The hook will still set cameraReady=true when the camera stream starts
    // because the WASM part is inside startCamera() which is async
  });
}

// ─── Seed test data via API ───
interface SeedData {
  student: { id: string; email: string };
  admin: { id: string; email: string };
  course: { id: string };
  exam: { id: string };
  attempt: { id: string };
  password: string;
}

async function seed(): Promise<SeedData> {
  const res = await fetch(`${API}/test/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const json = await res.json();
  if (!json.success) throw new Error(`Seed failed: ${JSON.stringify(json)}`);
  return json.data;
}

async function cleanup(): Promise<void> {
  await fetch(`${API}/test/cleanup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
}

test.describe('Exam Proctoring E2E', () => {
  let seedData: SeedData;

  async function loginAs(page: any, email: string, password: string, expectedUrlPattern: RegExp) {
    await page.goto('/login');
    await page.waitForSelector('#email', { timeout: 10000 });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(expectedUrlPattern, { timeout: 20000 });
  }

  test.beforeAll(async () => {
    seedData = await seed();
    console.log('Seed data:', JSON.stringify(seedData));
  });

  test.afterAll(async () => {
    await cleanup();
  });

  test('full proctoring flow: wizard → record → submit → admin sees recording', async ({ browser }) => {
    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await mockBrowserApis(studentPage);
    const apiResponses: string[] = [];

    // Intercept recording upload API call
    studentPage.route('**/upload-recording', async (route) => {
      apiResponses.push('upload-recording');
      await route.continue();
    });

    // ── 1. Login as student and navigate to exam ──
    await loginAs(studentPage, seedData.student.email, seedData.password, /\/student\/dashboard/);
    await studentPage.goto(`/student/exams/${seedData.exam.id}`);
    await studentPage.waitForTimeout(3000);

    // ── 2. Wizard Step 1: Rules ──
    await expect(studentPage.locator('text=Exam Rules').first()).toBeVisible({ timeout: 10000 });
    await studentPage.click('button:has-text("Accept")');
    await studentPage.waitForTimeout(1000);

    // ── 3. Wizard Step 2: Camera ──
    await expect(studentPage.locator('text=Camera').first()).toBeVisible({ timeout: 10000 });
    await expect(studentPage.locator('text=active').first()).toBeVisible({ timeout: 10000 });
    await studentPage.click('button:has-text("Continue")');
    await studentPage.waitForTimeout(1000);

    // ── 4. Wizard Step 3: Fullscreen + Screen Share ──
    await expect(studentPage.locator('text=Permission Check').first()).toBeVisible({ timeout: 10000 });
    await studentPage.click('button:has-text("Enter Fullscreen")');
    await studentPage.waitForTimeout(1000);
    await studentPage.click('button:has-text("Share Screen")');
    await studentPage.waitForTimeout(1000);
    await studentPage.click('button:has-text("Start Exam")');
    await studentPage.waitForTimeout(3000);

    // ── 5. Answer a question ──
    await expect(studentPage.locator('text=E2E test').first()).toBeVisible({ timeout: 10000 });
    await studentPage.locator('label').first().click();
    await studentPage.waitForTimeout(500);

    // ── 6. Submit the exam ──
    await studentPage.click('button:has-text("Submit")');
    await studentPage.waitForTimeout(1000);
    // Confirm submit dialog if present
    const confirmBtn = studentPage.locator('button:has-text("Confirm")');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      await studentPage.waitForTimeout(3000);
    }

    // ── 7. Verify recording was uploaded ──
    expect(apiResponses).toContain('upload-recording');

    // ── 8. Login as admin and check monitor ──
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    await loginAs(adminPage, seedData.admin.email, seedData.password, /\/admin\/dashboard/);
    await adminPage.goto('/admin/exams/monitor');
    await adminPage.waitForTimeout(3000);

    // ── 9. Switch to History tab ──
    const historyTab = adminPage.locator('button:has-text("History")');
    if (await historyTab.isVisible()) {
      await historyTab.click();
      await adminPage.waitForTimeout(2000);
    }

    // ── 10. Verify the recording appears ──
    await expect(adminPage.locator(`text=${seedData.student.email}`).first()).toBeVisible({ timeout: 10000 });
    await expect(adminPage.locator('video')).toBeVisible({ timeout: 5000 });

    await studentCtx.close();
    await adminCtx.close();
  });
});
