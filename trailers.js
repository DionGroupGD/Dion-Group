/* Product films: short motion-graphics trailers rendered live in the page.
   Each film is a fixed 1280×720 stage (built in index.html) scaled to
   fit its frame. A timeline of keyframes writes a few registered CSS
   properties (--to opacity, --tx/--ty move, --typ line reveal, --ts scale,
   --tr rotate, --td stroke draw, --tc clip reveal, --tw width) that
   styles-v3.css turns into motion. No video files: sharp at any size,
   follows the page language, and weighs a few kilobytes. */
(() => {
  'use strict';
  const section = document.querySelector('.films');
  if (!section) return;
  const html = document.documentElement;
  const language = () => ({en: 'en', de: 'de', el: 'gr'}[html.lang] || 'en');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the point-cloud look (films-cloud.js); the earlier solid look: index.html?films=solid
  const CLOUD = !!window.DionCloud && !/[?&]films=solid\b/.test(location.search);

  // ── Easing and keyframe sampling ────────────────────────────────────
  const EASE = {
    lin: (k) => k,
    out: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    in: (k) => k * k * k,
    io: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    back: (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2),
  };
  // kf is [[time, value, ease?], …]; a key's ease shapes the segment that ends on it
  const sample = (kf, t) => {
    if (t <= kf[0][0]) return kf[0][1];
    for (let i = 1; i < kf.length; i++) {
      const [t1, v1, ease] = kf[i];
      if (t <= t1) {
        const [t0, v0] = kf[i - 1];
        const k = t1 === t0 ? 1 : (t - t0) / (t1 - t0);
        return v0 + (v1 - v0) * EASE[ease || 'out'](k);
      }
    }
    return kf[kf.length - 1][1];
  };
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const PROP = {o: '--to', x: '--tx', y: '--ty', yp: '--typ', s: '--ts', r: '--tr', d: '--td', c: '--tc', w: '--tw'};

  // ── Vocabulary shared by both films ─────────────────────────────────
  const OUT = 0.32;
  // a masked line slides up into view, and up out of it
  const line = (t0, t1) => ({yp: t1 == null ? [[t0, 115], [t0 + 0.7, 0]]
    : [[t0, 115], [t0 + 0.7, 0], [t1 - OUT, 0], [t1, -115, 'in']]});
  // a group rises in, and leaves lifting slightly
  const show = (t0, t1, {y = 26, s = null} = {}) => {
    const p = {o: [[t0, 0], [t0 + 0.42, 1, 'lin']], y: [[t0, y], [t0 + 0.7, 0]]};
    if (s != null) p.s = [[t0, s], [t0 + 0.7, 1]];
    if (t1 != null) {
      p.o.push([t1 - OUT, 1], [t1, 0, 'lin']);
      p.y.push([t1 - OUT, 0], [t1, -y * 0.6, 'in']);
      if (p.s) p.s.push([t1 - OUT, 1], [t1, 1.02, 'in']);
    }
    return p;
  };
  const pop = (t0, {s = 0.5} = {}) => ({o: [[t0, 0], [t0 + 0.12, 1, 'lin']], s: [[t0, s], [t0 + 0.5, 1, 'back']]});
  // a beat's left column: step label, headline lines, one supporting line
  const copy = (sel, t0, t1) => [
    [`${sel} .tr-step .k`, line(t0, t1)],
    [`${sel} .tr-h .k`, line(t0 + 0.08, t1), 0.09],
    [`${sel} .tr-sub .k`, line(t0 + 0.3, t1)],
  ];
  const each = (fn) => ({each: fn});      // keyframes computed per element
  const frame = (fn) => ({frame: fn});    // arbitrary per-frame work (counters)
  const glows = (d) => [
    ['.g1', {x: [[0, -60], [d, 160, 'lin']]}],
    ['.g2', {x: [[0, 80], [d, -140, 'lin']]}],
  ];

  // ── Axon TMS: one truck, from plan to exit ──────────────────────────
  // beats: 0 one truck · 1 planning · 2 driver · 3 gate · 4 warehouse ·
  //        5 documents · 6 release · end card
  const NODE = [4.6, 12.4, 15.0, 15.5, 17.45, 22.6];   // when each lifecycle state lights
  const RAIL = [[0, 0], [4.6, 0], [11.8, 0], [12.4, 0.2, 'io'], [14.6, 0.2], [15.0, 0.4, 'io'], [15.1, 0.4],
    [15.5, 0.6, 'io'], [17.0, 0.6], [17.45, 0.8, 'io'], [22.0, 0.8], [22.6, 1, 'io']];
  // yard time in minutes: a morning compressed into the film (07:35 approval, 07:42 arrival…)
  const CLOCK = [[0, 360], [3.0, 360], [4.6, 372, 'io'], [9.3, 455, 'io'], [12.4, 462, 'io'], [15.0, 474, 'io'],
    [15.5, 480, 'io'], [17.45, 526, 'lin'], [21.0, 529, 'io'], [22.6, 532, 'io']];
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;
  const setText = (el, text) => {
    if (el.textContent !== text) el.textContent = text;
  };

  // headlines, clock, rail and end card: everything around the 3D yard
  const AXON_BASE = [
      ...glows(28),
      ['.tr-brand', {o: [[0.2, 0], [0.8, 1, 'lin'], [24.2, 1], [24.5, 0, 'lin']]}],
      ['.tr-clock', {o: [[2.8, 0], [3.3, 1, 'lin'], [24.2, 1], [24.5, 0, 'lin']]}],
      ['.tr-clock b', frame((t, el) => setText(el, hhmm(sample(CLOCK, t))))],

      // 0 — one truck, drawn in line, then it becomes the marker on the rail
      ['.ax0-t1 .k', line(0.3, 2.75)],
      ['.ax0-t2 .k', line(1.0, 2.75)],
      ['.ax0-truck path', {d: [[0.15, 0], [1.5, 1, 'io']]}, 0.07],
      ['.ax0-truck', {x: [[2.3, 0], [2.95, -520, 'io']], y: [[2.3, 0], [2.95, 293, 'io']],
        s: [[2.3, 1], [2.95, 0.1, 'io']], o: [[2.85, 1], [3.0, 0, 'lin']]}],
      ['.tr-rail', {o: [[2.5, 0], [3.0, 1, 'lin'], [24.4, 1], [24.9, 0.45, 'lin']], y: [[2.5, 16], [3.0, 0]]}],
      ['.rl-fill', {w: RAIL}],
      ['.rl-truck', {o: [[2.9, 0], [3.0, 1, 'lin']], x: RAIL.map(([t, v, e]) => [t, v * 1040, e])}],
      ['.rl-lit', each((el, i) => ({o: [[NODE[i], 0], [NODE[i] + 0.2, 1, 'lin']], s: [[NODE[i], 2.4], [NODE[i] + 0.5, 1, 'back']]}))],

      // 1–6 — one headline per step of the lifecycle
      ...copy('.ax-c1', 2.9, 6.4),
      ...copy('.ax-c2', 6.45, 10.4),
      ...copy('.ax-c3', 10.45, 14.2),
      ...copy('.ax-c4', 14.25, 18.0),
      ...copy('.ax-c5', 18.05, 21.4),
      ...copy('.ax-c6', 21.45, 24.4),

      // end card
      ['.ax-end img', {o: [[24.6, 0], [24.8, 1, 'lin']], s: [[24.6, 0.6], [25.2, 1, 'back']]}],
      ['.ax-end .end-name .k', line(24.75)],
      ['.ax-end .end-tag .k', line(25.0)],
      ['.ax-end .end-pill', pop(25.35)],
  ];

  // ── 3D tools shared by the films and the hero scene ─────────────────
  // World units are px on the ground (x east, y south, z up). A rig flies
  // the camera over a world; a pose places one object in it; face() turns
  // a label or document so it always looks back at the camera.
  const keys = (rows, c, ease) => rows.map((r) => [r[0], r[c], ease || r[4] || 'io']);
  const setTransform = (el, value) => {
    if (el && el._t !== value) {
      el._t = value;
      el.style.transform = value;
    }
  };
  const setOpacity = (el, value) => {
    const o = value.toFixed(2);
    if (el._o !== o) {
      el._o = o;
      el.style.opacity = o;
    }
  };
  // camera set-ups: [time, target x, target y, zoom, tilt, turn]; focus = where the target lands on the stage
  const rig = (rows, focus) => {
    const state = {rx: rows[0][4], rz: rows[0][5]};
    const series = [1, 2, 3, 4, 5].map((c) => keys(rows, c, 'io'));
    return {
      state,
      track: frame((t, el) => {
        const [tx, ty, zoom, rx, rz] = series.map((kf) => sample(kf, t));
        state.rx = rx;
        state.rz = rz;
        // the point-cloud world zooms in depth too, like a camera moving closer,
        // so trucks keep their true height; the solid world keeps its flat zoom
        const z = zoom.toFixed(4);
        setTransform(el, `translate(${focus[0]}px, ${focus[1]}px) rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) `
          + `${CLOUD ? `scale3d(${z}, ${z}, ${z})` : `scale(${z})`} translate(${(-tx).toFixed(1)}px, ${(-ty).toFixed(1)}px)`);
      }),
      face: (extraZ = 0) => `rotateZ(${(-state.rz - extraZ).toFixed(2)}deg) rotateX(${(-state.rx).toFixed(2)}deg)`,
    };
  };
  // pose: keyframes for x, y, z (px), rz, rx (deg) and o; face: a rig's face() to billboard it
  const pose = (spec) => ({pose: spec});

  // ── Axon TMS: one truck through a digital twin of the yard. The camera
  //    flies over a CSS 3D model while the truck drives it; each step of
  //    the lifecycle gets a compact overlay. ────────────────────────────
  const AX_CAM = [
    [0, 1180, 640, 0.42, 50, -30], [3.0, 1180, 640, 0.42, 50, -30], [6.3, 1140, 640, 0.48, 52, -24],
    [7.2, 470, 846, 1.3, 56, -34], [10.3, 510, 846, 1.4, 57, -30], [11.0, 560, 846, 1.85, 60, -24],
    [13.3, 590, 846, 1.95, 60, -20], [14.6, 1360, 660, 1.1, 56, -34], [17.9, 1340, 640, 1.2, 57, -30],
    [18.6, 1325, 575, 1.6, 58, -22], [21.3, 1325, 575, 1.7, 58, -18], [22.2, 1560, 810, 1.25, 55, -30],
    [23.6, 1880, 850, 1.35, 56, -34], [24.4, 1880, 850, 1.35, 56, -34], [26.5, 1200, 620, 0.44, 48, -26],
    [28, 1180, 620, 0.43, 48, -25]];
  const AX_RIG = rig(AX_CAM, [760, 430]);
  // the truck: [time, x, y, heading, ease] — in at the gate, reversed into dock 4, out at the exit
  const TRUCKK = [
    [0, -420, 860, 0], [6.9, -420, 860, 0], [8.5, 490, 860, 0, 'out'], [13.15, 490, 860, 0],
    [14.2, 1180, 860, 0, 'in'], [14.75, 1470, 860, 0, 'lin'], [15.1, 1420, 745, 50, 'io'], [15.45, 1325, 592, 90, 'out'],
    [21.6, 1325, 592, 90], [22.0, 1330, 760, 80, 'in'], [22.35, 1440, 860, 0, 'io'], [23.3, 2050, 860, 0, 'lin'],
    [24.2, 2700, 860, 0, 'in']];
  const [TX, TY, TH] = [1, 2, 3].map((c) => keys(TRUCKK, c));
  const ARM_IN = [[0, 0], [12.75, 0], [13.2, 80, 'io'], [14.3, 80], [14.8, 0, 'io']];
  const ARM_OUT = [[0, 0], [22.55, 0], [22.95, 80, 'io'], [23.8, 80], [24.3, 0, 'io']];
  const SCAN_X = [[0, 650], [11.6, 650], [12.55, 370, 'lin']];   // from the cab's nose to the trailer's tail
  const SCAN_O = [[0, 0], [11.6, 0], [11.7, 1, 'lin'], [12.45, 1], [12.6, 0, 'lin']];
  const lit = (a, b) => ({o: [[0, 0], [a, 0], [a + 0.25, 1, 'lin'], [b, 1], [b + 0.35, 0, 'lin']]});

  const AXON = {
    duration: 28,
    lead: 2,     // the mark in particles opens the film, and closes it on the end card
    mark: {name: 'axon', size: 300, end: 24.45, box: '.ax-end img', scale: 1},
    truck: '.ax0-truck',     // the opening card's truck, drawn in dots over its line drawing
    tracks: [
      ...AXON_BASE,
      ['.w3-view', {o: [[2.7, 0], [3.5, 1, 'lin'], [24.4, 1], [25.0, 0.3, 'lin']]}],
      ['.w3-scrim', {o: [[2.7, 0], [3.5, 1, 'lin'], [24.4, 1], [25.0, 0, 'lin']]}],
      // camera first: the labels below read its angles
      ['.w3-cam', AX_RIG.track],
      ['.w3-truck.hero', frame((t, el) => {
        const heading = sample(TH, t);
        setTransform(el, `translate3d(${sample(TX, t).toFixed(1)}px, ${sample(TY, t).toFixed(1)}px, 0) rotateZ(${heading.toFixed(2)}deg)`);
        el._label = el._label || el.querySelector('.w3-tlabel');
        setTransform(el._label, `translateZ(84px) ${AX_RIG.face(heading)}`);
      })],
      // in the point-cloud world heights zoom too, so the CMR stands beside the truck, between
      // the headline and the checklist and under the plate label, not above the truck
      ['.w3-cmr', pose({x: [[0, CLOUD ? 1243 : 1300]], y: [[0, CLOUD ? 719 : 560]], z: [[0, CLOUD ? 8 : 96]], face: AX_RIG.face})],
      ['.w3-arm.in', frame((t, el) => setTransform(el, `translateZ(34px) rotateX(${sample(ARM_IN, t).toFixed(1)}deg)`))],
      ['.w3-arm.out', frame((t, el) => setTransform(el, `translateZ(34px) rotateX(${sample(ARM_OUT, t).toFixed(1)}deg)`))],
      ['.w3-scan', frame((t, el) => {
        setTransform(el, `translate3d(${sample(SCAN_X, t).toFixed(1)}px, 800px, 0) rotateY(-90deg)`);
        setOpacity(el, sample(SCAN_O, t));
      })],
      ['.w3-lit.b', lit(15.0, 17.45)],
      ['.w3-lit.g', lit(17.45, 21.7)],
      ['.w3-bay4', lit(15.0, 21.7)],
      ['.w3-pool.p4', lit(15.0, 21.7)],

      // overlays, one per beat
      ['.w3-c1', show(3.35, 6.3, {y: 18})],
      ['.w3-c1 .w3-row', {o: [[3.6, 0], [3.9, 1, 'lin']], x: [[3.6, 24], [4.1, 0]]}, 0.1],
      ['.w3-sync', pop(4.3)],
      ['.w3-c2', show(7.5, 10.3, {y: 18})],
      ['.w3-c2 .w3-row', {o: [[7.85, 0], [8.1, 1, 'lin']], y: [[7.85, 10], [8.2, 0]]}, 0.22],
      ['.w3-c2 .w3-row em', pop(8.15, {s: 0.2}), 0.22],
      ['.w3-c2 .w3-ok', {o: [[9.1, 0], [9.3, 1, 'lin']], s: [[9.1, 0.9], [9.55, 1, 'back']]}],
      ['.w3-c3', show(11.8, 14.1, {y: 18})],
      ['.w3-match', pop(12.35)],
      ['.w3-arr', pop(12.5)],
      ['.w3-c4', show(15.0, 17.95, {y: 18})],
      ['.w3-ring .prog', {d: [[15.5, 0], [17.45, 1, 'lin']]}],
      ['.w3-clock', frame((t, el) => setText(el, `00:${String(Math.floor(clamp01((t - 15.5) / 1.95) * 46)).padStart(2, '0')}`))],
      ['.w3-st .s1', {o: [[0, 0], [15.0, 0], [15.15, 1, 'lin'], [15.35, 1], [15.5, 0, 'lin']], y: [[15.0, 12], [15.3, 0]]}],
      ['.w3-st .s2', {o: [[15.5, 0], [15.65, 1, 'lin'], [17.3, 1], [17.45, 0, 'lin']], y: [[15.5, 12], [15.8, 0]]}],
      ['.w3-st .s3', {o: [[17.45, 0], [17.6, 1, 'lin']], y: [[17.45, 12], [17.75, 0]]}],
      ['.w3-c5', show(18.3, 21.3, {y: 18})],
      ['.w3-c5 .w3-row', {o: [[18.5, 0], [18.7, 1, 'lin']]}, 0.25],
      ['.w3-c5 .w3-row em', pop(18.7, {s: 0.2}), 0.25],
      ['.w3-c5 .w3-ok', {o: [[20.3, 0], [20.5, 1, 'lin']], s: [[20.3, 0.9], [20.75, 1, 'back']]}],
      ['.w3-doc', {o: [[18.9, 0], [19.2, 1, 'lin'], [21.1, 1], [21.4, 0, 'lin']], s: [[18.9, 0.7], [19.4, 1, 'back']], y: [[18.9, 30], [19.4, 0]]}],
      ['.w3-dl', {c: [[19.3, 0], [19.6, 1]]}, 0.06],
      ['.w3-stamp', {o: [[20.2, 0], [20.28, 1, 'lin']], s: [[20.2, 2.6], [20.55, 1, 'back']], r: [[0, -14]]}],
      ['.w3-c6', show(22.6, 24.3, {y: 18})],
      ['.w3-to', each((el, i) => {
        const t = 22.85 + i * 0.16;
        return {o: [[t, 0], [t + 0.15, 1, 'lin']], x: [[t, 20], [t + 0.45, 0]]};
      })],
    ],
  };

  // ── Aegis: signal from noise ────────────────────────────────────────
  // The atom forms in the dark, and paper starts falling through the frame,
  // more and more of it. Aegis wakes and pulls every page into its orbits.
  // One invoice is held up and read field by field; it melts into light,
  // passes through Aegis and comes out the other side as a record. The
  // record is checked, against itself and against the CMR for the same load,
  // which disagrees by one pallet: flagged. Then the same, all day long.
  // The scene is a small 3D world of its own: the paper and the record are
  // HTML under one CSS perspective, placed every frame through the camera;
  // the atom, the dust and the light are drawn on two canvases through the
  // same camera. Everything is a function of time, so the film scrubs.
  const spline = (pts) => {
    // a monotone cubic through [[t, v], …]: the camera glides through its
    // keys without overshooting, and comes to rest only where it turns
    const n = pts.length, T = pts.map((p) => p[0]), V = pts.map((p) => p[1]), d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((V[i + 1] - V[i]) / (T[i + 1] - T[i]));
    for (let i = 0; i < n; i++) {
      if (i === 0 || i === n - 1 || d[i - 1] * d[i] <= 0) m.push(0);
      else {
        const h0 = T[i] - T[i - 1], h1 = T[i + 1] - T[i], w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
        m.push((w1 + w2) / (w1 / d[i - 1] + w2 / d[i]));
      }
    }
    return (t) => {
      if (t <= T[0]) return V[0];
      if (t >= T[n - 1]) return V[n - 1];
      let i = 0;
      while (t > T[i + 1]) i++;
      const h = T[i + 1] - T[i], s = (t - T[i]) / h, s2 = s * s, s3 = s2 * s;
      return (2 * s3 - 3 * s2 + 1) * V[i] + (s3 - 2 * s2 + s) * h * m[i] + (3 * s2 - 2 * s3) * V[i + 1] + (s3 - s2) * h * m[i + 1];
    };
  };
  // 0 before a, up to 1 by b, held, back to 0 by d
  const band = (t, a, b, c, d) => clamp01((t - a) / (b - a)) * (1 - clamp01((t - c) / (d - c)));
  const mix = (a, b, k) => a + (b - a) * k;

  const L = (i) => 9.15 + i * 0.2;                  // when field i lands in the record
  const SCAN = [6.0, 1.9], MELT = [8.2, 1.3];      // the read, and the paper melting: [start, length], top to bottom
  // the light's colours: paper, reading, the eight fields (blue → green), the flag
  const COLS = ['235,242,255', '90,200,250', '79,164,255', '70,180,240', '60,196,215', '47,211,180', '50,210,140', '60,215,110',
    '90,215,160', '130,240,175', '255,170,60'];
  const FIELD_KEYS = ['supplier', 'invoice_date', 'route', 'pallets', 'freight', 'handling', 'vat', 'total'];

  const AegisScene = (stage) => {
    const D = 1000, CX = 640, CY = 360, ORB_W = 640, O = [0, 0, 0];
    const world = stage.querySelector('.ag2-world'), bg = stage.querySelector('.ag2-bg'), bgCtx = bg.getContext('2d');
    const few = window.innerWidth < 700 || !!(window.DionParticles && window.DionParticles.LITE);
    let seed = 20410, k = 1, dpr = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    // the camera: [t, x, y, z, roll°]; world x right, y down, z into the screen, the atom at 0
    const CAM = [[-2, 0, 30, -1000, 0], [0.3, 0, 30, -1000, 0], [3.7, -330, -30, -1550, 1.2], [5.7, -170, 0, -1120, -0.8],
      [8.0, -120, 0, -900, 0], [9.2, 160, -5, -1000, 0], [10.8, 300, -10, -980, 0], [12.3, 435, 0, -670, 0], [15.0, 500, 0, -700, 0],
      [16.9, 280, -40, -2550, 0], [18.2, 0, 10, -1500, 0], [20, 0, 10, -1440, 0]];
    const camK = [1, 2, 3, 4].map((c) => spline(CAM.map((r) => [r[0], r[c]])));
    const cam = {x: 0, y: 0, z: 0, roll: 0};
    const camAt = (t, into = cam) => {
      into.x = camK[0](t) + Math.sin(t * 0.6) * 5;        // a hand on the camera
      into.y = camK[1](t) + Math.sin(t * 0.83 + 1.3) * 4;
      into.z = camK[2](t);
      into.roll = camK[3](t);
      return into;
    };
    // a world point → the stage (the roll is turned on the layers)
    const project = (x, y, z) => {
      const f = D / (D + z - cam.z);
      return [CX + (x - cam.x) * f, CY + (y - cam.y) * f, f];
    };

    // ── the storm: five kinds of paper ──
    const TYPES = [['inv', 'INVOICE', '#20'], ['cmr', 'CMR', 'No. 88'], ['dn', 'DELIVERY NOTE', 'DN-4'], ['pl', 'PACKING LIST', 'PL-3'], ['cus', 'CUSTOMS', 'MRN 26GR']];
    const N = few ? 20 : 34, docs = [], probe = {};
    for (let i = 0; i < N; i++) {
      const [type, title, pre] = TYPES[i % TYPES.length];
      const el = document.createElement('div');
      el.className = `ag2-d t-${type}`;
      el.innerHTML = `<b>${title}</b><span>${pre}${100 + Math.floor(rnd() * 899)}</span><i></i>`;
      world.appendChild(el);
      // spread over the frame as the camera will see it while it falls; a few pass right by the lens
      const t0 = -0.25 + (i / N) * 2.7 + rnd() * 0.25, c = camAt(t0 + 1.4, probe), lens = i % 7 === 3;
      const z = lens ? c.z - 620 + rnd() * 280 : -560 + rnd() * 2100, f = D / (D + z - c.z), s = 0.9 + rnd() * 0.45;
      const sx = lens ? (i % 2 ? 60 + rnd() * 260 : 960 + rnd() * 260) : -60 + rnd() * 1400;
      docs.push({el, w: 170, h: 230, p: {}, t0, z, s, x: c.x + (sx - CX) / f, y0: c.y - CY / f - 150 * s,
        v: (720 / f + 300 * s) / (3.4 + rnd() * 2.2), A: 30 + rnd() * 70, wf: 1 + rnd() * 1.3, ph: rnd() * 6.28,
        rz0: rnd() * 360, vr: (rnd() - 0.5) * 70, wx: 0.8 + rnd() * 1.2, px: rnd() * 6.28, wy: 0.7 + rnd() * 1.1, py: rnd() * 6.28,
        // caught: when, for how long, and the orbit it spirals in on
        // (the pages by the lens go first, fast: a rush past the camera that clears the view)
        c: lens ? 3.4 + rnd() * 0.3 : 3.6 + rnd() * 1.8, dur: lens ? 0.8 + rnd() * 0.2 : 1.0 + rnd() * 0.5, R0: 380 + rnd() * 260, th0: rnd() * 6.28, dir: rnd() < 0.5 ? -1 : 1,
        tilt: (68 + rnd() * 14) * Math.PI / 180, turn: (-30 + rnd() * 40) * Math.PI / 180,
        // all day long: from the left into Aegis
        e: 15.0 + (i / N) * 2.0 + rnd() * 0.1, sx0: -1950 + rnd() * 400, sy0: -650 + rnd() * 1300, sz0: -500 + rnd() * 1200});
    }
    const docPose = (d, t, p) => {
      const dt = t - d.t0;
      p.rx = 12 + 30 * Math.sin(d.wx * dt + d.px);
      p.ry = 36 * Math.sin(d.wy * dt + d.py);
      p.rz = d.rz0 + d.vr * dt;
      p.o = 0;
      if (t >= 14.6) {
        const u = (t - d.e) / 1.5, q = u * u;
        if (u <= 0 || u >= 1) return p;
        p.x = d.sx0 * (1 - q); p.y = d.sy0 * (1 - q) - Math.sin(Math.PI * u) * 160; p.z = d.sz0 * (1 - q);
        p.s = d.s * (1 - 0.8 * q); p.rz += u * 200;
        p.o = clamp01(u / 0.12) * (1 - clamp01((u - 0.86) / 0.14)) * (1 - clamp01((t - 17.2) / 0.45));
        return p;
      }
      if (t < d.t0) return p;
      p.x = d.x + d.A * Math.sin(d.wf * dt + d.ph); p.y = d.y0 + d.v * dt; p.z = d.z + 30 * Math.sin(0.7 * dt + d.ph);
      p.s = d.s; p.o = 1;
      if (t > d.c) {
        // caught: drawn onto an orbit of the atom, spiralling in faster and faster
        const u = clamp01((t - d.c) / d.dur), w = EASE.io(clamp01((t - d.c) / (d.dur * 0.45)));
        const r = d.R0 * (1 - 0.94 * u * u), th = d.th0 + d.dir * (u * 3.2 + u * u * 4);
        const ox = Math.cos(th) * r, oy = Math.sin(th) * r * Math.cos(d.tilt), oz = Math.sin(th) * r * Math.sin(d.tilt);
        const ct = Math.cos(d.turn), st = Math.sin(d.turn);
        p.x = mix(p.x, ox * ct - oy * st, w); p.y = mix(p.y, ox * st + oy * ct, w); p.z = mix(p.z, oz, w);
        p.s *= mix(1, Math.pow(r / d.R0, 0.9) * 0.9, w); p.rz += d.dir * u * u * 240;
        p.o = 1 - clamp01((u - 0.72) / 0.28);
      }
      return p;
    };

    // ── the invoice Aegis picks out of the storm, holds up and reads ──
    const hero = {el: world.querySelector('.ag2-hero'), w: 460, h: 600, p: {}, fields: []};
    hero.paper = hero.el.querySelector('.ag2-paper');
    hero.scan = hero.el.querySelector('.hv-scan');
    const STAND = [-430, 20, -540];
    const HF = (() => {
      const c = camAt(2.3, {}), z = -380, f = D / (D + z - c.z), s = 0.37;
      return {t0: 0.85, z, s, x: c.x + (590 - CX) / f, y0: c.y - CY / f - 330 * s, v: (720 / f + 600 * s) / 5.6};
    })();
    const heroPose = (t, p) => {
      const dt = t - HF.t0, k = EASE.io(clamp01((t - 3.8) / 1.7));
      p.x = mix(HF.x + 40 * Math.sin(1.1 * dt), STAND[0], k);
      p.y = mix(HF.y0 + HF.v * dt, STAND[1] + 5 * Math.sin(0.9 * t), k);
      p.z = mix(HF.z, STAND[2], k);
      p.rx = mix(10 + 22 * Math.sin(0.9 * dt + 1), 0, k);
      p.ry = mix(26 * Math.sin(0.8 * dt + 2), 8, k);
      p.rz = mix(-14 + 9 * dt, 0, k);
      p.s = mix(HF.s, 1, k);
      p.o = t < HF.t0 || t > MELT[0] + MELT[1] + 0.1 ? 0 : 1;
      return p;
    };

    // ── the record it becomes, the CMR that disagrees, the records of a day ──
    const rec = {el: world.querySelector('.ag2-rec'), w: 560, h: 720, p: {}, vals: []};
    const REC = [660, 0, -420], LEDGER = [760, -470, -420];
    const scroll = (t) => 60 * Math.max(0, t - 16.0);
    const recPose = (t, p) => {
      const k = EASE.io(clamp01((t - 15.3) / 1.2)), a = EASE.io(clamp01((t - 8.6) / 0.5));
      p.x = mix(REC[0], LEDGER[0], k); p.y = mix(REC[1], LEDGER[1], k) - scroll(t) * k; p.z = REC[2];
      p.rx = 0; p.ry = mix(-8, 0, k); p.rz = 0;
      p.s = mix(0.94, 1, a) * mix(1, 0.5, k);
      p.o = a * (1 - clamp01((t - 17.2) / 0.45));
      return p;
    };
    const cmr = {el: world.querySelector('.ag2-cmr'), w: 320, h: 400, p: {}, count: [0, 0]};
    const cmrPose = (t, p) => {
      const k = EASE.out(clamp01((t - 13.35) / 0.7)), out = EASE.in(clamp01((t - 15.25) / 0.6));
      p.x = mix(1560, 1100, k) + out * 300; p.y = mix(170, 70, k); p.z = mix(-200, -360, k);
      p.rx = 0; p.ry = mix(-32, -14, k); p.rz = mix(6, 0, k); p.s = 1;
      p.o = clamp01((t - 13.35) / 0.2) * (1 - out);
      return p;
    };
    const minis = Array.from({length: few ? 7 : 10}, (_, j) => {
      const el = document.createElement('div');
      el.className = 'ag2-mini';
      el.innerHTML = `<i class="ag-dot"></i><div><u></u><u></u></div><em${j === 4 ? ' class="w"' : ''}></em>`;
      world.appendChild(el);
      return {el, w: 300, h: 96, p: {}, m: 15.55 + j * 0.15, j};
    });
    const slot = (j, t) => [LEDGER[0], LEDGER[1] + 258 + j * 112 - scroll(t), LEDGER[2]];
    const miniPose = (mn, t, p) => {
      const u = clamp01((t - mn.m) / 0.65), q = EASE.out(u), [sx, sy, sz] = slot(mn.j, t);
      p.x = sx * q; p.y = sy * q; p.z = sz * q;
      p.rx = 0; p.ry = mix(-30, 0, q); p.rz = 0; p.s = mix(0.25, 1, q);
      p.o = t < mn.m ? 0 : clamp01(u / 0.15) * (1 - clamp01((t - 17.2) / 0.45));
      return p;
    };

    // ── placing a sheet: its CSS transform through the camera, and depth order ──
    const place = (obj) => {
      const {el, p} = obj, Z = p.z - cam.z;
      if (!(p.o > 0.003 && D + Z > 80)) {
        if (obj.on !== false) {
          el.style.opacity = '0';
          obj.on = false;
          obj.op = null;
        }
        return false;
      }
      obj.on = true;
      setTransform(el, `translate3d(${(CX + p.x - cam.x - obj.w / 2).toFixed(1)}px, ${(CY + p.y - cam.y - obj.h / 2).toFixed(1)}px, ${(-Z).toFixed(1)}px) `
        + `rotateZ(${p.rz.toFixed(2)}deg) rotateY(${p.ry.toFixed(2)}deg) rotateX(${p.rx.toFixed(2)}deg) scale(${p.s.toFixed(3)})`);
      const o = p.o.toFixed(3), zi = String(100000 - Math.round(Z));
      if (obj.op !== o) {
        el.style.opacity = o;
        obj.op = o;
      }
      if (obj.zi !== zi) {
        el.style.zIndex = zi;
        obj.zi = zi;
      }
      return true;
    };
    // paper turned from the light darkens, far paper sinks into the night, paper by the lens is out of focus
    const shade = (d) => {
      const {p} = d, Z = p.z - cam.z, f = D / (D + Z);
      const face = Math.cos(p.rx * Math.PI / 180) * Math.cos(p.ry * Math.PI / 180);
      const sh = Math.min(0.85, (1 - face) * 0.7 + clamp01((Z - 1500) / 2000) * 0.55).toFixed(2);
      if (d.sh !== sh) {
        d.el.style.setProperty('--sh', sh);
        d.sh = sh;
      }
      const blur = Math.round(clamp01((f - 1.2) / 1.4) * 8) / 2;
      if (d.blur !== blur) {
        d.el.style.filter = blur ? `blur(${blur}px)` : '';
        d.blur = blur;
      }
    };
    // a point on a sheet (its own px), in the world, at time t: CSS order, scale → rotateX → rotateY → rotateZ
    const ptOn = (obj, pose, t, lx, ly) => {
      const p = pose(t, {}), r = Math.PI / 180;
      let x = (lx - obj.w / 2) * p.s, y = (ly - obj.h / 2) * p.s, z = 0, c = Math.cos(p.rx * r), s = Math.sin(p.rx * r);
      [y, z] = [y * c - z * s, y * s + z * c];
      c = Math.cos(p.ry * r); s = Math.sin(p.ry * r);
      [x, z] = [x * c + z * s, -x * s + z * c];
      c = Math.cos(p.rz * r); s = Math.sin(p.rz * r);
      [x, y] = [x * c - y * s, x * s + y * c];
      return [p.x + x, p.y + y, p.z - z];     // CSS z comes toward the viewer
    };
    const localOf = (el, root) => {
      let x = 0, y = 0;
      for (let n = el; n && n !== root; n = n.offsetParent) {
        x += n.offsetLeft;
        y += n.offsetTop;
      }
      return [x, y];
    };

    // ── the light: each particle runs a curve a → c → b over [t0, t0 + dur] ──
    let streams = [], measured = '';
    const build = () => {
      seed = 777;
      const out = [], P = (a, b, c, t0, dur, col, ease = 'io') => out.push({a, b, c, t0, dur, col, ease});
      const jit = (v, r) => v.map((x) => x + (rnd() - 0.5) * 2 * r);
      const via = (a, b, lift) => [(a[0] + b[0]) / 2 + (rnd() - 0.5) * 120, (a[1] + b[1]) / 2 - lift, (a[2] + b[2]) / 2 + (rnd() - 0.5) * 120];
      // every page Aegis catches goes into it as light, and so does every page all day long
      docs.forEach((d) => {
        const pose = (t, p) => docPose(d, t, p);
        for (let j = 0; j < (few ? 8 : 14); j++) {
          const t0 = d.c + d.dur - 0.28 + rnd() * 0.14, a = ptOn(d, pose, t0, rnd() * 170, rnd() * 230);
          P(a, jit(O, 18), via(a, O, 80 + rnd() * 140), t0, 0.5 + rnd() * 0.3, rnd() < 0.7 ? 0 : 1, 'in');
        }
        for (let j = 0; j < (few ? 3 : 6); j++) {
          const t0 = d.e + 1.25 + rnd() * 0.1, a = ptOn(d, pose, t0, rnd() * 170, rnd() * 230);
          P(a, jit(O, 18), via(a, O, 60), t0, 0.4 + rnd() * 0.2, 0, 'in');
        }
      });
      const heroAt = (t, lx, ly) => ptOn(hero, heroPose, t, lx, ly);
      // reading: what the scan passes over flows into Aegis
      for (let j = 0, n = few ? 60 : 110; j < n; j++) {
        const t0 = SCAN[0] + (j / n) * SCAN[1] * 0.97, a = heroAt(t0, 30 + rnd() * 400, ((t0 - SCAN[0]) / SCAN[1]) * 600);
        P(a, jit(O, 24), via(a, O, 70), t0, 0.5 + rnd() * 0.15, 1);
      }
      // the paper melts into light, top to bottom, and is drawn into Aegis; its fields in their own colours
      for (let j = 0, n = few ? 520 : 1050; j < n; j++) {
        const lx = rnd() * 460, ly = rnd() * 600, t0 = MELT[0] + (ly / 600) * MELT[1] + rnd() * 0.05, a = heroAt(t0, lx, ly);
        P(a, jit(O, 26), via(a, O, 140 + rnd() * 120), t0, 0.75 + rnd() * 0.35, 0, 'in');
      }
      hero.fields.forEach((q, f) => {
        for (let j = 0; j < (few ? 14 : 28); j++) {
          const lx = q.x + rnd() * q.w, ly = q.y + rnd() * q.h, t0 = MELT[0] + (ly / 600) * MELT[1] + rnd() * 0.05;
          const a = heroAt(t0, lx, ly);
          P(a, jit(O, 20), via(a, O, 160), t0, 0.7 + rnd() * 0.2, 2 + f, 'in');
        }
      });
      // out of Aegis, each field into its row of the record, landing as its value appears
      const recAt = (t, lx, ly) => ptOn(rec, recPose, t, lx, ly);
      rec.vals.forEach(([vx, vy, vw], i) => {
        for (let j = 0; j < (few ? 18 : 36); j++) {
          const dur = 0.5 + rnd() * 0.15, t0 = L(i) - dur + (rnd() - 0.6) * 0.16, a = jit(O, 30);
          const b = recAt(L(i), vx + (rnd() - 0.5) * vw, vy + (rnd() - 0.5) * 14);
          P(a, b, via(a, b, 110 + rnd() * 70), t0, dur, 2 + i);
        }
      });
      // checking the sum: freight and handling run into the total
      [4, 5].forEach((i) => {
        for (let j = 0; j < (few ? 12 : 24); j++) {
          const t0 = 11.7 + rnd() * 0.18, [vx, vy] = rec.vals[i], [tx, ty] = rec.vals[7];
          const a = recAt(t0, vx + (rnd() - 0.5) * 60, vy), b = recAt(t0, tx + (rnd() - 0.5) * 70, ty);
          P(a, b, [a[0] + 120 + rnd() * 40, (a[1] + b[1]) / 2, a[2] - 30], t0, 0.45 + rnd() * 0.1, 1);
        }
      });
      // the records of the day leave Aegis with a short trail
      minis.forEach((mn) => {
        const b = slot(mn.j, mn.m + 0.65);
        for (let j = 0; j < (few ? 6 : 12); j++) P(jit(O, 20), jit(b, 30), via(O, b, 40), mn.m + j * 0.02, 0.6, 2 + (j % 8), 'out');
      });
      out.sort((p, q) => p.col - q.col);       // one path per colour
      return out;
    };
    // the invoice's fields and the record's values, measured on the page (and again if the language changes)
    const measure = () => {
      if (!hero.el.offsetWidth) return false;
      hero.el.querySelectorAll('.hv-hl').forEach((n) => n.remove());
      hero.fields = [];
      hero.el.querySelectorAll('[data-f]').forEach((b) => {
        const [x, y] = localOf(b, hero.el), w = b.offsetWidth, h = b.offsetHeight, pad = 7, f = +b.dataset.f;
        const hl = document.createElement('i'), tag = document.createElement('em');
        hl.className = 'hv-hl';
        Object.assign(hl.style, {left: `${x - pad}px`, top: `${y - pad + 1}px`, width: `${w + pad * 2}px`, height: `${h + pad * 2 - 2}px`});
        tag.textContent = FIELD_KEYS[f];
        tag.style.left = `${484 - x + pad}px`;                       // a column of tags beside the page
        tag.style.setProperty('--g', `${484 - x - w - pad}px`);
        hl.appendChild(tag);
        hero.el.appendChild(hl);
        hero.fields[f] = {hl, tag, x, y, w, h, at: SCAN[0] + ((y + h / 2) / 600) * SCAN[1]};
      });
      rec.vals = [...rec.el.querySelectorAll('.rc-row > b')].map((b) => {
        const [x, y] = localOf(b, rec.el);
        return [x + b.offsetWidth / 2, y + b.offsetHeight / 2, b.offsetWidth, x + b.offsetWidth];
      });
      const count = cmr.el.querySelector('.cm-box b'), [bx, by] = localOf(count, cmr.el);
      cmr.count = [bx - 8, by + count.offsetHeight / 2];
      streams = build();
      return true;
    };
    if (document.fonts) document.fonts.ready.then(() => { measured = ''; });

    // the invoice's own motion: the scan, the field tags, the melt
    const readInvoice = (t) => {
      const scanV = clamp01((t - SCAN[0]) / SCAN[1]), meltV = clamp01((t - MELT[0]) / MELT[1]);
      const melting = band(t, MELT[0] - 0.05, MELT[0] + 0.05, MELT[0] + MELT[1] - 0.05, MELT[0] + MELT[1] + 0.05);
      const scanning = band(t, SCAN[0] - 0.05, SCAN[0] + 0.05, SCAN[0] + SCAN[1] - 0.05, SCAN[0] + SCAN[1] + 0.05);
      setTransform(hero.scan, `translateY(${((melting > 0 ? meltV : scanV) * 600).toFixed(1)}px)`);
      setOpacity(hero.scan, Math.max(scanning, melting));
      const clip = meltV > 0 ? `inset(${(meltV * 100).toFixed(2)}% 0 0 0)` : '';
      if (hero.clip !== clip) {
        hero.paper.style.clipPath = clip;
        hero.clip = clip;
      }
      const sel = band(t, 3.8, 4.1, 5.6, 6.2).toFixed(2);       // picked out of the storm
      if (hero.sel !== sel) {
        hero.el.style.setProperty('--sel', sel);
        hero.sel = sel;
      }
      hero.fields.forEach((q) => {
        setOpacity(q.hl, clamp01((t - q.at) / 0.18) * (1 - clamp01((t - 8.0) / 0.3)));
        setTransform(q.hl, `scale(${(1 + 0.25 * (1 - EASE.out(clamp01((t - q.at) / 0.4)))).toFixed(3)})`);
        setTransform(q.tag, `translateX(${(-12 * (1 - EASE.out(clamp01((t - q.at - 0.08) / 0.4)))).toFixed(1)}px)`);
      });
    };

    // ── drawing: dust and the atom behind the paper, the light in front ──
    const dust = Array.from({length: few ? 130 : 260}, () => [-2600 + rnd() * 5200, -1700 + rnd() * 3400, -900 + rnd() * 3600, rnd()]);
    const drawDust = (b, t, dot) => {
      b.fillStyle = '#a9bfdf';
      for (const [x, y, z, r] of dust) {
        const Z = z - cam.z;
        if (D + Z < 120) continue;
        const [sx, sy, f] = project(x, y - t * 9, z);
        if (sx < -30 || sx > 1310 || sy < -30 || sy > 750) continue;
        if (f > 1.1) {                                  // by the lens: soft discs
          b.globalAlpha = 0.09;
          b.beginPath();
          b.arc(sx, sy, Math.min(16, f * 3.2), 0, 6.283);
          b.fill();
        } else {
          b.globalAlpha = (0.12 + 0.42 * r) * clamp01(1.6 - Z / 3000);
          const s = dot * (0.9 + f * 1.4);
          b.fillRect(sx - s / 2, sy - s / 2, s, s);
        }
      }
      b.globalAlpha = 1;
    };
    const drawOrb = (b, mark, t, dot) => {
      let [x, y, f] = project(0, 0, 0), size = ORB_W * f;
      const end = EASE.io(clamp01((t - 17.3) / 1.3));            // onto the end card, over the name
      x = mix(x, CX, end); y = mix(y, 226, end); size = mix(size, 320, end);
      const energy = band(t, 3.8, 4.5, 5.8, 6.8) * 0.8 + band(t, 8.3, 8.9, 10.2, 11.0) + band(t, 13.9, 14.2, 14.6, 15.3) * 0.5
        + band(t, 15.3, 15.8, 17.0, 17.6) * 0.6 + clamp01((t + 2) / 1.5) * 0.3 * (1 - clamp01(t / 2));
      const alpha = 1 - 0.8 * band(t, 11.2, 11.8, 15.1, 15.7);
      const g = b.createRadialGradient(x, y, 0, x, y, size * 0.8);
      g.addColorStop(0, `rgba(60,150,255,${((0.16 + 0.22 * energy) * alpha).toFixed(3)})`);
      g.addColorStop(0.45, `rgba(40,190,220,${((0.05 + 0.08 * energy) * alpha).toFixed(3)})`);
      g.addColorStop(1, 'rgba(40,190,220,0)');
      b.fillStyle = g;
      b.fillRect(x - size, y - size, size * 2, size * 2);
      if (!mark) return;
      const form = clamp01((t + 2) / 1.24);
      mark.draw(b, {cx: x, cy: y, size, form, t: t + 2, dot, alpha, turn: 0.5 * (1 - EASE.io(form)),
        wave: band(t, 3.7, 4.0, 5.9, 6.6) + band(t, 13.9, 14.1, 14.8, 15.3) * 0.7, sweep: clamp01((t - 8.5) / 1.2)});
    };
    const at = (s, u) => {
      const q = EASE[s.ease](u), v = 1 - q, a = v * v, m = 2 * v * q, c = q * q;
      return project(a * s.a[0] + m * s.c[0] + c * s.b[0], a * s.a[1] + m * s.c[1] + c * s.b[1], a * s.a[2] + m * s.c[2] + c * s.b[2]);
    };
    const drawLight = (ctx, t, dot) => {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = dot * 0.9;
      let col = -1;
      const flush = () => {
        ctx.globalAlpha = 0.45;
        ctx.stroke();
      };
      for (const s of streams) {
        const u = (t - s.t0) / s.dur;
        if (u <= 0 || u >= 1) continue;
        if (s.col !== col) {
          if (col >= 0) flush();
          col = s.col;
          ctx.fillStyle = ctx.strokeStyle = `rgb(${COLS[col]})`;
          ctx.beginPath();
        }
        const [x, y, f] = at(s, u), [x0, y0] = at(s, Math.max(0, u - 0.07)), size = Math.min(3.4, dot * (1.1 + f * 0.9));
        ctx.globalAlpha = Math.min(1, 0.35 + 4 * u) * (1 - Math.pow(u, 6));
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
        ctx.moveTo(x0, y0);
        ctx.lineTo(x, y);
      }
      if (col >= 0) flush();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };
    // the flag: a line from the record's pallets to the CMR's count
    const drawFlag = (ctx, t) => {
      const grow = EASE.io(clamp01((t - 13.95) / 0.4)), fade = 1 - clamp01((t - 15.15) / 0.3);
      if (grow <= 0 || fade <= 0 || !rec.vals.length) return;
      const [, vy, , vr] = rec.vals[3];
      const [x0, y0] = project(...ptOn(rec, recPose, t, vr + 12, vy)), [x1, y1] = project(...ptOn(cmr, cmrPose, t, ...cmr.count));
      ctx.save();
      ctx.strokeStyle = '#ff9f0a';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 6]);
      ctx.lineDashOffset = -t * 30;
      ctx.globalAlpha = fade;
      ctx.shadowColor = 'rgba(255,159,10,.9)';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(mix(x0, x1, grow), mix(y0, y1, grow));
      ctx.stroke();
      ctx.restore();
    };
    const roll = (c) => {
      if (!cam.roll) return;
      c.translate(CX, CY);
      c.rotate(cam.roll * Math.PI / 180);
      c.translate(-CX, -CY);
    };

    return {
      render(t) {
        if (measured !== html.lang && measure()) measured = html.lang;
        camAt(t);
        setTransform(world, cam.roll ? `rotate(${cam.roll.toFixed(2)}deg)` : 'none');
        for (const d of docs) if (place(d, docPose(d, t, d.p))) shade(d);
        heroPose(t, hero.p);
        if (place(hero)) readInvoice(t);
        recPose(t, rec.p);
        place(rec);
        cmrPose(t, cmr.p);
        place(cmr);
        for (const mn of minis) {
          miniPose(mn, t, mn.p);
          place(mn);
        }
      },
      paint(ctx, mark, t) {
        const dot = 1.15 / k;
        bgCtx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
        bgCtx.clearRect(0, 0, 1280, 720);
        roll(bgCtx);
        drawDust(bgCtx, t, dot);
        drawOrb(bgCtx, mark, t, dot);
        if (!ctx) return;
        roll(ctx);
        drawLight(ctx, t, dot);
        drawFlag(ctx, t);
      },
      resize(scale, ratio) {
        k = scale;
        dpr = ratio;
        bg.width = Math.round(1280 * k * dpr);
        bg.height = Math.round(720 * k * dpr);
      },
    };
  };

  // when each row is checked (the pallets row: flagged), and when each row lights up
  const CHECKED = [13.05, 13.15, 13.25, 14.35, 12.15, 12.15, 12.65, 12.25];
  const PULSES = [[L(0), 13.0], [L(1)], [L(2)], [L(3)], [L(4), 11.7], [L(5), 11.7], [L(6), 12.6], [L(7), 12.2]];
  const pulse = (times) => ({o: [[0, 0], ...times.flatMap((p) => [[p, 0], [p + 0.1, 1, 'lin'], [p + 0.8, 0, 'lin']])]});
  const CHECK_LINES = [12.3, 12.75, 13.2, 14.4];
  const AEGIS = {
    duration: 20,
    lead: 2,           // the atom forms out of the dark before the paper starts to fall
    mark: {name: 'aegis'},
    scene: AegisScene,
    tracks: [
      ...glows(20),
      ['.tr-brand', {o: [[0.2, 0], [0.8, 1, 'lin'], [17.3, 1], [17.6, 0, 'lin']]}],
      ['.ag2-scrim', {o: [[0, 0], [0.3, 1, 'lin'], [3.5, 1], [4.0, 0, 'lin'], [11.2, 0], [11.7, 1, 'lin'], [15.0, 1], [15.5, 0, 'lin']]}],
      ...copy('.ag-c0', 0.3, 3.6),
      ['.ag-t1 .k', line(4.35, 7.95)],
      ['.ag-t2 .k', line(8.35, 11.1)],
      ...copy('.ag-c3', 11.45, 15.15),
      ['.ag-t4 .k', line(15.55, 17.4)],

      // the record fills in as each field arrives, and is checked
      ['.rc-row > b', each((el, i) => ({o: [[L(i), 0], [L(i) + 0.12, 1, 'lin']], x: [[L(i), -16], [L(i) + 0.45, 0]]}))],
      ['.rc-row > .gl', each((el, i) => pulse(PULSES[i]))],
      ['.rc-row > em', each((el, i) => pop(CHECKED[i], {s: 0.3}))],
      ['.rc-row > .wl', {o: [[14.0, 0], [14.2, 1, 'lin']]}],
      ['.rc-ck', each((el, i) => ({o: [[CHECK_LINES[i], 0], [CHECK_LINES[i] + 0.2, 1, 'lin']], x: [[CHECK_LINES[i], -14], [CHECK_LINES[i] + 0.45, 0]]}))],
      ['.rc-ck em', each((el, i) => pop(CHECK_LINES[i] + 0.1, {s: 0.3}))],
      ['.rc-state .s1', {o: [[14.3, 1], [14.42, 0, 'lin']]}],
      ['.rc-state .s2', {o: [[14.35, 0], [14.5, 1, 'lin']], s: [[14.35, 0.8], [14.85, 1, 'back']]}],
      ['.cm-box .wl', {o: [[13.95, 0], [14.1, 1, 'lin']]}],

      // end card: the atom settles over its name (drawn by the scene)
      ['.ag-orb', {o: [[18.0, 0], [18.2, 1, 'lin']], s: [[18.0, 0.2], [18.8, 1, 'back']]}],
      ['.ag-end .end-name .k', line(18.3)],
      ['.ag-end .end-tag .k', line(18.55)],
      ['.ag-end .end-pill', pop(18.9)],
    ],
  };

  const SPECS = {axon: AXON, aegis: AEGIS};

  // ── Timeline → elements ─────────────────────────────────────────────
  const compile = (root, tracks) => {
    const items = [];
    tracks.forEach(([sel, spec, stagger = 0]) => {
      const els = [...root.querySelectorAll(sel)];
      els.forEach((el, i) => {
        if (spec.frame) {
          items.push({el, frame: spec.frame});
          return;
        }
        if (spec.pose) {
          items.push({el, off: i * stagger, pose: typeof spec.pose === 'function' ? spec.pose(el, i, els) : spec.pose});
          return;
        }
        const props = spec.each ? spec.each(el, i, els) : spec;
        items.push({el, off: i * stagger, last: {}, props: Object.entries(props).map(([k, kf]) => [PROP[k], kf])});
      });
    });
    return items;
  };

  const LABELS = {
    play: {en: 'Play film', de: 'Film abspielen', gr: 'Αναπαραγωγή ταινίας'},
    pause: {en: 'Pause film', de: 'Film pausieren', gr: 'Παύση ταινίας'},
    replay: {en: 'Play again', de: 'Erneut abspielen', gr: 'Ξανά από την αρχή'},
  };
  const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  // The film's truck model seen from its near side, as dots every ~2.4 px:
  // x along the truck (tail → cab), y up; tyres blue, the cab a light blue.
  const sideView = ({segs}) => {
    const xs = [], ys = [], cs = [];
    const TONE = ['#eef3ff', '#c9d6ea', '#9fd0ff', '#5ac8fa'];
    for (const [x1, y1, z1, x2, y2, z2, kind] of segs) {
      if (Math.min(y1, y2) < -0.5) continue;                 // the far side hides behind the near one
      const len = Math.hypot(x2 - x1, z2 - z1);
      if (len < 0.5) continue;                               // lines running across the truck
      const n = Math.max(1, Math.round(len / 2.4));
      for (let i = 0; i <= n; i++) {
        xs.push(x1 + ((x2 - x1) * i) / n);
        ys.push(z1 + ((z2 - z1) * i) / n);
        cs.push(TONE[kind]);
      }
    }
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    for (let x = minX - 6; x <= maxX + 6; x += 3) {         // the road under it
      xs.push(x); ys.push(-1); cs.push('#6f7c92');
    }
    const n = xs.length;
    const order = [...xs.keys()].sort((a, b) => cs[a] < cs[b] ? -1 : cs[a] > cs[b] ? 1 : 0);
    const out = {n, w: maxX - minX, x: new Float32Array(n), y: new Float32Array(n), u: new Float32Array(n), at: new Float32Array(n), c: []};
    order.forEach((j, i) => {
      out.x[i] = xs[j] - minX;
      out.y[i] = ys[j];
      out.u[i] = (xs[j] - minX) / (maxX - minX);
      out.at[i] = 0.15 + out.u[i] * 1.15 + Math.random() * 0.12;   // tail first, cab last
      out.c.push(cs[j]);
    });
    return out;
  };

  class Film {
    constructor(root, spec) {
      this.root = root;
      this.frameEl = root.querySelector('.film-frame');
      this.stage = root.querySelector('.tr-stage');
      this.bar = root.querySelector('.film-bar b');
      this.time = root.querySelector('.film-time');
      this.button = root.querySelector('.film-btn');
      this.lead = spec.lead || 0;
      this.duration = spec.duration + this.lead;
      this.loop = !!spec.loop;
      this.size = spec.size || [1280, 720];
      this.items = compile(this.stage, spec.tracks);
      this.scene = spec.scene ? spec.scene(this.stage) : null;
      this.t = 0;
      this.playing = false;
      this.ended = false;
      this.userPaused = false;
      this.tick = this.tick.bind(this);
      const view = this.stage.querySelector('.w3-view');
      if (CLOUD && view) {
        this.cloud = new window.DionCloud(view, new Set(this.items.map((item) => item.el)));
        this.cloud.lead = this.lead || 0;
        this.cloud.streams = spec.streams ? spec.streams(this.stage) : [];
        root.classList.add('is-cloud');
      }
      // the particle signature (particles-v3.js): a canvas over the scene
      const canvas = this.stage.querySelector('.tr-fx');
      if (spec.mark && canvas && window.DionParticles) {
        this.fx = {canvas, ctx: canvas.getContext('2d'), spec: spec.mark, mark: null, k: 1, dpr: 1, box: null};
        if (spec.truck && window.DionCloud) this.fx.truck = {el: this.stage.querySelector(spec.truck), dots: sideView(window.DionCloud.semi())};
        window.DionParticles.product(spec.mark.name, Math.round((window.innerWidth < 700 ? 2200 : 4200) * (window.DionParticles.LITE ? 0.5 : 1))).then((mark) => {
          this.fx.mark = mark;
          this.stage.classList.add('fx-on');
          this.render(this.t);
        }, () => {});
      }
      if (this.button) {
        this.button.addEventListener('click', () => {
          if (this.playing) {
            this.userPaused = true;
            this.pause();
          } else {
            this.userPaused = false;
            this.play();
            if (window.dionTrack) window.dionTrack('film_play', {film: root.dataset.film});
          }
        });
        root.querySelector('.film-bar').addEventListener('click', (event) => {
          const box = event.currentTarget.getBoundingClientRect();
          this.seek(clamp01((event.clientX - box.left) / box.width) * this.duration);
        });
      }
      if ('ResizeObserver' in window) new ResizeObserver(() => this.fit()).observe(this.frameEl);
      else window.addEventListener('resize', () => this.fit());
      this.fit();
      this.seek(0);
    }
    fit() {
      const w = this.frameEl.clientWidth, h = this.frameEl.clientHeight;
      if (!w || !h) return;
      const [sw, sh] = this.size;
      const k = Math.min(w / sw, h / sh);
      this.stage.style.transform = `translate(${(w - sw * k) / 2}px, ${(h - sh * k) / 2}px) scale(${k})`;
      if (this.scene) this.scene.resize(k, Math.min(2, window.devicePixelRatio || 1));
      if (this.cloud) {
        this.cloud.resize(k, Math.min(2, window.devicePixelRatio || 1));   // resizing clears the canvas
        this.cloud.draw(this.t);
      }
      if (this.fx) {
        const fx = this.fx;
        fx.k = k;
        fx.dpr = Math.min(2, window.devicePixelRatio || 1);
        fx.canvas.width = Math.round(sw * k * fx.dpr);
        fx.canvas.height = Math.round(sh * k * fx.dpr);
        fx.box = null;
        this.paint(this.t);
      }
      if (this.scene && !this.fx) this.render(this.t);
    }
    // The opening: the product's mark gathers out of the dark and flies apart
    // into the film. The end card: it gathers again, above the name.
    paint(time) {
      const fx = this.fx;
      if (this.scene) {
        if (fx) {
          fx.ctx.setTransform(fx.k * fx.dpr, 0, 0, fx.k * fx.dpr, 0, 0);
          fx.ctx.clearRect(0, 0, this.size[0], this.size[1]);
        }
        this.scene.paint(fx ? fx.ctx : null, fx && fx.mark, time - this.lead);
        return;
      }
      if (!fx || !fx.mark) return;
      const {ctx, k, spec, mark} = fx, lead = this.lead, dot = 1.15 / k;
      ctx.setTransform(k * fx.dpr, 0, 0, k * fx.dpr, 0, 0);
      ctx.clearRect(0, 0, this.size[0], this.size[1]);
      if (this.cloud) this.cloud.overlay(ctx, time, k);     // data streams, over the page
      if (time < lead + 0.4) {
        const form = clamp01(time / (lead * 0.62));
        mark.draw(ctx, {cx: this.size[0] / 2, cy: this.size[1] * 0.48, size: spec.size, form, t: time, dot,
          turn: 0.5 * (1 - EASE.io(form)), sweep: clamp01((time - lead * 0.48) / (lead * 0.36)),
          burst: clamp01((time - lead * 0.78) / 0.62)});
      }
      if (fx.truck) this.paintTruck(time - lead, dot);
      const end = time - lead - spec.end;
      if (end > 0) {
        if (!fx.box) {
          // the end card's placeholder, in stage pixels (offsets ignore its animation)
          const el = this.stage.querySelector(spec.box);
          if (!el || !el.offsetParent) return;
          let x = el.offsetWidth / 2, y = el.offsetHeight / 2;
          for (let node = el; node && node !== this.stage; node = node.offsetParent) {
            x += node.offsetLeft;
            y += node.offsetTop;
          }
          fx.box = {x, y, size: el.offsetWidth * spec.scale};
        }
        const form = clamp01(end / 1.5);
        mark.draw(ctx, {cx: fx.box.x, cy: fx.box.y, size: fx.box.size, form, t: time, dot,
          turn: 0.5 * (1 - EASE.io(form)), sweep: clamp01((end - 1.3) / 0.9)});
      }
    }
    // "This is one truck." — the truck appears dot by dot from its tail to its
    // cab, a light passes along it, then it flies down onto the rail
    paintTruck(t, dot) {
      const {el, dots} = this.fx.truck;
      if (!el || t < 0.1 || t > 3.05) return;
      const alpha = +getComputedStyle(el).opacity;
      if (alpha < 0.01) return;
      // the drawing's box on the stage, as the timeline moves and shrinks it
      const box = el.getBoundingClientRect(), stage = this.stage.getBoundingClientRect(), k = this.fx.k;
      const bx = (box.left - stage.left) / k, by = (box.top - stage.top) / k, bw = box.width / k, bh = box.height / k;
      const scale = (bw * 1.3) / dots.w, x0 = bx + bw * 0.5 - (dots.w * scale) / 2, ground = by + bh * 0.84;
      const ctx = this.fx.ctx, sweep = clamp01((t - 1.55) / 0.7), hx = -0.1 + sweep * 1.2;
      ctx.globalCompositeOperation = 'lighter';
      let colour = '';
      for (let i = 0; i < dots.n; i++) {
        const age = t - dots.at[i];
        if (age < 0) continue;
        const pop = Math.max(0, 1 - age / 0.28), u = dots.u[i];
        const band = sweep > 0 && sweep < 1 ? Math.max(0, 1 - Math.abs(u - hx) * 9) : 0;
        if (dots.c[i] !== colour) {
          colour = dots.c[i];
          ctx.fillStyle = colour;
        }
        ctx.globalAlpha = Math.min(1, (0.72 + pop * 0.9 + band) * alpha);
        const s = dot * (1.1 + pop * 1.2 + band * 0.6);
        ctx.fillRect(x0 + dots.x[i] * scale - s / 2, ground - dots.y[i] * scale - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    render(time) {
      const t = time - this.lead;       // the scene's own clock starts after the opening
      for (const item of this.items) {
        if (item.frame) {
          item.frame(t, item.el);
          continue;
        }
        if (item.pose) {
          const p = item.pose, tt = t - item.off, v = (kf) => (kf ? sample(kf, tt) : 0);
          let tr = `translate3d(${v(p.x).toFixed(1)}px, ${v(p.y).toFixed(1)}px, ${v(p.z).toFixed(1)}px)`;
          if (p.rz) tr += ` rotateZ(${v(p.rz).toFixed(2)}deg)`;
          if (p.rx) tr += ` rotateX(${v(p.rx).toFixed(2)}deg)`;
          if (p.s) tr += ` scale(${v(p.s).toFixed(3)})`;
          if (p.face) tr += ` ${p.face()}`;
          setTransform(item.el, tr);
          if (p.o) setOpacity(item.el, v(p.o));
          continue;
        }
        const tt = t - item.off;
        for (const [name, kf] of item.props) {
          const v = Math.round(sample(kf, tt) * 1000) / 1000;
          if (item.last[name] !== v) {
            item.last[name] = v;
            item.el.style.setProperty(name, v);
          }
        }
      }
      if (this.scene) this.scene.render(t);
      if (this.cloud) this.cloud.draw(time);
      this.paint(time);
      if (this.bar) this.bar.style.transform = `scaleX(${time / this.duration})`;
      if (this.time) this.time.textContent = `${clock(time)} / ${clock(this.duration)}`;
    }
    state() {
      this.root.classList.toggle('is-playing', this.playing);
      this.root.classList.toggle('is-ended', this.ended);
      const key = this.playing ? 'pause' : this.ended ? 'replay' : 'play';
      if (this.button) this.button.setAttribute('aria-label', LABELS[key][language()]);
    }
    seek(t) {
      this.t = Math.max(0, Math.min(this.duration, t));
      this.ended = this.t >= this.duration;
      if (this.ended) this.playing = false;
      this.render(this.t);
      this.state();
    }
    play() {
      if (this.playing) return;
      if (this.ended) this.seek(0);
      this.playing = true;
      this.last = performance.now();
      this.state();
      requestAnimationFrame(this.tick);
    }
    pause() {
      this.playing = false;
      this.state();
    }
    tick(now) {
      if (!this.playing) return;
      // a hidden tab stops frames; don't jump ahead when it comes back
      this.t += Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      if (this.t >= this.duration) {
        if (!this.loop) {
          this.seek(this.duration);
          return;
        }
        this.t %= this.duration;
      }
      this.render(this.t);
      requestAnimationFrame(this.tick);
    }
  }

  // ── The section: tabs, autoplay while in view ───────────────────────
  // The films are far below the first screen: they are built when the
  // section comes within a screen and a half, so setting them up doesn't
  // slow down the page's first moments.
  const films = {};
  const start = () => {
    section.querySelectorAll('.film').forEach((root) => {
      const spec = SPECS[root.dataset.film];
      if (spec) films[root.dataset.film] = new Film(root, spec);
    });
    // without motion, each film rests on its end card until someone presses play
    if (reducedMotion) Object.values(films).forEach((film) => film.seek(film.duration));

    let current = Object.keys(films)[0];
    let inView = false;
    const tabs = [...section.querySelectorAll('.film-tab')];
    const links = [...section.querySelectorAll('[data-film-link]')];
    const autoplay = () => {
      const film = films[current];
      if (film && inView && !reducedMotion && !film.userPaused && !film.ended) film.play();
    };
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      const name = tab.dataset.film;
      if (name === current || !films[name]) return;
      films[current].pause();
      films[current].root.hidden = true;
      current = name;
      const film = films[name];
      film.root.hidden = false;
      film.fit();
      tabs.forEach((other) => {
        other.classList.toggle('on', other === tab);
        other.setAttribute('aria-pressed', other === tab ? 'true' : 'false');
      });
      links.forEach((link) => { link.hidden = link.dataset.filmLink !== name; });
      film.userPaused = false;
      if (reducedMotion) film.seek(film.duration);
      else {
        film.seek(0);
        autoplay();
      }
    }));
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) autoplay();
        else if (films[current]) films[current].pause();
      }, {threshold: 0.45}).observe(section.querySelector('.films-player'));
    }
    new MutationObserver(() => Object.values(films).forEach((film) => film.state()))
      .observe(html, {attributes: true, attributeFilter: ['lang']});

    window.DionFilms = films; // test hook: DionFilms.axon.seek(12)
  };
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      start();
    }, {rootMargin: '150% 0px'});
    near.observe(section);
  } else {
    start();
  }
})();
