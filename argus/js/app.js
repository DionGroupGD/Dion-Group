/* Argus — application shell.
   Owns state, the three modes (studio / present / wallboard), filters,
   the tile editor and workspace persistence.

   Nothing here talks to a server. A workspace is a file the user saves,
   and the working copy lives in localStorage. */

import { readFile, tableFromObjects } from './data.js';
import { dateExtent, distinctValues, autoGrain, AGGS, GRAINS } from './model.js';
import { autoBuild, renderScene, makeContext, profile, defaultAgg, sceneName, tileTitle, uid } from './dash.js';
import { hideTip } from './charts.js';
import { t, tt } from './i18n.js';

const STORE_KEY = 'argus.workspace.v1';
const CANVAS_W = 1600;
const CANVAS_H = 900;

const state = {
  lang: 'el',
  theme: 'dark',
  table: null,
  scenes: [],
  sceneIndex: 0,
  filters: [],
  period: 'all',
  mode: 'studio',
  autoplay: false,
  autoplaySeconds: 14,
  sourceName: '',
  loadedAt: null,
};

let autoplayTimer = null;
const deferred = [];
const defer = (fn) => deferred.push(fn);

const $ = (sel) => document.querySelector(sel);
const S = (key) => t(state.lang, key);

/* ---------- small DOM helpers ---------- */

function h(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text !== undefined) node.textContent = opts.text;
  if (opts.title) node.title = opts.title;
  if (opts.type) node.type = opts.type;
  if (opts.attrs) for (const k in opts.attrs) node.setAttribute(k, opts.attrs[k]);
  if (opts.on) for (const k in opts.on) node.addEventListener(k, opts.on[k]);
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
}

function button(label, cls, onClick, title) {
  return h('button', { class: cls, text: label, title, type: 'button', on: { click: onClick } });
}

function select(options, value, onChange, cls = 'ax-select') {
  const sel = h('select', { class: cls, on: { change: (e) => onChange(e.target.value) } });
  for (const o of options) {
    const opt = h('option', { text: o.label });
    opt.value = o.value;
    if (String(o.value) === String(value)) opt.selected = true;
    sel.appendChild(opt);
  }
  return sel;
}

function flash(message, kind = 'info') {
  const bar = $('#ax-flash');
  bar.textContent = message;
  bar.className = `ax-flash is-on is-${kind}`;
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => bar.classList.remove('is-on'), kind === 'error' ? 7000 : 3500);
}

/* ---------- persistence ---------- */

function serialise(includeData) {
  const doc = {
    format: 'argus-workspace',
    version: 1,
    savedAt: new Date().toISOString(),
    lang: state.lang,
    theme: state.theme,
    period: state.period,
    filters: state.filters,
    sceneIndex: state.sceneIndex,
    scenes: state.scenes,
    sourceName: state.sourceName,
  };
  if (includeData && state.table) {
    doc.table = {
      name: state.table.name,
      fields: state.table.fields,
      rows: state.table.rows.map((r) => {
        const o = {};
        for (const f of state.table.fields) {
          const v = r[f.key];
          o[f.key] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
        }
        return o;
      }),
    };
  }
  return doc;
}

function restoreTable(saved) {
  const table = tableFromObjects(saved.rows, saved.name);
  // Keep the labels/units the workspace was authored against.
  for (const f of table.fields) {
    const prior = saved.fields.find((x) => x.key === f.key);
    if (prior) { f.label = prior.label; f.unit = prior.unit; }
  }
  return table;
}

function autosave() {
  if (!state.table) return;
  try {
    const doc = serialise(state.table.rows.length <= 25000);
    localStorage.setItem(STORE_KEY, JSON.stringify(doc));
  } catch {
    // Quota exceeded on a big table: keep the layout, drop the data.
    try { localStorage.setItem(STORE_KEY, JSON.stringify(serialise(false))); } catch { /* ignore */ }
  }
}

function loadAutosave() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const doc = JSON.parse(raw);
    if (!doc || !doc.table || !doc.scenes) return false;
    applyWorkspace(doc);
    return true;
  } catch { return false; }
}

