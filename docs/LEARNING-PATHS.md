# Learning-path commerce

Learners can enrol in a path for free, pay for the whole path in one checkout,
or pay for a single course.

## Data

- `learning_paths.bundle_price`, `bundle_discount_percent`, `enrollment_mode`,
  `bundle_enabled`, `is_published`.
- `learning_path_enrollments.status` (`active`, `pending_payment`).
- `payment_courses` stores the per-course allocation of a bundle payment so
  instructor payouts remain correct.
- View `instructor_revenue` unifies single-course and bundle revenue.

## Endpoints

- `GET /api/v1/learning-paths/:slug` — courses + pricing (owned, bundle,
  savings).
- `GET /api/v1/learning-paths/:slug/pricing`
- `POST /api/v1/learning-paths/:slug/enroll` — `{ mode: 'free' | 'all' }`.
  `all` returns `402` with a checkout URL when paid courses remain.
- `POST /api/v1/learning-paths/:slug/checkout` — one gateway payment.
- `POST /api/v1/learning-paths/:slug/courses/:courseId/enroll` — single course.
- Admin: `GET/POST/PUT /api/v1/admin/learning-paths`, add/remove/reorder courses.

## Pricing

If `bundle_price` is set, it is used (prorated when the learner already owns
some courses). Otherwise `bundle_discount_percent` is applied to the unpaid
list price. Checkout supports XP discount codes.

Payment verification and webhooks enrol every course in `payment_courses`,
activate the path enrolment and generate To-Do tasks. Refunds are recorded on
the payment; admin refund handling can revoke access if required.
