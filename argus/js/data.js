/* Argus — ingestion and typing.
   Turns a dropped file (CSV / TSV / XLSX / JSON) into a typed table:
   { name, fields: [{key, label, type, role, ...}], rows: [ {...} ] }

   Everything here is locale-aware in both directions, because a Greek ERP
   export writes 1.234,56 and 31/12/2026 while an English one writes 1,234.56
   and 2026-12-31, and the same customer will hand you both. */

import { readWorkbook } from './xlsx.js';

/* ---------- CSV ---------- */

function sniffDelimiter(text) {
  const sample = text.slice(0, 64000).split(/\r?\n/).slice(0, 20);
  const candidates = [';', ',', '\t', '|'];
  let best = ',';
  let bestScore = -1;
  for (const d of candidates) {
    const counts = sample.map((line) => line.split(d).length - 1).filter((n) => n > 0);
    if (counts.length < Math.min(2, sample.length)) continue;
    // Prefer the delimiter with the most fields AND the most consistent count.
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length;
    const score = mean - variance * 2;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

export function parseDelimited(text, delimiter) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const d = delimiter || sniffDelimiter(text);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === '') { quoted = true; continue; }
    if (ch === d) { row.push(field); field = ''; continue; }
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    if (ch === '\r') continue;
    field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  // Drop trailing blank lines.
  while (rows.length && rows[rows.length - 1].every((c) => String(c).trim() === '')) rows.pop();
  return rows;
}

/* ---------- value coercion ---------- */

const CURRENCY = /[€$£¥\s ]/g;

/**
 * Parse a number written in either European (1.234,56) or Anglo (1,234.56)
 * convention, plus accounting negatives and trailing/leading currency marks.
 */
export function parseNumber(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;

  let sign = 1;
  if (/^\(.*\)$/.test(s)) { sign = -1; s = s.slice(1, -1); }
  s = s.replace(CURRENCY, '');
  if (s.startsWith('-') || s.startsWith('−')) { sign = -sign; s = s.slice(1); }
  if (s.startsWith('+')) s = s.slice(1);

  const isPercent = s.endsWith('%');
  if (isPercent) s = s.slice(0, -1);
  if (!s || !/^[\d.,]+$/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator comes last is the decimal point.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    const tail = s.length - lastComma - 1;
    // "1,234" is a thousands group; "1,5" and "1,25" are decimals.
    s = (tail === 3 && /^\d{1,3}(,\d{3})+$/.test(s)) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (lastDot > -1) {
    const tail = s.length - lastDot - 1;
    if (tail === 3 && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return sign * (isPercent ? n / 100 : n);
}

const MONTHS_EL = {
  ιαν: 0, φεβ: 1, μαρ: 2, απρ: 3, μαι: 4, μάι: 4, ιουν: 5, ιούν: 5,
  ιουλ: 6, ιούλ: 6, αυγ: 7, σεπ: 8, οκτ: 9, νοε: 10, δεκ: 11,
};
const MONTHS_EN = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function mkDate(y, m, d) {
  if (y < 100) y += y < 70 ? 2000 : 1900;
  const dt = new Date(Date.UTC(y, m, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m && dt.getUTCDate() === d ? dt : null;
}

/**
 * Parse a date. `dayFirst` decides 03/04 — true (default) reads it as
 * 3 April, which is what every European ERP means.
 */
export function parseDate(raw, dayFirst = true) {
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || s.length < 4) return null;

  // ISO 8601 first — unambiguous.
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]|$)/);
  if (m) return mkDate(+m[1], +m[2] - 1, +m[3]);

  // 31/12/2026, 31.12.2026, 31-12-26
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})(?:[T\s]|$)/);
  if (m) {
    let a = +m[1];
    let b = +m[2];
    // A value over 12 settles the order regardless of the hint.
    const dFirst = a > 12 ? true : b > 12 ? false : dayFirst;
    return dFirst ? mkDate(+m[3], b - 1, a) : mkDate(+m[3], a - 1, b);
  }

  // 2026-Q1 / Q1 2026
  m = s.match(/^(\d{4})[\s-]*Q([1-4])$/i) || s.match(/^Q([1-4])[\s-]*(\d{4})$/i);
  if (m) {
    const [y, q] = /^\d{4}/.test(m[1]) ? [+m[1], +m[2]] : [+m[2], +m[1]];
    return mkDate(y, (q - 1) * 3, 1);
  }

  // 2026-01 monthly buckets
  m = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (m) return mkDate(+m[1], +m[2] - 1, 1);

  // 12 Ιαν 2026 / Jan 12 2026 / Ιανουάριος 2026
  const lower = s.toLowerCase();
  for (const table of [MONTHS_EL, MONTHS_EN]) {
    for (const key in table) {
      if (!lower.includes(key)) continue;
      const nums = lower.match(/\d+/g);
      if (!nums) continue;
      const year = nums.find((n) => n.length === 4);
      const day = nums.find((n) => n !== year && +n <= 31);
      if (year) return mkDate(+year, table[key], day ? +day : 1);
    }
  }
  return null;
}