function applyWorkspace(doc) {
  state.lang = doc.lang || state.lang;
  state.theme = doc.theme || state.theme;
  state.period = doc.period || 'all';
  state.filters = doc.filters || [];
  state.scenes = doc.scenes || [];
  state.sceneIndex = Math.min(doc.sceneIndex || 0, Math.max(0, state.scenes.length - 1));
  state.sourceName = doc.sourceName || '';
  if (doc.table) {
    state.table = restoreTable(doc.table);
    state.loadedAt = doc.savedAt ? new Date(doc.savedAt) : new Date();
  }
}

function saveToFile() {
  const doc = serialise(true);
  const blob = new Blob([JSON.stringify(doc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a');
  a.href = url;
  a.download = `${(state.sourceName || 'argus').replace(/[^\wͰ-Ͽ.-]+/g, '-')}.argus.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- data loading ---------- */

async function ingest(files) {
  const list = [...files];
  if (!list.length) return;
  flash(S('parsing'));
  try {
    const tables = [];
    for (const file of list) tables.push(...(await readFile(file)));
    // Largest table wins when a workbook has several sheets.
    tables.sort((a, b) => b.rows.length * b.fields.length - a.rows.length * a.fields.length);
    useTable(tables[0], list.map((f) => f.name).join(', '));
    flash(`${tables[0].rows.length.toLocaleString(state.lang === 'en' ? 'en-GB' : 'el-GR')} ${S('recordCount')} · ${tables[0].fields.length} ${S('columns')}`);
  } catch (err) {
    flash(err.message || String(err), 'error');
  }
}

function useTable(table, sourceName) {
  state.table = table;
  state.sourceName = sourceName || table.name;
  state.loadedAt = new Date();
  state.filters = [];
  state.period = 'all';
  state.scenes = autoBuild(table, state.lang);
  state.sceneIndex = 0;
  render();
  autosave();
}

async function loadDemo() {
  flash(S('parsing'));
  try {
    const res = await fetch('demo/kasidis-sales.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Sample data unavailable (${res.status}).`);
    const doc = await res.json();
    // The sample ships columnar (header names once, not per row) — expand it.
    const list = doc.columns
      ? doc.rows.map((row) => {
        const o = {};
        doc.columns.forEach((c, i) => { o[c] = row[i]; });
        return o;
      })
      : doc.rows;
    const table = tableFromObjects(list, doc.name || 'Sample');
    if (doc.units) for (const f of table.fields) if (doc.units[f.key]) f.unit = doc.units[f.key];
    useTable(table, doc.name || 'Sample');
    flash(`${table.rows.length.toLocaleString('el-GR')} ${S('recordCount')}`);
  } catch (err) {
    flash(err.message || String(err), 'error');
  }
}

/* ---------- filters ---------- */

function periodFilter() {
  const p = profile(state.table);
  if (!p.time || state.period === 'all') return null;
  const extent = dateExtent(state.table, p.time.key);
  if (!extent) return null;
  const [, max] = extent;
  const end = new Date(max);
  let from;
  if (state.period === 'ytd') from = Date.UTC(end.getUTCFullYear(), 0, 1);
  else from = max - Number(state.period) * 86400000;
  return { field: p.time.key, op: 'daterange', value: [from, max] };
}

function activeFilters() {
  const list = state.filters.filter((f) => f.value && f.value.length);
  const period = periodFilter();
  return period ? [...list, period] : list;
}

function filterSummary() {
  const bits = [];
  const p = profile(state.table);
  if (state.period !== 'all' && p.time) {
    bits.push(state.period === 'ytd' ? S('ytd') : S(state.period === '30' ? 'last30' : state.period === '90' ? 'last90' : 'last365'));
  }
  for (const f of state.filters) {
    if (!f.value || !f.value.length) continue;
    const field = state.table.fields.find((x) => x.key === f.field);
    bits.push(`${field ? field.label : f.field}: ${f.value.length > 2 ? `${f.value.length} ${S('allValues').toLowerCase()}` : f.value.join(', ')}`);
  }
  return bits.join('  ·  ');
}

/* ---------- multi-select popover ---------- */

let openPopover = null;

function closePopover() {
  if (openPopover) { openPopover.remove(); openPopover = null; }
}
document.addEventListener('click', (e) => {
  if (openPopover && !openPopover.contains(e.target) && !e.target.closest('.ax-chip')) closePopover();
});

function dimensionChip(field) {
  const current = state.filters.find((f) => f.field === field.key);
  const count = current && current.value ? current.value.length : 0;
  const chip = button(
    count ? `${field.label} · ${count}` : field.label,
    `ax-chip${count ? ' is-active' : ''}`,
    (e) => {
      e.stopPropagation();
      const wasOpen = openPopover && openPopover.dataset.field === field.key;
      closePopover();
      if (wasOpen) return;
      openPopover = buildValuePopover(field, chip);
    },
  );
  return chip;
}

function buildValuePopover(field, anchor) {
  const values = distinctValues(state.table, field.key, 300);
  const pop = h('div', { class: 'ax-pop' });
  pop.dataset.field = field.key;

  const search = h('input', { class: 'ax-pop-search', attrs: { type: 'search', placeholder: field.label, 'aria-label': field.label } });
  pop.appendChild(search);

  const list = h('div', { class: 'ax-pop-list' });
  pop.appendChild(list);

  const chosen = new Set((state.filters.find((f) => f.field === field.key) || {}).value || []);

  function paint(term) {
    list.textContent = '';
    const q = (term || '').toLowerCase();
    let shown = 0;
    for (const v of values) {
      const label = String(v.value);
      if (q && !label.toLowerCase().includes(q)) continue;
      if (shown++ > 200) break;
      const row = h('label', { class: 'ax-pop-row' });
      const box = h('input', { attrs: { type: 'checkbox' } });
      box.checked = chosen.has(v.value);
      box.addEventListener('change', () => {
        if (box.checked) chosen.add(v.value); else chosen.delete(v.value);
      });
      row.append(box, h('span', { class: 'ax-pop-label', text: label }), h('span', { class: 'ax-pop-count', text: String(v.count) }));
      list.appendChild(row);
    }
    if (!shown) list.appendChild(h('div', { class: 'ax-pop-empty', text: S('noData') }));
  }
  paint('');
  search.addEventListener('input', () => paint(search.value));

  const foot = h('div', { class: 'ax-pop-foot' }, [
    button(S('clearFilters'), 'ax-btn ax-btn-ghost', () => { chosen.clear(); commit(); }),
    button(S('apply'), 'ax-btn ax-btn-primary', () => commit()),
  ]);
  pop.appendChild(foot);

  function commit() {
    state.filters = state.filters.filter((f) => f.field !== field.key);
    if (chosen.size) state.filters.push({ field: field.key, op: 'in', value: [...chosen] });
    closePopover();
    render();
    autosave();
  }

  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  pop.style.left = `${Math.min(r.left, window.innerWidth - pop.offsetWidth - 12)}px`;
  pop.style.top = `${r.bottom + 8}px`;
  search.focus();
  return pop;
}

/* ---------- tile editor ---------- */

function openEditor(tile, sceneIndex) {
  const table = state.table;
  const p = profile(table);
  const draft = { ...tile };
  const isNew = !state.scenes[sceneIndex].tiles.some((x) => x.id === tile.id);

  const dialog = $('#ax-editor');
  dialog.textContent = '';

  const form = h('div', { class: 'ax-form' });

  const measureOptions = [
    ...p.measures.map((f) => ({ value: f.key, label: f.label })),
    ...table.fields.filter((f) => f.role !== 'measure').map((f) => ({ value: f.key, label: `${f.label} (${S('kpiCount').toLowerCase()})` })),
  ];
  const dimOptions = [
    ...p.times.map((f) => ({ value: f.key, label: `🕘 ${f.label}` })),
    ...p.dims.map((f) => ({ value: f.key, label: f.label })),
  ];

  function row(labelText, control) {
    return h('label', { class: 'ax-form-row' }, [h('span', { class: 'ax-form-label', text: labelText }), control]);
  }

  // Empty means "keep the generated title"; the placeholder shows what that is.
  const titleInput = h('input', {
    class: 'ax-input',
    attrs: { type: 'text', value: draft.title || '', placeholder: tileTitle({ ...draft, title: '' }, table, state.lang) },
  });
  titleInput.addEventListener('input', () => { draft.title = titleInput.value.trim(); });

  form.appendChild(row(S('title'), titleInput));
  form.appendChild(row(S('chartType'), select(
    ['kpi', 'column', 'bar', 'line', 'area', 'stack', 'donut', 'table', 'heatmap'].map((v) => ({ value: v, label: tt(state.lang, 'types', v) })),
    draft.type, (v) => { draft.type = v; rebuild(); },
  )));
  form.appendChild(row(S('measure'), select(measureOptions, draft.measure, (v) => { draft.measure = v; })));
  form.appendChild(row(S('aggregate'), select(
    AGGS.map((v) => ({ value: v, label: tt(state.lang, 'aggs', v) })), draft.agg, (v) => { draft.agg = v; },
  )));

  if (draft.type !== 'kpi') {
    form.appendChild(row(S('dimension'), select(dimOptions, draft.dimension, (v) => { draft.dimension = v; rebuild(); })));
    const dimField = table.fields.find((f) => f.key === draft.dimension);
    if (dimField && dimField.type === 'date') {
      form.appendChild(row(S('grain'), select(
        GRAINS.map((v) => ({ value: v, label: tt(state.lang, 'grains', v) })), draft.grain || 'month', (v) => { draft.grain = v; },
      )));
    }
    if (['stack', 'line', 'area', 'heatmap'].includes(draft.type)) {
      form.appendChild(row(S('breakdown'), select(
        [{ value: '', label: S('none') }, ...p.dims.map((f) => ({ value: f.key, label: f.label }))],
        draft.series || '', (v) => { draft.series = v || null; },
      )));
    }
    if (['bar', 'column', 'donut', 'table'].includes(draft.type)) {
      form.appendChild(row(S('limit'), select(
        [0, 5, 8, 10, 12, 15, 20, 30].map((n) => ({ value: n, label: n ? String(n) : S('allValues') })),
        draft.limit || 0, (v) => { draft.limit = Number(v); },
      )));
    }
  }

  form.appendChild(row(S('tileWidth'), select(
    [3, 4, 6, 8, 9, 12].map((n) => ({ value: n, label: `${n}/12` })), draft.w, (v) => { draft.w = Number(v); },
  )));
  form.appendChild(row(S('tileHeight'), select(
    [1, 2, 3, 4].map((n) => ({ value: n, label: String(n) })), draft.h, (v) => { draft.h = Number(v); },
  )));

  const foot = h('div', { class: 'ax-dialog-foot' }, [
    button(S('cancel'), 'ax-btn ax-btn-ghost', () => dialog.close()),
    button(S('apply'), 'ax-btn ax-btn-primary', () => {
      const scene = state.scenes[sceneIndex];
      const idx = scene.tiles.findIndex((x) => x.id === draft.id);
      if (idx >= 0) scene.tiles[idx] = draft; else scene.tiles.push(draft);
      dialog.close();
      render();
      autosave();
    }),
  ]);

  dialog.append(
    h('h2', { class: 'ax-dialog-title', text: isNew ? S('newTile') : S('edit') }),
    form,
    foot,
  );
  if (!dialog.open) dialog.showModal();

  function rebuild() {
    dialog.close();
    openEditor(draft, sceneIndex);
  }
}

/* ---------- scene actions ---------- */

function currentScene() {
  return state.scenes[state.sceneIndex] || null;
}

function addScene() {
  state.scenes.push({ id: uid(), nameKey: 'slide', nameIndex: state.scenes.length + 1, tiles: [] });
  state.sceneIndex = state.scenes.length - 1;
  render();
  autosave();
}

function goto(index) {
  if (!state.scenes.length) return;
  const n = state.scenes.length;
  state.sceneIndex = ((index % n) + n) % n;
  render();
}

/* ---------- rendering ---------- */

function renderTopbar() {
  const bar = h('div', { class: 'ax-topbar' });

  const brand = h('div', { class: 'ax-brand' }, [
    h('span', { class: 'ax-brand-mark', text: 'A' }),
    h('span', { class: 'ax-brand-name', text: S('appName') }),
  ]);

  const meta = h('div', { class: 'ax-source' }, [
    h('span', { class: 'ax-source-name', text: state.sourceName || '—' }),
    h('span', {
      class: 'ax-source-meta',
      text: state.table ? `${state.table.rows.length.toLocaleString(state.lang === 'en' ? 'en-GB' : 'el-GR')} ${S('recordCount')}` : '',
    }),
  ]);

  const modes = h('div', { class: 'ax-modes' }, [
    button(S('studio'), `ax-mode${state.mode === 'studio' ? ' is-on' : ''}`, () => setMode('studio')),
    button(S('present'), `ax-mode${state.mode === 'present' ? ' is-on' : ''}`, () => setMode('present')),
    button(S('wallboard'), `ax-mode${state.mode === 'wallboard' ? ' is-on' : ''}`, () => setMode('wallboard')),
  ]);

  const tools = h('div', { class: 'ax-tools' }, [
    button(S('addData'), 'ax-btn ax-btn-ghost', () => $('#ax-file').click(), S('addData')),
    button(S('save'), 'ax-btn ax-btn-ghost', saveToFile),
    button(S('load'), 'ax-btn ax-btn-ghost', () => $('#ax-workspace-file').click()),
    button(S('print'), 'ax-btn ax-btn-ghost', () => window.print()),
    button(state.theme === 'dark' ? '☀' : '☾', 'ax-icon-btn', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = state.theme;
      autosave();
      render();
    }, S('theme')),
    button(S('lang'), 'ax-icon-btn', () => {
      state.lang = state.lang === 'el' ? 'en' : 'el';
      autosave();
      render();
    }),
  ]);

  bar.append(brand, meta, modes, tools);
  return bar;
}

