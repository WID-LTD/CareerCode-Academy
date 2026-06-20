# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: exam-proctoring.spec.ts >> Exam Proctoring E2E >> full proctoring flow: wizard → record → submit → admin sees recording
- Location: e2e\exam-proctoring.spec.ts:91:3

# Error details

```
TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
=========================== logs ===========================
waiting for navigation until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e6]:
      - link "Go to homepage" [ref=e7] [cursor=pointer]:
        - /url: /
        - img "CareerCode Logo" [ref=e9]
        - generic [ref=e10]: CareerCode
      - list [ref=e11]:
        - listitem [ref=e12] [cursor=pointer]: Home
        - listitem [ref=e13] [cursor=pointer]: Courses
        - listitem [ref=e14] [cursor=pointer]: Pricing
        - listitem [ref=e15] [cursor=pointer]: Community
        - listitem [ref=e16] [cursor=pointer]: Teach
        - listitem [ref=e17] [cursor=pointer]: Blog
        - listitem [ref=e18] [cursor=pointer]: About
        - listitem [ref=e19] [cursor=pointer]: Contact
      - generic [ref=e20]:
        - button "Switch to dark mode" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
        - generic [ref=e24]:
          - link "Sign In" [ref=e25] [cursor=pointer]:
            - /url: /login
            - button "Sign In" [ref=e26]
          - link "Get Started" [ref=e27] [cursor=pointer]:
            - /url: /signup
            - button "Get Started" [ref=e28]
  - main [ref=e29]:
    - generic [ref=e33]:
      - generic [ref=e34]:
        - link "CareerCode" [ref=e35] [cursor=pointer]:
          - /url: /
          - img [ref=e37]
          - generic [ref=e41]: CareerCode
        - heading "Welcome Back" [level=1] [ref=e42]
        - paragraph [ref=e43]: Sign in to continue your learning journey.
      - generic [ref=e44]:
        - generic [ref=e45]:
          - generic [ref=e46]:
            - generic [ref=e47]: Email
            - generic [ref=e48]:
              - generic:
                - img
              - textbox "Email" [ref=e49]:
                - /placeholder: you@example.com
                - text: e2e-student-1781857897680@test.local
          - generic [ref=e50]:
            - generic [ref=e51]: Password
            - generic [ref=e52]:
              - generic:
                - img
              - textbox "Password" [ref=e53]:
                - /placeholder: Enter your password
                - text: dummy
              - button "Show password" [ref=e55] [cursor=pointer]:
                - img [ref=e56]
          - generic [ref=e59]:
            - generic [ref=e60] [cursor=pointer]:
              - checkbox "Remember me" [ref=e61]
              - generic [ref=e62]: Remember me
            - link "Forgot password?" [ref=e63] [cursor=pointer]:
              - /url: /forgot-password
          - button "Sign In" [ref=e64] [cursor=pointer]
        - generic [ref=e69]: or continue with
        - generic [ref=e70]:
          - button "Sign in with GitHub" [disabled]:
            - img
            - text: GitHub
          - button "Sign in with Twitter" [disabled]:
            - img
            - text: Twitter
      - paragraph [ref=e71]:
        - text: Don't have an account?
        - link "Create one" [ref=e72] [cursor=pointer]:
          - /url: /signup
  - contentinfo [ref=e73]:
    - generic [ref=e74]:
      - generic [ref=e75]:
        - generic [ref=e76]:
          - link "CareerCode Logo CareerCode" [ref=e77] [cursor=pointer]:
            - /url: /
            - img "CareerCode Logo" [ref=e79]
            - generic [ref=e80]: CareerCode
          - paragraph [ref=e81]: Empowering the next generation of developers with industry-focused, project-based learning. Transform your career with hands-on coding experience and expert mentorship.
          - generic [ref=e82]:
            - link "GitHub" [ref=e83] [cursor=pointer]:
              - /url: "#"
              - img [ref=e84]
            - link "Twitter" [ref=e87] [cursor=pointer]:
              - /url: "#"
              - img [ref=e88]
            - link "LinkedIn" [ref=e90] [cursor=pointer]:
              - /url: "#"
              - img [ref=e91]
            - link "YouTube" [ref=e95] [cursor=pointer]:
              - /url: "#"
              - img [ref=e96]
        - generic [ref=e99]:
          - heading "Platform" [level=3] [ref=e100]
          - list [ref=e101]:
            - listitem [ref=e102]:
              - link "Courses" [ref=e103] [cursor=pointer]:
                - /url: /courses
            - listitem [ref=e104]:
              - link "Pricing" [ref=e105] [cursor=pointer]:
                - /url: /pricing
            - listitem [ref=e106]:
              - link "Community" [ref=e107] [cursor=pointer]:
                - /url: /community
            - listitem [ref=e108]:
              - link "Blog" [ref=e109] [cursor=pointer]:
                - /url: /blog
            - listitem [ref=e110]:
              - link "FAQ" [ref=e111] [cursor=pointer]:
                - /url: /faq
        - generic [ref=e112]:
          - heading "Company" [level=3] [ref=e113]
          - list [ref=e114]:
            - listitem [ref=e115]:
              - link "About" [ref=e116] [cursor=pointer]:
                - /url: /about
            - listitem [ref=e117]:
              - link "Teach on CareerCode" [ref=e118] [cursor=pointer]:
                - /url: /become-instructor
            - listitem [ref=e119]:
              - link "Careers" [ref=e120] [cursor=pointer]:
                - /url: /careers
            - listitem [ref=e121]:
              - link "Contact" [ref=e122] [cursor=pointer]:
                - /url: /contact
            - listitem [ref=e123]:
              - link "Partners" [ref=e124] [cursor=pointer]:
                - /url: /partners
            - listitem [ref=e125]:
              - link "Press" [ref=e126] [cursor=pointer]:
                - /url: /press
        - generic [ref=e127]:
          - heading "Support" [level=3] [ref=e128]
          - list [ref=e129]:
            - listitem [ref=e130]:
              - link "Help Center" [ref=e131] [cursor=pointer]:
                - /url: /help
            - listitem [ref=e132]:
              - link "Terms of Service" [ref=e133] [cursor=pointer]:
                - /url: /terms
            - listitem [ref=e134]:
              - link "Privacy Policy" [ref=e135] [cursor=pointer]:
                - /url: /privacy
            - listitem [ref=e136]:
              - link "Cookie Policy" [ref=e137] [cursor=pointer]:
                - /url: /cookies
            - listitem [ref=e138]:
              - link "Accessibility" [ref=e139] [cursor=pointer]:
                - /url: /accessibility
      - generic [ref=e141]:
        - generic [ref=e142]:
          - generic [ref=e143]:
            - img [ref=e144]
            - text: hello@careercode.academy
          - generic [ref=e147]:
            - img [ref=e148]
            - text: San Francisco, CA
          - generic [ref=e151]:
            - img [ref=e152]
            - text: +1 (555) 123-4567
        - paragraph [ref=e154]: © 2026 CareerCode Academy. All rights reserved.
```

