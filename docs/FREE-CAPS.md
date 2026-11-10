# CareerCode Academy — free-tier caps, monitors, and tripwires.
# Goal: $0/month forever. Review the first week of each month (10 min).

## Allowances (verified Sep 2026)
| Service | Free allowance | Overage behavior | Our exposure |
|---|---|---|---|
| Pages | Unlimited sites + bandwidth | None (no meter) | Zero risk |
| Workers | 100k req/day | HARD STOP, no charge | Worst case = pause till 00:00 UTC, never a bill |
| Durable Objects | 1M req, 5 GB storage | Billed | Auth logins only — thousands/day max |
| R2 | 10 GB-month, 1M Class-A, 10M Class-B ops, zero egress | Billed | D1 backups (~3 MB gzipped/day, 90-day lifecycle) + course media |
| Realtime SFU + TURN | 1,000 GB/mo shared | $0.05/GB after | Hundreds of classroom-hours before the line |
| Workers AI | Daily free neurons | Billed | Per-user caps on study assistant |
| Email Sending | Workers Paid: 3,000/mo included | $0.35 per 1,000 after | Verification, welcome, reset, invoices, role changes |
| **D1 (primary DB)** | 5 GB storage, **5M rows read/day**, **100k rows written/day** | Hard stop at daily cap (queries error until reset) | 106 tables, 45.8k rows, ~30 MB. Reads dominate; analytics is the only heavy writer |
| Neon Postgres | ~0.5 GB, ~100 CU-h/mo | Throttled/cold | **Idle** — kept only as the `DB_BACKEND=neon` rollback target |
| Hyperdrive | Included all plans | — | Not used |

## Forbidden (would create bills)
Images ($5/mo base), Stream, Workers Paid, extra seats, Load Balancing.
If it isn't in the table above, it doesn't get enabled.

## Monitors (all free)
- Cloudflare: Manage Account → Notifications → usage alerts for Workers,
  R2, Durable Objects, AI Gateway, Realtime. Turn ALL on.
- `GET /api/v1/live/admin/usage` (admin): Realtime minutes consumed this
  month from `live_participants.minutes_claimed` + open-session estimate.
- Cloudflare dashboard → D1 → `careercode-academy` → rows read/written per day
  (the 100k writes/day cap is the one to watch; analytics batch writes are the
  main driver).
- Neon dashboard → Billing (compute hours) — only while proxied routes remain.
- R2 dashboard → bucket size.

## No-card rule
If the Cloudflare account has no payment method attached, paid overages
cannot materialize. If one is attached, the alerts above + this monthly
check are the safety net.

## Monthly checklist (10 min)
1. Workers analytics: requests/day trend vs 100k line.
2. R2: bucket GB vs 10 GB line; delete temp/pipeline artifacts.
3. Realtime: `admin/usage` minutes vs ~500 classroom-hour equivalent.
4. D1: rows written/day trend vs 100k; storage vs 5 GB.
   Neon: compute hours vs 100 only if proxied routes still exist.
5. Confirm no paid product was enabled (Images/Stream/Paid plan).