function renderFilterbar() {
  const p = profile(state.table);
  const bar = h('div', { class: 'ax-filterbar' });

  if (p.time) {
    const periods = [
      { value: 'all', label: S('allTime') },
      { value: '30', label: S('last30') },
      { value: '90', label: S('last90') },
      { value: '365', label: S('last365') },
      { value: 'ytd', label: S('ytd') },
    ];
    bar.appendChild(h('span', { class: 'ax-filter-label', text: S('period') }));
    bar.appendChild(select(periods, state.period, (v) => { state.period = v; render(); autosave(); }, 'ax-select ax-select-period'));
  }

  bar.appendChild(h('span', { class: 'ax-filter-label', text: S('filters') }));
  for (const field of p.dims.slice(0, 5)) bar.appendChild(dimensionChip(field));

  if (state.filters.length || state.period !== 'all') {
    bar.appendChild(button(S('clearFilters'), 'ax-btn ax-btn-ghost ax-btn-sm', () => {
      state.filters = [];
      state.period = 'all';
      render();
      autosave();
    }));
  }
  return bar;
}

function renderSceneChrome(scene) {
  const head = h('header', { class: 'ax-scene-head' });
  const left = h('div', { class: 'ax-scene-titles' }, [
    h('h2', { class: 'ax-scene-name', text: sceneName(scene, state.lang) }),
    h('p', { class: 'ax-scene-sub', text: filterSummary() || state.sourceName }),
  ]);
  const right = h('div', { class: 'ax-scene-meta' }, [
    h('span', { class: 'ax-scene-count', text: `${state.sceneIndex + 1} ${S('of')} ${state.scenes.length}` }),
    h('span', { class: 'ax-scene-brand', text: 'ARGUS' }),
  ]);
  head.append(left, right);
  return head;
}

