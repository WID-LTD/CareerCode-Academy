# CareerCode Academy — free-tier caps, monitors, and tripwires.
# Goal: $0/month forever. Review the first week of each month (10 min).

## Allowances (verified Sep 2026)
| Service | Free allowance | Overage behavior | Our exposure |
|---|---|---|---|
| Pages | Unlimited sites + bandwidth | None (no meter) | Zero risk |
| Workers | 100k req/day | HARD STOP, no charge | Worst case = pause till 00:00 UTC, never a bill |
| Durable Objects | 1M req, 5 GB storage | Billed | Auth logins only — thousands/day max |
| R2 | 10 GB-month, 1M Class-A, 10M Class-B ops, zero egress | Billed | Videos accumulate — compress 720p, lifecycle temp cleanup |
| Realtime SFU + TURN | 1,000 GB/mo shared | $0.05/GB after | Hundreds of classroom-hours before the line |
| Workers AI | Daily free neurons | Billed | Per-user caps on study assistant |
| Neon Postgres | ~0.5 GB, ~100 CU-h/mo | Throttled/cold | Relational data only (MBs); relax keepalive, watch Billing |
| Hyperdrive | Included all plans | — | Optional; direct driver first |

## Forbidden (would create bills)
Images ($5/mo base), Stream, Workers Paid, extra seats, Load Balancing.
If it isn't in the table above, it doesn't get enabled.

## Monitors (all free)
- Cloudflare: Manage Account → Notifications → usage alerts for Workers,
  R2, Durable Objects, AI Gateway, Realtime. Turn ALL on.
- `GET /api/v1/live/admin/usage` (admin): Realtime minutes consumed this
  month from `live_participants.minutes_claimed` + open-session estimate.
- Neon dashboard → Billing (compute hours), R2 dashboard → bucket size.

## No-card rule
If the Cloudflare account has no payment method attached, paid overages
cannot materialize. If one is attached, the alerts above + this monthly
check are the safety net.

## Monthly checklist (10 min)
1. Workers analytics: requests/day trend vs 100k line.
2. R2: bucket GB vs 10 GB line; delete temp/pipeline artifacts.
3. Realtime: `admin/usage` minutes vs ~500 classroom-hour equivalent.
4. Neon: compute hours vs 100; storage vs 0.5 GB.
5. Confirm no paid product was enabled (Images/Stream/Paid plan).
