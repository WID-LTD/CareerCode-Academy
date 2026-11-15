# Production Checklist

## Payment acceptance
- [x] Checkout redirects to the provider before treating a course as enrolled.
- [x] Provider verification checks reference, status, amount and currency.
- [x] Safe status polling after returning from the provider.
- [x] Hourly reconciliation for pending payments.
- [x] Refunds call the provider and revoke access.
- [ ] Complete one real Paystack test purchase end to end.
- [ ] Complete one real Flutterwave test purchase end to end.
- [ ] Confirm receipt email and enrollment after each live purchase.

## Access and routing
- [x] Logged-in users visiting `/login` or `/signup` are redirected to their role dashboard.
- [x] All course enrollments cleared for the current test cycle.
- [ ] Re-test trial start, course access and expiry after the next enrollment cycle.

## Teaching quality
- [x] Beginner, intermediate and advanced course pages load.
- [x] All 461 lessons have notes.
- [x] All 461 lessons have published quizzes.
- [x] All 35 published courses have learning outcomes and projects.
- [ ] Human review of one beginner, one intermediate and one advanced course.

## Voice and GiGo
- [x] Aura-2 text-to-speech verified directly with punctuation.
- [ ] Authenticated in-app voice test with a real student account.
- [ ] Authenticated video/document upload test with a real student account.

## Guides and support
- [x] Public `/guide` page.
- [x] Guided tour with arrow pointers.
- [x] GiGo coach on the student dashboard.
- [x] Bug report and client error telemetry.
