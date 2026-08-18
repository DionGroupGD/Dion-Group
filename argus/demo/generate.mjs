/* Generates the Argus sample dataset: two years of order lines for a Greek
   meat producer/distributor. Deterministic (seeded), so the demo board looks
   the same for everyone.

   Run:  node argus/demo/generate.mjs
   Out:  argus/demo/kasidis-sales.json

   This is synthetic data for demonstration only. No customer, price or volume
   here comes from a real company. */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = dirname(fileURLToPath(import.meta.url));

/* ---------- seeded rng ---------- */

function mulberry32(seed) {
  return function rng() {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260818);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const between = (lo, hi) => lo + rng() * (hi - lo);
const jitter = (v, pct) => v * (1 + between(-pct, pct));

/* ---------- reference data ---------- */

const CHANNELS = [
  { name: 'Εστίαση',      weight: 0.31, margin: [0.19, 0.26], summer: 1.18, orderKg: [40, 260] },
  { name: 'Ξενοδοχεία',   weight: 0.19, margin: [0.17, 0.24], summer: 2.30, orderKg: [80, 520] },
  { name: 'Super Market', weight: 0.24, margin: [0.11, 0.16], summer: 1.02, orderKg: [180, 1400] },
  { name: 'Χονδρική',     weight: 0.16, margin: [0.09, 0.14], summer: 1.00, orderKg: [200, 1800] },
  { name: 'Εξαγωγές',     weight: 0.10, margin: [0.14, 0.21], summer: 0.95, orderKg: [400, 3200] },
];

const REGIONS = {
  'Εστίαση':      ['Θεσσαλία', 'Αττική', 'Κεντρική Μακεδονία', 'Ήπειρος', 'Πελοπόννησος', 'Κρήτη'],
  'Ξενοδοχεία':   ['Κρήτη', 'Νησιά Αιγαίου', 'Ιόνια Νησιά', 'Χαλκιδική', 'Πελοπόννησος', 'Αττική'],
  'Super Market': ['Αττική', 'Κεντρική Μακεδονία', 'Θεσσαλία', 'Πελοπόννησος', 'Κρήτη'],
  'Χονδρική':     ['Θεσσαλία', 'Κεντρική Μακεδονία', 'Ήπειρος', 'Δυτική Ελλάδα', 'Αττική'],
  'Εξαγωγές':     ['Ιταλία', 'Γερμανία', 'Κύπρος', 'Βουλγαρία', 'Ρουμανία', 'Ην. Βασίλειο'],
};

const CATEGORIES = [
  {
    name: 'Μοσχάρι', share: 0.34, price: [9.2, 13.4],
    products: ['Μοσχάρι Σπάλα', 'Μοσχάρι Κιλότο', 'Μοσχάρι Ελιά', 'Μοσχαρίσιος Κιμάς', 'Μοσχάρι Μπριζόλα', 'Μοσχάρι Ποντίκι'],
    season: (m) => (m === 11 ? 1.22 : m === 3 ? 1.10 : 1),
  },
  {
    name: 'Χοιρινό', share: 0.26, price: [4.4, 7.1],
    products: ['Χοιρινό Λαιμός', 'Χοιρινή Πανσέτα', 'Χοιρινό Μπούτι', 'Χοιρινές Μπριζόλες', 'Χοιρινός Κιμάς'],
    season: (m) => (m === 11 ? 1.35 : m === 6 || m === 7 ? 1.15 : 1),
  },
  {
    name: 'Αρνί & Κατσίκι', share: 0.14, price: [8.1, 12.6],
    products: ['Αρνί Ολόκληρο', 'Αρνίσια Παϊδάκια', 'Κατσίκι Ολόκληρο', 'Αρνί Μπούτι', 'Κοκορέτσι'],
    // Easter is the whole year for lamb; Christmas is a distant second.
    season: (m, easterWeeks) => (easterWeeks <= 2 ? 5.4 : easterWeeks <= 5 ? 2.1 : m === 11 ? 1.45 : 0.72),
  },
  {
    name: 'Πουλερικά', share: 0.16, price: [3.4, 5.9],
    products: ['Κοτόπουλο Στήθος', 'Κοτόπουλο Μπούτι', 'Γαλοπούλα Φιλέτο', 'Κοτόπουλο Ολόκληρο'],
    season: (m) => (m === 11 ? 1.3 : 1),
  },
  {
    name: 'Παρασκευάσματα', share: 0.10, price: [5.6, 9.4],
    products: ['Μπιφτέκια Μοσχαρίσια', 'Σουβλάκι Χοιρινό', 'Γύρος Χοιρινός', 'Λουκάνικα Χωριάτικα', 'Κεμπάπ'],
    season: (m) => (m >= 4 && m <= 8 ? 1.28 : 1),
  },
];

const CUSTOMER_STEMS = {
  'Εστίαση': ['Ταβέρνα Ο Πλάτανος', 'Ψητοπωλείο Αθηναϊκόν', 'Εστιατόριο Θέα', 'Grill House Λάρισα', 'Μεζεδοπωλείο Στου Γιάννη',
    'Ουζερί Θαλασσινό', 'Steakhouse Prime', 'Ψησταριά Ολύμπιον', 'Bistro Aegean', 'Ταβέρνα Ελιά', 'Καφε-Εστιατόριο Κεντρικόν',
    'Ψητοπωλείο Ο Θόδωρος', 'Trattoria Nostra', 'Σχάρα & Σούβλα', 'Εστιατόριο Πηνειός', 'Burger Yard', 'Ταβέρνα Αμπέλι',
    'Κουζίνα 1885', 'Meat Bar Θεσσαλονίκη', 'Ψησταριά Ζάρκο'],
  'Ξενοδοχεία': ['Blue Palace Resort', 'Olympus Grand Hotel', 'Aegean Bay Suites', 'Creta Mare Hotel', 'Thalassa Beach Resort',
    'Meteora View Hotel', 'Ionian Pearl Resort', 'Halkidiki Sun Hotel', 'Athens Central Hotel', 'Santorini Cliff Suites',
    'Rhodes Palm Resort', 'Corfu Bay Hotel', 'Pelion Mountain Lodge', 'Kos Blue Lagoon', 'Riviera Athens Hotel'],
  'Super Market': ['Market Δέλτα ΑΕ', 'Alfa Stores', 'Σούπερ Μάρκετ Ήλιος', 'FreshMart Hellas', 'Οικογένεια Market',
    'City Market ΑΕΒΕ', 'Economy Stores', 'Κρίκος Market', 'Λαϊκή Αγορά ΑΕ', 'Prima Stores', 'Νέα Αγορά ΑΕΒΕ'],
  'Χονδρική': ['Κρεαταγορά Θεσσαλίας', 'Χονδρεμπόριο Βορρά ΑΕ', 'Distribution Λαμία', 'Meat Supply Hellas',
    'Αφοι Παπαδάκη ΟΕ', 'Κεντρική Διανομή Ηπείρου', 'Κρεατεμπορική Αττικής', 'Πελοπόννησος Foods ΑΕ',
    'Aegean Meat Logistics', 'Βορράς Τρόφιμα ΑΕΒΕ'],
  'Εξαγωγές': ['Carni Italia SRL', 'Balkan Foods EOOD', 'Cyprus Meat Traders', 'Deutsche Fleisch GmbH',
    'RO Food Distribution', 'Albion Meats Ltd', 'Adriatic Food Group', 'Nordic Meat Import AB'],
};

/* ---------- calendar ---------- */

const ORTHODOX_EASTER = [Date.UTC(2024, 4, 5), Date.UTC(2025, 3, 20), Date.UTC(2026, 3, 12)];
const DAY = 86400000;

/** Weeks until the next Orthodox Easter (0 = Easter week). */
function weeksToEaster(ms) {
  let best = 99;
  for (const e of ORTHODOX_EASTER) {
    const diff = (e - ms) / (DAY * 7);
    if (diff >= -0.6 && diff < best) best = diff;
  }
  return Math.max(0, best);
}

function isSummer(month) { return month >= 5 && month <= 8; }

/* ---------- customers ---------- */

const customers = [];
let cid = 1;
for (const ch of CHANNELS) {
  for (const stem of CUSTOMER_STEMS[ch.name]) {
    customers.push({
      name: stem,
      channel: ch.name,
      region: pick(REGIONS[ch.name]),
      // Persistent per-customer size and price position.
      size: between(0.45, 2.4),
      priceIndex: between(0.94, 1.07),
      // A few accounts churn or ramp during the window.
      startShift: rng() < 0.12 ? between(0.15, 0.5) : 0,
      endShift: rng() < 0.10 ? between(0.55, 0.9) : 1,
      code: `K${String(cid++).padStart(4, '0')}`,
    });
  }
}

/* ---------- generation ---------- */

const START = Date.UTC(2024, 7, 1);   // 1 Aug 2024
const END = Date.UTC(2026, 7, 17);    // 17 Aug 2026
const SPAN = (END - START) / DAY;

const rows = [];
let orderSeq = 4100;

for (let day = 0; day <= SPAN; day++) {
  const ms = START + day * DAY;
  const d = new Date(ms);
  const dow = d.getUTCDay();
  const month = d.getUTCMonth();
  if (dow === 0) continue;             // no Sunday dispatch
  const satFactor = dow === 6 ? 0.35 : 1;

  const easterWeeks = weeksToEaster(ms);
  // 8% annual growth, applied smoothly across the window.
  const growth = 1 + 0.08 * (day / 365);
  const noise = jitter(1, 0.16);

  for (const customer of customers) {
    const progress = day / SPAN;
    if (progress < customer.startShift || progress > customer.endShift) continue;

    const channel = CHANNELS.find((c) => c.name === customer.channel);
    const seasonal = isSummer(month) ? channel.summer : 1;
    // Order frequency: bigger accounts order more often.
    const chance = 0.135 * customer.size * seasonal * satFactor * (channel.name === 'Εξαγωγές' ? 0.55 : 1);
    if (rng() > chance) continue;

    const orderId = `ΠΑΡ-${d.getUTCFullYear()}-${String(orderSeq++).padStart(5, '0')}`;
    const lineCount = 1 + Math.floor(rng() * (channel.name === 'Super Market' || channel.name === 'Εξαγωγές' ? 4 : 3));
    const usedProducts = new Set();

    for (let l = 0; l < lineCount; l++) {
      // Category chosen by share, then nudged by season.
      let roll = rng();
      let category = CATEGORIES[CATEGORIES.length - 1];
      for (const c of CATEGORIES) {
        const weight = c.share * c.season(month, easterWeeks);
        if (roll < weight) { category = c; break; }
        roll -= weight;
      }

      const product = pick(category.products);
      const dedupe = `${category.name}|${product}`;
      if (usedProducts.has(dedupe)) continue;
      usedProducts.add(dedupe);

      const seasonMul = category.season(month, easterWeeks);
      const kgBase = (between(channel.orderKg[0], channel.orderKg[1]) * 1.35) / lineCount;
      const kg = Math.round(kgBase * seasonal * seasonMul * growth * noise * customer.size * 10) / 10;
      if (kg < 3) continue;

      // Prices drift up ~5%/yr and sit slightly higher when demand spikes.
      const drift = 1 + 0.05 * (day / 365);
      const spikePremium = seasonMul > 2 ? 1.09 : 1;
      const price = between(category.price[0], category.price[1]) * customer.priceIndex * drift * spikePremium;
      const revenue = Math.round(kg * price * 100) / 100;
      const margin = between(channel.margin[0], channel.margin[1]);
      const cost = Math.round(revenue * (1 - margin) * 100) / 100;

      rows.push([
        d.toISOString().slice(0, 10),
        orderId,
        customer.name,
        customer.code,
        customer.channel,
        customer.region,
        category.name,
        product,
        kg,
        revenue,
        cost,
        Math.round((revenue - cost) * 100) / 100,
      ]);
    }
  }
}

/* Columnar output: the header names are written once instead of on every row,
   which keeps a 14k-line dataset around a megabyte instead of six. */
const doc = {
  name: 'Πωλήσεις — Δείγμα 24 μηνών',
  note: 'Synthetic demonstration data generated by argus/demo/generate.mjs. Not real company data.',
  generatedAt: new Date(END).toISOString().slice(0, 10),
  columns: ['Ημερομηνία', 'Παραστατικό', 'Πελάτης', 'Κωδικός Πελάτη', 'Κανάλι', 'Περιοχή',
    'Κατηγορία', 'Προϊόν', 'Κιλά', 'Τζίρος (€)', 'Κόστος (€)', 'Μικτό Κέρδος (€)'],
  units: {
    'Κιλά': 'quantity',
    'Τζίρος (€)': 'currency',
    'Κόστος (€)': 'currency',
    'Μικτό Κέρδος (€)': 'currency',
  },
  rows,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'kasidis-sales.json'), JSON.stringify(doc));

const revenue = rows.reduce((a, r) => a + r[9], 0);
const kg = rows.reduce((a, r) => a + r[8], 0);
console.log(`rows      ${rows.length.toLocaleString('en-GB')}`);
console.log(`revenue   €${Math.round(revenue).toLocaleString('en-GB')}`);
console.log(`volume    ${Math.round(kg).toLocaleString('en-GB')} kg`);
console.log(`customers ${customers.length}`);
console.log(`span      ${new Date(START).toISOString().slice(0, 10)} → ${new Date(END).toISOString().slice(0, 10)}`);
