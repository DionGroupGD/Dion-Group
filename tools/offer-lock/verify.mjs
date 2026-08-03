#!/usr/bin/env node
/* ============================================================================
   verify.mjs — prove a locked build is both sealed and still the same app.

   Run this after every rebuild. It drives a real Chromium over file:// (the
   way a colleague actually opens the file) and checks two things that matter
   in opposite directions:

     sealed   — no source text survives in plaintext, a wrong passphrase gets
                nowhere, and a single flipped byte makes the file refuse to open
     intact   — the unlocked app renders byte-identical to the unminified
                original, saves to localStorage, and still backs up and restores

   Usage:
     node verify.mjs --locked "./dist/Offer Sheet INT (Locked).html" \
                     --src "./src/Offer Sheet INT"
     (passphrase from --passphrase, or $OFFER_LOCK_PASSPHRASE)
   ============================================================================ */

import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { chromium } from "playwright-core";

const HERE = dirname(fileURLToPath(import.meta.url));

const opts = {
  locked: join(HERE, "dist", "Offer Sheet INT (Locked).html"),
  src: join(HERE, "src", "Offer Sheet INT"),
  passphrase: process.env.OFFER_LOCK_PASSPHRASE || "",
  headed: false,
};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--locked") opts.locked = process.argv[++i];
  else if (a === "--src") opts.src = process.argv[++i];
  else if (a === "--passphrase") opts.passphrase = process.argv[++i];
  else if (a === "--headed") opts.headed = true;
}
if (!opts.passphrase) {
  console.error("\n  ✗ No passphrase. Pass --passphrase or set OFFER_LOCK_PASSPHRASE.\n");
  process.exit(1);
}

/* ------------------------------------------------------------- test harness */
const results = [];
let failures = 0;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  const mark = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`  ${mark} ${name}${detail && !ok ? `\n      ${detail}` : ""}`);
}
const section = (t) => console.log(`\n  \x1b[1m${t}\x1b[0m`);

/* --------------------------------------------------- determinism injection */
// Freeze the clock and the RNG so the original and the locked build produce
// literally the same markup — otherwise every comparison drowns in timestamps
// and generated ids.
const DETERMINISM = `
(() => {
  const FIXED = 1768470600000; // 2026-01-15T09:30:00Z
  const Real = Date;
  const Stub = function (...args) {
    return args.length === 0 ? new Real(FIXED) : new Real(...args);
  };
  Stub.prototype = Real.prototype;
  Stub.now = () => FIXED;
  Stub.parse = Real.parse;
  Stub.UTC = Real.UTC;
  window.Date = Stub;
  let seed = 1;
  Math.random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
})();
`;

async function newPage(browser) {
  const context = await browser.newContext({ acceptDownloads: true });
  await context.addInitScript(DETERMINISM);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  return { context, page, errors };
}

/* ------------------------------------------------------------ app driving */
// The same scripted tour, run against both builds. Everything it captures has
// to match exactly.
async function tour(page) {
  const snap = {};
  const content = async () => (await page.locator("#app-content").innerHTML()).trim();

  await page.waitForSelector("#app-content .page-heading, #app-content", { timeout: 15000 });
  await page.waitForTimeout(250);
  snap.offers = await content();

  for (const nav of ["catalogue", "freight", "settings"]) {
    await page.click(`.nav-item[data-nav="${nav}"]`);
    await page.waitForTimeout(200);
    snap[nav] = await content();
  }

  await page.click(`.nav-item[data-nav="offers"]`);
  await page.waitForTimeout(200);

  // Build an offer and walk the six steps — this is where calc.js actually
  // gets exercised (quantities, costing, freight, pricing, offersheet).
  await page.click('[data-action="new-offer"]');
  await page.waitForTimeout(350);
  snap.builderStep1 = await content();

  const fill = async (selector, value) => {
    const el = page.locator(selector).first();
    if (await el.count()) { await el.fill(value); await el.dispatchEvent("change"); }
  };
  await fill('input[data-offer-field="customer"]', "Acme Foods BV");
  await fill('input[data-offer-field="country"]', "Netherlands");
  await page.waitForTimeout(250);
  snap.builderStep1Filled = await content();

  // Step through whatever the stepper offers, capturing each screen.
  const steps = await page.locator(".builder-stepper button, .step-rail button").count();
  for (let i = 0; i < Math.min(steps, 8); i++) {
    const btn = page.locator(".builder-stepper button, .step-rail button").nth(i);
    if (!(await btn.isVisible().catch(() => false))) continue;
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(220);
    snap[`step_${i}`] = await content();
  }

  snap.localStorageKeys = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith("offerv2.")).sort().join(",")
  );
  snap.offersStored = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("offerv2.offers") || "[]").length; }
    catch { return -1; }
  });
  return snap;
}

