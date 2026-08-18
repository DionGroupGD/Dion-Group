/* Argus — SVG chart renderers.
   No chart library: every mark is built with createElementNS, which keeps the
   app dependency-free, CSP-clean, and XSS-safe (customer data is only ever set
   through textContent, never innerHTML).

   Colours come from CSS custom properties (--series-1..8, --grid, --ink-*), so
   light/dark is one stylesheet swap and never a second palette in JS. */

import { formatNumber, formatDelta } from './model.js';

const NS = 'http://www.w3.org/2000/svg';
export const SERIES_SLOTS = 8;

function el(tag, attrs, parent) {
  const node = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(node);
  return node;
}

function text(parent, str, attrs) {
  const t = el('text', attrs, parent);
  t.textContent = str;
  return t;
}

export function seriesColor(i) {
  return `var(--series-${(i % SERIES_SLOTS) + 1})`;
}

/* ---------- shared chrome ---------- */

/** Nice round axis ceiling: 1/2/2.5/5 × 10^n above the max. */
function niceMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const pow = 10 ** exp;
  const frac = value / pow;
  const step = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 2.5 ? 2.5 : frac <= 5 ? 5 : 10;
  return step * pow;
}

function ticks(max, count = 4) {
  const out = [];
  for (let i = 0; i <= count; i++) out.push((max / count) * i);
  return out;
}

/**
 * Bar path with rounded data-end and a square baseline.
 * dir: 'up' | 'right'
 */
function barPath(x, y, w, h, r, dir) {
  const rad = Math.max(0, Math.min(r, dir === 'up' ? w / 2 : h / 2, dir === 'up' ? h : w));
  if (dir === 'up') {
    if (h <= 0.5) return `M${x} ${y + h} h${w}`;
    return `M${x} ${y + h} L${x} ${y + rad} Q${x} ${y} ${x + rad} ${y} L${x + w - rad} ${y} Q${x + w} ${y} ${x + w} ${y + rad} L${x + w} ${y + h} Z`;
  }
  if (w <= 0.5) return `M${x} ${y} v${h}`;
  return `M${x} ${y} L${x + w - rad} ${y} Q${x + w} ${y} ${x + w} ${y + rad} L${x + w} ${y + h - rad} Q${x + w} ${y + h} ${x + w - rad} ${y + h} L${x} ${y + h} Z`;
}

/* ---------- tooltip ---------- */

let tipNode = null;
function tooltip() {
  if (!tipNode) {
    tipNode = document.createElement('div');
    tipNode.className = 'ax-tip';
    tipNode.setAttribute('role', 'status');
    document.body.appendChild(tipNode);
  }
  return tipNode;
}

function showTip(evt, lines) {
  const tip = tooltip();
  tip.textContent = '';
  for (const line of lines) {
    const row = document.createElement('div');
    row.className = 'ax-tip-row';
    if (line.color) {
      const dot = document.createElement('span');
      dot.className = 'ax-tip-dot';
      dot.style.background = line.color;
      row.appendChild(dot);
    }
    const label = document.createElement('span');
    label.className = line.head ? 'ax-tip-head' : 'ax-tip-label';
    label.textContent = line.label;
    row.appendChild(label);
    if (line.value !== undefined) {
      const val = document.createElement('span');
      val.className = 'ax-tip-value';
      val.textContent = line.value;
      row.appendChild(val);
    }
    tip.appendChild(row);
  }
  tip.classList.add('is-on');
  const pad = 14;
  const r = tip.getBoundingClientRect();
  let x = evt.clientX + pad;
  let y = evt.clientY + pad;
  if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - pad;
  if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - pad;
  tip.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
}

export function hideTip() {
  if (tipNode) tipNode.classList.remove('is-on');
}

function hoverable(node, lines) {
  node.addEventListener('pointerenter', (e) => showTip(e, lines()));
  node.addEventListener('pointermove', (e) => showTip(e, lines()));
  node.addEventListener('pointerleave', hideTip);
}

/* ---------- legend ---------- */

function legend(container, items) {
  const box = document.createElement('div');
  box.className = 'ax-legend';
  for (const it of items) {
    const chip = document.createElement('span');
    chip.className = 'ax-legend-item';
    const dot = document.createElement('span');
    dot.className = 'ax-legend-dot';
    dot.style.background = it.color;
    const label = document.createElement('span');
    label.textContent = it.label;
    chip.append(dot, label);
    box.appendChild(chip);
  }
  container.appendChild(box);
  return box;
}