function renderTileTools(card, tile, scene) {
  const tools = h('div', { class: 'ax-tile-tools' }, [
    button('✎', 'ax-tile-btn', (e) => { e.stopPropagation(); openEditor(tile, state.sceneIndex); }, S('edit')),
    button('⧉', 'ax-tile-btn', (e) => {
      e.stopPropagation();
      const copy = { ...tile, id: uid() };
      scene.tiles.splice(scene.tiles.indexOf(tile) + 1, 0, copy);
      render(); autosave();
    }, S('duplicate')),
    button('‹', 'ax-tile-btn', (e) => {
      e.stopPropagation();
      const i = scene.tiles.indexOf(tile);
      if (i > 0) { scene.tiles.splice(i, 1); scene.tiles.splice(i - 1, 0, tile); render(); autosave(); }
    }, S('moveLeft')),
    button('›', 'ax-tile-btn', (e) => {
      e.stopPropagation();
      const i = scene.tiles.indexOf(tile);
      if (i < scene.tiles.length - 1) { scene.tiles.splice(i, 1); scene.tiles.splice(i + 1, 0, tile); render(); autosave(); }
    }, S('moveRight')),
    button('×', 'ax-tile-btn ax-tile-btn-danger', (e) => {
      e.stopPropagation();
      scene.tiles.splice(scene.tiles.indexOf(tile), 1);
      render(); autosave();
    }, S('remove')),
  ]);
  card.appendChild(tools);
}

