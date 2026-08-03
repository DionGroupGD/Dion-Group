#!/usr/bin/env node
/* ============================================================================
   build.mjs — package the Offer Builder as a single encrypted HTML file.

   The four source files (index.html, styles.css, calc.js, app.js) are bundled
   into one JSON payload, the JavaScript is minified and obfuscated, the whole
   payload is gzipped and then encrypted with AES-256-GCM under a key derived
   from a passphrase via PBKDF2-SHA-256. The result is dropped into an unlock
   shell that asks for the passphrase and boots the app in the browser.

   What that buys you: the file on disk is ciphertext. Without the passphrase
   there is nothing to read, edit or re-brand — not by a person, not by a tool.
   Editing any byte of the ciphertext breaks the GCM tag and the file refuses
   to open, so tampering is detected rather than silently accepted.

   What it does not buy you: once a colleague types the passphrase, the code is
   running in their browser, and anyone determined enough can read it out of
   the browser. Encryption protects the file, not the session. See README.md.

   Usage:
     node build.mjs --src "./src/Offer Sheet INT" --out "./dist/Offer Sheet INT (Locked).html"
     node build.mjs --gen-passphrase

   The passphrase is read from, in order: --passphrase-file <path>,
   the OFFER_LOCK_PASSPHRASE environment variable, or an interactive prompt.
   It is never written to disk by this script and must never be committed.
   ============================================================================ */

import { createHash, randomBytes, pbkdf2Sync, createCipheriv } from "node:crypto";
import { gzipSync, constants as zlibConstants } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { minify } from "terser";
import JsObfuscator from "javascript-obfuscator";

const HERE = dirname(fileURLToPath(import.meta.url));

/* --------------------------------------------------------------- defaults */
const DEFAULTS = {
  src: join(HERE, "src", "Offer Sheet INT"),
  out: join(HERE, "dist", "Offer Sheet INT (Locked).html"),
  owner: "George Dionysiou — Dion Group",
  title: "Offer Builder · Intercomm Foods",
  brandTop: "INTERCOMM",
  brandSub: "FOODS",
  // OWASP's floor for PBKDF2-HMAC-SHA256 is 600,000. Raising it makes every
  // guess in an offline attack proportionally more expensive; the honest user
  // pays it exactly once per open.
  iterations: 1_000_000,
  obfuscate: true,
  compress: true,
};

/* ------------------------------------------------------------------- args */
function parseArgs(argv) {
  const out = { ...DEFAULTS, _flags: new Set() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(`Missing value after ${a}`);
      return v;
    };
    switch (a) {
      case "--src": out.src = next(); break;
      case "--out": out.out = next(); break;
      case "--owner": out.owner = next(); break;
      case "--title": out.title = next(); break;
      case "--brand-top": out.brandTop = next(); break;
      case "--brand-sub": out.brandSub = next(); break;
      case "--iterations": out.iterations = Number(next()); break;
      case "--passphrase-file": out.passphraseFile = next(); break;
      case "--no-obfuscate": out.obfuscate = false; break;
      case "--no-compress": out.compress = false; break;
      case "--gen-passphrase": out._flags.add("gen"); break;
      case "--help": case "-h": out._flags.add("help"); break;
      default: fail(`Unknown option: ${a}`);
    }
  }
  return out;
}

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const HELP = `
  offer-lock — package the Offer Builder as one encrypted HTML file

  node build.mjs [options]

    --src <dir>              Folder holding index.html, styles.css, calc.js, app.js
    --out <file>             Where to write the locked HTML
    --owner <text>           Name shown on the unlock screen and in the app
    --title <text>           Window/tab title
    --brand-top <text>       Top line of the lock-screen wordmark
    --brand-sub <text>       Second line of the lock-screen wordmark
    --iterations <n>         PBKDF2 iterations (default ${DEFAULTS.iterations.toLocaleString("en-GB")})
    --passphrase-file <f>    Read the passphrase from a file instead of prompting
    --no-obfuscate           Minify only, skip the obfuscation pass
    --no-compress            Do not gzip the payload before encrypting
    --gen-passphrase         Print a fresh 100-bit passphrase and exit
    -h, --help               This message

  The passphrase comes from --passphrase-file, then $OFFER_LOCK_PASSPHRASE,
  then an interactive prompt. It is never stored by this script.
`;

