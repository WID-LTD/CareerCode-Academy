# CareerCode Academy — Phased Implementation Roadmap

> **Status:** Analysis complete. ~70% of Phase 1–2 features exist in codebase.
> **Current focus:** Fix integration gaps between frontend stores and backend before adding new features.

---

## Inventory: What Already Exists

### Backend (48 source files)
| Layer | Count | Details |
|-------|-------|---------|
| Models | 14 | user, course, lesson, module, enrollment, payment, certificate, quiz, review, submission, assignment, forum, notification, token |
| Routes | 22 | 100+ endpoints covering auth, courses, admin, instructor, student, forum, quizzes, payments, notifications, certificates, blogs, reviews, assignments, progress, search, wishlists |
| Middleware | 4 | auth (JWT + RBAC), errorHandler, validate (Zod), upload (multer + cloud) |
| DB Tables | 32+ | All core tables created in index.ts with full indexes |
| Real-time | Socket.IO | Rooms per user, messaging events |

### Frontend (89 source files)
| Layer | Count | Details |
|-------|-------|---------|
| Pages | 52+ | Home, student (11), instructor (13), admin (12), public (16) |
| Components | 22 | Layout (6), UI primitives (8), home sections (6), student widgets (7) |
| Stores | 9 | auth, student, admin, instructor, instructorExtended, course, wishlist, chat, theme |
| Hooks | 1 | useAuth (auth + navigation + toast) |

---

## Phase 1: Core Foundation

**Current completion:** ~80%

### 1.1 RBAC (Role-Based Access Control)
**Status:** ✅ Complete — authenticate middleware, authorize() factory, role column on users table, all routes gated
**Remaining:** Super admin should have additional privileges beyond admin (e.g., delete any user, manage other admins). Currently `authorize('admin', 'super_admin')` treats them identically.

### 1.2 Dashboard Layout
**Status:** ✅ Complete — DashboardLayout, Sidebar (collapsible, role-aware), Navbar, Footer, BottomNav (student mobile), AnimatePresence transitions

### 1.3 Authentication Guards
**Status:** ✅ Complete — JWT access + refresh tokens, login/register/logout, password reset flow, email verification flow, auto-refresh on 401, role-based post-login redirect via `useAuth` hook

### 1.4 User Management
**Status:** 80% — Missing pieces:
- **Profile page polish:** student/Profile.tsx exists but needs real data binding to `PUT /auth/profile`
- **User search/filter:** backend `/admin/users` now supports `search` and `role` params, frontend implements filter UI
- **Bulk actions:** frontend selects users but backend has no bulk suspend/delete endpoints

| Item | Details |
|------|---------|
| **Backend** | `GET /admin/users` (search/role/pagination), `PUT /users/:id/role`, `DELETE /users/:id`, `PUT /users/:id/suspend`, `PUT /users/:id/reactivate` |
| **Frontend** | `admin/Users.tsx` — table with search, role filter, sort, pagination, bulk select, confirm modals |
| **Gaps** | No bulk operations endpoint; `resetUserPassword` store action calls `POST /admin/users/:id/reset-password` which doesn't exist |
| **Complexity** | Low — 1 missing route + minor store fix |

### 1.5 Audit Logs
**Status:** 75% — Missing:
- **Auto-logging:** Currently no middleware auto-logs admin actions. Must manually insert audit_logs in each route.
- **Dashboard integration:** Recent activities on dashboard should pull from audit_logs

| Item | Details |
|------|---------|
| **DB** | `audit_logs` table exists (id, admin_id, action, resource_type, resource_id, details, ip_address, user_agent) |
| **Backend** | `GET /admin/audit-logs` exists with pagination |
| **Frontend** | `admin/AuditLog.tsx` — table with search |
| **Gaps** | No audit middleware; actions not logged from routes |
| **Complexity** | Medium — create audit middleware, wire into all admin mutation routes |

### 1.6 Notifications
**Status:** 70% — Missing:
- **System-level triggers:** Notifications are created manually in some routes (application approval, role change) but not for others (enrollment, course publish, payment)
- **Notification types:** `certificate`, `enrollment`, `payment`, `progress`, `system` types exist in constraint but aren't used everywhere
- **Real-time push:** Socket.IO could push new notifications (currently no server → client notification emission)

