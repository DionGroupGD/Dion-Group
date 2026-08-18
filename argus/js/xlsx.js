/* Argus — native XLSX reader.
   Zero dependencies. A .xlsx is a ZIP of XML parts, so we unzip with the
   platform's DecompressionStream and read the XML with DOMParser. That keeps
   the app inside a `script-src 'self'` CSP and keeps every byte of customer
   data in the browser. */

const DEC = new TextDecoder('utf-8');

/* ---------- ZIP ---------- */

function findEOCD(view, bytes) {
  // End-of-central-directory: PK\x05\x06, within the last 64KB + comment.
  const min = Math.max(0, bytes.length - 66560);
  for (let i = bytes.length - 22; i >= min; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  throw new Error('Not a valid .xlsx file (no ZIP end-of-directory record).');
}

function readCentralDirectory(buf) {
  const bytes = new Uint8Array(buf);
  const view = new DataView(buf);
  const eocd = findEOCD(view, bytes);

  let count = view.getUint16(eocd + 10, true);
  let cdOffset = view.getUint32(eocd + 16, true);

  // ZIP64 fallback when the 32-bit fields are saturated.
  if (cdOffset === 0xffffffff || count === 0xffff) {
    for (let i = eocd - 20; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x07064b50) {
        const z64 = Number(view.getBigUint64(i + 8, true));
        if (view.getUint32(z64, true) === 0x06064b50) {
          count = Number(view.getBigUint64(z64 + 32, true));
          cdOffset = Number(view.getBigUint64(z64 + 48, true));
        }
        break;
      }
    }
  }

  const entries = new Map();
  let p = cdOffset;
  for (let n = 0; n < count && p + 46 <= bytes.length; n++) {
    if (view.getUint32(p, true) !== 0x02014b50) break;
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const localOffset = view.getUint32(p + 42, true);
    const name = DEC.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    entries.set(name, { method, compSize, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return { bytes, view, entries };
}

async function inflate(raw) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('This browser cannot unzip .xlsx files. Save the sheet as CSV and try again.');
  }
  const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readPart(zip, name) {
  const e = zip.entries.get(name);
  if (!e) return null;
  // The local header repeats the name/extra with its own lengths — skip them.
  const h = e.localOffset;
  if (zip.view.getUint32(h, true) !== 0x04034b50) return null;
  const nameLen = zip.view.getUint16(h + 26, true);
  const extraLen = zip.view.getUint16(h + 28, true);
  const start = h + 30 + nameLen + extraLen;
  const raw = zip.bytes.subarray(start, start + e.compSize);
  if (e.method === 0) return DEC.decode(raw);
  if (e.method === 8) return DEC.decode(await inflate(raw));
  throw new Error(`Unsupported compression in .xlsx (method ${e.method}).`);
}

/* ---------- XML ---------- */

let parser = null;
function xml(text) {
  // Created on first use, not at import time, so importing the module has no
  // DOM requirement of its own.
  if (!parser) parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Damaged .xlsx: could not read the sheet XML.');
  return doc;
}

/* Built-in numFmtIds that mean "this is a date". */
const DATE_FMT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57]);

function looksLikeDateFormat(code) {
  if (!code) return false;
  // Strip quoted literals and colour/condition blocks before sniffing for d/m/y.
  const bare = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '');
  return /[ymdhs]/i.test(bare) && !/^[^ymdhs]*$/i.test(bare);
}

async function readStyles(zip) {
  const text = await readPart(zip, 'xl/styles.xml');
  const isDate = [];
  if (!text) return isDate;
  const doc = xml(text);

  const custom = new Map();
  doc.querySelectorAll('numFmts > numFmt').forEach((n) => {
    custom.set(Number(n.getAttribute('numFmtId')), n.getAttribute('formatCode') || '');
  });

  const xfs = doc.querySelector('cellXfs');
  if (!xfs) return isDate;
  Array.from(xfs.children).forEach((xf, i) => {
    const id = Number(xf.getAttribute('numFmtId') || 0);
    isDate[i] = DATE_FMT_IDS.has(id) || looksLikeDateFormat(custom.get(id));
  });
  return isDate;
}