/* ------------------------------------------------------------- passphrase */
// Crockford-style alphabet: no I, L, O or U, so nothing is misread or
// accidentally turned into a rude word. 20 characters × 5 bits = 100 bits.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function generatePassphrase(groups = 5, perGroup = 4) {
  const n = groups * perGroup;
  const chars = [];
  // Rejection sampling keeps every character equally likely (256 % 32 === 0
  // here, so this never actually rejects, but the guard survives edits).
  while (chars.length < n) {
    for (const byte of randomBytes(n)) {
      if (byte >= 256 - (256 % ALPHABET.length)) continue;
      chars.push(ALPHABET[byte % ALPHABET.length]);
      if (chars.length === n) break;
    }
  }
  return chars.join("").match(new RegExp(`.{1,${perGroup}}`, "g")).join("-");
}

function promptHidden(question) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      if (["\n", "\r", ""].includes(String(char))) process.stdin.removeListener("data", onData);
      else process.stdout.write("\x1B[2K\x1B[200D" + question + "*".repeat(rl.line.length));
    };
    process.stdin.on("data", onData);
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      res(answer);
    });
  });
}

async function resolvePassphrase(opts) {
  if (opts.passphraseFile) {
    const p = resolve(opts.passphraseFile);
    if (!existsSync(p)) fail(`Passphrase file not found: ${p}`);
    const v = readFileSync(p, "utf8").trim();
    if (!v) fail("Passphrase file is empty.");
    return v;
  }
  if (process.env.OFFER_LOCK_PASSPHRASE) return process.env.OFFER_LOCK_PASSPHRASE.trim();
  if (!process.stdin.isTTY) fail("No passphrase. Use --passphrase-file or set OFFER_LOCK_PASSPHRASE.");
  const a = await promptHidden("  Passphrase: ");
  const b = await promptHidden("     Confirm: ");
  if (!a) fail("Passphrase cannot be empty.");
  if (a !== b) fail("The two entries did not match.");
  return a;
}

// Rough strength read, used only to warn. An offline attacker gets unlimited
// guesses against the file, so a weak passphrase undoes everything above it.
function estimateBits(pass) {
  let pool = 0;
  if (/[a-z]/.test(pass)) pool += 26;
  if (/[A-Z]/.test(pass)) pool += 26;
  if (/[0-9]/.test(pass)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pass)) pool += 33;
  const unique = new Set(pass).size;
  // Penalise repetition: "aaaaaaaaaaaa" is long but not strong.
  const effective = Math.min(pass.length, unique * 2.5);
  return Math.round(effective * Math.log2(Math.max(pool, 2)));
}

/* ------------------------------------------------------------ source read */
const SOURCES = ["index.html", "styles.css", "calc.js", "app.js"];

function readSources(srcDir) {
  const dir = resolve(srcDir);
  if (!existsSync(dir)) {
    fail(
      `Source folder not found: ${dir}\n` +
      `    Put the unpacked "Offer Sheet INT" folder there, or pass --src <dir>.`
    );
  }
  const files = {};
  for (const name of SOURCES) {
    const p = join(dir, name);
    if (!existsSync(p)) fail(`Missing ${name} in ${dir}`);
    files[name] = readFileSync(p, "utf8");
  }
  return files;
}