| Item | Details |
|------|---------|
| **DB** | `notifications` table (types: info, success, warning, error, enrollment, payment, progress, certificate, system) |
| **Backend** | CRUD routes: `GET /`, `PUT /:id/read`, `PUT /read-all`, `DELETE /:id` |
| **Frontend** | NotificationsBell component, student Notifications page, admin Broadcasts page |
| **Gaps** | No Socket.IO push for live notifications |
| **Complexity** | Low — add io.emit in notification create routes |

---

## Phase 2: Academic Management

**Current completion:** ~75%

### 2.1 Instructor Applications
**Status:** 85% — Missing:
- **Qualifications/message fields:** Frontend page references `qualifications` and `message` fields but DB table only has `bio` and `motivation`
- **Request changes workflow:** Store has `requestChangesApplication` action calling `PUT /admin/applications/:id/request-changes` — route doesn't exist

| Item | Details |
|------|---------|
| **DB** | `instructor_applications` table (full_name, email, phone, country, etc.) |
| **Backend** | `GET /applications`, `PUT /applications/:id/approve`, `PUT /applications/:id/reject`, `PUT /applications/:id` (generic) — approve auto-creates/upgrades user + sends email |
| **Frontend** | `admin/Applications.tsx` — tab filter, review cards, approve/reject modal with notes |
| **Gaps** | No `request-changes` route; frontend references missing DB columns |
| **Complexity** | Low — 1 missing route + minor field alignment |

### 2.2 Course Approval Workflow
**Status:** 70% — Missing:
- **Course status lifecycle:** Current model has `published` (boolean) and we added `status` (string). But there's no workflow: `draft → pending_review → approved → published`
- **Review notes:** Admin can add notes when approving/rejecting (route exists) but UI isn't connected for courses

| Item | Details |
|------|---------|
| **DB** | `courses` table with `status` (VARCHAR, added via migration) and `featured` columns |
| **Backend** | `PUT /courses/:id/approve`, `/reject`, `/archive`, `/feature` exist |
| **Frontend** | `admin/Courses.tsx` — tab filter (draft/published/archived), category filter, approve/reject/archive/feature/delete actions |
| **Gaps** | No `pending_review` status in flow; frontend doesn't show review notes input for courses |
| **Complexity** | Medium — update course status lifecycle in routes, add review notes modal to frontend |

### 2.3 Course Management
**Status:** 80% — Missing:
- **Course editor polish:** `instructor/CourseEditor.tsx` exists but may need content management (lessons, modules, resources)
- **Category management:** Categories are free-text strings, no taxonomy

| Item | Details |
|------|---------|
| **DB** | `courses`, `modules`, `lessons`, `resources` tables fully defined |
| **Backend** | Full CRUD for courses, lessons, modules, resources + admin moderation routes |
| **Frontend** | instructor CourseEditor, ManageCourses; admin Courses; public CourseDetails; student CourseView |
| **Gaps** | No category taxonomy; no drag-and-drop lesson reordering |
| **Complexity** | Medium |

### 2.4 Enrollment Management
**Status:** 85% — Missing:
- **Enrollment export:** Backend route exists (`POST /admin/enrollments/export`), frontend not implemented
- **Enrollment trends:** Dashboard needs enrollment trend data

| Item | Details |
|------|---------|
| **DB** | `enrollments` table with status (active/completed/cancelled), progress, completed_lessons |
| **Backend** | `GET /enrollments`, `PATCH /enrollments/:id`, `POST /enrollments/export` |
| **Frontend** | Admin enrollment export not connected; dashboard shows mock trend data |
| **Gaps** | Export not wired to UI; dashboard trend data is placeholder |
| **Complexity** | Low |

---

## Phase 3: Business Operations

**Current completion:** ~50%

### 3.1 Payment Management
**Status:** 70% — Missing:
- **Refund flow:** Store calls `POST /admin/payments/:id/refund` — route doesn't exist
- **Payment webhook handling:** Route exists but may need reconciliation logic
- **Manual payment support:** Provider includes 'manual' in constraint but no flow for it

