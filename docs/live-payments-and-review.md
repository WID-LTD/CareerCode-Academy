# Live labs, payments, coupons and project review

## Live labs
- Meeting link: `https://meet.google.com/dwn-crnc-exi`
- All live-session events use Google Meet.
- Events are visible only to enrolled students in paid courses (`courses.price > 0`).
- Reminders run from the 15-minute cron at:
  - 2 days before
  - 1 day before
  - 1 hour 30 minutes before
  - 1 hour before
- Each reminder is written to `live_reminder_log`, then sent as an in-app notification, web push and email.
- Duplicate reminders are prevented by the `(event_id, user_id, window)` primary key.

## Payments
- `paid_enrollment_enabled` was disabled in production. It is now enabled.
- Paystack health: ready.
- Flutterwave health: ready. Live keys were replaced and both provider initializations returned a hosted payment link.
- Health endpoint: `GET /api/v1/payments/gateways/health`.

## Coupons
- Admin page: `/admin/coupons`
- API: `GET/POST/PUT/DELETE /api/v1/admin/coupons`
- Supports percent or fixed amount, whole catalogue / one course / one pathway, max uses and expiry.
- Checkout validates admin coupons and XP discount codes.

## Project review and analytics
- Instructor page: `Submissions → Projects`
- API: `GET /api/v1/instructor/project-submissions`
- Review API: `PUT /api/v1/instructor/project-submissions/:id/review`
- Admin analytics: `/admin/project-analytics`
- Analytics include submissions, GitHub verified, needs-work, reviewed, average score, by course and common failed checks.

## GitHub
- The supplied token `3312ab...` was rejected by GitHub (`Bad credentials`), so it was removed.
- Verification now falls back to the public GitHub API if a token is rejected.
- Set a valid `GITHUB_TOKEN` secret later to raise rate limits.
