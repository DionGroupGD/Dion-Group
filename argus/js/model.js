/* Argus — query + format layer.
   A tile declares what it wants (dimension, measure, aggregate, grain,
   filters); this module answers it against an in-memory table. */

export const AGGS = ['sum', 'avg', 'count', 'distinct', 'min', 'max'];
export const GRAINS = ['day', 'week', 'month', 'quarter', 'year'];

/* ---------- time ---------- */

const DAY = 86400000;

export function bucketDate(date, grain) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  switch (grain) {
    case 'year': return Date.UTC(y, 0, 1);
    case 'quarter': return Date.UTC(y, Math.floor(m / 3) * 3, 1);
    case 'week': {
      // ISO weeks start Monday.
      const d = Date.UTC(y, m, date.getUTCDate());
      const dow = (new Date(d).getUTCDay() + 6) % 7;
      return d - dow * DAY;
    }
    case 'day': return Date.UTC(y, m, date.getUTCDate());
    default: return Date.UTC(y, m, 1);
  }
}

const MONTHS = {
  el: ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export function formatBucket(ms, grain, lang = 'el') {
  const d = new Date(ms);
  const mo = MONTHS[lang] || MONTHS.el;
  const y = d.getUTCFullYear();
  switch (grain) {
    case 'year': return String(y);
    case 'quarter': return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${String(y).slice(2)}`;
    case 'week': return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    case 'day': return `${String(d.getUTCDate()).padStart(2, '0')} ${mo[d.getUTCMonth()]}`;
    default: return `${mo[d.getUTCMonth()]} ${String(y).slice(2)}`;
  }
}

/** Pick the grain that gives a readable number of points for a date span. */
export function autoGrain(minMs, maxMs) {
  const days = (maxMs - minMs) / DAY;
  if (days <= 31) return 'day';
  if (days <= 120) return 'week';
  if (days <= 900) return 'month';
  if (days <= 2600) return 'quarter';
  return 'year';
}

/* ---------- formatting ---------- */

const LOCALE = { el: 'el-GR', en: 'en-GB' };

export function formatNumber(value, unit, lang = 'el', opts = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const loc = LOCALE[lang] || 'el-GR';

  if (unit === 'percent') {
    return new Intl.NumberFormat(loc, { style: 'percent', maximumFractionDigits: opts.compact ? 0 : 1 }).format(value);
  }

  const abs = Math.abs(value);
  if (opts.compact && abs >= 1000) {
    const n = new Intl.NumberFormat(loc, { notation: 'compact', maximumFractionDigits: abs >= 10000 ? 1 : 2 }).format(value);
    return unit === 'currency' ? `€${n}` : unit === 'quantity' ? `${n} kg` : n;
  }

  const decimals = opts.decimals !== undefined ? opts.decimals
    : unit === 'currency' ? (abs < 100 ? 2 : 0)
      : Number.isInteger(value) ? 0 : abs < 10 ? 2 : abs < 1000 ? 1 : 0;

  const n = new Intl.NumberFormat(loc, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
  return unit === 'currency' ? `€${n}` : unit === 'quantity' ? `${n} kg` : n;
}

export function formatDelta(value, lang = 'el') {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const loc = LOCALE[lang] || 'el-GR';
  const s = new Intl.NumberFormat(loc, { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }).format(value);
  return s;
}

/* ---------- filtering ---------- */

/**
 * filters: [{ field, op, value }]
 *   op: 'in' (value = array) | 'between' (value = [min,max]) | 'daterange' (value = [msFrom, msTo])
 */
export function applyFilters(rows, filters) {
  if (!filters || !filters.length) return rows;
  return rows.filter((row) => {
    for (const f of filters) {
      const v = row[f.field];
      if (f.op === 'in') {
        if (!f.value || !f.value.length) continue;
        if (!f.value.includes(v)) return false;
      } else if (f.op === 'between') {
        if (v === null) return false;
        const [lo, hi] = f.value;
        if (lo !== null && v < lo) return false;
        if (hi !== null && v > hi) return false;
      } else if (f.op === 'daterange') {
        if (!(v instanceof Date)) return false;
        const t = v.getTime();
        const [lo, hi] = f.value;
        if (lo !== null && t < lo) return false;
        if (hi !== null && t > hi) return false;
      }
    }
    return true;
  });
}

/* ---------- aggregation ---------- */

function reduce(values, agg) {
  if (agg === 'count') return values.length;
  if (agg === 'distinct') return new Set(values).size;
  const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (!nums.length) return agg === 'sum' ? 0 : null;
  switch (agg) {
    case 'avg': return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min': return Math.min(...nums);
    case 'max': return Math.max(...nums);
    default: return nums.reduce((a, b) => a + b, 0);
  }
}

const BLANK = '(κενό)';

/**
 * Group rows and aggregate one measure.
 * spec: { dimension, grain, series, measure, agg, limit, sort, lang }
 * Returns { rows: [{ key, label, value, series? }], series: [names], isTime }
 */
export function aggregate(table, spec) {
  const { dimension, measure, agg = 'sum', series = null, limit = 0, sort = 'desc', lang = 'el' } = spec;
  const rows = spec.rows || table.rows;
  const dimField = table.fields.find((f) => f.key === dimension);
  const isTime = dimField && dimField.type === 'date';
  const grain = spec.grain || 'month';

  const groups = new Map();
  const seriesSet = new Set();

  for (const row of rows) {
    let key;
    if (isTime) {
      const v = row[dimension];
      if (!(v instanceof Date)) continue;
      key = bucketDate(v, grain);
    } else {
      const v = row[dimension];
      key = v === null || v === '' ? BLANK : v;
    }

    const sKey = series ? (row[series] === null || row[series] === '' ? BLANK : String(row[series])) : '__all__';
    if (series) seriesSet.add(sKey);

    let g = groups.get(key);
    if (!g) { g = new Map(); groups.set(key, g); }
    let bucket = g.get(sKey);
    if (!bucket) { bucket = []; g.set(sKey, bucket); }
    bucket.push(agg === 'count' ? 1 : row[measure]);
  }

  let out = [];
  for (const [key, g] of groups) {
    const entry = { key, label: isTime ? formatBucket(key, grain, lang) : String(key), values: {} };
    let total = 0;
    for (const [sKey, values] of g) {
      const v = reduce(values, agg);
      entry.values[sKey] = v;
      if (typeof v === 'number') total += v;
    }
    entry.value = series ? total : (entry.values.__all__ ?? null);
    out.push(entry);
  }

  if (isTime) {
    out.sort((a, b) => a.key - b.key);
  } else if (sort === 'asc') {
    out.sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  } else if (sort === 'label') {
    out.sort((a, b) => a.label.localeCompare(b.label, 'el'));
  } else {
    out.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  }

  // Fold the tail into "Other" rather than cycling colours past the palette.
  let seriesList = series ? [...seriesSet] : [];
  if (series && seriesList.length > 8) {
    const totals = new Map();
    for (const e of out) for (const k in e.values) totals.set(k, (totals.get(k) || 0) + (e.values[k] || 0));
    const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const keep = new Set(ranked.slice(0, 7));
    const otherLabel = lang === 'en' ? 'Other' : 'Λοιπά';
    for (const e of out) {
      let other = 0;
      for (const k in e.values) {
        if (!keep.has(k)) { other += e.values[k] || 0; delete e.values[k]; }
      }
      if (other) e.values[otherLabel] = other;
    }
    seriesList = [...ranked.slice(0, 7), otherLabel];
  } else if (series) {
    const totals = new Map();
    for (const e of out) for (const k in e.values) totals.set(k, (totals.get(k) || 0) + (e.values[k] || 0));
    seriesList.sort((a, b) => (totals.get(b) || 0) - (totals.get(a) || 0));
  }

  if (limit > 0 && !isTime && out.length > limit) {
    const head = out.slice(0, limit);
    const tail = out.slice(limit);
    const rest = tail.reduce((a, e) => a + (e.value || 0), 0);
    // "Other" belongs where the parts must sum to the whole (donut, table).
    // In a top-N ranking it is not a peer of the named bars and, when it is
    // the largest value, it sets the axis and flattens everything else.
    if (rest && spec.withOther) {
      head.push({
        key: '__other__',
        label: lang === 'en' ? `Other (${tail.length})` : `Λοιπά (${tail.length})`,
        value: rest,
        values: { __all__: rest },
        isOther: true,
      });
    }
    out = head;
  }

  return { rows: out, series: seriesList, isTime, grain };
}

/** Single aggregated number, plus the same number for the preceding period. */
export function kpi(table, spec) {
  const rows = spec.rows || table.rows;
  const { measure, agg = 'sum', compareField = null } = spec;
  const values = rows.map((r) => (agg === 'count' ? 1 : r[measure]));
  const value = reduce(values, agg);

  let previous = null;
  if (compareField) {
    let min = Infinity;
    let max = -Infinity;
    for (const r of rows) {
      const d = r[compareField];
      if (d instanceof Date) { const t = d.getTime(); if (t < min) min = t; if (t > max) max = t; }
    }
    if (Number.isFinite(min) && max > min) {
      const span = max - min;
      const prevRows = table.rows.filter((r) => {
        const d = r[compareField];
        if (!(d instanceof Date)) return false;
        const t = d.getTime();
        return t >= min - span - DAY && t < min;
      });
      if (prevRows.length) previous = reduce(prevRows.map((r) => (agg === 'count' ? 1 : r[measure])), agg);
    }
  }

  const delta = previous && previous !== 0 && typeof value === 'number' ? (value - previous) / Math.abs(previous) : null;
  return { value, previous, delta };
}

/** Min/max timestamps of a date field. */
export function dateExtent(table, field) {
  let min = Infinity;
  let max = -Infinity;
  for (const r of table.rows) {
    const d = r[field];
    if (d instanceof Date) { const t = d.getTime(); if (t < min) min = t; if (t > max) max = t; }
  }
  return Number.isFinite(min) ? [min, max] : null;
}

/** Distinct values of a dimension, most frequent first. */
export function distinctValues(table, field, limit = 500) {
  const counts = new Map();
  for (const r of table.rows) {
    const v = r[field];
    const k = v === null || v === '' ? BLANK : v;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([value, count]) => ({ value, count }));
}