/* ------------------------------------------------------------ JS pipeline */
// calc.js and app.js are plain classic scripts that share the global scope
// (app.js reads calc.js's `XL`). Concatenating them and mangling as ONE unit
// keeps that reference consistent — minifying them separately would rename
// `XL` in one file and not the other.
async function buildBundle(files, { obfuscate, banner }) {
  const source = [files["calc.js"], files["app.js"]].join("\n;\n");

  const minified = await minify(source, {
    ecma: 2020,
    compress: { passes: 2, drop_debugger: true },
    // toplevel is safe here: nothing outside the bundle references these names
    // (no inline handlers in the HTML, no window.* exports, no eval).
    mangle: { toplevel: true },
    format: { comments: false },
  });
  if (minified.error) throw minified.error;
  let code = minified.code;

  if (obfuscate) {
    // Deliberately conservative. controlFlowFlattening and deadCodeInjection
    // buy little against anyone who already has the passphrase and cost real
    // runtime performance in a UI this interactive, so they stay off.
    code = JsObfuscator.obfuscate(code, {
      compact: true,
      identifierNamesGenerator: "mangled-shuffled",
      renameGlobals: false,
      selfDefending: false,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      numbersToExpressions: true,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 12,
      stringArray: true,
      stringArrayThreshold: 0.85,
      stringArrayEncoding: ["base64"],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 3,
      stringArrayWrappersType: "function",
      unicodeEscapeSequence: false,
    }).getObfuscatedCode();
  }

  // Prepend after obfuscation — the obfuscator strips comments, so a banner
  // added earlier would not survive.
  return `/*! ${banner} */\n${code}`;
}

