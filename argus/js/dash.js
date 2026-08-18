/* Argus — dashboard model.
   Profiles any table, proposes a starter board, and renders tiles.
   The auto-build is deliberately generic: it reads column types and
   cardinality, not column names, so a warehouse export and a sales export
   both come out sensible. */

import { aggregate, kpi, autoGrain, dateExtent, applyFilters } from './model.js';
import { renderKpi, renderBars, renderLine, renderStack, renderDonut, renderTable, renderHeatmap } from './charts.js';
import { t } from './i18n.js';

let seq = 0;
const uid = () => `t${Date.now().toString(36)}${(seq++).toString(36)}`;

/* ---------- profiling ---------- */

/* Cost is a real measure but a poor headline; revenue and profit lead. */
const REVENUE_LIKE = /(τζίρ|πωλήσ|έσοδ|revenue|sales|turnover|income)/i;
const PROFIT_LIKE = /(κέρδ|profit|margin|gross|contribution)/i;
const COST_LIKE = /(κόστ|δαπάν|έξοδ|cost|expense|spend)/i;

export function profile(table) {
  const measures = table.fields.filter((f) => f.role === 'measure');
  const times = table.fields.filter((f) => f.role === 'time');
  const dims = table.fields.filter((f) => f.role === 'dimension');

  const unitRank = { currency: 0, quantity: 1, percent: 3 };
  const rank = (f) => {
    let score = unitRank[f.unit] ?? 2;
    if (REVENUE_LIKE.test(f.label)) score -= 3;
    else if (PROFIT_LIKE.test(f.label)) score -= 1;
    else if (COST_LIKE.test(f.label)) score += 3;
    return score;
  };
  measures.sort((a, b) => rank(a) - rank(b));

  // A dimension is "chartable" when it has enough variety to be interesting
  // but not so much that a bar chart turns into a hairbrush.
  const score = (f) => {
    const d = f.distinct;
    if (d < 2) return -1;
    if (d <= 12) return 100 - d;
    if (d <= 60) return 70 - d / 4;
    return Math.max(1, 40 - d / 200);
  };
  dims.sort((a, b) => score(b) - score(a));

  times.sort((a, b) => {
    const ea = dateExtent(table, a.key);
    const eb = dateExtent(table, b.key);
    return ((eb ? eb[1] - eb[0] : 0) - (ea ? ea[1] - ea[0] : 0));
  });

  const small = dims.filter((f) => f.distinct >= 2 && f.distinct <= 10);
  const large = dims.filter((f) => f.distinct > 10);

  /* "Entities" are the things a business counts and ranks — customers, SKUs,
     depots. A near-unique column (an invoice number) is a transaction key, not
     an entity, so it is excluded even though its cardinality is the highest. */
  const rowCount = table.rows.length || 1;
  const entities = dims
    .filter((f) => !f.isId && f.distinct >= 8 && f.distinct <= 5000 && f.distinct / rowCount < 0.25)
    .sort((a, b) => b.distinct - a.distinct);

  /** First measure whose unit differs from the ones already used. */
  const diverseMeasures = (count) => {
    const out = [];
    const usedUnits = new Set();
    for (const pass of [0, 1]) {
      for (const m of measures) {
        if (out.length >= count || out.includes(m)) continue;
        if (pass === 0 && usedUnits.has(m.unit)) continue;
        out.push(m);
        usedUnits.add(m.unit);
      }
    }
    return out;
  };

  return {
    measures, times, dims, small, large, entities, diverseMeasures,
    time: times[0] || null,
    primary: measures[0] || null,
  };
}

/* ---------- auto-build ---------- */

function tile(spec) {
  return { id: uid(), w: 4, h: 2, agg: 'sum', limit: 0, ...spec };
}

/** Summing a rate produces nonsense (a 6% discount column totalling 1814%). */
export function defaultAgg(field) {
  return field && field.unit === 'percent' ? 'avg' : 'sum';
}

/* A scene is a fixed 16:9 page, so it holds a fixed number of grid rows.
   Anything past the budget spills onto a new page rather than off the slide. */
export const GRID_COLS = 12;
export const GRID_ROWS = 4;