# Test source

```ts
  10  | 
  11  |     navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
  12  |       if (constraints?.video) {
  13  |         const canvas = Object.assign(document.createElement('canvas'), { width: 320, height: 240 });
  14  |         const stream = canvas.captureStream(30);
  15  |         return stream;
  16  |       }
  17  |       return origGetUserMedia(constraints);
  18  |     };
  19  | 
  20  |     // Mock getDisplayMedia (screen share)
  21  |     navigator.mediaDevices.getDisplayMedia = async () => {
  22  |       const canvas = Object.assign(document.createElement('canvas'), { width: 1280, height: 720 });
  23  |       const stream = canvas.captureStream(10);
  24  |       return stream;
  25  |     };
  26  | 
  27  |     // Mock Fullscreen API
  28  |     document.documentElement.requestFullscreen = async () => {
  29  |       Object.defineProperty(document, 'fullscreenElement', {
  30  |         configurable: true,
  31  |         get: () => document.documentElement,
  32  |       });
  33  |       document.dispatchEvent(new Event('fullscreenchange'));
  34  |     };
  35  | 
  36  |     document.exitFullscreen = async () => {
  37  |       Object.defineProperty(document, 'fullscreenElement', {
  38  |         configurable: true,
  39  |         get: () => null,
  40  |       });
  41  |       document.dispatchEvent(new Event('fullscreenchange'));
  42  |     };
  43  | 
  44  |     // Mock Picture-in-Picture
  45  |     Object.defineProperty(document, 'pictureInPictureEnabled', {
  46  |       configurable: true,
  47  |       get: () => true,
  48  |     });
  49  |     HTMLVideoElement.prototype.requestPictureInPicture = async function () {
  50  |       // no-op — cannot create real PiP window in test
  51  |     };
  52  | 
  53  |     // Prevent FaceLandmarker WASM from loading (too slow / not available)
  54  |     // The hook will still set cameraReady=true when the camera stream starts
  55  |     // because the WASM part is inside startCamera() which is async
  56  |   });
  57  | }
  58  | 
  59  | // ─── Seed test data via API ───
  60  | interface SeedData {
  61  |   student: { id: string; email: string };
  62  |   admin: { id: string; email: string };
  63  |   course: { id: string };
  64  |   exam: { id: string };
  65  |   attempt: { id: string };
  66  | }
  67  | 
  68  | async function seed(): Promise<SeedData> {
  69  |   const res = await fetch(`${API}/test/seed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  70  |   const json = await res.json();
  71  |   if (!json.success) throw new Error(`Seed failed: ${JSON.stringify(json)}`);
  72  |   return json.data;
  73  | }
  74  | 
  75  | async function cleanup(): Promise<void> {
  76  |   await fetch(`${API}/test/cleanup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  77  | }
  78  | 
  79  | test.describe('Exam Proctoring E2E', () => {
  80  |   let seedData: SeedData;
  81  | 
  82  |   test.beforeAll(async () => {
  83  |     seedData = await seed();
  84  |     console.log('Seed data:', JSON.stringify(seedData));
  85  |   });
  86  | 
  87  |   test.afterAll(async () => {
  88  |     await cleanup();
  89  |   });
  90  | 
  91  |   test('full proctoring flow: wizard → record → submit → admin sees recording', async ({ browser }) => {
  92  |     const studentCtx = await browser.newContext();
  93  |     const studentPage = await studentCtx.newPage();
  94  |     await mockBrowserApis(studentPage);
  95  |     const apiResponses: string[] = [];
  96  | 
  97  |     // Intercept recording upload API call
  98  |     studentPage.route('**/upload-recording', async (route) => {
  99  |       apiResponses.push('upload-recording');
  100 |       await route.continue();
  101 |     });
  102 | 
  103 |     // ── 1. Login as student ──
  104 |     await studentPage.goto('/login');
  105 |     await studentPage.waitForTimeout(2000);
  106 |     // Click the login form and fill in credentials
  107 |     await studentPage.fill('input[name="email"], input[type="email"], input[placeholder*="email" i]', seedData.student.email);
  108 |     await studentPage.fill('input[name="password"], input[type="password"]', 'dummy');
  109 |     await studentPage.click('button[type="submit"]');
> 110 |     await studentPage.waitForURL(/\/student\/dashboard/, { timeout: 15000 });
      |                       ^ TimeoutError: page.waitForURL: Timeout 15000ms exceeded.
  111 | 
  112 |     // ── 2. Navigate to the exam ──
  113 |     await studentPage.goto(`/student/exams/${seedData.exam.id}`);
  114 |     await studentPage.waitForTimeout(3000);
  115 | 
  116 |     // ── 3. Wizard Step 1: Rules ──
  117 |     // Wait for the wizard to appear (first step shows exam rules)
  118 |     await expect(studentPage.locator('text=Exam Rules').first()).toBeVisible({ timeout: 10000 });
  119 |     // Click "Accept & Continue" or similar
  120 |     await studentPage.click('button:has-text("Accept")');
  121 |     await studentPage.waitForTimeout(1000);
  122 | 
  123 |     // ── 4. Wizard Step 2: Camera ──
  124 |     await expect(studentPage.locator('text=Face Detection').first()).toBeVisible({ timeout: 10000 });
  125 |     // Wait until camera becomes ready (should be fast with mocked stream)
  126 |     await expect(studentPage.locator('text=active').first()).toBeVisible({ timeout: 10000 });
  127 |     await studentPage.click('button:has-text("Continue")');
  128 |     await studentPage.waitForTimeout(1000);
  129 | 
  130 |     // ── 5. Wizard Step 3: Fullscreen + Screen Share ──
  131 |     await expect(studentPage.locator('text=Permission Check').first()).toBeVisible({ timeout: 10000 });
  132 |     await studentPage.click('button:has-text("Enter Fullscreen")');
  133 |     await studentPage.waitForTimeout(1000);
  134 |     await studentPage.click('button:has-text("Share Screen")');
  135 |     await studentPage.waitForTimeout(1000);
  136 |     // Click "Start Exam"
  137 |     await studentPage.click('button:has-text("Start Exam")');
  138 |     await studentPage.waitForTimeout(3000);
  139 | 
  140 |     // ── 6. Answer a question ──
  141 |     await expect(studentPage.locator('text=Test question').first()).toBeVisible({ timeout: 10000 });
  142 |     // Click the first answer option
  143 |     await studentPage.locator('label').first().click();
  144 |     await studentPage.waitForTimeout(500);
  145 | 
  146 |     // ── 7. Submit the exam ──
  147 |     await studentPage.click('button:has-text("Submit")');
  148 |     // Confirm submit dialog
  149 |     await studentPage.click('button:has-text("Confirm")');
  150 |     await studentPage.waitForTimeout(3000);
  151 | 
  152 |     // ── 8. Verify recording was uploaded ──
  153 |     expect(apiResponses).toContain('upload-recording');
  154 | 
  155 |     // ── 9. Log in as admin and check monitor ──
  156 |     const adminCtx = await browser.newContext();
  157 |     const adminPage = await adminCtx.newPage();
  158 |     await adminPage.goto('/login');
  159 |     await adminPage.waitForTimeout(2000);
  160 |     await adminPage.fill('input[name="email"], input[type="email"], input[placeholder*="email" i]', seedData.admin.email);
  161 |     await adminPage.fill('input[name="password"], input[type="password"]', 'dummy');
  162 |     await adminPage.click('button[type="submit"]');
  163 |     await adminPage.waitForURL(/\/admin\/dashboard/, { timeout: 15000 });
  164 | 
  165 |     // ── 10. Navigate to Exam Monitor ──
  166 |     await adminPage.goto('/admin/exams/monitor');
  167 |     await adminPage.waitForTimeout(3000);
  168 | 
  169 |     // ── 11. Switch to History tab ──
  170 |     const historyTab = adminPage.locator('button:has-text("History")');
  171 |     if (await historyTab.isVisible()) {
  172 |       await historyTab.click();
  173 |       await adminPage.waitForTimeout(2000);
  174 |     }
  175 | 
  176 |     // ── 12. Verify the recording appears in the table ──
  177 |     await expect(adminPage.locator(`text=${seedData.student.email}`).first()).toBeVisible({ timeout: 10000 });
  178 |     // Verify a video element exists for playback
  179 |     await expect(adminPage.locator('video')).toBeVisible({ timeout: 5000 });
  180 | 
  181 |     await studentCtx.close();
  182 |     await adminCtx.close();
  183 |   });
  184 | });
  185 | 
```