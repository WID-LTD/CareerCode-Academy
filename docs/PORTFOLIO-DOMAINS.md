# Portfolio domains

## Free per-user subdomain (live)

Every published portfolio is reachable at:

```
https://<username>.careercode.com.ng
https://<username>.careercode.com.ng/<project-slug>
```

This uses a proxied wildcard DNS record `*.careercode.com.ng`, the Worker route
`*.careercode.com.ng/*`, and host routing in `workers/src/index.ts`.

## External custom domains (live)

External domains are attached to the **Cloudflare Pages** project
`career-code-academy`. Cloudflare provisions the certificate automatically.

User steps in **Portfolio Builder → Portfolio domain**:

1. Add `_careercode.<domain>` TXT `careercode-verify-<token>`.
2. Add `<domain>` CNAME → `career-code-academy.pages.dev` (proxied).
3. Press **Verify**. The API checks DNS, then calls the Pages custom-domain API.
4. Press **Check status** until Pages reports `active`.

Serving path:

- Pages custom domain receives the request.
- `frontend/functions/[[path]].ts` resolves the hostname through
  `GET /api/v1/portfolio/resolve-host?host=...`.
- The function redirects `/` to `/u/<username>` on the same custom domain.
- Assets and `/u/...` paths pass through to the SPA.
- The API CORS middleware allows verified custom-domain origins dynamically.

Verified live with `https://portfolio.widltd.com.ng` →
`https://portfolio.widltd.com.ng/u/ikewisdom-2d35f3` (200, SSL active).

## Configuration

Worker secrets:

- `CF_API_TOKEN` — token with Pages Write + DNS/SSL/Workers permissions
- `CF_ACCOUNT_ID`
- `CF_PAGES_PROJECT=career-code-academy`

The token is stored outside the repository in `~/.config/cloudflare/`.