/** Shelf-pack tiles into pages of at most GRID_ROWS rows.
    Pages carry the i18n key of their name, not the resolved string, so the
    language toggle re-labels a board the user has not renamed. */
export function packIntoPages(tiles, nameKey) {
  const pages = [];
  let current = [];
  let rowsUsed = 0;
  let shelfCols = 0;
  let shelfHeight = 0;

  const flush = () => {
    if (!current.length) return;
    pages.push({
      id: uid(),
      nameKey,
      nameIndex: pages.length ? pages.length + 1 : 0,
      tiles: current,
    });
    current = [];
    rowsUsed = 0;
    shelfCols = 0;
    shelfHeight = 0;
  };

  for (const item of tiles) {
    const w = Math.min(item.w, GRID_COLS);
    const startsNewShelf = shelfCols === 0 || shelfCols + w > GRID_COLS;
    const rowsAfter = startsNewShelf ? rowsUsed + shelfHeight + item.h : rowsUsed + Math.max(shelfHeight, item.h);

    if (rowsAfter > GRID_ROWS && current.length) {
      flush();
    }

    if (shelfCols === 0 || shelfCols + w > GRID_COLS) {
      rowsUsed += shelfHeight;
      shelfCols = w;
      shelfHeight = item.h;
    } else {
      shelfCols += w;
      shelfHeight = Math.max(shelfHeight, item.h);
    }
    current.push(item);
  }
  flush();

  if (!pages.length) pages.push({ id: uid(), nameKey, nameIndex: 0, tiles: [] });
  return pages;
}

