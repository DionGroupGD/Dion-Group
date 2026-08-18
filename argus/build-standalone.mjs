/* Bundle Argus into one self-contained .html file.

   Everything — stylesheet, all seven modules, and the sample dataset — is
   inlined, so the result runs from a file:// path, an email attachment or a
   USB stick with no server at all. That is the demo you hand a customer who
   wants to try it on their own laptop before anyone signs anything.

   Run:  node argus/build-standalone.mjs [outfile]
   Out:  argus/dist/argus-standalone.html
*/

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

/* Concatenation order is dependency order: a module may only use things
   defined above it once the import statements are gone. */
const MODULES = [
  'js/i18n.js',
  'js/xlsx.js',
  'js/model.js',
  'js/data.js',
  'js/charts.js',
  'js/dash.js',
  'js/app.js',
];

/** Strip ES module syntax so the files can share one scope. */
function flatten(source, name) {
  let out = source
    .replace(/^import\s[^;]*?;\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\}\s*;\s*$/gm, '')
    .replace(/^export\s+(?=(async\s+)?function|const|let|class)/gm, '');

  // Anchored at column 0, like the strippers above — indented prose inside a
  // comment can legitimately start with the word "export".
  if (/^(import|export)\s/m.test(out)) {
    throw new Error(`${name}: module syntax left after flattening — check for a multi-line import/export.`);
  }
  return `/* ---------- ${name} ---------- */\n${out.trim()}\n`;
}

/* The sample data is fetched at runtime in the served app; inline it here. */
const demo = JSON.parse(read('demo/kasidis-sales.json'));

const FETCH_BLOCK = `    const res = await fetch('demo/kasidis-sales.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(\`Sample data unavailable (\${res.status}).\`);
    const doc = await res.json();`;

const bundle = MODULES.map((path) => {
  let source = read(path);
  if (path === 'js/app.js') {
    if (!source.includes(FETCH_BLOCK)) {
      throw new Error('app.js: sample-data fetch block not found — update FETCH_BLOCK in this script.');
    }
    source = source.replace(FETCH_BLOCK, '    const doc = ARGUS_DEMO;');
  }
  return flatten(source, path);
}).join('\n');

const css = read('argus.css');

const html = `<title>Argus</title>
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&amp;display=swap">
<style>
${css}
</style>

<main id="ax-app" class="ax-app"></main>

<div id="ax-flash" class="ax-flash" role="status" aria-live="polite"></div>

<div class="ax-dropveil" aria-hidden="true">
  <div class="ax-dropveil-inner">Αφήστε το αρχείο εδώ</div>
</div>

<dialog id="ax-editor" class="ax-dialog"></dialog>

<input id="ax-file" class="ax-hidden-input" type="file" accept=".csv,.tsv,.txt,.json,.xlsx,.xlsm,.xltx" multiple aria-hidden="true" tabindex="-1">
<input id="ax-workspace-file" class="ax-hidden-input" type="file" accept=".json" aria-hidden="true" tabindex="-1">

<noscript>
  <div class="ax-noscript">Το Argus χρειάζεται JavaScript. Ενεργοποιήστε το και ανανεώστε τη σελίδα.</div>
</noscript>

<script id="ax-demo-data" type="application/json">${
  // </script> inside the payload would end the block early; \\u003c is the
  // same character to JSON.parse and inert to the HTML tokenizer.
  JSON.stringify(demo).replace(/</g, '\\u003c')
}</script>

<script>
(function () {
  'use strict';
  const ARGUS_DEMO = JSON.parse(document.getElementById('ax-demo-data').textContent);

${bundle}
})();
</script>
`;

const outPath = resolve(process.argv[2] || join(ROOT, 'dist', 'argus-standalone.html'));
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);

console.log(`wrote ${outPath}`);
console.log(`size  ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB`);
console.log(`rows  ${demo.rows.length.toLocaleString('en-GB')}`);