| Item | Details |
|------|---------|
| **DB** | `payments` table (amount, currency, provider, reference, status, metadata) |
| **Backend** | `POST /initialize`, `GET /verify/:reference`, `POST /webhook`, `GET /history`, `GET /admin/payments`, `GET /admin/revenue` |
| **Frontend** | `admin/Payments.tsx` — stats cards, charts, table with search/export, refund button (UI only) |
| **Gaps** | No refund route; payment amount stored as string in DB (PostgreSQL DECIMAL) |
| **Complexity** | Medium — 1 missing route + webhook reconciliation |

### 3.2 Revenue Analytics
**Status:** 50% — Missing:
- **Dashboard charts:** Revenue over time, enrollment trends, top courses, user registrations — all using mock data
- **Date range filtering:** Backend should accept `startDate`/`endDate` params for revenue queries
- **Export functionality:** No CSV/PDF export for revenue reports

| Item | Details |
|------|---------|
| **DB** | Revenue data queryable from payments + enrollments tables |
| **Backend** | `GET /admin/revenue` (summary, monthly, by course, by provider) plus dashboard stats |
| **Frontend** | `admin/Dashboard.tsx` — stat cards, charts (enrollment trend, monthly revenue, user registrations, top courses); `admin/Analytics.tsx` — existing page with period filter |
| **Gaps** | Dashboard charts use fallback data; no date range filtering on analytics backend |
| **Complexity** | Medium — enrich dashboard route with real queries, wire to frontend |

### 3.3 Certificates
**Status:** 85% — Missing:
- **Auto-issuance:** Route `POST /certificates/auto` exists but may not trigger on course completion
- **Bulk operations:** No bulk revoke/reissue

| Item | Details |
|------|---------|
| **DB** | `certificates` table (revoked, revoked_at, expires_at added via migration) |
| **Backend** | `GET /admin/certificates`, `PUT /:id/revoke`, `PUT /:id/reissue`, `GET /verify/:code`, `POST /` (issue), `POST /auto` |
| **Frontend** | `admin/Certificates.tsx` — search, revoke/reissue with confirmation modal |
| **Gaps** | Minor — auto-issuance might need progress route integration |
| **Complexity** | Low |

### 3.4 Reporting
**Status:** 0% — Not started
- **Currently no reporting module**

| Item | Details |
|------|---------|
| **Backend needed** | `GET /admin/reports/enrollments`, `/revenue`, `/users`, `/courses` with date range + format (JSON/CSV) params |
| **Frontend needed** | Reporting page with date pickers, chart previews, export buttons |
| **Complexity** | High — new feature end-to-end |

---

## Phase 4: Support & Communication

**Current completion:** ~50%

### 4.1 Support Ticket System
**Status:** 70% — Missing:
- **User-facing ticket creation:** No ticket submission for students/instructors
- **Ticket reply notifications:** No notification when admin replies

| Item | Details |
|------|---------|
| **DB** | `support_tickets`, `ticket_replies` tables |
| **Backend** | `GET /admin/tickets`, `POST /:id/reply`, `PUT /:id/close|reopen|assign` |
| **Frontend** | `admin/Tickets.tsx` — split-pane layout, reply/close/reopen/assign |
| **Gaps** | No student-facing ticket submission UI or route; no new-reply notification |
| **Complexity** | Medium — new user-facing route + UI + notification integration |

### 4.2 Announcements
**Status:** 60% — Missing:
- **Admin broadcast system:** Backend routes exist, admin Broadcasts page exists, but no dashboard integration
- **Scheduled broadcasts:** Backend supports `scheduled_at` but no cron job to send them
- **Audience filtering:** Broadcast stores audience type but no logic to actually filter recipients

| Item | Details |
|------|---------|
| **DB** | `broadcasts` table (title, message, audience, type, status, scheduled_at, sent_at) |
| **Backend** | `GET /admin/broadcasts`, `POST /admin/broadcasts` |
| **Frontend** | `admin/Broadcasts.tsx` — composer with title/message/audience/type/schedule, history table |
| **Gaps** | No scheduled broadcast worker; no actual delivery mechanism to users |
| **Complexity** | High — need delivery worker + user notification creation on broadcast send |

### 4.3 Messaging
**Status:** 60% — Missing:
- **Socket.IO integration:** Works for instructor messaging but student→instructor messaging not implemented
- **Read receipts:** `direct_messages` has `is_read` but no unread count API