async function unlock(page, passphrase) {
  await page.fill("#pw", passphrase);
  await page.click("#go");
  await page.waitForSelector(".app-shell .primary-nav", { timeout: 60000 });
}

/* -------------------------------------------------------------------- main */
const lockedPath = resolve(opts.locked);
const srcIndex = resolve(join(opts.src, "index.html"));
const lockedHtml = readFileSync(lockedPath, "utf8");
const tmp = mkdtempSync(join(tmpdir(), "offer-lock-verify-"));

console.log(`\n  offer-lock · verification\n  ${"─".repeat(58)}`);
console.log(`  locked  ${lockedPath}`);
console.log(`  source  ${resolve(opts.src)}`);

/* ---- 1. sealed on disk ---------------------------------------------------- */
section("Sealed on disk");

const FINGERPRINTS = [
  ["engine comment", "Excel-faithful calculation engine"],
  ["storage keys", "offerv2.offers"],
  ["company default", "Intercomm Foods S.A."],
  ["function name", "function exportBackup"],
  ["function name", "offersheetLines"],
  ["incoterm data", "Free Alongside Ship"],
  ["css selector", ".builder-stepper"],
  ["olive logic", "whole-olives"],
];
for (const [kind, needle] of FINGERPRINTS) {
  check(`no plaintext leak — ${kind}: "${needle.slice(0, 34)}"`, !lockedHtml.includes(needle));
}

// Sample real lines out of the sources and prove none of them survive. The
// unlock shell legitimately repeats a few boilerplate <head> lines (viewport,
// cache headers, title, favicon), so anything the template already contains is
// not a leak — everything else must be gone.
const shellTemplate = readFileSync(join(HERE, "templates", "shell.html"), "utf8");
let sampled = 0;
const leaks = [];
for (const f of ["index.html", "styles.css", "calc.js", "app.js"]) {
  const text = readFileSync(join(resolve(opts.src), f), "utf8");
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 45);
  for (let i = 0; i < lines.length; i += Math.max(1, Math.floor(lines.length / 60))) {
    const line = lines[i];
    if (shellTemplate.includes(line)) continue;   // shared shell boilerplate
    if (/^<title>.*<\/title>$/i.test(line)) continue; // the tab title is meant to be visible
    sampled++;
    if (lockedHtml.includes(line)) leaks.push(`${f}: ${line.slice(0, 60)}`);
  }
}
check(`no source line survives (${sampled} sampled from all 4 files)`, leaks.length === 0, leaks.slice(0, 3).join(" | "));

