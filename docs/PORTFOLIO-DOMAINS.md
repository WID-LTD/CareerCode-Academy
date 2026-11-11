# Portfolio domains

## Free per-user subdomain (live)

Every published portfolio is reachable at:

```
https://<username>.careercode.com.ng
https://<username>.careercode.com.ng/<project-slug>
```

This uses:

- a proxied wildcard DNS record `*.careercode.com.ng`
- the Worker route `*.careercode.com.ng/*`
- host routing in `workers/src/index.ts`, which looks up the username and
  redirects to the public portfolio.

The wildcard is covered by Cloudflare's certificate for `careercode.com.ng`.
`api`, `www` and `portfolio` subdomains are excluded and keep their own routes.

## External domains

The builder can verify an external domain with a TXT record:

```
_careercode.<domain>  TXT  careercode-verify-<token>
```

`POST /api/v1/portfolio/site/custom-domain/verify` checks DNS over HTTPS and
marks the domain verified.

Serving an external hostname directly requires **Cloudflare for SaaS (SSL for
SaaS)**. On this account the custom-hostnames API authenticates correctly but
returns:

```
1404 No quota has been allocated for this zone or for this account
```

That is a Cloudflare sales/quota enrollment, not a token-permission problem.
Until the quota is allocated, use one of these:

1. A **301 redirect** at the registrar/DNS provider to
   `https://<username>.careercode.com.ng` (works immediately, SSL handled by
   the registrar).
2. Keep the domain verified and attach it once SSL for SaaS is enabled.

The API token used for platform automation is stored outside the repository in
`~/.config/cloudflare/`; never commit it.
