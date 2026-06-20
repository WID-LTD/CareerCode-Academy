# Goal: Certificate auto-issuance with exam requirement + notifications

## Fixes vs New Features

### Phase 1: Fix Health Endpoint (quick)
**Problem:** `App.tsx` calls `api.get('/health')` but axios baseURL is `/api/v1`, so it hits `GET /api/v1/health` (404). The real health endpoint is at `GET /health` (root).

**Fix:** Use `fetch('/health')` or a raw axios call without the baseURL.

### Phase 2: Certificate Exam Requirement + Auto-Issue

## Backend Changes

### 1. `backend/src/index.ts` (always-run migration)
Add `requires_exam` column to `certificate_templates`:
```sql
ALTER TABLE certificate_templates ADD COLUMN IF NOT EXISTS requires_exam BOOLEAN DEFAULT false;
```

### 2. `backend/src/models/certificateTemplate.ts`
- Add `requires_exam: boolean` to `CertificateTemplate` interface
- Add `requires_exam?: boolean` to `CreateCertificateTemplateInput`
- In `createTemplate()`, accept and pass `requires_exam` param

### 3. `backend/src/routes/admin.routes.ts`
- No changes needed — the `POST /admin/certificate-templates` already passes `req.body` straight to `createTemplate()`. The frontend just needs to send `requires_exam`.
- Same for `PUT /admin/certificate-templates/:id` — `updateTemplate()` already handles arbitrary fields via dynamic column mapping.

### 4. `backend/src/routes/exam.routes.ts`
Add auto-issue logic at 3 points where `passed = true`:

**After `POST /exams/student/:examId/submit` (line 694):**
```typescript
if (passed && exam.certificate_template_id) {
  // 1. Check template has requires_exam
  // 2. Check enrollment is completed
  // 3. Check no existing certificate
  // 4. Create certificate + notification
}
```

**After `POST /exams/student/:examId/timeout` (line 739):**
Same logic.

**After `PUT /exams/:id/attempts/:attemptId/grade` (line 400):**
Same logic (for manual grades).

**Shared helper function** `autoIssueCertificateOnExamPass(exam, userId, courseId)`:
- Looks up template by `exam.certificate_template_id`
- Checks `template.requires_exam` (should be true, but guard)
- Checks enrollment is completed
- Checks no existing cert for user+course
- Creates certificate via `CertificateModel.createCertificate()`
- Creates notification via `NotificationModel.createNotification()` with type `'certificate'`
- Emits socket event `new_notification` to the user's room

### 5. `backend/src/routes/certificate.routes.ts`
Update `POST /certificates/auto` (line 162-164):
If template has `requires_exam`, don't auto-issue — the exam pass handler will trigger it:

```typescript
// After checking enrollment.completed (line 164)
const template = await CertificateTemplateModel.getTemplateByCourseId(courseId);
if (template?.requires_exam) {
  // Check if student has a passing exam for this course
  const passingAttempt = await ExamModel.getPassingAttemptForCourse(userId, courseId);
  if (!passingAttempt) {
    return res.json({
      success: false,
      message: 'Certificate requires passing an exam first.',
      requiresExam: true,
    });
  }
}
```

(This requires adding `getPassingAttemptForCourse` to the exam model.)

### 6. `backend/src/routes/certificate.routes.ts` (notification on auto-issue)
After creating the certificate (line 183), add:
```typescript
await NotificationModel.createNotification({
  user_id: userId,
  title: 'New Certificate Earned!',
  message: `You earned a certificate for completing "${course?.title || 'Course'}".`,
  type: 'certificate',
});
// Emit socket
```

### 7. `backend/src/models/exam.ts`
Add function: `getPassingAttemptForCourse(userId, courseId) → ExamAttempt | null`
```sql
SELECT ea.* FROM exam_attempts ea
JOIN exams e ON ea.exam_id = e.id
WHERE e.course_id = $1 AND ea.user_id = $2 AND ea.passed = true AND ea.status = 'completed'
LIMIT 1
```

## Frontend Changes

### 8. `frontend/src/App.tsx`
Fix health endpoint wake-up — use `fetch('/health')` instead of `api.get('/health')`.

### 9. `frontend/src/pages/admin/CertificateTemplates.tsx`
Add "Requires passing exam" checkbox in the form:
```tsx
<label className="flex items-center gap-2 text-sm">
  <input type="checkbox" checked={form.requiresExam}
    onChange={e => setForm({ ...form, requiresExam: e.target.checked })} />
  Requires passing exam before certificate is issued
</label>
```
Update `handleSave` to send `requires_exam: form.requiresExam`.

### 10. `frontend/src/pages/student/Certificate.tsx`
- Add `newCertIds` state — certificates issued in the last 7 days get a "NEW" badge
- On mount, if there are new certificates, show:
  - A congratulatory toast: "🎉 You earned new certificates!"
  - A walkthrough popup/modal showing newly earned certificates with a "View Certificate" button
- Sort certificates with newest first

### 11. `frontend/src/components/layout/Sidebar.tsx`
- For the student Certificates nav item, add a badge showing count of certificates issued in the last 7 days
- Fetch the data from a new store field or from the existing certificate data

### 12. `frontend/src/store/studentStore.ts` (if it exists) or authStore
- Add `newCertificateCount` field or use the certificate page's local state
- Initialize from the certificate list

## Summary of Files to Change
1. `backend/src/index.ts` — add `requires_exam` column migration
2. `backend/src/models/certificateTemplate.ts` — add `requires_exam` field
3. `backend/src/routes/exam.routes.ts` — add auto-issue after exam pass
4. `backend/src/routes/certificate.routes.ts` — add exam requirement check in auto-issue + notification
5. `backend/src/models/exam.ts` — add `getPassingAttemptForCourse`
6. `frontend/src/App.tsx` — fix health endpoint URL
7. `frontend/src/pages/admin/CertificateTemplates.tsx` — add requires_exam checkbox
8. `frontend/src/pages/student/Certificate.tsx` — add "new" badge + congratulatory modal/toast
9. `frontend/src/components/layout/Sidebar.tsx` — add new certificate badge on nav item