check("self-contained — no external <script src>", !/<script\s+[^>]*src=/i.test(lockedHtml));
check("self-contained — no external stylesheet", !/<link\s+[^>]*rel=["']stylesheet["']/i.test(lockedHtml));
// Nothing may be fetched over the network: the file has to work fully offline,
// and must not be able to phone anything home. (The favicon is a data: URI
// whose SVG namespace is an http:// identifier, not a request — hence the
// attribute-level check rather than a bare string search.)
const remoteRefs = [...lockedHtml.matchAll(/\b(?:src|href|action|data)\s*=\s*["'](https?:)?\/\/[^"']+/gi)].map((m) => m[0]);
check("no remote resource is referenced", remoteRefs.length === 0, remoteRefs.slice(0, 2).join(" | "));
check("authorship notice present in plaintext", /All rights reserved/i.test(lockedHtml) && /<meta name="author"/i.test(lockedHtml));
check("declares AES-256-GCM + PBKDF2 params", /"cipher":"AES-256-GCM"/.test(lockedHtml) && /"iterations":\d{6,}/.test(lockedHtml));

const iterMatch = lockedHtml.match(/"iterations":(\d+)/);
check(`PBKDF2 iterations >= 600,000 (found ${iterMatch ? Number(iterMatch[1]).toLocaleString("en-GB") : "none"})`,
  !!iterMatch && Number(iterMatch[1]) >= 600_000);

/* ---- 2. browser behaviour ------------------------------------------------- */
function findChromium() {
  const candidates = [
    process.env.PW_CHROMIUM_PATH,
    "/opt/pw-browsers/chromium",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  return undefined; // fall back to whatever playwright resolves
}

const browser = await chromium.launch({
  headless: !opts.headed,
  executablePath: findChromium(),
});

try {
  section("Locked file in the browser");
  {
    const { context, page, errors } = await newPage(browser);
    await page.goto(pathToFileURL(lockedPath).href);
    await page.waitForSelector("#lock-form", { timeout: 15000 });

    check("shows the unlock screen", await page.locator("#lock-form").isVisible());
    check("app DOM absent before unlocking", (await page.locator(".app-shell").count()) === 0);
    check("owner credit shown on the lock screen", /All rights reserved/i.test(await page.locator(".lock-foot").innerText()));
    check("ciphertext is in the DOM as inert text", (await page.locator("#lock-data").count()) === 1);

    // Wrong passphrase.
    await page.fill("#pw", "definitely-not-the-passphrase");
    await page.click("#go");
    await page.waitForSelector("#msg.show", { timeout: 60000 });
    check("wrong passphrase is rejected", /incorrect/i.test(await page.locator("#msg").innerText()));
    check("still locked after a wrong passphrase", (await page.locator(".app-shell").count()) === 0);

    // Right passphrase.
    await page.waitForTimeout(300);
    await page.fill("#pw", opts.passphrase);
    await page.click("#go");
    await page.waitForSelector(".app-shell .primary-nav", { timeout: 60000 });
    check("correct passphrase boots the app", await page.locator(".primary-nav").isVisible());
    check("ciphertext removed from the DOM after boot", (await page.locator("#lock-data").count()) === 0);

    const credit = page.locator(".owner-credit");
    check("authorship credit rendered inside the app", (await credit.count()) === 1 && /All rights reserved|©/.test(await credit.innerText()));

    await page.emulateMedia({ media: "print" });
    const printed = await credit.evaluate((el) => getComputedStyle(el).display);
    await page.emulateMedia({ media: "screen" });
    check("credit hidden when printing an offersheet", printed === "none", `display was "${printed}"`);

    check("no JavaScript errors while unlocking", errors.length === 0, errors.slice(0, 3).join(" | "));
    await context.close();
  }

  /* ---- 3. tamper detection ------------------------------------------------ */
  section("Tamper detection");
  {
    // Flip one base64 character of the ciphertext.
    const m = lockedHtml.match(/(<script id="lock-data" type="text\/plain">)([\s\S]*?)(<\/script>)/);
    if (!m) {
      check("could locate the ciphertext block to tamper with", false);
    } else {
      const b64 = m[2];
      const at = Math.floor(b64.length / 2);
      const flipped = b64[at] === "A" ? "B" : "A";
      const tampered = lockedHtml.replace(m[0], `${m[1]}${b64.slice(0, at)}${flipped}${b64.slice(at + 1)}${m[3]}`);
      const tamperedPath = join(tmp, "tampered.html");
      writeFileSync(tamperedPath, tampered, "utf8");

      const { context, page } = await newPage(browser);
      await page.goto(pathToFileURL(tamperedPath).href);
      await page.waitForSelector("#lock-form");
      await page.fill("#pw", opts.passphrase);
      await page.click("#go");
      await page.waitForSelector("#msg.show", { timeout: 60000 });
      const text = await page.locator("#msg").innerText();
      check("one flipped byte makes the file refuse to open", (await page.locator(".app-shell").count()) === 0);
      check("failure is reported, not silently ignored", /incorrect|altered|trusted/i.test(text), text);
      await context.close();
    }
  }

  /* ---- 4. parity with the original ---------------------------------------- */
  section("Behaviour matches the unprotected original");
  let lockedSnap, originalSnap;
  {
    const { context, page, errors } = await newPage(browser);
    await page.goto(pathToFileURL(srcIndex).href);
    originalSnap = await tour(page);
    check("original app runs without errors", errors.length === 0, errors.slice(0, 3).join(" | "));
    await context.close();
  }
  {
    const { context, page, errors } = await newPage(browser);
    await page.goto(pathToFileURL(lockedPath).href);
    await page.waitForSelector("#lock-form");
    await unlock(page, opts.passphrase);
    lockedSnap = await tour(page);
    check("locked app runs without errors", errors.length === 0, errors.slice(0, 3).join(" | "));
    await context.close();
  }

  const keys = [...new Set([...Object.keys(originalSnap), ...Object.keys(lockedSnap)])];

  // Guard against a vacuous pass: identical snapshots mean nothing if the tour
  // never rendered anything, or if every screen was the same screen.
  const screens = keys.filter((k) => typeof lockedSnap[k] === "string" && k !== "localStorageKeys");
  const smallest = Math.min(...screens.map((k) => (lockedSnap[k] || "").length));
  check(`the tour actually rendered (${screens.length} screens, smallest ${smallest} chars)`,
    screens.length >= 10 && smallest > 500, `smallest screen was ${smallest} chars`);
  const distinct = new Set(screens.map((k) => lockedSnap[k])).size;
  check(`the tour visited distinct screens (${distinct} unique of ${screens.length})`, distinct >= 6);

  const mismatches = keys.filter((k) => originalSnap[k] !== lockedSnap[k]);
  check(
    `every captured screen is identical (${keys.length} checkpoints)`,
    mismatches.length === 0,
    mismatches.length ? `differs at: ${mismatches.join(", ")}` : ""
  );
  check("data persisted to localStorage", (lockedSnap.localStorageKeys || "").includes("offerv2.offers"));
  check("offer written and read back", lockedSnap.offersStored >= 1, `stored ${lockedSnap.offersStored}`);

  /* ---- 5. backup + restore ------------------------------------------------ */
  section("Backup and restore still work");
  {
    const { context, page, errors } = await newPage(browser);
    await page.goto(pathToFileURL(lockedPath).href);
    await page.waitForSelector("#lock-form");
    await unlock(page, opts.passphrase);

    // Seed one offer so the backup has something in it.
    await page.click('[data-action="new-offer"]');
    await page.waitForTimeout(300);
    const cust = page.locator('input[data-offer-field="customer"]').first();
    if (await cust.count()) { await cust.fill("Backup Test Ltd"); await cust.dispatchEvent("change"); }
    await page.waitForTimeout(200);
    await page.click('.nav-item[data-nav="offers"]');
    await page.waitForTimeout(300);

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20000 }),
      page.click('[data-action="export-backup"]'),
    ]);
    const backupPath = join(tmp, "backup.json");
    await download.saveAs(backupPath);
    const backup = JSON.parse(readFileSync(backupPath, "utf8"));
    check("Backup downloads a .json file", /^offer-builder-backup-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), download.suggestedFilename());
    check("backup is a valid Offer Builder payload", backup.app === "offer-builder" && Array.isArray(backup.offers));
    check("backup contains the seeded offer", JSON.stringify(backup.offers).includes("Backup Test Ltd"));

    // Wipe, then restore from the file.
    await page.evaluate(() => { localStorage.clear(); });
    await page.reload();
    await page.waitForSelector("#lock-form");
    await unlock(page, opts.passphrase);
    check("clean slate after clearing storage", (await page.evaluate(() =>
      JSON.parse(localStorage.getItem("offerv2.offers") || "[]").length)) === 0);

    page.on("dialog", (d) => d.accept());
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 20000 }),
      page.click('[data-action="import-backup"]'),
    ]);
    await chooser.setFiles(backupPath);
    await page.waitForTimeout(1200);
    const restored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("offerv2.offers") || "[]"));
    check("Restore loads the backup back in", restored.length === 1, `got ${restored.length} offers`);
    check("restored offer keeps its data", JSON.stringify(restored).includes("Backup Test Ltd"));
    check("no errors during backup/restore", errors.length === 0, errors.slice(0, 3).join(" | "));
    await context.close();
  }
} finally {
  await browser.close();
  rmSync(tmp, { recursive: true, force: true });
}

/* ------------------------------------------------------------------ report */
console.log(`\n  ${"─".repeat(58)}`);
if (failures === 0) {
  console.log(`  \x1b[32m✓ all ${results.length} checks passed\x1b[0m — the build is sealed and intact.\n`);
} else {
  console.log(`  \x1b[31m✗ ${failures} of ${results.length} checks failed\x1b[0m\n`);
  for (const r of results.filter((r) => !r.ok)) console.log(`      · ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
  console.log("");
}
process.exit(failures === 0 ? 0 : 1);
