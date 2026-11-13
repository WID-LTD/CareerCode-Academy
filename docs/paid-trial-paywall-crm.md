# Paid access, trial, GiGo paywall and CRM

## Trial
- Default 7 days.
- Campaign: 13 November 2026 to 20 November 2026.
- One trial per learner by default.
- Admin can edit global settings and per-user/per-course trials.
- Trial progress is preserved after expiry.
- Expired trials are hidden from My Courses and course access checks.

## Paid access
- All published courses have a price above zero.
- No free course enrollment on the dashboard.
- Paid enrollment keeps lifetime access unless revoked or refunded.

## GiGo paywall
- Customer care, account, payment, consultation and platform questions are allowed.
- Course help and course recommendations without entitlement return a paywall block.
- Paywall block includes course, price, trial and purchase links.
- Paywall attempts are intended to be logged in `gigo_access_log`.

## Admin CRM
- Admin Users drawer shows only enrolled courses.
- Per course: access type, trial days remaining, progress, grant paid access, extend trial, set custom end date, revoke.
- Trial settings page: `/admin/trial-settings`.
- APIs: `/api/v1/admin/crm/*`.

## Campaign
- Landing page: `/trial`.
- Email sent to 66 active users with valid non-test email addresses.
- Subject: “One week. Any course. Build something real.”
- Campaign tracking link uses `utm_source=email`, `utm_medium=international_education_week`, `utm_campaign=free_trial`.