/* ---------- typing ---------- */

/* JS \b is ASCII-only, so it never fires next to a Greek letter. Greek stems
   are matched as plain substrings (which also catches the inflections —
   κιλά / κιλών); only the short ASCII tokens keep a word boundary. */
const KG_HINT = /(κιλ|βάρος|ποσότητ|τεμάχ|\bkg\b|\bqty\b|\bunits?\b|\bpcs\b)/i;
const MONEY_HINT = /(€|αξία|τζίρ|πωλήσ|κόστ|κέρδ|τιμή|έσοδ|σύνολο|\beur\b|sales|revenue|amount|value|cost|price|profit|margin|total|\bnet\b|gross)/i;
const PERCENT_HINT = /(%|ποσοστ|percent|\brate\b|\bshare\b)/i;
const DATE_HINT = /(ημ\/νία|ημερομην|ημερ|μήνα|έτος|περίοδ|εβδομάδ|ημέρα|date|month|year|period|week)/i;
const ID_HINT = /(κωδικ|α\/α|αριθμ|τιμολ|παραστατ|αφμ|\bid\b|\bcode\b|\bno\b|\bnumber\b|\binvoice\b|\bbarcode\b|\bean\b|\bvat\b|\bsku\b)/i;

function sampleValues(rows, key, limit = 400) {
  const out = [];
  const step = Math.max(1, Math.floor(rows.length / limit));
  for (let i = 0; i < rows.length && out.length < limit; i += step) {
    const v = rows[i][key];
    if (v !== null && v !== undefined && v !== '') out.push(v);
  }
  return out;
}

function inferField(key, label, rows) {
  const sample = sampleValues(rows, key);
  const n = sample.length || 1;

  let dates = 0;
  let numbers = 0;
  let percentMarks = 0;
  for (const v of sample) {
    if (v instanceof Date) { dates++; numbers++; continue; }
    if (typeof v === 'number') { numbers++; continue; }
    const s = String(v);
    if (s.includes('%')) percentMarks++;
    if (parseNumber(s) !== null) numbers++;
    else if (parseDate(s) !== null) dates++;
  }

  const dateRatio = dates / n;
  const numberRatio = numbers / n;
  const distinct = new Set(sample.map((v) => (v instanceof Date ? v.getTime() : v))).size;

  let type = 'text';
  if (dateRatio > 0.8) type = 'date';
  else if (numberRatio > 0.85) type = 'number';
  else if (DATE_HINT.test(label) && dateRatio > 0.5) type = 'date';

  let unit = null;
  if (type === 'number') {
    // Quantity is tested before money so "Σύνολο Κιλών" reads as kg, not €.
    if (percentMarks > n * 0.5 || PERCENT_HINT.test(label)) unit = 'percent';
    else if (KG_HINT.test(label)) unit = 'quantity';
    else if (MONEY_HINT.test(label)) unit = 'currency';
  }

  /* A numeric column that is really a key — an invoice or order number — is a
     dimension, not something to sum. The shape test (all values distinct,
     all whole, no decimals) is only allowed to fire when the header does NOT
     name a quantity: a small export's "Κιλά" column can easily be 20 distinct
     whole numbers, and summing it is exactly what the user wants. The
     magnitude floor matters too: a real key (invoice 100482) is at least three
     digits, while a measure that happens to run 1..20 is not a key. */
  const looksLikeKey = sample.length > 0 && sample.every((v) => {
    const num = typeof v === 'number' ? v : parseNumber(v);
    return num !== null && Number.isInteger(num) && num >= 100;
  });
  const isIdentifier = ID_HINT.test(label)
    || (type === 'number' && !unit && looksLikeKey && distinct === sample.length && sample.length > 12);

  const role = type === 'date' ? 'time' : (type === 'number' && !isIdentifier) ? 'measure' : 'dimension';
  return {
    key, label, unit, distinct, role,
    type: isIdentifier && type === 'number' ? 'text' : type,
    isId: isIdentifier,
    nulls: rows.length - sample.length,
  };
}