/* ---------- measuring ---------- */

function frame(container) {
  const w = Math.max(160, container.clientWidth || 320);
  const h = Math.max(90, container.clientHeight || 200);
  container.textContent = '';
  const svg = el('svg', {
    viewBox: `0 0 ${w} ${h}`, width: '100%', height: '100%',
    preserveAspectRatio: 'xMidYMid meet', class: 'ax-svg', role: 'img',
  }, container);
  return { svg, w, h };
}

/** Rough text width — good enough to decide whether a label fits. */
function textWidth(str, size) {
  return String(str).length * size * 0.56;
}

function truncate(str, size, max) {
  const s = String(str);
  if (textWidth(s, size) <= max) return s;
  const keep = Math.max(1, Math.floor(max / (size * 0.56)) - 1);
  return `${s.slice(0, keep)}…`;
}

/* ---------- KPI ---------- */

export function renderKpi(container, opts) {
  const { value, delta, unit, lang, spark, goodDirection = 1, subtitle } = opts;
  container.textContent = '';
  const wrap = document.createElement('div');
  wrap.className = `ax-kpi${opts.hero ? ' is-hero' : ''}`;

  const v = document.createElement('div');
  v.className = 'ax-kpi-value';
  v.textContent = formatNumber(value, unit, lang, { compact: true });
  wrap.appendChild(v);

  const meta = document.createElement('div');
  meta.className = 'ax-kpi-meta';
  if (delta !== null && delta !== undefined && Number.isFinite(delta)) {
    const d = document.createElement('span');
    const good = delta * goodDirection >= 0;
    d.className = `ax-delta ${good ? 'is-good' : 'is-bad'}`;
    // Arrow + sign + label: direction never rides on colour alone.
    d.textContent = `${delta >= 0 ? '▲' : '▼'} ${formatDelta(delta, lang)}`;
    meta.appendChild(d);
  }
  if (subtitle) {
    const s = document.createElement('span');
    s.className = 'ax-kpi-sub';
    s.textContent = subtitle;
    meta.appendChild(s);
  }
  if (meta.childNodes.length) wrap.appendChild(meta);
  container.appendChild(wrap);

  if (spark && spark.length > 1) {
    const holder = document.createElement('div');
    holder.className = 'ax-kpi-spark';
    container.appendChild(holder);
    // Give the sparkline a measured box before drawing into it.
    requestAnimationFrame(() => drawSpark(holder, spark));
  }
}