function renderStage() {
  const stage = h('div', { class: 'ax-stage' });
  const canvas = h('div', { class: 'ax-canvas' });
  canvas.style.width = `${CANVAS_W}px`;
  canvas.style.height = `${CANVAS_H}px`;

  const scene = currentScene();
  if (!scene) {
    canvas.appendChild(h('div', { class: 'ax-empty ax-empty-scene', text: S('noData') }));
  } else {
    canvas.appendChild(renderSceneChrome(scene));
    const ctx = makeContext(state.table, activeFilters(), state.lang, defer);
    const grid = renderScene(scene, ctx);
    if (state.mode === 'studio') {
      grid.querySelectorAll('.ax-card').forEach((card) => {
        const tile = scene.tiles.find((x) => x.id === card.dataset.tileId);
        if (tile) renderTileTools(card, tile, scene);
      });
    }
    canvas.appendChild(grid);
  }

  stage.appendChild(canvas);
  return stage;
}

function renderScenebar() {
  const bar = h('div', { class: 'ax-scenebar' });
  const tabs = h('div', { class: 'ax-scene-tabs' });

  state.scenes.forEach((scene, i) => {
    const tab = h('div', { class: `ax-scene-tab${i === state.sceneIndex ? ' is-on' : ''}` });
    const label = h('button', {
      class: 'ax-scene-tab-label', type: 'button', text: sceneName(scene, state.lang),
      on: { click: () => goto(i) },
    });
    label.addEventListener('dblclick', () => {
      const next = prompt(S('rename'), sceneName(scene, state.lang));
      // A user-set name wins over the i18n key from then on.
      if (next && next.trim()) { scene.name = next.trim(); render(); autosave(); }
    });
    tab.appendChild(label);
    if (state.scenes.length > 1) {
      tab.appendChild(button('×', 'ax-scene-tab-x', () => {
        state.scenes.splice(i, 1);
        state.sceneIndex = Math.max(0, Math.min(state.sceneIndex, state.scenes.length - 1));
        render(); autosave();
      }, S('deleteScene')));
    }
    tabs.appendChild(tab);
  });

  tabs.appendChild(button(`+ ${S('newScene')}`, 'ax-scene-add', addScene));
  bar.appendChild(tabs);

  // Add-card lives in the chrome, not on the slide, so the canvas stays a
  // true preview of what gets presented.
  bar.appendChild(button(`+ ${S('newTile')}`, 'ax-btn ax-btn-primary ax-add-tile', () => {
    const p = profile(state.table);
    openEditor({
      id: uid(), type: 'bar', title: '',
      measure: (p.primary || state.table.fields[0]).key,
      agg: p.primary ? defaultAgg(p.primary) : 'count',
      dimension: (p.entities[0] || p.dims[0] || p.times[0] || state.table.fields[0]).key,
      grain: 'month', limit: 8, w: 6, h: 2,
    }, state.sceneIndex);
  }));
  return bar;
}