export function autoBuild(table, lang = 'el') {
  const p = profile(table);
  const timeKey = p.time ? p.time.key : null;
  const grain = timeKey
    ? (() => { const e = dateExtent(table, timeKey); return e ? autoGrain(e[0], e[1]) : 'month'; })()
    : 'month';

  const scenes = [];
  const fallbackField = table.fields[0];

  /* --- Page 1: the headline numbers, the trend, the mix --- */
  const overview = [];
  // Diversify the KPI row by unit so it reads €, kg, € margin — not three €s.
  const headline = p.diverseMeasures(3);
  headline.forEach((m, i) => {
    const agg = defaultAgg(m);
    overview.push(tile({
      type: 'kpi', measure: m.key, agg, grain, w: 3, h: 1, hero: i === 0,
      autoTitle: { key: agg === 'avg' ? 'kpiAvg' : 'kpiTotal', fields: [m.key] },
    }));
  });

  // Round the KPI row out with a count — of customers/SKUs if we found any,
  // otherwise of the records themselves.
  const countable = p.entities[0] || p.large[0] || p.dims[0];
  if (overview.length < 4) {
    overview.push(countable
      ? tile({
        type: 'kpi', measure: countable.key, agg: 'distinct', w: 3, h: 1,
        autoTitle: { key: 'kpiDistinct', fields: [countable.key] },
      })
      : tile({
        type: 'kpi', measure: (p.primary || fallbackField).key, agg: 'count', w: 3, h: 1,
        autoTitle: { key: 'kpiCount', fields: [] },
      }));
  }

  const mixDim = p.small[0] || p.dims[0];
  if (timeKey && p.primary) {
    overview.push(tile({
      type: 'area', measure: p.primary.key, agg: defaultAgg(p.primary), dimension: timeKey, grain, w: mixDim ? 8 : 12, h: 3,
      autoTitle: { key: 'trendOf', fields: [p.primary.key] },
    }));
  }
  if (mixDim && p.primary) {
    overview.push(tile({
      type: 'donut', measure: p.primary.key, agg: defaultAgg(p.primary), dimension: mixDim.key, limit: 7,
      w: timeKey ? 4 : 6, h: 3,
      autoTitle: { key: 'mixOf', fields: [mixDim.key] },
    }));
  }
  scenes.push(...packIntoPages(overview, 'overview'));

  /* --- Page 2: who and what, split over time --- */
  const breakdown = [];
  const topDim = p.entities[0] || p.large[0] || p.dims[1] || p.dims[0];
  const detailDim = p.entities[1] || p.entities[0] || p.large[0] || mixDim;

  if (topDim && p.primary) {
    breakdown.push(tile({
      type: 'bar', measure: p.primary.key, agg: defaultAgg(p.primary), dimension: topDim.key, limit: 8, sort: 'desc', w: 6, h: 2,
      autoTitle: { key: 'topBy', fields: [topDim.key] },
    }));
  }
  if (detailDim && p.primary) {
    breakdown.push(tile({
      type: 'table', measure: p.primary.key, agg: defaultAgg(p.primary), dimension: detailDim.key, limit: 12, w: 6, h: 2,
      autoTitle: { key: 'detail', fields: [detailDim.key] },
    }));
  }
  if (timeKey && p.primary && mixDim) {
    breakdown.push(tile({
      type: 'stack', measure: p.primary.key, agg: defaultAgg(p.primary), dimension: timeKey, series: mixDim.key, grain, w: 12, h: 2,
      autoTitle: { fields: [p.primary.key, mixDim.key] },
    }));
  }
  if (breakdown.length) scenes.push(...packIntoPages(breakdown, 'breakdownOf'));

  /* --- Page 3: when it happens --- */
  const season = [];
  if (timeKey && p.primary && mixDim) {
    season.push(tile({
      type: 'heatmap', measure: p.primary.key, agg: defaultAgg(p.primary), dimension: timeKey, series: mixDim.key,
      grain: grain === 'day' ? 'week' : grain, w: 12, h: 2,
      autoTitle: { key: 'seasonality', fields: [mixDim.key, p.time.key], joiner: 'x' },
    }));
  }
  const catDim = p.small[1] || p.small[0];
  const secondMeasure = p.diverseMeasures(2)[1] || p.primary;
  if (catDim && p.primary) {
    season.push(tile({
      type: 'column', measure: p.primary.key, agg: defaultAgg(p.primary), dimension: catDim.key, limit: 12, w: 6, h: 2,
      autoTitle: { fields: [p.primary.key, catDim.key] },
    }));
  }
  if (secondMeasure && (p.entities[1] || catDim)) {
    const d = p.entities[1] || catDim;
    season.push(tile({
      type: 'bar', measure: secondMeasure.key, agg: defaultAgg(secondMeasure), dimension: d.key, limit: 8, w: catDim ? 6 : 12, h: 2,
      autoTitle: { fields: [secondMeasure.key, d.key] },
    }));
  }
  if (season.length) scenes.push(...packIntoPages(season, 'seasonality'));

  if (!scenes.length || !scenes.some((s) => s.tiles.length)) {
    return [{
      id: uid(),
      nameKey: 'overview',
      nameIndex: 0,
      tiles: [tile({
        type: 'table',
        measure: (p.primary || fallbackField).key,
        agg: p.primary ? 'sum' : 'count',
        dimension: (p.dims[0] || fallbackField).key,
        limit: 20, title: table.name, w: 12, h: 4,
      })],
    }];
  }
  return scenes.filter((s) => s.tiles.length);
}

/* ---------- rendering ---------- */

function fieldOf(table, key) {
  return table.fields.find((f) => f.key === key) || null;
}

function unitOf(table, key) {
  const f = fieldOf(table, key);
  return f ? f.unit : null;
}

function labelOf(table, key, lang) {
  const f = fieldOf(table, key);
  return f ? f.label : t(lang, 'none');
}

/** A scene's display name: the user's, or the resolved auto one. */
export function sceneName(scene, lang) {
  if (scene.name) return scene.name;
  const base = t(lang, scene.nameKey || 'overview');
  return scene.nameIndex ? `${base} ${scene.nameIndex}` : base;
}

/** A tile's display title: the user's, or one rebuilt from its i18n key. */
export function tileTitle(tile, table, lang) {
  if (tile.title) return tile.title;
  const spec = tile.autoTitle;
  if (!spec) return labelOf(table, tile.measure, lang);
  const parts = [];
  if (spec.key) parts.push(t(lang, spec.key));
  const labels = (spec.fields || []).map((k) => labelOf(table, k, lang));
  if (spec.joiner === 'x') { if (labels.length) parts.push(labels.join(' × ')); }
  else parts.push(...labels);
  return parts.join(' · ');
}