async function readSharedStrings(zip) {
  const text = await readPart(zip, 'xl/sharedStrings.xml');
  if (!text) return [];
  const doc = xml(text);
  return Array.from(doc.getElementsByTagName('si')).map((si) => {
    // Rich text splits a single string across many <t> runs.
    const runs = si.getElementsByTagName('t');
    let out = '';
    for (let i = 0; i < runs.length; i++) out += runs[i].textContent;
    return out;
  });
}

/* "BC12" -> 54 (zero-based column index) */
function colIndex(ref) {
  let n = 0;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c < 65 || c > 90) break;
    n = n * 26 + (c - 64);
  }
  return n - 1;
}

/* Excel serial day -> Date. Accounts for the fictional 1900-02-29. */
export function serialToDate(serial) {
  const days = serial < 61 ? serial + 1 : serial;
  const ms = Math.round((days - 25569) * 86400000);
  return new Date(ms);
}

async function sheetNames(zip) {
  const wb = await readPart(zip, 'xl/workbook.xml');
  if (!wb) return [];
  const rels = await readPart(zip, 'xl/_rels/workbook.xml.rels');
  const relMap = new Map();
  if (rels) {
    xml(rels).querySelectorAll('Relationship').forEach((r) => {
      let t = r.getAttribute('Target') || '';
      if (t.startsWith('/xl/')) t = t.slice(4);
      else if (t.startsWith('/')) t = t.slice(1);
      else if (t.startsWith('xl/')) t = t.slice(3);
      relMap.set(r.getAttribute('Id'), t);
    });
  }
  const out = [];
  xml(wb).querySelectorAll('sheets > sheet').forEach((s, i) => {
    const rid = s.getAttribute('r:id') || s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const target = relMap.get(rid) || `worksheets/sheet${i + 1}.xml`;
    out.push({
      name: s.getAttribute('name') || `Sheet${i + 1}`,
      path: `xl/${target}`,
      hidden: s.getAttribute('state') === 'hidden' || s.getAttribute('state') === 'veryHidden',
    });
  });
  return out;
}

async function readSheet(zip, sheet, strings, dateStyles) {
  const text = await readPart(zip, sheet.path);
  if (!text) return [];
  const doc = xml(text);
  const rows = [];

  Array.from(doc.getElementsByTagName('row')).forEach((rowEl) => {
    const cells = [];
    Array.from(rowEl.getElementsByTagName('c')).forEach((c) => {
      const ref = c.getAttribute('r');
      const idx = ref ? colIndex(ref) : cells.length;
      const type = c.getAttribute('t');
      const styleIdx = Number(c.getAttribute('s') || -1);
      let value = null;

      if (type === 'inlineStr') {
        const runs = c.getElementsByTagName('t');
        let s = '';
        for (let i = 0; i < runs.length; i++) s += runs[i].textContent;
        value = s;
      } else {
        const v = c.getElementsByTagName('v')[0];
        const raw = v ? v.textContent : null;
        if (raw === null || raw === '') value = null;
        else if (type === 's') value = strings[Number(raw)] ?? '';
        else if (type === 'str' || type === 'e') value = raw;
        else if (type === 'b') value = raw === '1';
        else {
          const num = Number(raw);
          value = Number.isFinite(num)
            ? (styleIdx >= 0 && dateStyles[styleIdx] ? serialToDate(num) : num)
            : raw;
        }
      }
      cells[idx] = value;
    });
    // Trailing holes stay undefined; normalise to null so downstream sees a grid.
    for (let i = 0; i < cells.length; i++) if (cells[i] === undefined) cells[i] = null;
    rows.push(cells);
  });

  return rows;
}

/**
 * Read every visible sheet of an .xlsx / .xlsm file.
 * @returns {Promise<Array<{name: string, rows: any[][]}>>}
 */
export async function readWorkbook(arrayBuffer) {
  const zip = readCentralDirectory(arrayBuffer);
  const [strings, dateStyles, sheets] = await Promise.all([
    readSharedStrings(zip),
    readStyles(zip),
    sheetNames(zip),
  ]);

  const out = [];
  for (const sheet of sheets) {
    if (sheet.hidden) continue;
    const rows = await readSheet(zip, sheet, strings, dateStyles);
    if (rows.length) out.push({ name: sheet.name, rows });
  }
  if (!out.length) throw new Error('That workbook has no readable sheets.');
  return out;
}