function renderPresentBar() {
  const bar = h('div', { class: 'ax-presentbar' });

  const dots = h('div', { class: 'ax-dots' });
  state.scenes.forEach((scene, i) => {
    dots.appendChild(button('', `ax-dot${i === state.sceneIndex ? ' is-on' : ''}`, () => goto(i), sceneName(scene, state.lang)));
  });

  const play = button(state.autoplay ? '❙❙' : '▶', 'ax-icon-btn', () => {
    state.autoplay = !state.autoplay;
    syncAutoplay();
    render();
  }, S('autoplay'));

  bar.append(
    button('‹', 'ax-icon-btn', () => goto(state.sceneIndex - 1)),
    dots,
    button('›', 'ax-icon-btn', () => goto(state.sceneIndex + 1)),
    play,
    button('⛶', 'ax-icon-btn', toggleFullscreen, S('fullscreen')),
    button(S('exit'), 'ax-btn ax-btn-ghost', () => setMode('studio')),
    h('span', { class: 'ax-keys', text: S('keysHint') }),
  );
  return bar;
}

function renderWallboardBar() {
  const clock = h('span', { class: 'ax-clock' });
  const paint = () => {
    clock.textContent = new Date().toLocaleTimeString(state.lang === 'en' ? 'en-GB' : 'el-GR', { hour: '2-digit', minute: '2-digit' });
  };
  paint();
  clearInterval(renderWallboardBar.timer);
  renderWallboardBar.timer = setInterval(paint, 20000);

  return h('div', { class: 'ax-wallbar' }, [
    h('span', { class: 'ax-wall-source', text: state.sourceName }),
    clock,
    button(S('exit'), 'ax-btn ax-btn-ghost', () => setMode('studio')),
  ]);
}

