// Pages Function: host-based portfolio routing for external custom domains.
// A custom domain is attached to the Pages project; this function resolves the
// hostname through the API and redirects to the matching /u/<username> route
// while keeping the custom domain in the address bar.

const PASS_PREFIXES = ['/assets/', '/icons/', '/fonts/', '/wasm/', '/api/'];
const PASS_EXACT = new Set([
  '/manifest.webmanifest', '/sw.js', '/offline.html', '/favicon.svg',
  '/screen.png', '/robots.txt', '/sitemap.xml', '/_redirects',
]);

export const onRequest = async (context: any) => {
  const url = new URL(context.request.url);
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  if (PASS_PREFIXES.some((p) => path.startsWith(p)) || PASS_EXACT.has(path)) {
    return context.next();
  }
  if (
    host === 'careercode.com.ng' ||
    host === 'www.careercode.com.ng' ||
    host === 'portfolio.careercode.com.ng' ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.careercode.com.ng')
  ) {
    return context.next();
  }

  try {
    const res = await fetch(`https://api.careercode.com.ng/api/v1/portfolio/resolve-host?host=${encodeURIComponent(host)}`);
    if (res.ok) {
      const json: any = await res.json();
      const username = json?.data?.username;
      if (username) {
        if (path.startsWith('/u/')) return context.next();
        const target = path === '/' || path === ''
          ? `/u/${encodeURIComponent(username)}`
          : `/u/${encodeURIComponent(username)}${path}`;
        return Response.redirect(`https://${host}${target}`, 302);
      }
    }
  } catch {
    /* fall through to the static site */
  }
  return context.next();
};
