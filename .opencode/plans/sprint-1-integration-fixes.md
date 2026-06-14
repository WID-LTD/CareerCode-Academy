# Sprint 1: Frontend↔Backend Integration Fixes

**Estimate:** 2 days | **Risk:** Low | **Dependencies:** None

**Goal:** All 12 admin pages load real backend data without console errors.

---

## Task 1.1: Add Response Mapping Utility in adminStore.ts

### What
Add `normalizeId()` and `normalizeList()` functions that transform PostgreSQL flat responses into the nested `_id`-based format the frontend pages expect.

### Mapping Rules
| Backend (flat) | Frontend (nested) | Reason |
|---|---|---|
| `id` | `_id` | All 34 page references use `_id` for keys, selections, API calls |
| `user_name`, `user_email`, `user_id` | `user: { name, email, _id }` | Pages access `payment.user?.name`, `ticket.user_name` |
| `course_title`, `course_id` | `course: { title, _id }` | Pages access `payment.course?.title` |
| `instructor_name`, `instructor_id` | `instructor: { name, _id }` | Pages access `course.instructor?.name` |
| `admin_name`, `admin_id` | `admin: { name, _id }` | Pages access `log.admin_name` |
| `amount` (string) | `amount` (number) | `.toFixed()` crashes on strings |
| `revoked` (boolean) | `is_revoked` (alias) | Pages check `cert.is_revoked` |
| `verification_code` | `certificateId` (alias) | Pages reference `cert.certificateId` |

### File Changes
- `frontend/src/store/adminStore.ts`
  - Add `normalizeId()` function (~30 lines)
  - Add `normalizeList()` wrapper
  - Apply `normalizeList()` to all fetch method responses (13 methods)

### Verification
- Open each admin page → no "X is not a function" or "Cannot read properties of undefined" errors
- User table rows selectable, checkboxes work
- Payment amounts display with 2 decimal places

---

## Task 1.2: Add 3 Missing Backend Routes

### Route 1: `POST /admin/users/:id/reset-password`
| Item | Detail |
|------|--------|
| **Called by** | `adminStore.resetUserPassword(id)` |
| **Current** | 404 Not Found |
| **Implementation** | Generate random password, hash it, update user, return success (or send email if mailer active) |
| **File** | `backend/src/routes/admin.routes.ts` |

### Route 2: `POST /admin/payments/:id/refund`
| Item | Detail |
|------|--------|
| **Called by** | `adminStore.refundPayment(id)` |
| **Current** | 404 Not Found |
| **Implementation** | Update payment status → 'refunded', optionally notify user |
| **File** | `backend/src/routes/admin.routes.ts` |

### Route 3: `PUT /admin/applications/:id/request-changes`
| Item | Detail |
|------|--------|
| **Called by** | `adminStore.requestChangesApplication(id, notes)` |
| **Current** | 404 Not Found |
| **Implementation** | Set status → 'pending', add review notes, same pattern as approve/reject |
| **File** | `backend/src/routes/admin.routes.ts` |

---

## Task 1.3: Enhance Dashboard Backend with Real Queries

### What
The dashboard route currently returns 6 stats fields. Upgrade it to return 11 stats fields + 4 chart arrays + 2 activity arrays.

### New Stats Queries
| Field | SQL |
|-------|-----|
| `pendingApplications` | `SELECT COUNT(*) FROM instructor_applications WHERE status = 'pending'` |
| `draftCourses` | `SELECT COUNT(*) FROM courses WHERE published = false` |
| `activeUsers` | `SELECT COUNT(*) FROM users WHERE is_suspended = false OR is_suspended IS NULL` |
| `certificatesIssued` | `SELECT COUNT(*) FROM certificates` |

### New Chart Data Queries
| Array | SQL |
|-------|-----|
| `enrollmentTrend` | `SELECT DATE_TRUNC('month', enrolled_at)::date as month, COUNT(*) as enrollments FROM enrollments WHERE enrolled_at > NOW() - INTERVAL '6 months' GROUP BY month ORDER BY month` |
| `userRegistrationTrend` | `SELECT DATE(created_at) as day, COUNT(*) as users FROM users WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY day ORDER BY day` |
| `topCourses` | `SELECT c.title, COUNT(e.id) as enrollments FROM courses c LEFT JOIN enrollments e ON c.id = e.course_id GROUP BY c.id, c.title ORDER BY enrollments DESC LIMIT 5` |
| `recentActivities` | `SELECT al.*, u.name as admin_name FROM audit_logs al JOIN users u ON al.admin_id = u.id ORDER BY al.created_at DESC LIMIT 10` |

### File
- `backend/src/routes/admin.routes.ts` — update `GET /dashboard` handler

---

## Task 1.4: Add Audit Logging Middleware

### What
Create middleware that auto-log insert/update/delete operations by admin users to the `audit_logs` table.

### Implementation
```typescript
// backend/src/middleware/audit.ts
export async function logAudit(params: {
  adminId: string;
  action: string;       // 'create' | 'update' | 'delete' | 'suspend' | 'approve' | 'reject'
  resourceType: string; // 'user' | 'course' | 'application' | 'payment' | etc.
  resourceId: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await query(
    `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [params.adminId, params.action, params.resourceType, params.resourceId, params.details, params.ipAddress, params.userAgent]
  );
}
```

### Integration
Call `logAudit()` in every admin mutation route (approx 15 routes):
- User: suspend, reactivate, delete, role change
- Course: approve, reject, archive, feature, delete
- Application: approve, reject, request changes
- Payment: refund
- Certificate: revoke, reissue
- Ticket: close, reopen, assign

### File
- `backend/src/middleware/audit.ts` — new file
- `backend/src/routes/admin.routes.ts` — add audit calls to all mutation routes

---

## Task 1.5: Add Socket.IO Notification Push

### What
When a notification is created (via `NotificationModel.createNotification()`), emit a Socket.IO event to the target user's room.

### Implementation
In `backend/src/index.ts`, export the `io` instance. In notification routes, after creating a notification:
```typescript
import { io } from '../index';
io.to(userId).emit('new_notification', notification);
```

### File
- `backend/src/index.ts` — ensure `io` is exported
- `backend/src/routes/admin.routes.ts` — add emit when notifications are created (application approve, role change, etc.)

---

## Files Changed Summary

| File | Change Type | Lines |
|------|-------------|-------|
| `frontend/src/store/adminStore.ts` | Edit — add normalize functions + apply to fetches | +50 |
| `backend/src/routes/admin.routes.ts` | Edit — add 3 routes, enhance dashboard, add audit calls | +100 |
| `backend/src/middleware/audit.ts` | **New** — audit logging function | +30 |
| `backend/src/index.ts` | Edit — export `io` for use in routes | +1 |

**Total:** ~180 lines across 4 files

---

## Verification Checklist

- [ ] Admin Dashboard loads without errors — all 10 stat cards show numbers, 4 charts render
- [ ] Admin Users loads user list, search works, role filter works, suspend/reactivate works
- [ ] Admin Applications loads, approve/reject modals work
- [ ] Admin Courses loads, approve/reject/archive/feature actions work
- [ ] Admin Payments loads, refund button works
- [ ] Admin Certificates loads, revoke/reissue works
- [ ] Admin Tickets loads, reply/close/reopen works
- [ ] Admin Broadcasts loads, send broadcast works
- [ ] Admin Audit Log loads, search works
- [ ] Admin Analytics loads with real data
- [ ] Admin Settings loads
- [ ] `npm run build` passes on both frontend and backend