function fitCanvas() {
  const stage = $('.ax-stage');
  const canvas = $('.ax-canvas');
  if (!stage || !canvas) return;
  const pad = state.mode === 'studio' ? 32 : 24;
  const scale = Math.min((stage.clientWidth - pad) / CANVAS_W, (stage.clientHeight - pad) / CANVAS_H);
  canvas.style.transform = `scale(${Math.max(0.2, scale)})`;
}

function render() {
  hideTip();
  closePopover();
  deferred.length = 0;
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.lang = state.lang;
  document.body.dataset.mode = state.mode;

  const root = $('#ax-app');
  root.textContent = '';

  if (!state.table) {
    root.appendChild(renderWelcome());
    return;
  }

  if (state.mode === 'studio') {
    root.append(renderTopbar(), renderFilterbar(), renderStage(), renderScenebar());
  } else if (state.mode === 'present') {
    root.append(renderStage(), renderPresentBar());
  } else {
    root.append(renderStage(), renderWallboardBar());
  }

  requestAnimationFrame(() => {
    fitCanvas();
    // Charts measure their box, so they draw only once the canvas has size.
    requestAnimationFrame(() => {
      const jobs = deferred.splice(0);
      for (const job of jobs) { try { job(); } catch (err) { console.error(err); } }
    });
  });
}

function renderWelcome() {
  const zone = h('div', { class: 'ax-welcome' });

  const card = h('div', { class: 'ax-welcome-card' }, [
    h('div', { class: 'ax-welcome-mark', text: 'A' }),
    h('h1', { class: 'ax-welcome-title', text: S('appName') }),
    h('p', { class: 'ax-welcome-tag', text: S('tagline') }),
    h('div', { class: 'ax-drop' }, [
      h('p', { class: 'ax-drop-title', text: S('dropTitle') }),
      h('p', { class: 'ax-drop-hint', text: S('dropHint') }),
      h('div', { class: 'ax-drop-actions' }, [
        button(S('browse'), 'ax-btn ax-btn-primary', () => $('#ax-file').click()),
        button(S('demo'), 'ax-btn ax-btn-ghost', loadDemo),
      ]),
    ]),
    h('button', {
      class: 'ax-welcome-lang', type: 'button', text: S('lang'),
      on: { click: () => { state.lang = state.lang === 'el' ? 'en' : 'el'; render(); } },
    }),
  ]);

  zone.appendChild(card);
  return zone;
}