/** The heading line under a tile title: what is being measured, how. */
function subtitleFor(tile, table, lang) {
  const m = labelOf(table, tile.measure, lang);
  const aggLabel = tile.agg === 'sum' ? '' : `${t(lang, 'aggs') && ''}`;
  const parts = [];
  if (tile.type !== 'kpi') parts.push(m);
  if (tile.series) parts.push(`× ${labelOf(table, tile.series, lang)}`);
  return parts.join(' ') + aggLabel;
}

export function renderTileBody(body, tile, ctx) {
  const { table, rows, lang } = ctx;
  const unit = tile.agg === 'count' || tile.agg === 'distinct' ? null : unitOf(table, tile.measure);
  const measureLabel = labelOf(table, tile.measure, lang);
  const emptyText = t(lang, 'noData');

  if (tile.type === 'kpi') {
    const timeField = ctx.timeKey;
    const res = kpi(table, { rows, measure: tile.measure, agg: tile.agg, compareField: timeField });
    let spark = null;
    if (timeField) {
      const series = aggregate(table, { rows, dimension: timeField, measure: tile.measure, agg: tile.agg, grain: tile.grain || 'month', lang });
      spark = series.rows.map((r) => r.value ?? 0);
      if (spark.length < 2) spark = null;
    }
    renderKpi(body, {
      value: res.value, delta: res.delta, unit, lang, spark, hero: tile.hero,
      subtitle: res.delta !== null ? t(lang, 'vsPrev') : null,
    });
    return;
  }

  const data = aggregate(table, {
    rows, dimension: tile.dimension, series: tile.series || null,
    measure: tile.measure, agg: tile.agg, grain: tile.grain, limit: tile.limit, sort: tile.sort, lang,
    withOther: tile.type === 'donut' || tile.type === 'table',
  });

  const shared = { data, unit, lang, measureLabel, emptyText, dimensionLabel: labelOf(table, tile.dimension, lang) };

  switch (tile.type) {
    case 'bar': renderBars(body, { ...shared, horizontal: true }); break;
    case 'column': renderBars(body, { ...shared, horizontal: false }); break;
    case 'line': renderLine(body, { ...shared, area: false }); break;
    case 'area': renderLine(body, { ...shared, area: true }); break;
    case 'stack': renderStack(body, shared); break;
    case 'donut': renderDonut(body, shared); break;
    case 'heatmap': renderHeatmap(body, shared); break;
    default: renderTable(body, shared);
  }
}

export function renderTile(tile, ctx) {
  const card = document.createElement('article');
  card.className = `ax-card ax-card-${tile.type}${tile.hero ? ' is-hero' : ''}`;
  card.style.setProperty('--w', tile.w);
  card.style.setProperty('--h', tile.h);
  card.dataset.tileId = tile.id;

  const head = document.createElement('header');
  head.className = 'ax-card-head';
  const h = document.createElement('h3');
  h.className = 'ax-card-title';
  h.textContent = tileTitle(tile, ctx.table, ctx.lang);
  head.appendChild(h);

  const sub = subtitleFor(tile, ctx.table, ctx.lang).trim();
  if (sub && tile.type !== 'kpi') {
    const s = document.createElement('span');
    s.className = 'ax-card-sub';
    s.textContent = sub;
    head.appendChild(s);
  }
  card.appendChild(head);

  const body = document.createElement('div');
  body.className = 'ax-card-body';
  card.appendChild(body);

  // Charts need a measured box, so draw after the card is in the document.
  ctx.defer(() => renderTileBody(body, tile, ctx));
  return card;
}

export function renderScene(scene, ctx) {
  const grid = document.createElement('div');
  grid.className = 'ax-grid';
  for (const tile of scene.tiles) grid.appendChild(renderTile(tile, ctx));
  return grid;
}

/* ---------- context ---------- */

export function makeContext(table, filters, lang, defer) {
  const p = profile(table);
  return {
    table,
    rows: applyFilters(table.rows, filters),
    lang,
    timeKey: p.time ? p.time.key : null,
    defer,
  };
}

export { uid };
