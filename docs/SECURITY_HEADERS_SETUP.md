# Security Headers Setup

This project includes hardened headers in `_headers`, but runtime support depends on hosting.

## Current Runtime Check

Run:

```bash
curl -sSI https://dion-group.com
```

If you see `server: GitHub.com`, your site is on GitHub Pages and `_headers` is ignored.

## What To Do If `_headers` Is Ignored

## Option A (Recommended): Put a CDN/edge proxy in front

Use Cloudflare in front of the domain and set security headers with Transform Rules / Response Header Rules.

Headers to enforce:

- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

## Option B: Move static hosting to platform that supports `_headers`

- Netlify: supports `_headers` natively.
- Cloudflare Pages: supports `_headers` natively.

## Option C: Keep GitHub Pages + HTML CSP fallback

This repo already includes `<meta http-equiv="Content-Security-Policy">` as a fallback in main pages.
Note: meta CSP cannot replace all response headers (for example `X-Frame-Options`, HSTS, and other non-CSP headers).

## Verification Command

After deployment/proxy changes:

```bash
curl -sSI https://dion-group.com | egrep -i "content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|cross-origin-opener-policy|cross-origin-resource-policy|strict-transport-security"
```

If the lines are present, your production headers are active.