| Item | Details |
|------|---------|
| **DB** | `direct_messages` table (sender_id, receiver_id, content, is_read) |
| **Backend** | `GET /instructor/messages/conversations`, `GET /messages/:userId`, `POST /messages` with Socket.IO emit |
| **Frontend** | `instructor/Messages.tsx`; chat store with socket connection |
| **Gaps** | No student messaging page; no conversation list for students |
| **Complexity** | Medium — add student messaging routes + frontend page |

### 4.4 Email Campaigns
**Status:** 10% — Missing:
- **Mailer is suppressed:** Currently all email sending is disabled (no-op mailer)
- **No campaign management:** No templates, scheduling, or analytics

| Item | Details |
|------|---------|
| **Backend** | Resend SDK configured but suppressed; helper functions for verification/welcome/approval emails |
| **Gaps** | Mailer needs reactivation; no campaign CRUD; no email template system |
| **Complexity** | High — new feature + infrastructure |

---

## Phase 5: Advanced Intelligence

**Current completion:** ~5%

### 5.1 Real-time Monitoring
**Status:** Not started
- Socket.IO exists for messaging but no admin monitoring dashboard

### 5.2 Automation Engine
**Status:** Not started
- No scheduled jobs, no webhook automation, no course publish scheduling

### 5.3 AI Assistant
**Status:** Frontend only — `AIStudyAssistant.tsx` is a mock chatbot UI with hardcoded responses. No backend AI integration.

### 5.4 Predictive Analytics
**Status:** Not started
- No machine learning, no trend forecasting, no student dropout prediction

---

## Recommended Implementation Order

Based on dependency analysis and existing codebase maturity:

### Sprint 1: Integration Fixes (Current → ~2 days)
**Why first:** Fix the broken wires between frontend stores and backend so the existing 70% of code actually works.

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 1.1 | Add `normalizeId` mapping in adminStore to fix `id`/`_id` and nested object mismatches | `adminStore.ts` | None |
| 1.2 | Add missing backend routes: `POST /admin/users/:id/reset-password`, `POST /admin/payments/:id/refund`, `PUT /admin/applications/:id/request-changes` | `admin.routes.ts` | None |
| 1.3 | Enhance dashboard backend with real queries for enrollmentTrend, userRegistrationTrend, topCourses, pendingApplications, draftCourses, activeUsers, certificatesIssued | `admin.routes.ts`, `dashboard` route | 1.2 |
| 1.4 | Add audit logging middleware and wire into all admin mutation routes | `audit.middleware.ts` (new), `admin.routes.ts` | None |
| 1.5 | Add Socket.IO notification push when notifications are created | `notification.routes.ts`, `index.ts` | None |

**Risk:** Low — minimal new code, mostly fixing existing
**Deliverable:** All 12 admin pages load real data without errors

### Sprint 2: Academic Workflow Completion (~3 days)
**Why second:** Core academic features (courses, enrollments, applications) are the platform's value proposition.

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 2.1 | Implement course status lifecycle (`draft → pending_review → approved → published`) | `course.model.ts`, admin course routes | Sprint 1 |
| 2.2 | Add course review notes modal to admin Courses page | `admin/Courses.tsx` | 2.1 |
| 2.3 | Wire enrollment export to admin UI (download CSV) | `admin/EnrollmentExport.tsx` (new) | Sprint 1 |
| 2.4 | Add `qualifications` and `message` fields to instructor_applications table | `index.ts` migration | None |
| 2.5 | Add category taxonomy — create `categories` table, add CRUD routes, update course creation to use it | `category.model.ts`, `category.routes.ts`, course routes | None |

**Risk:** Low-Medium — course lifecycle touches multiple routes
**Deliverable:** Course approval workflow works end-to-end with status tracking

### Sprint 3: Business Operations (~3 days)
**Why third:** Revenue and certificate features unlock the business value.

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 3.1 | Implement refund route + payment reconciliation on webhook | `payment.routes.ts`, `admin.routes.ts` | Sprint 1 |
| 3.2 | Add date range filtering to revenue analytics backend | `admin.routes.ts` revenue route | None |
| 3.3 | Wire real dashboard data (charts no longer show fallback) | `adminStore.ts` dashboard fetch | 3.2 |
| 3.4 | Add certificate auto-issuance verification (ensure `POST /certificates/auto` fires on course completion) | `progress.routes.ts`, `certificate.routes.ts` | None |
| 3.5 | Build reporting page with date pickers, chart previews, CSV/JSON export | `admin/Reports.tsx` (new), `admin.routes.ts` | 3.2 |