/* ---------- modes ---------- */

function setMode(mode) {
  state.mode = mode;
  state.autoplay = mode === 'wallboard';
  syncAutoplay();
  if (mode !== 'studio' && !document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => { /* user gesture may be required */ });
  } else if (mode === 'studio' && document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => { /* ignore */ });
  }
  render();
}

function syncAutoplay() {
  clearInterval(autoplayTimer);
  if (state.autoplay && state.scenes.length > 1) {
    autoplayTimer = setInterval(() => goto(state.sceneIndex + 1), state.autoplaySeconds * 1000);
  }
}

/* Printing exports the whole deck, one page per scene — the handout version
   of the presentation, not just whatever is on screen. */
function buildPrintDeck() {
  if (!state.table || !state.scenes.length) return;
  document.querySelector('.ax-print-deck')?.remove();
  document.body.dataset.printing = '1';

  const deck = h('div', { class: 'ax-print-deck' });
  const jobs = [];
  const printDefer = (fn) => jobs.push(fn);

  for (const scene of state.scenes) {
    const canvas = h('div', { class: 'ax-canvas' });
    canvas.style.width = `${CANVAS_W}px`;
    canvas.style.height = `${CANVAS_H}px`;
    canvas.appendChild(renderSceneChrome(scene));
    canvas.appendChild(renderScene(scene, makeContext(state.table, activeFilters(), state.lang, printDefer)));
    deck.appendChild(canvas);
  }
  document.body.appendChild(deck);
  // Print is synchronous, so the charts have to be drawn before we return.
  for (const job of jobs) { try { job(); } catch (err) { console.error(err); } }
}

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen?.().catch(() => { /* ignore */ });
}

/* ---------- wiring ---------- */

function wire() {
  const fileInput = $('#ax-file');
  fileInput.addEventListener('change', () => { ingest(fileInput.files); fileInput.value = ''; });

  const wsInput = $('#ax-workspace-file');
  wsInput.addEventListener('change', async () => {
    const file = wsInput.files[0];
    wsInput.value = '';
    if (!file) return;
    try {
      const doc = JSON.parse(await file.text());
      if (doc.format !== 'argus-workspace') throw new Error('That is not an Argus workspace file.');
      if (!doc.table && !state.table) throw new Error('That workspace has no data — load the data file first.');
      applyWorkspace(doc);
      render();
      autosave();
      flash(S('done'));
    } catch (err) {
      flash(err.message || String(err), 'error');
    }
  });

  let dragDepth = 0;
  document.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return;
    e.preventDefault();
    dragDepth++;
    document.body.classList.add('is-dragging');
  });
  document.addEventListener('dragover', (e) => { if (e.dataTransfer) e.preventDefault(); });
  document.addEventListener('dragleave', () => {
    if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('is-dragging'); }
  });
  document.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('is-dragging');
    ingest(e.dataTransfer.files);
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (state.mode === 'studio' && !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': goto(state.sceneIndex + 1); break;
      case 'ArrowLeft': case 'PageUp': goto(state.sceneIndex - 1); break;
      case 'f': case 'F': toggleFullscreen(); break;
      case 'Escape': if (state.mode !== 'studio') setMode('studio'); break;
      case ' ': e.preventDefault(); state.autoplay = !state.autoplay; syncAutoplay(); render(); break;
      default: break;
    }
  });

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    fitCanvas();
    // Re-draw after the resize settles so charts re-measure their boxes.
    resizeTimer = setTimeout(render, 220);
  });

  window.addEventListener('beforeprint', buildPrintDeck);
  window.addEventListener('afterprint', () => {
    document.querySelector('.ax-print-deck')?.remove();
    delete document.body.dataset.printing;
  });
}

/* ---------- boot ---------- */

function boot() {
  // Fonts are parked on media="print" so they never block first paint.
  const gfont = document.getElementById('gfont');
  if (gfont) gfont.media = 'all';

  wire();
  const restored = loadAutosave();
  if (restored && state.table) {
    render();
    flash(`${S('loadedAt')}: ${state.sourceName}`);
  } else {
    render();
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
