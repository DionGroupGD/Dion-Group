# Dion Group Website

Production source for [dion-group.com](https://dion-group.com). Static HTML + CSS + JS, no build step.

## Project structure

```
DION GROUP WEBSITE/
├── index.html              ← Homepage (current design)
├── styles.css              ← Homepage styles
├── home.js                 ← Homepage scripts (reveal-on-scroll, foundry sticky)
├── app.js                  ← Shared scripts (lang switcher, scroll reveal, tilt)
├── form-guard.js           ← Anti-spam guard for the contact + Axon pricing forms
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

- **Homepage** (`index.html`) → `styles.css` + `app.js` + `home.js` + `form-guard.js` + `axon-truck.webp`
- **Legal pages** (`privacy.html`, `terms.html`, `cookies.html`, `thanks.html`) → `index.css` + `app.js`
- **Sub-products** (`/aegis`, `/tms`) → self-contained, own assets (the Axon pricing form also loads `../form-guard.js`)

> ⚠️  **Do not delete `index.css`** — it is still loaded by the four legal pages even though the new homepage uses `styles.css`.

## Contact forms (spam protection)

Both forms (homepage `#contact` and the Axon `#pricing-form`) post to FormSubmit, but **their `<form>` tags have no `action` on purpose**. Bots read the action URL from the HTML and post to it directly, so `form-guard.js` adds the FormSubmit endpoint only at submit time, and only when the submission looks human: the `_honey` honeypot is empty, the visitor really typed/clicked in the form, and at least 3 seconds passed since they started. A blocked visitor sees a short "please submit again" note.

To change where submissions go, edit `ENDPOINT` in `form-guard.js`. Do not put the URL back in the HTML.

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