**Risk:** Medium — payment reconciliation can have edge cases
**Deliverable:** Revenue dashboard shows real data; certificate issuance works end-to-end

### Sprint 4: Support & Communication (~3 days)
**Why fourth:** Community features enhance retention but aren't critical for launch.

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 4.1 | Add student-facing ticket submission (new route + UI) | `ticket.routes.ts` (new student route), `student/Tickets.tsx` (new) | Sprint 1 |
| 4.2 | Add notification on ticket reply (Socket.IO + in-app) | `admin.routes.ts` ticket reply route | Sprint 1.5 |
| 4.3 | Implement broadcast delivery worker (creates user notifications on broadcast send) | `broadcast.worker.ts` (new), `admin.routes.ts` | Sprint 1 |
| 4.4 | Add student messaging page (conversation list, send/receive) | `student/Messages.tsx` (new), `user.routes.ts` | Sprint 1 |
| 4.5 | Un-suppress mailer, verify email delivery through Resend | `mailer.ts` | None |

**Risk:** Medium — mailer reactivation could expose configuration issues
**Deliverable:** Students can submit tickets; broadcast notifications reach users; email sending works

### Sprint 5: Advanced Intelligence (~5 days)
**Why last:** High effort, lower priority for initial launch.

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 5.1 | Build admin real-time monitoring dashboard (active users, page views, API latency, error rates) | `admin/Monitoring.tsx` (new), Socket.IO events | Sprint 1 |
| 5.2 | Create automation engine — scheduled course publishing, certificate auto-issue on completion, enrollment expiration | `cron/` (new dir), `automation.routes.ts` | Sprint 2, 3 |
| 5.3 | Integrate AI Assistant with backend (LLM API for course recommendations, study help) | `ai.routes.ts` (new), `ai.service.ts` (new) | Sprint 1 |
| 5.4 | Add predictive analytics — churn prediction, course completion forecasting | `analytics.service.ts` (new) | Sprint 3 |

**Risk:** High — unproven features with external dependencies
**Deliverable:** AI-powered assistant with real recommendations; admin monitoring dashboard

---

## Dependency Graph

```
Sprint 1 (Integration Fixes)
  ├── Sprint 2 (Academic Workflow)
  │     ├── Sprint 3 (Business Operations)
  │     │     ├── Sprint 4 (Support & Communication)
  │     │     └── Sprint 5 (Advanced Intelligence)
  │     └── Sprint 5 (needs course lifecycle)
  └── Sprint 4 (needs working notifications & store)
  └── Sprint 5 (needs working stores & routes)
```

Sprint 1 is the critical path — nothing works reliably without fixing frontend↔backend integration.

---

## Complexity Estimates

| Sprint | Total Est. | Files Changed | Risk Level |
|--------|-----------|---------------|------------|
| Sprint 1: Integration Fixes | 2 days | ~10 files | Low |
| Sprint 2: Academic Workflow | 3 days | ~15 files | Low-Med |
| Sprint 3: Business Operations | 3 days | ~12 files | Medium |
| Sprint 4: Support & Communication | 3 days | ~15 files | Medium |
| Sprint 5: Advanced Intelligence | 5 days | ~20 files | High |

**Total:** ~16 days for full implementation

---

## Immediate Next Step (Sprint 1.1)

The highest-impact starting point is fixing the frontend store → backend integration. Specifically:

1. Add `normalizeId`/`normalizeList` utility in `adminStore.ts` to map backend `id`→`_id`, build nested user/course/instructor objects, convert amount types, add field aliases
2. Apply normalization in all 13 fetch methods
3. Add 3 missing routes: `POST /admin/users/:id/reset-password`, `POST /admin/payments/:id/refund`, `PUT /admin/applications/:id/request-changes`
4. Verify all admin pages load without console errors on real backend data

**Do not proceed to Sprint 2 until Sprint 1 is verified working end-to-end.**
