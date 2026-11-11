# Portfolio domains

## Per-user subdomain (default)

Every published portfolio is served directly at:

```
https://<username>.careercode.com.ng
https://<username>.careercode.com.ng/<project-slug>
```

The Worker route `*.careercode.com.ng/*` proxies the Pages SPA while keeping the
subdomain in the address bar. `App.tsx` detects the portfolio host and renders
the standalone portfolio — no site navbar, no CareerCode footer, no shared
portfolio host.

Metadata is still CareerCode-owned in the background:

- `<meta name="generator" content="CareerCode Academy">`
- canonical URL on the subdomain
- JSON-LD `ProfilePage` with `isPartOf` CareerCode Academy
- `https://careercode.com.ng/sitemap.xml` lists every published portfolio and
  project URL

## Optional external domain

Users who own a domain can connect it in **Portfolio Builder → Portfolio
domain**:

1. `_careercode.<domain>` TXT `careercode-verify-<token>`
2. `<domain>` CNAME → `career-code-academy.pages.dev` (proxied)
3. Verify → the API attaches it to the Pages project and Cloudflare provisions
   SSL.
4. `frontend/functions/[[path]].ts` resolves Host → username and redirects `/`
   to `/u/<username>` on the same custom domain.

The default and recommended URL remains the per-user CareerCode subdomain.
