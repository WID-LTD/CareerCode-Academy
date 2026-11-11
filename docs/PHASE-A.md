# Phase A — stabilisation & media migration

Date: 2026-11-10

## Fixed

| Issue | Fix |
|---|---|
| Course locked while enrolled | `CourseView` now calls `GET /enrollments/course/:courseId` instead of scanning page 1 of `/enrollments`; empty modules no longer lock the next one |
| `payments/initialize` 409 | Idempotent: already-enrolled returns `200 { alreadyEnrolled, course_slug }` |
| `/courses/:id/announcements` 404 | Ported (list + instructor POST) |
| `/student/assignments` 404 | Ported with pagination |
| `/student/mentoring-slots` 404 | Ported: list, book, my bookings (+ notification + emails) |
| `/student/tickets` 404 | Student aliases added |
| `/student/messages/*` | Ported: conversations, thread, send, read, read-all, delete |
| Instructor application `NOT NULL full_name` | Multipart is parsed; resume/profile images upload to R2; receipt email |
| Instructor course creation | Native `POST/PUT/DELETE /courses`, publish/unpublish/archive, duplicate, lessons |
| Admin users | `POST /admin/users` (invite email), real per-user role picker, role-change email + deep link |
| Live role switch | `RoleWatcher` polls `/auth/me` every 60 s and on focus, redirects to the new dashboard |
| Tiptap duplicate underline | Removed the extra extension (StarterKit already provides it) |
| Exam camera AbortError | Separate refs for the two `<video>` elements; safe `play()`; tracks no longer stopped by step changes |
| Uploads | Shared parser accepts multipart, JSON base64 or external URL; `/upload`, `/videos/upload`, `/resources`, applications all work |
| Email | Brevo removed; one sender (Cloudflare Email binding) with templates for verification, welcome, reset, role change, application, enrollment, mentorship, invoice |

## Media migration (applied)

- **32 Unsplash thumbnails → R2** (`career-code-academy`), DB rewritten
- **64 base64 transcripts (1.35 MB) → R2** `.txt`, DB rewritten
- 1 dead Unsplash URL replaced with a generated branded placeholder
- `media_assets` records source URL, hash, size, licence
- Result: **0 external image hotlinks, 0 data-URIs in D1**
- Script: `scripts/media/migrate-to-r2.cjs` (dry-run by default, idempotent)

## PWA

- `manifest.webmanifest`, 192/512/maskable + apple-touch icons
- Service worker: app-shell precache, navigation network-first with offline
  fallback, hashed assets cache-first; API and exam WASM are never cached
- Install prompt (7-day dismissal) and "new version" banner
- iOS meta tags, `viewport-fit=cover`

## Verified

- 120/120 local route checks (real Hono app against seeded SQLite)
- Live sweep: every new endpoint 200/201, multipart application 201,
  idempotent payment 200, PWA assets served with correct MIME types
- 0 external course images, 0 base64 resources

## Email (done)

- Cloudflare Email Service only — **Brevo and Resend removed everywhere**
- `careercode.com.ng` onboarded as a sending domain (SPF, DKIM, DMARC auto-published)
- Worker binding `send_email` (`EMAIL`), sender `noreply@careercode.com.ng`
- Verified end-to-end: `POST /admin/email-test` returns
  `{ok:true, provider:"cloudflare", id:"…@careercode.com.ng"}`
- Details: `docs/EMAIL.md`

## Open

1. ~~Transactional email provider~~ — resolved (Cloudflare Email Service).
2. Background Web Push (tab closed) still needs VAPID + subscription table.
3. Full media UX (gallery uploads, image resizing) and portfolio templates are
   Phase C.
4. Jobs scraping, GiGo AI, Turnstile, 2FA, settings persistence remain in the
   master plan.
