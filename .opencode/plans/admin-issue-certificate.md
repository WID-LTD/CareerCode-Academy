# Goal: Enable admins to issue certificates to students

## Problem
- Admin Certificates page only lists/manages existing certs — no "Issue Certificate" button
- Backend `POST /certificates` Zod schema strips `userId` (not in schema), so admin always gets cert for themselves

## Files to Change

### 1. Backend: `backend/src/routes/certificate.routes.ts`
- **Line 16-19**: Add `userId: z.string().uuid()` to `createCertificateSchema`
- **Line 97**: Change to `const userId = req.body.userId;` (now required, no fallback since admin-only)

### 2. Backend: `backend/src/routes/admin.routes.ts`
- Add new route `GET /admin/users/:userId/completed-courses` (after line 149, before `PUT /users/:id/role`)
  - Validates `userId` exists
  - Calls `EnrollmentModel.getEnrollmentsByUser(userId)` to get all enrollments
  - Filters for `completed === true`
  - Returns course details for each completed enrollment
  - Alternatively, keep it simple: return all completed enrollments with course info

### 3. Frontend: `frontend/src/store/adminStore.ts`
- **Interface** (line 292-296): Add `issueCertificate: (userId: string, courseId: string) => Promise<void>`
- **Implementation** (after line 528): Add `issueCertificate` that calls `api.post('/certificates', { userId, courseId })` then refreshes list
- **Interface**: Add `fetchUserCompletedCourses: (userId: string) => Promise<any[]>`
- **Implementation**: Add `fetchUserCompletedCourses` that calls `GET /admin/users/${userId}/completed-courses`

### 4. Frontend: `frontend/src/pages/admin/Certificates.tsx`
- Add "Issue Certificate" button in the header area (line 44-45)
- Add state: `showIssueModal`, `issueUserSearch`, `userResults`, `selectedUser`, `completedCourses`, `selectedCourseId`, `issueLoading`
- Create modal with:
  - **User search**: text input that calls `fetchUsers` on debounced input, shows dropdown of matching users
  - **User select list**: clickable user items showing name + email
  - After selecting user, fetch completed courses via `fetchUserCompletedCourses`
  - **Course select**: dropdown of completed courses
  - **Issue button**: calls `issueCertificate(userId, courseId)`
- Refresh certificate list on success
- Close modal after success/error

## Data Flow
1. Admin clicks "Issue Certificate" → modal opens
2. Admin types user name → `GET /admin/users?search=...` returns matching users
3. Admin clicks a user → `GET /admin/users/:userId/completed-courses` fetches their completed courses
4. Admin picks a course from dropdown → courseId is set
5. Admin clicks "Issue" → `POST /certificates` with `{ userId, courseId }`
6. Backend validates userId exists, course exists, user is enrolled & completed, no duplicate cert
7. Certificate created → list refreshes, modal closes, success toast shown