/* Coerce every cell once, up front, so aggregation never re-parses strings. */
function coerceRows(rows, fields) {
  for (const f of fields) {
    if (f.type === 'number') {
      for (const r of rows) r[f.key] = parseNumber(r[f.key]);
    } else if (f.type === 'date') {
      for (const r of rows) r[f.key] = parseDate(r[f.key]);
    } else {
      for (const r of rows) {
        const v = r[f.key];
        r[f.key] = v === null || v === undefined || v === '' ? null
          : v instanceof Date ? v.toISOString().slice(0, 10)
            : String(v).trim();
      }
    }
  }
}

/* Find the header row: the first row whose cells are mostly non-empty text
   and which is followed by rows that look like data. Title rows above a table
   ("ΠΩΛΗΣΕΙΣ 2026") are common in ERP exports and get skipped this way. */
function findHeaderRow(grid) {
  const limit = Math.min(grid.length, 20);
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < limit; i++) {
    const row = grid[i];
    const filled = row.filter((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (filled.length < 2) continue;
    const textish = filled.filter((c) => !(c instanceof Date) && typeof c !== 'number' && parseNumber(c) === null).length;
    const next = grid[i + 1] || [];
    const nextFilled = next.filter((c) => c !== null && c !== undefined && String(c).trim() !== '').length;
    const score = filled.length * 2 + textish * 3 + Math.min(nextFilled, filled.length) - i * 2;
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

function uniqueKeys(headers) {
  const seen = new Map();
  return headers.map((h, i) => {
    let label = String(h ?? '').trim().replace(/\s+/g, ' ');
    if (!label) label = `Column ${i + 1}`;
    let key = label;
    if (seen.has(key)) {
      const n = seen.get(key) + 1;
      seen.set(key, n);
      key = `${label} (${n})`;
    } else seen.set(key, 1);
    return { key, label: key };
  });
}

/** Build a typed table from a 2-D grid. */
export function tableFromGrid(grid, name) {
  if (!grid || !grid.length) throw new Error('That file has no rows.');
  const headerIdx = findHeaderRow(grid);
  const headers = grid[headerIdx] || [];
  const cols = uniqueKeys(headers);

  const rows = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const raw = grid[i];
    if (!raw || raw.every((c) => c === null || c === undefined || String(c).trim() === '')) continue;
    const obj = {};
    for (let c = 0; c < cols.length; c++) obj[cols[c].key] = raw[c] ?? null;
    rows.push(obj);
  }
  if (!rows.length) throw new Error(`"${name}" has headers but no data rows.`);

  const fields = cols.map((c) => inferField(c.key, c.label, rows));
  coerceRows(rows, fields);

  // Drop columns that are entirely empty — ERP exports are full of them.
  const kept = fields.filter((f) => f.nulls < rows.length);
  return { name, fields: kept, rows };
}

/** Build a typed table from an array of objects (JSON input). */
export function tableFromObjects(list, name) {
  if (!Array.isArray(list) || !list.length) throw new Error('That JSON has no rows.');
  const keys = [];
  const seen = new Set();
  for (const row of list.slice(0, 200)) {
    for (const k of Object.keys(row)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
  }
  const rows = list.map((r) => {
    const o = {};
    for (const k of keys) o[k] = r[k] ?? null;
    return o;
  });
  const fields = keys.map((k) => inferField(k, k, rows));
  coerceRows(rows, fields);
  return { name, fields, rows };
}

/* ---------- file entry point ---------- */

const MAX_BYTES = 60 * 1024 * 1024;

/** Read one dropped file into one or more typed tables. */
export async function readFile(file) {
  if (file.size > MAX_BYTES) {
    throw new Error(`"${file.name}" is ${(file.size / 1048576).toFixed(0)} MB. Files over 60 MB need the scheduled-feed connector instead of a browser upload.`);
  }
  const lower = file.name.toLowerCase();
  const base = file.name.replace(/\.[^.]+$/, '');

  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm') || lower.endsWith('.xltx')) {
    const sheets = await readWorkbook(await file.arrayBuffer());
    const tables = [];
    for (const s of sheets) {
      try {
        tables.push(tableFromGrid(s.rows, sheets.length > 1 ? `${base} · ${s.name}` : base));
      } catch { /* a sheet with no usable table is skipped, not fatal */ }
    }
    if (!tables.length) throw new Error(`No table found in "${file.name}".`);
    return tables;
  }

  if (lower.endsWith('.xls')) {
    throw new Error('Legacy .xls is not supported. Re-save as .xlsx or CSV.');
  }

  const text = await file.text();

  if (lower.endsWith('.json')) {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data
      : Array.isArray(data.rows) ? data.rows
        : Array.isArray(data.data) ? data.data : null;
    if (!list) throw new Error('That JSON is not an array of records.');
    return [tableFromObjects(list, base)];
  }

  return [tableFromGrid(parseDelimited(text, lower.endsWith('.tsv') ? '\t' : null), base)];
}