/* ---------------------------------------------------------- HTML assembly */
// Strip the <link> and the two <script src> tags: the shell injects the CSS
// and the bundle as DOM nodes after unlocking, so the payload HTML must not
// try to fetch anything from disk.
function stripLocalAssets(html) {
  const before = html;
  const out = html
    .replace(/[ \t]*<link\s+rel=["']stylesheet["'][^>]*>\s*\n?/gi, "")
    .replace(/[ \t]*<script\s+src=["']\.\/(?:calc|app)\.js["']\s*>\s*<\/script>\s*\n?/gi, "");
  if (out === before) fail("Could not find the stylesheet/script tags in index.html — has it changed?");
  if (/<script\s+src=/i.test(out) || /<link\s+rel=["']stylesheet["']/i.test(out)) {
    fail("index.html still references an external asset after stripping. Check for new files.");
  }
  return out;
}

// Authorship, inside the encrypted payload rather than the shell — so it
// cannot be edited out without the passphrase. The sidebar is display:none in
// the print stylesheet, so this never lands on a customer's offersheet PDF.
function injectCredit(html, { owner, year, buildId }) {
  const credit =
    `\n          <div class="owner-credit" role="contentinfo">` +
    `<span>© ${year} ${escapeHtml(owner)}</span>` +
    `<span>Licensed copy · not for redistribution</span>` +
    `<span class="owner-credit-build">Build ${escapeHtml(buildId)}</span>` +
    `</div>`;

  const anchor = /(<div class="build-tag"[^>]*>[\s\S]*?<\/div>)/i;
  if (!anchor.test(html)) fail("Could not find the sidebar build tag to anchor the credit to.");
  return html.replace(anchor, `$1${credit}`);
}

const CREDIT_CSS = `
/* --- licence / authorship credit (added by offer-lock) --- */
.owner-credit { margin: 0 0 8px; padding: 7px 8px; border-radius: 7px; background: var(--mint-50, #f2f8f6);
  border: 1px solid var(--line, #d9e5e0); font-size: 9.5px; line-height: 1.5; color: var(--muted, #5d726b); }
.owner-credit span { display: block; }
.owner-credit span:first-child { font-weight: 700; color: var(--ink, #14201c); }
.owner-credit-build { margin-top: 2px; opacity: .7; letter-spacing: .03em; }
body.nav-collapsed .owner-credit { display: none; }
@media print { .owner-credit { display: none !important; } }
`;

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));

function fillTemplate(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`__${key}__`).join(value);
  }
  const leftover = out.match(/__[A-Z_]{3,}__/g);
  if (leftover) fail(`Template placeholder(s) left unfilled: ${[...new Set(leftover)].join(", ")}`);
  return out;
}

/* ------------------------------------------------------------------- main */
async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts._flags.has("help")) { console.log(HELP); return; }
  if (opts._flags.has("gen")) {
    const p = generatePassphrase();
    console.log(`\n  ${p}\n\n  100 bits of entropy. Store it in a password manager — if it is lost,\n  the locked file cannot be recovered by anyone, including you.\n`);
    return;
  }

  if (!Number.isFinite(opts.iterations) || opts.iterations < 100_000) {
    fail("--iterations must be a number and at least 100000.");
  }

  const passphrase = await resolvePassphrase(opts);
  const bits = estimateBits(passphrase);
  if (bits < 60) {
    console.warn(
      `\n  ! That passphrase is weak (~${bits} bits). Everything here rests on it —\n` +
      `    an attacker with the file gets unlimited offline guesses. Run\n` +
      `    "node build.mjs --gen-passphrase" for a strong one.\n`
    );
  }

  const t0 = Date.now();
  const year = new Date().getFullYear();
  const buildId = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(3).toString("hex").toUpperCase()}`;

  console.log(`\n  offer-lock\n  ${"─".repeat(58)}`);

  /* 1. read + bundle ------------------------------------------------------ */
  const files = readSources(opts.src);
  const rawBytes = SOURCES.reduce((n, f) => n + Buffer.byteLength(files[f]), 0);
  console.log(`  source        ${SOURCES.length} files, ${kb(rawBytes)}`);

  const banner = `${opts.title} — © ${year} ${opts.owner}. Licensed copy, not for redistribution. Build ${buildId}`;
  const js = await buildBundle(files, { obfuscate: opts.obfuscate, banner });
  console.log(`  javascript    ${kb(Buffer.byteLength(js))} ${opts.obfuscate ? "(minified + obfuscated)" : "(minified)"}`);

  let html = stripLocalAssets(files["index.html"]);
  html = injectCredit(html, { owner: opts.owner, year, buildId });
  const css = files["styles.css"] + CREDIT_CSS;

  /* 2. payload ------------------------------------------------------------ */
  const payload = Buffer.from(JSON.stringify({ html, css, js, title: opts.title, owner: opts.owner, build: buildId }), "utf8");
  const sha256 = createHash("sha256").update(payload).digest("hex");

  const body = opts.compress
    ? gzipSync(payload, { level: zlibConstants.Z_BEST_COMPRESSION })
    : payload;
  console.log(`  payload       ${kb(payload.length)}${opts.compress ? ` → ${kb(body.length)} gzipped` : ""}`);

  /* 3. encrypt ------------------------------------------------------------ */
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(Buffer.from(passphrase, "utf8"), salt, opts.iterations, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  // WebCrypto expects the 16-byte GCM tag appended to the ciphertext.
  const ciphertext = Buffer.concat([cipher.update(body), cipher.final(), cipher.getAuthTag()]);
  key.fill(0);
  console.log(`  encryption    AES-256-GCM · PBKDF2-SHA256 × ${opts.iterations.toLocaleString("en-GB")}`);

  /* 4. shell -------------------------------------------------------------- */
  const template = readFileSync(join(HERE, "templates", "shell.html"), "utf8");
  const config = {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations: opts.iterations,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    cipher: "AES-256-GCM",
    compressed: opts.compress,
    sha256,
    build: buildId,
  };

  const outHtml = fillTemplate(template, {
    TITLE: escapeHtml(opts.title),
    OWNER: escapeHtml(opts.owner),
    COPYRIGHT: `© ${year} ${escapeHtml(opts.owner)}. All rights reserved.`,
    BRAND_TOP: escapeHtml(opts.brandTop),
    BRAND_SUB: escapeHtml(opts.brandSub),
    BUILD_ID: escapeHtml(buildId),
    CONFIG_JSON: JSON.stringify(config),
    PAYLOAD_B64: ciphertext.toString("base64"),
  });

  const outPath = resolve(opts.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, outHtml, "utf8");

  /* 5. report ------------------------------------------------------------- */
  const outBytes = Buffer.byteLength(outHtml);
  console.log(`  ${"─".repeat(58)}`);
  console.log(`  ✓ ${basename(outPath)}`);
  console.log(`    ${outPath}`);
  console.log(`    ${kb(outBytes)} · build ${buildId} · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`    file sha256 ${createHash("sha256").update(outHtml).digest("hex")}`);
  console.log(`\n  Send this one file. Send the passphrase separately, by another route.\n`);
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

main().catch((err) => {
  console.error(`\n  ✗ Build failed: ${err && err.stack ? err.stack : err}\n`);
  process.exit(1);
});
