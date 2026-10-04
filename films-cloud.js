/* A film's 3D world as a point cloud: every surface of the CSS world
   (.w3-cam) becomes points of light, like a laser scan of the yard, drawn
   on a canvas through the film's own camera. Labels and documents stay as
   HTML, sharp and in place. trailers.js calls draw() after each frame.

   Positions come from the page itself: each element's layout offset and
   computed transform are chained exactly as CSS 3D does it, so the points
   sit where the solid world would have been. Trucks are drawn from a line
   model instead (a tractor and tri-axle trailer in hairlines, joints lit),
   and dust hangs in the air with depth of field. */
(() => {
  'use strict';
  const C = {
    cyan: [90, 200, 250], white: [236, 240, 247], dim: [150, 160, 176], blue: [60, 150, 255],
    green: [70, 220, 120], warm: [255, 222, 170], red: [255, 90, 80],
  };
  // How each kind of element is scanned. edge: spacing of points along its
  // outline (px) · fill: area per point inside (px²) · a: brightness.
  // keep: stays HTML · skip: not drawn · ellipse / cone: the shape inside.
  const RECIPES = [
    // Aegis: its orb becomes the particle globe of its mark (particles-v3.js)
    ['.g3-orb', {globe: true}],
    // trucks: a line model in the truck's own space (see semi())
    ['.w3-truck', {model: true}],
    ['.g3-doc, .g3-tray > span, .g3-sheet > b, .g3-lab, .g3-val, .g3-ok', {keep: true}],
    ['.w3-anchor, .w3-mark, .w3-roofmark, .w3-side, .w3-logo, .w3-door > b, .w3-board > b', {keep: true}],
    ['.w3-ao, .w3-tshadow, .w3-qr', {skip: true}],
    ['.w3-ground', {grid: 60, step: 20, c: C.cyan, a: 0.5}],
    ['.w3-road', {rows: [0, 1], edge: 6, c: C.cyan, a: 0.55}],
    ['.w3-dash', {dash: [26, 52], edge: 5, c: C.white, a: 0.5}],
    ['.w3-fence', {edge: 9, dash: [9, 18], c: C.cyan, a: 0.4}],
    ['.w3-apron', {edge: 8, c: C.white, a: 0.14}],
    ['.w3-bayline', {edge: 6, fill: 0, c: C.white, a: 0.3}],
    ['.w3-pool.p4', {ellipse: true, fill: 90, c: C.cyan, a: 0.5}],
    ['.w3-pool', {ellipse: true, fill: 260, c: C.warm, a: 0.22}],
    ['.w3-bay4', {edge: 4, fill: 110, c: C.cyan, a: 0.7}],
    ['.w3-box.wh > .f', {edge: 4, lattice: 10, c: C.cyan, a: 0.7, la: 0.22}],
    ['.w3-sky', {edge: 7, c: C.cyan, a: 0.35}],
    ['.w3-door', {edge: 4, c: C.white, a: 0.4}],
    ['.w3-lit.b', {fill: 26, edge: 3, c: C.blue, a: 0.95}],
    ['.w3-lit.g', {fill: 26, edge: 3, c: C.green, a: 0.95}],
    ['.w3-box.booth > .f', {edge: 3, fill: 140, c: C.cyan, a: 0.7}],
    ['.w3-win', {fill: 10, c: C.warm, a: 0.9}],
    ['.w3-box.pole > .f, .w3-box.camhead > .f', {edge: 3, c: C.dim, a: 0.6}],
    ['.w3-arm', {fill: 6, stripes: 12, c: C.white, c2: C.red, a: 0.95}],
    ['.w3-board', {edge: 3, fill: 40, c: C.cyan, a: 0.7}],
    ['.w3-scan', {fill: 22, edge: 2, c: C.cyan, a: 0.9}],
    ['.g3-tray', {edge: 5, c: C.cyan, a: 0.5}],
    ['.g3-sheet', {edge: 3, fill: 70, c: C.white, a: 0.55}],
    ['.g3-sheet > u', {rows: [0.5], edge: 3, c: C.dim, a: 0.8}],
    ['.g3-ped', {ring: true, edge: 4, fill: 240, c: C.cyan, a: 0.6}],
    ['.g3-ped > i', {ring: true, edge: 5, c: C.cyan, a: 0.45}],
    ['.w3-box.g3-slab > .f', {edge: 3, fill: 360, c: C.cyan, a: 0.6}],
    ['.g3-glow', {edge: 2.5, c: C.cyan, a: 1}],
    ['.g3-scan', {fill: 20, edge: 2, c: C.cyan, a: 0.9}],
    ['*', {edge: 8, c: C.white, a: 0.2}],
  ];
  const recipe = (el) => RECIPES.find(([sel]) => el.matches(sel))[1];

  // CSS 3D, by hand: an element's matrix relative to its parent
  const local = (el) => {
    const cs = getComputedStyle(el);
    const m = new DOMMatrix();
    m.translateSelf(el.offsetLeft, el.offsetTop, 0);
    if (cs.transform && cs.transform !== 'none') {
      const [ox, oy, oz = 0] = cs.transformOrigin.split(' ').map(parseFloat);
      m.translateSelf(ox, oy, oz).multiplySelf(new DOMMatrix(cs.transform)).translateSelf(-ox, -oy, -oz);
    }
    return m;
  };

  // ── A semi truck in lines ────────────────────────────────────────────
  // In the truck's own space, as the film moves it: x forward along its
  // heading, y to its right, z up, in px (about 16.5 to the metre). The
  // trailer's rear is at x = −92, where the dock wall is when it's docked.
  // A European cab-over tractor on two axles, a tri-axle box trailer.
  // Segments: [x1, y1, z1, x2, y2, z2, kind] — kind 0 frame, 1 detail,
  // 2 cab, 3 tyres. Joints: points that catch the light.
  const semi = () => {
    const segs = [], joints = [];
    const seg = (a, b, k = 0) => segs.push([...a, ...b, k]);
    const poly = (pts, k, closed = true) => {
      for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) seg(pts[i], pts[(i + 1) % pts.length], k);
    };
    const box = (x0, x1, y0, y1, z0, z1, k = 0, lit = true) => {
      const c = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      poly(c.map(([x, y]) => [x, y, z0]), k);
      poly(c.map(([x, y]) => [x, y, z1]), k);
      c.forEach(([x, y]) => {
        seg([x, y, z0], [x, y, z1], k);
        if (lit) joints.push([x, y, z0], [x, y, z1]);
      });
    };
    // a circle upright along the truck (a wheel), at lateral offset y
    const ring = (cx, y, cz, r, k, n = 18) => poly(Array.from({length: n}, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
    }), k);
    const tyre = (cx, y, w = 3.5) => {
      const R = 9;
      ring(cx, y - w, R, R, 3); ring(cx, y + w, R, R, 3);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2, x = cx + Math.cos(a) * R, z = R + Math.sin(a) * R;
        seg([x, y - w, z], [x, y + w, z], 3);
      }
      const out = y + Math.sign(y) * w;
      ring(cx, out, R, 5.2, 1, 12);
      joints.push([cx, out, R]);
    };

    // trailer: frame, side posts, logistics rails, roof bows, floor, doors
    const X0 = -92, X1 = 92, W = 21, F = 19, T = 68;
    box(X0, X1, -W, W, F, T);
    for (const y of [-W, W]) {
      for (let x = X0 + 18.4; x < X1 - 4; x += 18.4) {
        seg([x, y, F], [x, y, T], 1);
        joints.push([x, y, T], [x, y, F]);
      }
      for (const z of [34, 51]) seg([X0, y, z], [X1, y, z], 1);
      seg([X0 + 100, y, 8], [X0 + 146, y, 8], 1);           // side guard
      seg([X0 + 100, y, 13], [X0 + 146, y, 13], 1);
    }
    for (let x = X0 + 18.4; x < X1 - 4; x += 18.4) seg([x, -W, T], [x, W, T], 1);
    for (let x = X0 + 9; x < X1; x += 18.4) seg([x, -W, F - 2], [x, W, F - 2], 1);
    for (const y of [-8, 8]) seg([X0 + 4, y, F - 4], [X1 - 6, y, F - 4], 1);
    seg([X0, 0, F], [X0, 0, T]);
    for (const y of [-15, -7, 7, 15]) seg([X0 - 0.6, y, F + 3], [X0 - 0.6, y, T - 3], 1);
    box(X0 - 2, X0 + 3, -19, 19, 6, 10, 1, false);                  // rear underrun bar
    for (const x of [-42, -20, 2]) {                                  // tri-axle bogie
      tyre(x, -16); tyre(x, 16);
      seg([x, -16, 9], [x, 16, 9], 1);
    }
    for (const y of [-14, 14]) {                                      // landing gear
      seg([62, y, F - 4], [62, y, 3], 1);
      seg([58, y, 3], [66, y, 3], 1);
      joints.push([62, y, 3]);
    }

    // tractor: chassis, fifth wheel, cab, glass, grille, mirrors, tanks
    for (const y of [-9, 9]) box(44, 142, y - 1.5, y + 1.5, 10, 15, 1, false);
    box(68, 88, -12, 12, 15, 17, 1, false);
    const CB = 100, CF = 140, CW = 20, CZ0 = 16, CZ1 = 62;
    poly([[CB, -CW, CZ0], [CF, -CW, CZ0], [CF, CW, CZ0], [CB, CW, CZ0]], 2);
    poly([[CB, -CW, CZ1], [CF - 3, -CW, CZ1], [CF - 3, CW, CZ1], [CB, CW, CZ1]], 2);
    for (const [x0, x1] of [[CB, CB], [CF, CF - 3]]) for (const y of [-CW, CW]) seg([x0, y, CZ0], [x1, y, CZ1], 2);
    [[CB, -CW, CZ0], [CF, -CW, CZ0], [CF, CW, CZ0], [CB, CW, CZ0], [CB, -CW, CZ1], [CF - 3, -CW, CZ1], [CF - 3, CW, CZ1], [CB, CW, CZ1]]
      .forEach((p) => joints.push(p));
    poly([[CF - 0.6, -17, 38], [CF - 0.6, 17, 38], [CF - 2.6, 17, 58], [CF - 2.6, -17, 58]], 2);   // windscreen
    for (const z of [22, 26, 30, 34]) seg([CF + 0.4, -13, z], [CF + 0.4, 13, z], 1);                // grille
    for (const y of [-CW, CW]) {
      poly([[112, y, 18], [136, y, 18], [136, y, 58], [112, y, 58]], 2);   // door
      poly([[116, y, 40], [135, y, 40], [135, y, 56], [116, y, 56]], 2);   // side window
      const o = Math.sign(y);
      seg([137, y, 52], [137, y + o * 6, 53], 1);                          // mirror
      poly([[137, y + o * 6, 44], [137, y + o * 6, 55], [135, y + o * 7, 55], [135, y + o * 7, 44]], 1);
      box(88, 106, y - o * 5 - 2, y - o * 5 + 2, 6, 15, 1, false);          // fuel tank
      seg([106, y, 30], [106, y, 18], 1);                                    // grab handle
    }
    poly([[CB, -18, CZ1], [CB + 22, -18, CZ1], [CB + 4, -16, T + 1], [CB, -16, T + 1]], 2);   // roof deflector
    poly([[CB, 18, CZ1], [CB + 22, 18, CZ1], [CB + 4, 16, T + 1], [CB, 16, T + 1]], 2);
    seg([CB, -16, T + 1], [CB, 16, T + 1], 2); seg([CB + 4, -16, T + 1], [CB + 4, 16, T + 1], 2);
    box(CF - 2, CF + 3, -CW, CW, 9, 16, 1, false);                                    // bumper
    for (const [x, ys] of [[124, [-17, 17]], [78, [-17, -10, 10, 17]]]) {            // steer axle, twin-tyred drive axle
      ys.forEach((y) => tyre(x, y, 3));
      seg([x, -17, 9], [x, 17, 9], 1);
    }
    const heads = [[CF + 0.6, -15, 20], [CF + 0.6, 15, 20]];
    return {segs, joints, heads};
  };

  class Cloud {
    constructor(view, dynamic) {
      this.view = view;
      this.cam = view.querySelector('.w3-cam');
      this.dynamic = dynamic;            // elements the timeline moves or fades
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'w3-cloud';
      view.insertBefore(this.canvas, this.cam);
      this.ctx = this.canvas.getContext('2d');
      this.built = false;
    }
    // Walk the world once: sample every surface into points, grouped by the
    // nearest element that moves (the truck, an arm, a light) so a frame
    // only recomputes one matrix per group.
    build() {
      if (!this.cam.offsetParent) return false;
      // a small frame (phones) shows the same scan with fewer, wider-spaced points
      this.sparse = (this.view.getBoundingClientRect().width < 600 ? 1.8 : 1) * (window.DionParticles && window.DionParticles.LITE ? 1.4 : 1);
      const groups = new Map();
      this.globes = [];
      this.models = [];
      this.semi = this.semi || semi();
      this.dust = this.dust || Array.from({length: Math.round(520 / this.sparse)}, () => ({
        x: -300 + Math.random() * 3000, y: -50 + Math.random() * 1300, z: 10 + Math.random() * 260, s: Math.random() * 100}));
      const group = (root) => {
        if (!groups.has(root)) groups.set(root, {root, xs: [], ys: [], zs: [], cs: [], as: []});
        return groups.get(root);
      };
      const walk = (el, root, below) => {
        for (const child of el.children) {
          const r = recipe(child);
          if (r.keep) continue;
          if (r.model) {
            // the CSS truck gives way to the line model; its label stays
            child.querySelectorAll('*').forEach((el) => { if (!el.closest('.w3-anchor')) el.classList.add('pc-h'); });
            this.models.push({el: child, hero: child.classList.contains('hero')});
            continue;
          }
          if (r.globe) {
            child.classList.add('pc-g');
            this.globes.push({el: child, ball: child.firstElementChild});
            continue;
          }
          const moves = this.dynamic.has(child);
          const g = moves ? child : root;
          // matrix from the group's content space to this element's space
          const m = moves ? new DOMMatrix() : below.multiply(local(child));
          child.classList.add('pc-s');     // its solid look gives way to the points
          if (!r.skip) this.sample(child, r, group(g), m);
          walk(child, g, m);
        }
      };
      walk(this.cam, this.cam, new DOMMatrix());
      const cs = getComputedStyle(this.view);
      this.D = parseFloat(cs.perspective) || 1500;
      [this.OX, this.OY] = cs.perspectiveOrigin.split(' ').map(parseFloat);
      // a dynamic root's own placement (above its content) is read every frame
      let total = 0;
      this.groups = [...groups.values()].map((g) => {
        const n = g.xs.length;
        total += n;
        return {root: g.root, n, x: Float32Array.from(g.xs), y: Float32Array.from(g.ys), z: Float32Array.from(g.zs),
          c: g.cs, a: Float32Array.from(g.as)};
      });
      this.total = total;
      this.built = true;
      return true;
    }
    // points on one element's rectangle, taken into group space by m
    sample(el, recipe, g, m) {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w && !h) return;
      const q = this.sparse, r = {...recipe, edge: recipe.edge && recipe.edge * q, fill: recipe.fill && recipe.fill * q * q,
        step: recipe.step && recipe.step * q, lattice: recipe.lattice && recipe.lattice * q};
      const put = (u, v, c, a) => {
        const p = m.transformPoint(new DOMPoint(u, v, 0));
        g.xs.push(p.x); g.ys.push(p.y); g.zs.push(p.z); g.cs.push(c); g.as.push(a);
      };
      const colour = `rgb(${r.c.join(',')})`, colour2 = r.c2 ? `rgb(${r.c2.join(',')})` : colour;
      const line = (x0, y0, x1, y1, step, a) => {
        const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
        for (let i = 0; i <= n; i++) {
          const k = i / n, d = k * len;
          if (r.dash && d % r.dash[1] > r.dash[0]) continue;
          put(x0 + (x1 - x0) * k + (Math.random() - 0.5) * 0.8, y0 + (y1 - y0) * k + (Math.random() - 0.5) * 0.8, colour, a);
        }
      };
      if (r.grid) {
        // the ground: lattice lines, fading toward the edges like its vignette
        const fade = (u, v) => Math.max(0, 1 - Math.hypot((u / w - 0.5) / 0.55, (v / h - 0.45) / 0.5) * 0.85);
        for (let u = 0; u <= w; u += r.grid) for (let v = 0; v <= h; v += r.step) if (fade(u, v) > 0.05) put(u, v, colour, r.a * fade(u, v));
        for (let v = 0; v <= h; v += r.grid) for (let u = 0; u <= w; u += r.step) if (u % r.grid && fade(u, v) > 0.05) put(u, v, colour, r.a * fade(u, v));
      } else if (r.ring) {
        // a circle on the floor: its rim, and a soft glow inside
        const rim = Math.round((Math.PI * (w + h)) / 2 / r.edge);
        for (let i = 0; i < rim; i++) {
          const a = (i / rim) * Math.PI * 2;
          put(w / 2 + (Math.cos(a) * w) / 2, h / 2 + (Math.sin(a) * h) / 2, colour, r.a);
        }
        const n = r.fill ? Math.round((w * h) / r.fill) : 0;
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random());
          put(w / 2 + (Math.cos(a) * d * w) / 2, h / 2 + (Math.sin(a) * d * h) / 2, colour, r.a * 0.5 * (1 - d * 0.8));
        }
      } else if (r.rows) {
        r.rows.forEach((k) => line(0, k * h, w, k * h, r.edge, r.a));
      } else if (r.ellipse) {
        const n = Math.round((w * h) / r.fill);
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random());
          put(w / 2 + Math.cos(a) * d * w / 2, h / 2 + Math.sin(a) * d * h / 2, colour, r.a * (1 - d));
        }
      } else if (r.cone) {
        const n = Math.round((w * h * 0.6) / r.fill);
        for (let i = 0; i < n; i++) {
          const u = Math.random(), v0 = 0.4 - 0.4 * u, v1 = 0.6 + 0.4 * u;
          put(u * w, (v0 + (v1 - v0) * Math.random()) * h, colour, r.a * (1 - u));
        }
      } else {
        if (r.edge) {
          const a = r.a;
          if (w < 3 || h < 3) line(0, 0, w < 3 ? 0 : w, h < 3 ? 0 : h, r.edge, a);
          else {
            line(0, 0, w, 0, r.edge, a); line(w, 0, w, h, r.edge, a);
            line(w, h, 0, h, r.edge, a); line(0, h, 0, 0, r.edge, a);
          }
        }
        if (r.lattice) {
          // a dot matrix across the surface, like a scanned wall
          const L = r.lattice;
          for (let u = L / 2; u < w; u += L) for (let v = L / 2; v < h; v += L) put(u, v, colour, r.la);
        }
        if (r.fill) {
          const n = Math.round((w * h) / r.fill);
          for (let i = 0; i < n; i++) {
            const u = Math.random() * w, v = Math.random() * h;
            const c = r.stripes && Math.floor(v / r.stripes) % 2 ? colour2 : colour;
            put(u, v, c, r.a * (0.55 + Math.random() * 0.45));
          }
        }
      }
    }
    resize(k, dpr) {
      this.k = k;
      this.dpr = dpr;
      this.canvas.width = Math.round(1280 * k * dpr);
      this.canvas.height = Math.round(720 * k * dpr);
    }
    draw(time = 0) {
      if (!this.built && !this.build()) return;
      const ctx = this.ctx, k = this.k || 1, dpr = this.dpr || 1;
      ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
      ctx.clearRect(0, 0, 1280, 720);
      // the camera, then the view's perspective
      const cam = new DOMMatrix(this.cam.style.transform || 'matrix(1,0,0,1,0,0)');
      const {D, OX, OY} = this, dot = 1.25 / k, big = 2.6 / k;
      ctx.globalCompositeOperation = 'lighter';
      let colour = '';
      for (const g of this.groups) {
        let m = cam, alpha = 1;
        if (g.root !== this.cam) {
          // chain the moving root's own placement up to the camera
          let chain = new DOMMatrix();
          for (let el = g.root; el && el !== this.cam; el = el.parentElement) {
            chain = local(el).multiply(chain);
            alpha *= +getComputedStyle(el).opacity;
          }
          if (alpha < 0.01) continue;
          m = cam.multiply(chain);
        }
        const {m11, m12, m13, m21, m22, m23, m31, m32, m33, m41, m42, m43} = m;
        for (let i = 0; i < g.n; i++) {
          const x = g.x[i], y = g.y[i], z = g.z[i];
          const vx = m11 * x + m21 * y + m31 * z + m41, vy = m12 * x + m22 * y + m32 * z + m42, vz = m13 * x + m23 * y + m33 * z + m43;
          const w = 1 - vz / D;
          if (w <= 0.05) continue;
          const sx = OX + (vx - OX) / w, sy = OY + (vy - OY) / w;
          if (sx < -4 || sx > 1284 || sy < -4 || sy > 724) continue;
          const s = Math.min(big, dot / w);
          // nearer is brighter; far points fade into the dark
          const a = g.a[i] * alpha * Math.min(1, 1.25 / w);
          if (a < 0.02) continue;
          if (g.c[i] !== colour) {
            colour = g.c[i];
            ctx.fillStyle = colour;
          }
          ctx.globalAlpha = a > 1 ? 1 : a;
          ctx.fillRect(sx, sy, s, s);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'lighter';
      this.models.forEach((model) => this.drawTruck(model, cam, k));
      if (this.dust) this.drawDust(cam, time, k);
      ctx.globalCompositeOperation = 'source-over';
      this.globes.forEach((globe) => this.drawGlobe(globe, cam, time, k));
    }
    // a truck in hairlines: a soft glow under a fine line, joints lit
    drawTruck(model, cam, k) {
      let chain = new DOMMatrix(), alpha = 1;
      for (let el = model.el; el && el !== this.cam; el = el.parentElement) {
        chain = local(el).multiply(chain);
        alpha *= +getComputedStyle(el).opacity;
      }
      if (alpha < 0.01) return;
      const m = cam.multiply(chain), {D, OX, OY} = this, ctx = this.ctx;
      const {m11, m12, m13, m21, m22, m23, m31, m32, m33, m41, m42, m43} = m;
      const P = (x, y, z) => {
        const vx = m11 * x + m21 * y + m31 * z + m41, vy = m12 * x + m22 * y + m32 * z + m42, vz = m13 * x + m23 * y + m33 * z + m43;
        const w = 1 - vz / D;
        return w <= 0.05 ? null : [OX + (vx - OX) / w, OY + (vy - OY) / w, w];
      };
      const centre = P(0, 0, 30);
      if (!centre) return;
      // ours is bright and a little blue; the parked ones sit back
      const a = alpha * (model.hero ? 0.95 : 0.5) * Math.min(1, 1.3 / centre[2]);
      const kinds = [[], [], [], []];
      for (const s of this.semi.segs) {
        const p = P(s[0], s[1], s[2]), q = P(s[3], s[4], s[5]);
        if (p && q) kinds[s[6]].push(p[0], p[1], q[0], q[1]);
      }
      const stroke = (list, style, width) => {
        ctx.beginPath();
        for (let i = 0; i < list.length; i += 4) {
          ctx.moveTo(list[i], list[i + 1]);
          ctx.lineTo(list[i + 2], list[i + 3]);
        }
        ctx.strokeStyle = style;
        ctx.lineWidth = width;
        ctx.stroke();
      };
      const cab = model.hero ? '120,190,255' : '205,220,240';
      const tone = ['225,236,255', '190,210,235', cab, '170,190,215'];
      const weight = [1, 0.55, 1, 0.6];
      // glow first, then the lines themselves
      kinds.forEach((list, i) => list.length && stroke(list, `rgba(110,180,255,${(0.1 * a * weight[i]).toFixed(3)})`, 3 / k));
      kinds.forEach((list, i) => list.length && stroke(list, `rgba(${tone[i]},${(0.85 * a * weight[i]).toFixed(3)})`, 0.7 / k));
      ctx.fillStyle = `rgba(235,245,255,${(0.9 * a).toFixed(3)})`;
      const j = 1.6 / k;
      for (const p0 of this.semi.joints) {
        const p = P(p0[0], p0[1], p0[2]);
        if (p) ctx.fillRect(p[0] - j / 2, p[1] - j / 2, j, j);
      }
      if (model.hero) {
        // headlights
        for (const h of this.semi.heads) {
          const p = P(h[0], h[1], h[2]);
          if (!p) continue;
          const r = 9 / k / p[2], g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
          g.addColorStop(0, `rgba(255,244,215,${(0.9 * a).toFixed(3)})`);
          g.addColorStop(1, 'rgba(255,244,215,0)');
          ctx.fillStyle = g;
          ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
        }
      }
    }
    // Data in flight: particles riding a curve from one place in the world to
    // another, each leaving a short trail. A stream's source can be an element
    // (the page), whose surface then breaks up into the particles, top first.
    // Drawn on the film's top canvas (trailers.js), so a stream can leave the
    // surface of the page, which is HTML above the world
    overlay(ctx, time, k) {
      if (!this.built || !this.streams || !this.streams.length) return;
      const alpha = +getComputedStyle(this.view).opacity;
      if (alpha < 0.01) return;
      const cam = new DOMMatrix(this.cam.style.transform || 'matrix(1,0,0,1,0,0)');
      ctx.globalCompositeOperation = 'lighter';
      this.drawStreams(ctx, cam, time, k, alpha);
      ctx.globalCompositeOperation = 'source-over';
    }
    drawStreams(ctx, cam, time, k, alpha) {
      const t = time - (this.lead || 0), {D, OX, OY} = this;
      const project = (x, y, z) => {
        const p = cam.transformPoint(new DOMPoint(x, y, z)), w = 1 - p.z / D;
        return w <= 0.05 ? null : [OX + (p.x - OX) / w, OY + (p.y - OY) / w];
      };
      const io = (e) => (e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2);
      for (const st of this.streams) {
        if (t < st.t0 || t > st.t0 + st.spread + st.dur) continue;
        const fromEl = st.from instanceof Element;
        if (!st.jit) {
          // each particle's own path: when it leaves, and how its curve bends
          const R = () => Math.random() - 0.5;
          st.jit = Array.from({length: st.n}, () => ({u: Math.random(), v: Math.random(), cx: R() * 60, cy: R() * 60, cz: R() * 40,
            ex: R() * 14, ey: R() * 14, ez: R() * 10}));
          if (fromEl) st.jit.forEach((j) => { j.order = j.v * 0.85 + Math.random() * 0.15; });
        }
        let src = null;
        if (fromEl) {
          let chain = new DOMMatrix();
          for (let el = st.from; el && el !== this.cam; el = el.parentElement) chain = local(el).multiply(chain);
          src = {m: chain, w: st.from.offsetWidth, h: st.from.offsetHeight};
        }
        ctx.beginPath();
        const heads = [];
        st.jit.forEach((j, i) => {
          const start = st.t0 + (fromEl ? j.order : i / st.n) * st.spread, s = (t - start) / st.dur;
          if (s <= 0 || s >= 1) return;
          let x0, y0, z0;
          if (src) {
            const p = src.m.transformPoint(new DOMPoint(j.u * src.w, j.v * src.h, 0));
            x0 = p.x; y0 = p.y; z0 = p.z;
          } else [x0, y0, z0] = st.from;
          const [x2, y2, z2] = [st.to[0] + j.ex, st.to[1] + j.ey, st.to[2] + j.ez];
          const x1 = (x0 + x2) / 2 + j.cx, y1 = (y0 + y2) / 2 + j.cy, z1 = Math.max(z0, z2) + st.lift + j.cz;
          const at = (e) => {
            const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e;
            return project(a * x0 + b * x1 + c * x2, a * y0 + b * y1 + c * y2, a * z0 + b * z1 + c * z2);
          };
          const e = io(s), head = at(e), tail = at(Math.max(0, e - 0.08));
          if (!head || !tail) return;
          ctx.moveTo(tail[0], tail[1]);
          ctx.lineTo(head[0], head[1]);
          heads.push(head[0], head[1], Math.pow(Math.sin(Math.PI * s), 0.6));
        });
        ctx.strokeStyle = `rgba(${st.colour},${(0.35 * alpha).toFixed(3)})`;
        ctx.lineWidth = 1 / k;
        ctx.stroke();
        ctx.fillStyle = `rgb(${st.colour})`;
        const d = 1.9 / k;
        for (let i = 0; i < heads.length; i += 3) {
          ctx.globalAlpha = heads[i + 2] * alpha;
          ctx.fillRect(heads[i] - d / 2, heads[i + 1] - d / 2, d, d);
        }
        ctx.globalAlpha = 1;
      }
    }
    // dust in the air: sharp near the focus, soft discs in front and behind
    drawDust(cam, time, k) {
      const ctx = this.ctx, {D, OX, OY} = this;
      const {m11, m12, m13, m21, m22, m23, m31, m32, m33, m41, m42, m43} = cam;
      ctx.fillStyle = 'rgb(200,225,255)';
      for (const d of this.dust) {
        const x = d.x + Math.sin(time * 0.21 + d.s) * 26, y = d.y + Math.cos(time * 0.17 + d.s) * 18;
        const z = 10 + ((d.z + time * 7) % 260);
        const vx = m11 * x + m21 * y + m31 * z + m41, vy = m12 * x + m22 * y + m32 * z + m42, vz = m13 * x + m23 * y + m33 * z + m43;
        const w = 1 - vz / D;
        if (w <= 0.1) continue;
        const sx = OX + (vx - OX) / w, sy = OY + (vy - OY) / w;
        if (sx < -20 || sx > 1300 || sy < -20 || sy > 740) continue;
        const blur = Math.min(1, Math.abs(1 - w) * 2.2);
        const r = (0.7 + blur * 5) / k / Math.max(0.6, w);
        ctx.globalAlpha = (0.55 - blur * 0.44) * Math.min(1, z / 40);
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // the orb, as a globe of light where the solid ball would stand
    drawGlobe(globe, cam, time, k) {
      if (!globe.mark) {
        if (!globe.asked && window.DionParticles) {
          globe.asked = true;
          window.DionParticles.product('aegis', window.innerWidth < 700 ? 2200 : 4200).then((mark) => { globe.mark = mark; }, () => {});
        }
        return;
      }
      let chain = new DOMMatrix(), alpha = 1;
      for (let el = globe.el; el && el !== this.cam; el = el.parentElement) {
        chain = local(el).multiply(chain);
        alpha *= +getComputedStyle(el).opacity;
      }
      const ball = getComputedStyle(globe.ball);
      alpha *= +ball.opacity;
      if (alpha < 0.01) return;
      const m = cam.multiply(chain);
      const project = (x, y) => {
        const p = m.transformPoint(new DOMPoint(x, y, 0)), w = 1 - p.z / this.D;
        return [this.OX + (p.x - this.OX) / w, this.OY + (p.y - this.OY) / w];
      };
      const [cx, cy] = project(0, 0), [ex, ey] = project(62, 0);
      const scale = ball.transform && ball.transform !== 'none' ? new DOMMatrix(ball.transform).a : 1;
      const radius = Math.hypot(ex - cx, ey - cy) * scale;
      globe.mark.draw(this.ctx, {cx, cy, size: radius * (globe.mark.scene || 2.6), t: time, alpha, dot: 1.15 / k});
    }
  }
  Cloud.semi = semi;          // the truck model, for the film's opening card
  window.DionCloud = Cloud;
})();
