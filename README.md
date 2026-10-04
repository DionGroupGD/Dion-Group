# Dion Group Website

Production source for [dion-group.com](https://dion-group.com). Static HTML, CSS and JavaScript, no build step, hosted on GitHub Pages.

## Project structure

```
DION GROUP WEBSITE/
├── index.html              ← Homepage
├── styles-v3.css           ← Homepage styles
├── home-v3.js              ← Homepage: story, gallery, forms, sticky mobile button
├── intro-v3.js             ← The opening (the DG mark in particles), from dg-mark-1200.png
├── particles-v3.js         ← Product marks in particles (Axon, Aegis)
├── trailers.js             ← Product films rendered live in the page (Axon, Aegis)
├── films-cloud.js          ← The films' point-cloud look
├── app.js                  ← Shared: language switching (EN/DE/GR), reveals
├── de/, gr/                ← German and Greek home and Axon pages: GENERATED, do not edit (see below)
├── index.css               ← Legal-page styles
│
├── privacy.html            ← Legal pages: share index.css and app.js
├── cookies.html
├── terms.html
├── legal-notice.html
├── accessibility.html
├── thanks.html             ← Contact form landing (noindex)
├── 404.html                ← Not-found page (absolute paths: GitHub Pages serves it at any address)
│
├── tms/                    ← Axon TMS product page (own HTML/CSS/JS)
├── film/axon/              ← The Axon product film and its poster
├── fonts/                  ← Self-hosted Inter and Cinzel (no requests to Google), with their licences
│
├── cookie-consent.js/.css  ← Consent banner (Google Analytics only after consent)
├── analytics.js            ← Google Analytics 4 loader, consent-gated
│
├── favicon*.png/.ico, apple-touch-icon.png, site.webmanifest
├── og-preview.png          ← Social sharing card (1200×630)
├── robots.txt, sitemap.xml, llms.txt
└── _headers                ← Security headers for hosts that read it (GitHub Pages does not)
```

Working files (film recording pages, design explorations, staging pages, tools) are kept out of the repository by `.gitignore`.

## Languages

The home page and the Axon page exist as separate pages per language, so search engines index each one:
`/`, `/de/`, `/gr/` and `/tms/axon.html`, `/de/tms/axon.html`, `/gr/tms/axon.html`.
The German and Greek pages are generated from the English ones (their `data-de` / `data-gr` texts) by
`archive/site-tools/lang_pages.cjs`. After every change to `index.html` or `tms/axon.html`, run:

```bash
node archive/site-tools/lang_pages.cjs
```

The other pages switch language in place (`?lang=de`, `?lang=gr`).

## Running locally

```bash
python3 -m http.server 8090
```

Then open http://localhost:8090/.
