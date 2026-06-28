# Dion Group Website

Production source for [dion-group.com](https://dion-group.com). Static HTML + CSS + JS, no build step.

## Project structure

```
DION GROUP WEBSITE/
├── index.html              ← Homepage (current design)
├── styles.css              ← Homepage styles
├── home.js                 ← Homepage scripts (reveal-on-scroll, foundry sticky)
├── app.js                  ← Shared scripts (lang switcher, scroll reveal, tilt)
├── index.css               ← Legal-page styles (privacy / terms / cookies / thanks)
│
├── privacy.html            ← Legal pages — share index.css and app.js
├── terms.html
├── cookies.html
├── thanks.html             ← Form submission landing
│
├── aegis/                  ← Aegis sub-product page (own HTML/CSS/JS)
├── tms/                    ← Axon TMS sub-product page (own HTML/CSS/JS)
├── axon-truck.webp         ← Homepage truck illustration (used by Axon TMS section)
│
├── favicon*.png/.ico       ← Favicons (browsers expect at root)
├── apple-touch-icon.png
├── og-preview.png          ← OpenGraph card preview
├── site.webmanifest        ← PWA manifest
├── robots.txt              ← Search-engine crawl rules
├── sitemap.xml             ← Sitemap for SEO
├── llms.txt                ← LLM-readable site summary
├── _headers                ← Hosting (Netlify/Vercel) security headers
├── .well-known/            ← Web standards (e.g. assetlinks)
│
├── docs/                   ← Project documentation (developer-facing)
│   └── SECURITY_HEADERS_SETUP.md
│
├── versions/               ← Historical homepage snapshots (NOT served)
│   ├── README.md
│   └── index.old.html      ← Pre-2026-04-25 design
│
└── archive/                ← Stale workspace artifacts (NOT served, safe to delete)
    └── README.md
```

## What touches what

- **Homepage** (`index.html`) → `styles.css` + `app.js` + `home.js` + `axon-truck.webp`
- **Legal pages** (`privacy.html`, `terms.html`, `cookies.html`, `thanks.html`) → `index.css` + `app.js`
- **Sub-products** (`/aegis`, `/tms`) → self-contained, own assets

> ⚠️  **Do not delete `index.css`** — it is still loaded by the four legal pages even though the new homepage uses `styles.css`.

## Running locally

```bash
python3 -m http.server 8090
# open http://localhost:8090/
```

A pre-configured launch is also available via `.claude/launch.json`.

## Deploy

Static files only — push to any static host. The `_headers` file applies on Netlify / Cloudflare Pages.

## Languages

The homepage and legal pages support EN / DE / GR via `data-{lang}` attributes on text nodes; `app.js` swaps text on language-button click and persists choice to `localStorage`. URL `?lang=de|gr` also works.