function drawSpark(container, values) {
  const { svg, w, h } = frame(container);
  const pad = 3;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Headroom above and below, so a nearly flat series doesn't fill the box
  // edge to edge and read as dramatic.
  const spread = (max - min) || Math.abs(max) || 1;
  const lo = min - spread * 0.2;
  const span = (max + spread * 0.2) - lo;
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const y = (v) => h - pad - ((v - lo) / span) * (h - pad * 2);

  let d = '';
  values.forEach((v, i) => { d += `${i ? 'L' : 'M'}${pad + i * step} ${y(v)}`; });
  el('path', { d: `${d} L${pad + (values.length - 1) * step} ${h} L${pad} ${h} Z`, fill: 'var(--series-1)', 'fill-opacity': 0.1, stroke: 'none' }, svg);
  el('path', { d, fill: 'none', stroke: 'var(--spark)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
  const last = values.length - 1;
  el('circle', { cx: pad + last * step, cy: y(values[last]), r: 3.5, fill: 'var(--series-1)', stroke: 'var(--surface)', 'stroke-width': 2 }, svg);
}

/* ---------- bar / column ---------- */

export function renderBars(container, opts) {
  const { data, unit, lang, horizontal, measureLabel } = opts;
  const rows = data.rows.filter((r) => r.value !== null);
  if (!rows.length) return empty(container, opts.emptyText);

  container.textContent = '';
  const holder = document.createElement('div');
  holder.className = 'ax-plot';
  container.appendChild(holder);

  const { svg, w, h } = frame(holder);
  const max = niceMax(Math.max(...rows.map((r) => Math.abs(r.value))));
  const LABEL = 11;

  if (horizontal) {
    const labelW = Math.min(w * 0.38, Math.max(...rows.map((r) => textWidth(r.label, LABEL))) + 12);
    const valueW = 62;
    const x0 = labelW;
    const plotW = Math.max(20, w - labelW - valueW);
    const band = h / rows.length;
    const thick = Math.min(24, band - 6);

    rows.forEach((r, i) => {
      const y = i * band + (band - thick) / 2;
      const len = Math.max(1, (Math.abs(r.value) / max) * plotW);
      const color = r.isOther ? 'var(--muted-mark)' : seriesColor(opts.colorIndex ?? 0);

      text(svg, truncate(r.label, LABEL, labelW - 10), {
        x: labelW - 10, y: y + thick / 2 + 4, 'text-anchor': 'end', class: 'ax-axis-label',
      });

      const bar = el('path', { d: barPath(x0, y, len, thick, 4, 'right'), fill: color, class: 'ax-mark' }, svg);
      hoverable(bar, () => [
        { label: r.label, head: true },
        { label: measureLabel, value: formatNumber(r.value, unit, lang), color },
      ]);

      text(svg, formatNumber(r.value, unit, lang, { compact: true }), {
        x: x0 + len + 8, y: y + thick / 2 + 4, class: 'ax-value-label',
      });
    });
    return;
  }

  // Vertical columns
  const axisW = 46;
  const labelH = 22;
  const plotW = w - axisW - 6;
  const plotH = h - labelH - 8;
  const band = plotW / rows.length;
  const thick = Math.min(24, band - 4);

  for (const t of ticks(max)) {
    const y = 8 + plotH - (t / max) * plotH;
    el('line', { x1: axisW, y1: y, x2: w, y2: y, class: t === 0 ? 'ax-baseline' : 'ax-gridline' }, svg);
    text(svg, formatNumber(t, unit, lang, { compact: true }), { x: axisW - 8, y: y + 4, 'text-anchor': 'end', class: 'ax-axis-label' });
  }

  const skip = Math.ceil((rows.length * LABEL * 4.2) / plotW);
  rows.forEach((r, i) => {
    const len = Math.max(1, (Math.abs(r.value) / max) * plotH);
    const x = axisW + i * band + (band - thick) / 2;
    const y = 8 + plotH - len;
    const color = r.isOther ? 'var(--muted-mark)' : seriesColor(opts.colorIndex ?? 0);

    const bar = el('path', { d: barPath(x, y, thick, len, 4, 'up'), fill: color, class: 'ax-mark' }, svg);
    hoverable(bar, () => [
      { label: r.label, head: true },
      { label: measureLabel, value: formatNumber(r.value, unit, lang), color },
    ]);

    if (i % skip === 0) {
      text(svg, truncate(r.label, LABEL, band * skip - 4), {
        x: x + thick / 2, y: h - 6, 'text-anchor': 'middle', class: 'ax-axis-label',
      });
    }
  });

  // Label only the peak — a number on every column is noise.
  const peak = rows.reduce((a, b, i) => (Math.abs(b.value) > Math.abs(rows[a].value) ? i : a), 0);
  const pr = rows[peak];
  const plen = (Math.abs(pr.value) / max) * plotH;
  text(svg, formatNumber(pr.value, unit, lang, { compact: true }), {
    x: axisW + peak * band + band / 2, y: 8 + plotH - plen - 7, 'text-anchor': 'middle', class: 'ax-value-label',
  });
}

/* ---------- stacked columns ---------- */

export function renderStack(container, opts) {
  const { data, unit, lang, measureLabel } = opts;
  const rows = data.rows;
  const series = data.series.length ? data.series : ['__all__'];
  if (!rows.length) return empty(container, opts.emptyText);

  container.textContent = '';
  const holder = document.createElement('div');
  holder.className = 'ax-plot';
  container.appendChild(holder);

  const { svg, w, h } = frame(holder);
  const totals = rows.map((r) => series.reduce((a, s) => a + (r.values[s] || 0), 0));
  const max = niceMax(Math.max(...totals));
  const axisW = 46;
  const labelH = 22;
  const plotW = w - axisW - 6;
  const plotH = h - labelH - 8;
  const band = plotW / rows.length;
  const thick = Math.min(24, band - 4);
  const GAP = 2; // surface gap between segments

  for (const t of ticks(max)) {
    const y = 8 + plotH - (t / max) * plotH;
    el('line', { x1: axisW, y1: y, x2: w, y2: y, class: t === 0 ? 'ax-baseline' : 'ax-gridline' }, svg);
    text(svg, formatNumber(t, unit, lang, { compact: true }), { x: axisW - 8, y: y + 4, 'text-anchor': 'end', class: 'ax-axis-label' });
  }

  const skip = Math.ceil((rows.length * 11 * 4.2) / plotW);
  rows.forEach((r, i) => {
    const x = axisW + i * band + (band - thick) / 2;
    let cursor = 8 + plotH;
    series.forEach((s, si) => {
      const v = r.values[s] || 0;
      if (v <= 0) return;
      const len = (v / max) * plotH;
      const top = cursor - len;
      const color = seriesColor(si);
      const drawn = Math.max(1, len - GAP);
      const seg = el('rect', { x, y: top, width: thick, height: drawn, fill: color, class: 'ax-mark' }, svg);
      hoverable(seg, () => [
        { label: r.label, head: true },
        { label: s, value: formatNumber(v, unit, lang), color },
        { label: measureLabel, value: formatNumber(totals[i], unit, lang) },
      ]);
      cursor = top;
    });

    if (i % skip === 0) {
      text(svg, truncate(r.label, 11, band * skip - 4), { x: x + thick / 2, y: h - 6, 'text-anchor': 'middle', class: 'ax-axis-label' });
    }
  });

  if (series.length > 1) legend(container, series.map((s, i) => ({ label: s, color: seriesColor(i) })));
}

/* ---------- line / area ---------- */

export function renderLine(container, opts) {
  const { data, unit, lang, area, measureLabel } = opts;
  const rows = data.rows;
  const series = data.series.length ? data.series : ['__all__'];
  if (rows.length < 2) return empty(container, opts.emptyText);

  container.textContent = '';
  const holder = document.createElement('div');
  holder.className = 'ax-plot';
  container.appendChild(holder);

  const { svg, w, h } = frame(holder);
  let max = 0;
  for (const r of rows) for (const s of series) max = Math.max(max, r.values[s] ?? 0);
  max = niceMax(max);

  const axisW = 46;
  const labelH = 22;
  const plotW = w - axisW - 14;
  const plotH = h - labelH - 10;
  const x = (i) => axisW + (rows.length > 1 ? (i / (rows.length - 1)) * plotW : plotW / 2);
  const y = (v) => 10 + plotH - (v / max) * plotH;

  for (const t of ticks(max)) {
    const ty = y(t);
    el('line', { x1: axisW, y1: ty, x2: w - 4, y2: ty, class: t === 0 ? 'ax-baseline' : 'ax-gridline' }, svg);
    text(svg, formatNumber(t, unit, lang, { compact: true }), { x: axisW - 8, y: ty + 4, 'text-anchor': 'end', class: 'ax-axis-label' });
  }

  const single = series.length === 1;
  series.forEach((s, si) => {
    const color = seriesColor(si);
    const pts = rows.map((r, i) => [x(i), y(r.values[s] ?? 0)]);
    let d = '';
    pts.forEach((p, i) => { d += `${i ? 'L' : 'M'}${p[0]} ${p[1]}`; });

    if (area && single) {
      el('path', { d: `${d} L${pts[pts.length - 1][0]} ${y(0)} L${pts[0][0]} ${y(0)} Z`, fill: color, 'fill-opacity': 0.1, stroke: 'none' }, svg);
    }
    el('path', { d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);

    const last = pts[pts.length - 1];
    el('circle', { cx: last[0], cy: last[1], r: 4, fill: color, stroke: 'var(--surface)', 'stroke-width': 2 }, svg);
  });

  const skip = Math.ceil((rows.length * 11 * 4.6) / plotW);
  rows.forEach((r, i) => {
    if (i % skip) return;
    text(svg, r.label, { x: x(i), y: h - 6, 'text-anchor': 'middle', class: 'ax-axis-label' });
  });

  // Crosshair: one hit-band per x position, so the whole column is a target.
  const cross = el('line', { y1: 10, y2: 10 + plotH, class: 'ax-crosshair' }, svg);
  const bandW = plotW / Math.max(1, rows.length - 1);
  rows.forEach((r, i) => {
    const hit = el('rect', {
      x: x(i) - bandW / 2, y: 6, width: bandW, height: plotH + 8, fill: 'transparent', class: 'ax-hit',
    }, svg);
    hit.addEventListener('pointerenter', () => { cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.classList.add('is-on'); });
    hit.addEventListener('pointerleave', () => { cross.classList.remove('is-on'); hideTip(); });
    hoverable(hit, () => {
      const lines = [{ label: r.label, head: true }];
      if (single) lines.push({ label: measureLabel, value: formatNumber(r.values[series[0]] ?? 0, unit, lang), color: seriesColor(0) });
      else series.forEach((s, si) => lines.push({ label: s, value: formatNumber(r.values[s] ?? 0, unit, lang), color: seriesColor(si) }));
      return lines;
    });
  });

  if (!single) legend(container, series.map((s, i) => ({ label: s, color: seriesColor(i) })));
}

/* ---------- donut ---------- */

export function renderDonut(container, opts) {
  const { data, unit, lang } = opts;
  const rows = data.rows.filter((r) => r.value > 0);
  if (!rows.length) return empty(container, opts.emptyText);

  container.textContent = '';
  const holder = document.createElement('div');
  holder.className = 'ax-plot ax-plot-donut';
  container.appendChild(holder);

  const { svg, w, h } = frame(holder);
  const total = rows.reduce((a, r) => a + r.value, 0);
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - 6;
  const thickness = Math.max(14, radius * 0.34);
  const inner = radius - thickness;

  let angle = -Math.PI / 2;
  const GAP = 0.014; // radians of surface gap between arcs

  rows.forEach((r, i) => {
    const sweep = (r.value / total) * Math.PI * 2;
    const a0 = angle + GAP / 2;
    const a1 = angle + sweep - GAP / 2;
    angle += sweep;
    if (a1 <= a0) return;

    const large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rad, a) => `${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}`;
    const d = `M${p(radius, a0)} A${radius} ${radius} 0 ${large} 1 ${p(radius, a1)} L${p(inner, a1)} A${inner} ${inner} 0 ${large} 0 ${p(inner, a0)} Z`;
    const color = r.isOther ? 'var(--muted-mark)' : seriesColor(i);
    const arc = el('path', { d, fill: color, class: 'ax-mark' }, svg);
    hoverable(arc, () => [
      { label: r.label, head: true },
      { label: formatNumber(r.value, unit, lang), value: formatNumber(r.value / total, 'percent', lang), color },
    ]);
  });

  const top = rows[0];
  text(svg, formatNumber(top.value / total, 'percent', lang), { x: cx, y: cy - 1, 'text-anchor': 'middle', class: 'ax-donut-value' });
  text(svg, truncate(top.label, 11, inner * 1.8), { x: cx, y: cy + 16, 'text-anchor': 'middle', class: 'ax-donut-label' });

  legend(container, rows.map((r, i) => ({ label: r.label, color: r.isOther ? 'var(--muted-mark)' : seriesColor(i) })));
}

/* ---------- table ---------- */

export function renderTable(container, opts) {
  const { data, unit, lang, dimensionLabel, measureLabel } = opts;
  const rows = data.rows;
  if (!rows.length) return empty(container, opts.emptyText);

  container.textContent = '';
  const scroll = document.createElement('div');
  scroll.className = 'ax-table-scroll';
  const table = document.createElement('table');
  table.className = 'ax-table';

  const max = Math.max(...rows.map((r) => Math.abs(r.value || 0))) || 1;
  const total = rows.reduce((a, r) => a + (r.value || 0), 0);

  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const [label, cls] of [[dimensionLabel, ''], [measureLabel, 'is-num'], ['%', 'is-num']]) {
    const th = document.createElement('th');
    th.textContent = label;
    if (cls) th.className = cls;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const r of rows) {
    const tr = document.createElement('tr');

    const name = document.createElement('td');
    name.className = 'ax-td-name';
    // The data bar is a background wash behind the label, not extra ink.
    name.style.setProperty('--bar', `${((Math.abs(r.value || 0) / max) * 100).toFixed(1)}%`);
    name.textContent = r.label;
    tr.appendChild(name);

    const val = document.createElement('td');
    val.className = 'is-num';
    val.textContent = formatNumber(r.value, unit, lang);
    tr.appendChild(val);

    const share = document.createElement('td');
    share.className = 'is-num ax-td-share';
    share.textContent = total ? formatNumber((r.value || 0) / total, 'percent', lang) : '—';
    tr.appendChild(share);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  scroll.appendChild(table);
  container.appendChild(scroll);
}

/* ---------- heatmap ---------- */

export function renderHeatmap(container, opts) {
  const { data, unit, lang, measureLabel } = opts;
  const rows = data.rows;
  const series = data.series;
  if (!rows.length || !series.length) return empty(container, opts.emptyText);

  container.textContent = '';
  const holder = document.createElement('div');
  holder.className = 'ax-plot';
  container.appendChild(holder);

  const { svg, w, h } = frame(holder);
  let max = 0;
  for (const r of rows) for (const s of series) max = Math.max(max, r.values[s] ?? 0);
  if (!max) return empty(container, opts.emptyText);

  const LABEL = 11;
  const labelW = Math.min(w * 0.3, Math.max(...series.map((s) => textWidth(s, LABEL))) + 14);
  const labelH = 20;
  const gridW = w - labelW - 4;
  const gridH = h - labelH - 4;
  const cw = gridW / rows.length;
  const ch = gridH / series.length;
  const GAP = 2;

  /* Sequential = one hue, stepped light→dark from the blue ramp in CSS.
     Bin edges are quantiles, not equal slices of the max: monthly business
     data is skewed, and a linear scale collapses almost every cell into the
     same two mid steps. The legend below prints each bin's real range, so the
     steps stay honest about what they encode. */
  const STEPS = 6;
  const sorted = [];
  for (const r of rows) for (const s of series) { const v = r.values[s] ?? 0; if (v > 0) sorted.push(v); }
  sorted.sort((a, b) => a - b);
  const edges = [];
  for (let i = 1; i < STEPS; i++) edges.push(sorted[Math.floor((sorted.length * i) / STEPS)] ?? max);
  const stepOf = (v) => {
    if (v <= 0) return 0;
    let step = 1;
    while (step < STEPS && v >= edges[step - 1]) step++;
    return step;
  };

  series.forEach((s, si) => {
    text(svg, truncate(s, LABEL, labelW - 12), { x: labelW - 10, y: si * ch + ch / 2 + 4, 'text-anchor': 'end', class: 'ax-axis-label' });
    rows.forEach((r, ri) => {
      const v = r.values[s] ?? 0;
      const step = stepOf(v);
      const cell = el('rect', {
        x: labelW + ri * cw, y: si * ch, width: Math.max(1, cw - GAP), height: Math.max(1, ch - GAP),
        rx: 3, fill: step === 0 ? 'var(--seq-0)' : `var(--seq-${step})`, class: 'ax-mark',
      }, svg);
      hoverable(cell, () => [
        { label: `${s} · ${r.label}`, head: true },
        { label: measureLabel, value: formatNumber(v, unit, lang) },
      ]);
    });
  });

  const skip = Math.ceil((rows.length * LABEL * 4.2) / gridW);
  rows.forEach((r, ri) => {
    if (ri % skip) return;
    text(svg, truncate(r.label, LABEL, cw * skip - 4), { x: labelW + ri * cw + cw / 2, y: h - 5, 'text-anchor': 'middle', class: 'ax-axis-label' });
  });

  // Ramp legend: the reader needs to know what a darker cell is worth.
  const scale = document.createElement('div');
  scale.className = 'ax-scale';
  const lo = document.createElement('span');
  lo.className = 'ax-scale-end';
  lo.textContent = formatNumber(sorted[0] ?? 0, unit, lang, { compact: true });
  scale.appendChild(lo);
  for (let i = 1; i <= STEPS; i++) {
    const sw = document.createElement('span');
    sw.className = 'ax-scale-swatch';
    sw.style.background = `var(--seq-${i})`;
    sw.title = i === 1
      ? `≤ ${formatNumber(edges[0], unit, lang, { compact: true })}`
      : i === STEPS
        ? `≥ ${formatNumber(edges[STEPS - 2], unit, lang, { compact: true })}`
        : `${formatNumber(edges[i - 2], unit, lang, { compact: true })} – ${formatNumber(edges[i - 1], unit, lang, { compact: true })}`;
    scale.appendChild(sw);
  }
  const hi = document.createElement('span');
  hi.className = 'ax-scale-end';
  hi.textContent = formatNumber(max, unit, lang, { compact: true });
  scale.appendChild(hi);
  container.appendChild(scale);
}

/* ---------- empty ---------- */

function empty(container, message) {
  container.textContent = '';
  const box = document.createElement('div');
  box.className = 'ax-empty';
  box.textContent = message || 'Δεν υπάρχουν δεδομένα';
  container.appendChild(box);
}
