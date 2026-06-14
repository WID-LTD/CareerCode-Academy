# Admin Dashboard Production Readiness Plan

## Phase A: Frontend Store Response Mapping (adminStore.ts)

### 1. Add `normalizeId` / `normalizeList` utility
A mapping function that transforms backend responses to match frontend interfaces:
- `id` → `_id` (for PostgreSQL → MongoDB convention compatibility)
- Flat `user_name` / `user_email` / `user_id` → nested `user: { name, email, _id }`
- Flat `course_title` / `course_id` → nested `course: { title, _id }`
- Flat `instructor_name` / `instructor_id` → nested `instructor: { name, _id }`
- Flat `admin_name` / `admin_id` → nested `admin: { name, _id }`
- String `amount` → `Number(amount)`
- `revoked` → `is_revoked` alias
- `featured` → `is_featured` alias
- `verification_code` → `certificateId` alias

### 2. Apply in every fetch method
Add `normalizeList()` call in all 13 fetch methods:
- `fetchDashboardData` — normalize `d.recentUsers`, `d.recentPayments`
- `fetchUsers` — normalize response data
- `fetchApplications` — normalize response data
- `fetchCourses` — normalize response data
- `fetchPayments` — normalize response data
- `fetchCertificates` — normalize response data
- `fetchTickets` — normalize response data
- `fetchBroadcastNotifications` — normalize response data
- `fetchAuditLogs` — normalize response data

## Phase B: Backend Dashboard Enhancement (admin.routes.ts)

### 1. Add missing stats queries
```sql
-- pendingApplications
SELECT COUNT(*) FROM instructor_applications WHERE status = 'pending'

-- draftCourses
SELECT COUNT(*) FROM courses WHERE published = false

-- activeUsers
SELECT COUNT(*) FROM users WHERE is_suspended = false OR is_suspended IS NULL

-- certificatesIssued
SELECT COUNT(*) FROM certificates
```

### 2. Add enrollmentTrend (last 6 months)
```sql
SELECT DATE_TRUNC('month', enrolled_at)::date as month,
       COUNT(*) as enrollments
FROM enrollments
WHERE enrolled_at > NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', enrolled_at)
ORDER BY month
```

### 3. Add userRegistrationTrend (last 7 days)
```sql
SELECT DATE(created_at) as day, COUNT(*) as users
FROM users
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY day
```

### 4. Add topCourses (top 5 by enrollment)
```sql
SELECT c.title, COUNT(e.id) as enrollments
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title
ORDER BY enrollments DESC
LIMIT 5
```

### 5. Add recentActivities (last 10 audit logs)
```sql
SELECT al.*, u.name as admin_name
FROM audit_logs al
JOIN users u ON al.admin_id = u.id
ORDER BY al.created_at DESC
LIMIT 10
```

## Phase C: Backend Model Fixes

### 1. user.ts — update `getAllUsers` SELECT to include `is_suspended`
Current: `'SELECT id, name, email, role, avatar, bio, is_verified, created_at, updated_at FROM users...'`
New: Add `is_suspended` to the field list.

### 2. course.ts — update `getAllCourses` SELECT
The current query uses `c.*` which will auto-include `featured` and `status` columns after migration ALTER TABLE runs.

### 3. payment.ts — convert amount to number in query
Option: use `CAST(amount AS FLOAT8)` or handle in JS. The store will handle this via `normalizeId`.

## Files to Modify
1. `frontend/src/store/adminStore.ts` — add normalize functions, update fetch methods
2. `backend/src/routes/admin.routes.ts` — add dashboard stats queries
3. `backend/src/models/user.ts` — add `is_suspended` to SELECT
