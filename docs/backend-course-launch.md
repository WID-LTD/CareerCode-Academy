# Backend Engineering Course Launch

## Instructor
- Thomas Jhon — existing verified instructor account (`wizzyboy756@gmail.com`).
- The requested `wizzy756@gmail.com` was not present in D1. The existing Thomas account was used so the courses appear in his instructor dashboard immediately.

## Market research (Nigeria, 2026)
Sources reviewed:
- Classes.ng backend development listing: ₦200,000–₦500,000, average about ₦333,300.
- Tekhub NG Backend Development (Node.js): ₦155,000 for a 3-month onsite programme.
- Mindgrid Academy: backend/cloud live cohorts ₦400,000; self-paced certifications from ₦50,000.
- Univelcity: backend classes from ₦300,000.
- AltSchool Africa: nano-diplomas from about ₦45,000; diplomas about $290.
- Utiva: bootcamps $300–$500.

## Recommended pricing
| Course | Level | Lessons | Price |
| --- | --- | --- | --- |
| Backend Development Foundations with Node.js | Beginner | 12 | ₦95,000 |
| Backend APIs & Databases with Node.js | Intermediate | 12 | ₦165,000 |
| Advanced Backend Engineering & System Design | Advanced | 13 | ₦245,000 |
| Backend Engineering Mastery pathway | Bundle | 37 | ₦425,000 |

The bundle saves ₦80,000 compared with buying the three courses separately (₦505,000).

Positioning: mid-market between low-cost self-paced courses and ₦300k–₦500k live cohorts. The price reflects video lessons, written notes, quizzes, coding challenges, assignments, a portfolio project and GiGo AI feedback on screenshots and screen recordings.

## Video sources
- Beginner: The Net Ninja — Node.js Crash Course (12 videos).
- Intermediate: The Net Ninja — REST API Tutorials (Node, Express & Mongo).
- Advanced: Hussein Nasser — Backend Engineering (Advanced/Intermediate selections).

Each lesson records `reference_source`, a YouTube URL and a 3-question quiz. Every quiz answer is based on the video's chapters/topics.

## Course assets
- 37 lessons, 37 quizzes, 111 quiz questions.
- 17 coding challenges (JavaScript, Piston-compatible stdin tests).
- 9 assignments with tools, instructions and submission expectations.
- Per-lesson resources with download links and setup guidance.
- Branded course covers stored in R2.

## Payment gateways
- Paystack and Flutterwave secrets are both configured in the production worker.
- `GET /api/v1/payments/gateways` reports both as configured.
- Checkout only renders gateways reported as live.

## Student support
- New `/student/lab` Guided Lab lists assignments and challenges.
- GiGo can analyse screenshots and screen-recording frames through `POST /api/v1/ai/vision` (vision model → text model pipeline).

## Email
- Recommendation email sent to `amarachifavour897@gmail.com` with the beginner course and the full pathway, pricing rationale, expectations and start steps.
