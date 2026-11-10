# Auth & notifications

## Auth endpoints (all native on the worker)

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/register` | create account + email verification code |
| `POST /api/v1/auth/login` | email/password |
| `GET /api/v1/auth/me` | current user |
| `POST /api/v1/auth/refresh-token` | rotate refresh token |
| `POST /api/v1/auth/logout` | revoke refresh token |
| `POST /api/v1/auth/verify-email` | `{email, code}` → tokens |
| `GET /api/v1/auth/verify-email/:token` | link in verification email |
| `POST /api/v1/auth/resend-verification` | new 6-digit code |
| `POST /api/v1/auth/forgot-password` | email a reset link (15 min, SHA-256 at rest) |
| `POST /api/v1/auth/reset-password` | `{token, password}` |
| `POST /api/v1/auth/set-password` | first-time setup token |
| `PUT /api/v1/auth/profile` | name/bio/avatar/links |
| `POST /api/v1/auth/change-password` | verify current, revoke sessions |
| `GET /api/v1/auth/google` | start Google OAuth |
| `GET /api/v1/auth/google/callback` | exchange code, redirect to SPA |
| `POST /api/v1/auth/oauth/exchange` | one-time code → tokens |

### Google OAuth setup

The worker builds the redirect URI as `GOOGLE_CALLBACK_URL` if set, otherwise
`https://api.careercode.com.ng/api/v1/auth/google/callback`. Add that exact URI
to **Google Cloud Console → APIs & Services → Credentials → OAuth client →
Authorized redirect URIs**. Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` as
worker secrets (already present in this account).

No passport/session dependency: the flow is a direct authorization-code
exchange, `state` is a signed 5-minute JWT, and the SPA receives a 2-minute
one-time code at `/auth/callback?code=…`.

## Notifications

Every notification row can carry a `link` (added in
`backend/migrations/021_notification_links.sql`). Native producers set it:

| Event | Recipient | Link |
|---|---|---|
| certificate issued | student | `/student/certificates` |
| learning path completed | student | `/student/learning-paths` |
| new enrollment | instructor | `/instructor/students` |

Older rows without `link` fall back to a type→route map in
`frontend/src/lib/notifications.ts`.

### Browser notifications

- `useBrowserNotifications` (mounted in `App.tsx`) polls unread notifications
  every 45s while the user is signed in.
- Permission is requested automatically on load (opt-out model); the first poll
  only records existing ids so users don't get a backlog burst.
- Clicking a desktop notification focuses the tab and navigates to the deep
  link.
- Settings → Notifications → **Browser Notifications** toggles it, requests
  permission on enable, and shows "Blocked in browser" when denied.

True background push (service worker + Web Push/VAPID, delivered when the tab
is closed) is **not** implemented yet; that needs a subscription table, VAPID
keys and an encrypted push sender. The current implementation covers all
in-app actions while the app is open.
