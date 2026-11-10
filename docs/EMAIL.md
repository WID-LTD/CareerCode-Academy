# Transactional email — Cloudflare Email Service

Status: **live** (verified 2026-11-10).

## Setup

- Sending domain: `careercode.com.ng` (zone `ccdc048f…`)
- Sending subdomain created via API:
  `POST /zones/{zone}/email/sending/subdomains {"name":"careercode.com.ng"}`
  → tag `9d62504f723b45c6ab0f7a667b513100`, return-path `cf-bounce.careercode.com.ng`
- DNS records auto-published by Cloudflare:
  - MX `cf-bounce` → route1/2/3.mx.cloudflare.net
  - SPF `v=spf1 include:_spf.mx.cloudflare.net ~all`
  - DKIM `cf-bounce._domainkey` (Cloudflare-managed)
  - DMARC `_dmarc` → `v=DMARC1; p=reject;`
- Worker binding: `[[send_email]] name = "EMAIL"`
- Sender: `CareerCode Academy <noreply@careercode.com.ng>` (`MAIL_FROM`)

## Code

`workers/src/email.ts` is the only sender. It calls `env.EMAIL.send(...)`.
There is **no Brevo and no Resend** anywhere in the platform.

Templates: verification, welcome, password reset, role change, account invite,
instructor application received/approved, enrollment, mentoring booked,
community request, invoice (with PDF attachment).

## Verification

- Direct REST send: `202` → queued to `ceo@xperiencestore.store`
- Worker path: `POST /api/v1/admin/email-test` (admin only) →
  `{"ok":true,"provider":"cloudflare","id":"<…@careercode.com.ng>"}`

## Operations

- Daily quota: 3,000 emails/month included (Workers Paid), then $0.35/1,000.
- Preview/logs: Cloudflare dashboard → Compute → Email Service → Email Sending.
- Bounces/suppressions: managed by Cloudflare; the API exposes the suppression list.
- If sending is disabled or the domain is removed, `sendEmail()` logs the error
  and returns `{ok:false}`; request flows never fail because of email.
