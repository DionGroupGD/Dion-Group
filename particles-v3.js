/* The particle signature. The opening DG, each product's entrance in the
   story and the first and last frames of each film share one look: a mark
   made of a few thousand points of light that gather out of a loose cloud,
   hold with a slight breath, and fly apart toward the viewer.

   A Mark draws as a pure function of how far it has formed, how far it has
   burst and the time (for the breath and any spin), so a scroll position
   or a film's clock can scrub it forwards and back. */
(() => {
  'use strict';
  // images are found next to this script, so pages in other folders (/de/, /gr/) load them too
  const HERE = (document.currentScript && document.currentScript.src) || window.location.href;
  const clamp = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  const images = {};
  const load = (src) => images[src] || (images[src] = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  }));

  // Points on the opaque pixels of a logo, cropped to the drawing and
  // centred, its longer side spanning −0.5…0.5, with a sculpted bulge so
  // the mark has depth when it turns. c: 0 main colour, 1 accent.
  const fromImage = (img, count, accent = 0.18) => {
    const S = 360, off = document.createElement('canvas');
    off.width = off.height = S;
    const o = off.getContext('2d', {willReadFrequently: true});
    const k = S / Math.max(img.naturalWidth, img.naturalHeight);
    o.drawImage(img, 0, 0, img.naturalWidth * k, img.naturalHeight * k);
    const data = o.getImageData(0, 0, S, S).data;
    const inside = [];
    let x0 = S, y0 = S, x1 = 0, y1 = 0;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        if (data[(y * S + x) * 4 + 3] > 128) {
          inside.push(x, y);
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    const span = Math.max(x1 - x0, y1 - y0) + 1, mx = (x0 + x1 + 1) / 2, my = (y0 + y1 + 1) / 2;
    const n = inside.length / 2;
    const pts = {x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count), c: new Uint8Array(count)};
    for (let i = 0; i < count; i++) {
      const j = (Math.random() * n) | 0;
      const x = (inside[j * 2] + Math.random() - mx) / span, y = (inside[j * 2 + 1] + Math.random() - my) / span;
      pts.x[i] = x;
      pts.y[i] = y;
      pts.z[i] = -(1 - Math.min(1, (x * x + y * y) * 4)) * 0.09 + (Math.random() - 0.5) * 0.05;
      pts.c[i] = i < count * (1 - accent) ? 0 : 1;   // sorted by colour: one fillStyle per run
    }
    return pts;
  };

  // Aegis has no drawn mark; its sign is the orb from its film, here a
  // globe of light banded blue → teal → green, with one orbit around it.
  // c: 0–3 the globe's bands from top to bottom, 4 the orbit.
  const globe = (count, {r = 0.3, ring = 0.55, share = 0.22} = {}) => {
    const pts = {x: new Float32Array(count), y: new Float32Array(count), z: new Float32Array(count), c: new Uint8Array(count)};
    const nRing = Math.round(count * share), nBall = count - nRing, golden = Math.PI * (3 - Math.sqrt(5));
    const order = [];
    for (let i = 0; i < nBall; i++) {
      const y = 1 - (i + 0.5) * (2 / nBall), rad = Math.sqrt(1 - y * y), a = i * golden;
      const d = r * (0.94 + Math.random() * 0.08);
      const band = Math.min(3, Math.max(0, Math.floor((y * 0.5 + 0.5 + (Math.random() - 0.5) * 0.16) * 4)));
      order.push([Math.cos(a) * rad * d, y * d, Math.sin(a) * rad * d, band]);
    }
    for (let i = 0; i < nRing; i++) {
      const a = Math.random() * Math.PI * 2, d = ring + (Math.random() - 0.5) * 0.035;
      order.push([Math.cos(a) * d, (Math.random() - 0.5) * 0.012, Math.sin(a) * d, 4]);
    }
    order.sort((p, q) => p[3] - q[3]);
    order.forEach(([x, y, z, c], i) => {
      pts.x[i] = x; pts.y[i] = y; pts.z[i] = z; pts.c[i] = c;
    });
    return pts;
  };

  // Aegis as on the current site: a glossy sphere inside five orbits, like an
  // atom (the live homepage's .aegis-atom-svg), built as true 3D circles so
  // the rings sweep around the sphere as the mark turns. Sizes follow the SVG
  // (outer orbit = 0.5), with the sphere a little larger so it reads in points.
  // c: 0–3 the sphere's bands top to bottom, 4–8 the orbits, 9–10 the nodes.
  const ATOM_ORBITS = [
    // radius, tilt (deg, about x; or about y when upright), upright, turn in the picture (deg), colour, dashed, nodes (angles, deg)
    [0.455, 79.4, false, -4, 4, false, [200, 10]],
    [0.397, 76.2, false, 5, 5, false, [150]],
    [0.321, 75.2, false, -31, 6, false, [330, 300]],
    [0.228, 65.9, true, -5, 7, false, [270, 120]],
    [0.5, 76.6, false, 0, 8, true, [40]],
  ];
  const atom = (count) => {
    const R = 0.135, lift = -0.024, golden = Math.PI * (3 - Math.sqrt(5)), list = [];
    const nBall = Math.round(count * 0.46), nNodes = Math.round(count * 0.1), nRings = count - nBall - nNodes;
    for (let i = 0; i < nBall; i++) {
      const y = 1 - (i + 0.5) * (2 / nBall), rad = Math.sqrt(1 - y * y), a = i * golden, d = R * (0.95 + Math.random() * 0.07);
      const band = Math.min(3, Math.max(0, Math.floor((y * 0.5 + 0.5 + (Math.random() - 0.5) * 0.16) * 4)));
      list.push([Math.cos(a) * rad * d, y * d + lift, Math.sin(a) * rad * d, band]);
    }
    // a point on orbit k at angle θ, in 3D
    const onOrbit = ([r, tiltDeg, upright, turnDeg], th) => {
      const tilt = tiltDeg * Math.PI / 180, turn = turnDeg * Math.PI / 180;
      let x = Math.cos(th) * r, y = Math.sin(th) * r, z = 0;
      if (upright) { const x1 = x * Math.cos(tilt); z = x * Math.sin(tilt); x = x1; }
      else { const y1 = y * Math.cos(tilt); z = y * Math.sin(tilt); y = y1; }
      return [x * Math.cos(turn) - y * Math.sin(turn), x * Math.sin(turn) + y * Math.cos(turn), z];
    };
    const total = ATOM_ORBITS.reduce((a, o) => a + o[0], 0);
    ATOM_ORBITS.forEach((o) => {
      const n = Math.round(nRings * o[0] / total);
      for (let i = 0; i < n; i++) {
        let th = Math.random() * Math.PI * 2;
        if (o[5] && (th * 9 / Math.PI) % 2 > 1.25) th += Math.PI / 9 * 0.75;    // the outer orbit is dashed
        const [x, y, z] = onOrbit(o, th);
        const j = 0.004;
        list.push([x + (Math.random() - 0.5) * j, y + (Math.random() - 0.5) * j, z + (Math.random() - 0.5) * j, o[4]]);
      }
    });
    const nodes = ATOM_ORBITS.flatMap((o, k) => o[6].map((deg, m) => [o, deg * Math.PI / 180, (k + m) % 3 === 2 ? 10 : 9]));
    nodes.forEach(([o, th, c], k) => {
      const [x, y, z] = onOrbit(o, th), n = Math.round(nNodes / nodes.length), r = c === 10 ? 0.016 : 0.011;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, b = Math.acos(Math.random() * 2 - 1), d = r * Math.cbrt(Math.random());
        list.push([x + Math.sin(b) * Math.cos(a) * d, y + Math.cos(b) * d, z + Math.sin(b) * Math.sin(a) * d, c]);
      }
    });
    list.sort((p, q) => p[3] - q[3]);
    const pts = {x: new Float32Array(list.length), y: new Float32Array(list.length), z: new Float32Array(list.length), c: new Uint8Array(list.length)};
    list.forEach(([x, y, z, c], i) => { pts.x[i] = x; pts.y[i] = y; pts.z[i] = z; pts.c[i] = c; });
    return pts;
  };
  const ATOM_PALETTE = [[120, 178, 255], [80, 170, 255], [40, 200, 225], [47, 211, 150],
    [96, 160, 255], [176, 196, 236], [60, 210, 190], [182, 168, 255], [90, 215, 160], [236, 244, 255], [130, 240, 175]];

  class Mark {
    // palette: [r, g, b] per colour index. spin (rad/s) turns the mark about
    // its vertical axis; tilt and roll then lean it toward the viewer.
    constructor(pts, palette, {spin = 0, tilt = 0, roll = 0} = {}) {
      const n = pts.x.length;
      Object.assign(this, pts, {n, spin, tilt, roll});
      this.fills = palette.map((c) => `rgb(${c[0]},${c[1]},${c[2]})`);
      const F = () => new Float32Array(n);
      this.sx = F(); this.sy = F(); this.sz = F(); this.d = F(); this.w = F(); this.seed = F();
      for (let i = 0; i < n; i++) {
        // the loose cloud each point starts in: a thick shell around the mark
        const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), r = 0.9 + Math.random() * 1.4;
        this.sx[i] = Math.sin(b) * Math.cos(a) * r;
        this.sy[i] = Math.cos(b) * r * 0.7;
        this.sz[i] = Math.sin(b) * Math.sin(a) * r;
        this.d[i] = Math.random();                       // when it sets off
        this.w[i] = 0.8 + Math.random() * 1.4;           // how far it swirls on the way
        this.seed[i] = Math.random() * 1000;
      }
    }
    // form 0 → 1: from the cloud into the mark · burst 0 → 1: apart and toward
    // the viewer · turn: the mark's angle to us · sweep 0 → 1: one pass of light
    // wave 0 → 1: while it holds, rings pass out through it like sound, and the
    // points they push leave short trails (after Apple's HomePod wordmark)
    // pour 0 → 1 with into {x, y, w, h}: instead of bursting, the points leave
    // as streams of light and land in that rectangle (the product's screen),
    // so one scene flows into the next rather than fading
    draw(ctx, {cx, cy, size, form = 1, burst = 0, t = 0, turn = 0, sweep = 0, alpha = 1, dot = 1.15, still = false, wave = 0, pour = 0, into = null}) {
      const fade = (1 - burst) * (1 - burst) * alpha;
      if (fade < 0.004 || form <= 0) return;
      const b = burst * burst, f = 2.4;
      const cT = Math.cos(turn), sT = Math.sin(turn);
      const spin = still ? 0 : t * this.spin, cS = Math.cos(spin), sS = Math.sin(spin);
      const cX = Math.cos(this.tilt), sX = Math.sin(this.tilt), cR = Math.cos(this.roll), sR = Math.sin(this.roll);
      const rotate = this.spin || this.tilt || this.roll;
      const sweeping = sweep > 0 && sweep < 1, hx = -0.6 + sweep * 1.2;
      const breath = still ? 0 : 1;
      const waving = wave > 0.01 && !still, phase = (t / 2.4) % 1, ringR = 0.06 + phase * 0.95, ringA = wave * Math.pow(1 - phase, 1.4);
      let colour = -1, trails = 0;
      const pouring = pour > 0 && into;
      if (pouring && !this.gx) {
        // where each point lands: an even spread over the target
        this.gx = new Float32Array(this.n); this.gy = new Float32Array(this.n);
        for (let i = 0; i < this.n; i++) { this.gx[i] = Math.random(); this.gy[i] = Math.random(); }
      }
      const flush = () => {
        if (!trails) return;
        ctx.globalAlpha = 0.5 * fade;
        ctx.strokeStyle = this.fills[colour];
        ctx.lineWidth = dot * 0.9;
        ctx.stroke();
        trails = 0;
      };
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.n; i++) {
        // where the point belongs, with the mark's own motion
        let x = this.x[i], y = this.y[i], z = this.z[i];
        if (rotate) {
          const x1 = x * cS + z * sS, z1 = -x * sS + z * cS;
          const y2 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
          x = x1 * cR - y2 * sR; y = x1 * sR + y2 * cR; z = z2;
        }
        // how far it has come from the cloud, swirling in
        const e = ease(clamp((form - this.d[i] * 0.45) / 0.55));
        if (e < 1) {
          const a = (1 - e) * this.w[i], ca = Math.cos(a), sa = Math.sin(a);
          const sx = this.sx[i] * ca - this.sz[i] * sa, sz = this.sx[i] * sa + this.sz[i] * ca;
          x = sx + (x - sx) * e; y = this.sy[i] + (y - this.sy[i]) * e; z = sz + (z - sz) * e;
        } else if (breath) {
          const w = Math.sin(t * 0.9 + this.seed[i]) * 0.0022;
          x += w; z += w;
        }
        if (b > 0) {
          const r = Math.hypot(x, y) + 0.001;
          x += (x / r) * b * 1.1; y += (y / r) * b * 1.1; z -= b * 1.7;
        }
        let push = 0, rx = 0, ry = 0;
        if (waving && e >= 1) {
          const r = Math.hypot(x, y) + 0.001, d = (r - ringR) / 0.075;
          push = ringA * Math.exp(-d * d) * 0.06;
          if (push > 0.002) {
            rx = x; ry = y;
            x += (x / r) * push; y += (y / r) * push * 0.8; z -= push * 0.6;
          } else push = 0;
        }
        const x1 = x * cT + z * sT, z1 = -x * sT + z * cT;
        const k = Math.min(1.8, f / Math.max(0.8, f + z1));        // near-camera dots stay small
        const band = sweeping ? Math.max(0, 1 - Math.abs(x - hx) * 7) : 0;
        const a = Math.min(1, (0.46 + 0.5 * (1 - z1 * 3)) * (0.85 + band * 1.5)) * fade * (0.2 + 0.8 * e);
        if (a < 0.01) continue;
        if (this.c[i] !== colour) {
          flush();
          colour = this.c[i];
          ctx.fillStyle = this.fills[colour];
          ctx.beginPath();
        }
        const s = Math.min(dot * 2.3, (dot + band * 0.8 * dot) * k);
        let px = cx + x1 * size * k, py = cy + y * size * k;
        if (pouring) {
          // the mark peels off from left to right, in five ribbons of light
          const order = clamp((px - (cx - size * 0.6)) / (size * 1.2));
          const q = ease(clamp((pour - order * 0.48 - this.d[i] * 0.1) / 0.42));
          if (q > 0) {
            // every point takes the same road: the mark unravels into one thread
            // of light that runs to the top of the screen, then spreads into it
            const lane = ((this.seed[i] * 7.31) % 5 | 0) - 2;
            const tx = into.x + this.gx[i] * into.w, ty = into.y + this.gy[i] * into.h;
            const fx = into.x + into.w * 0.5 + lane * 5, fy = into.y + into.h * 0.1 + lane * 2;
            const mx = (px + fx) / 2 + lane * 9, my = Math.min(py, fy) - into.h * 0.3 + lane * 4;
            const at = (u) => {
              if (u < 0.7) { const k = u / 0.7, v = 1 - k; return [v * v * px + 2 * v * k * mx + k * k * fx, v * v * py + 2 * v * k * my + k * k * fy]; }
              const k = ease((u - 0.7) / 0.3);
              return [fx + (tx - fx) * k, fy + (ty - fy) * k];
            };
            const [ox, oy] = at(Math.max(0, q - 0.03));
            [px, py] = at(q);
            const land = 1 - clamp((q - 0.8) / 0.2);
            if (land <= 0.01) continue;
            ctx.globalAlpha = a * land;
            ctx.fillRect(px, py, s, s);
            ctx.moveTo(ox + s / 2, oy + s / 2);
            ctx.lineTo(px + s / 2, py + s / 2);
            trails++;
            continue;
          }
        }
        ctx.globalAlpha = a;
        ctx.fillRect(px, py, s, s);
        if (push) {
          // a trail back toward where the ring found it
          ctx.moveTo(px + s / 2, py + s / 2);
          ctx.lineTo(cx + (rx * cT) * size * k + s / 2, cy + ry * size * k + s / 2);
          trails++;
        }
      }
      flush();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // ── Aegis: the shield ────────────────────────────────────────────────
  // Aegis was Athena's shield. The outline of a heater shield (flat top,
  // straight sides curving to a point) as a dense polyline in the −0.5…0.5 box.
  const SHIELD = (() => {
    const pts = [];
    const line = (x0, y0, x1, y1, n) => { for (let i = 0; i < n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]); };
    const curve = (x0, y0, qx, qy, x1, y1, n) => {
      for (let i = 0; i < n; i++) {
        const t = i / n, u = 1 - t;
        pts.push([u * u * x0 + 2 * u * t * qx + t * t * x1, u * u * y0 + 2 * u * t * qy + t * t * y1]);
      }
    };
    line(-0.38, -0.45, 0.38, -0.45, 80);
    line(0.38, -0.45, 0.38, 0.0, 48);
    curve(0.38, 0.0, 0.37, 0.33, 0, 0.5, 64);
    curve(0, 0.5, -0.37, 0.33, -0.38, 0.0, 64);
    line(-0.38, 0.0, -0.38, -0.45, 48);
    return pts;
  })();
  const CY = 0.02;                                      // the shield's centre, for scaling it
  const scaled = (k) => SHIELD.map(([x, y]) => [x * k, CY + (y - CY) * k]);
  const inside = (poly, x, y) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  // n points spread evenly along a closed polyline, a hair off the line
  const along = (poly, n, jitter = 0.004) => {
    const seglen = poly.map((p, i) => Math.hypot(poly[(i + 1) % poly.length][0] - p[0], poly[(i + 1) % poly.length][1] - p[1]));
    const total = seglen.reduce((a, b) => a + b, 0), out = [];
    for (let k = 0; k < n; k++) {
      let d = ((k + Math.random() * 0.6) / n) * total, i = 0;
      while (d > seglen[i] && i < poly.length - 1) { d -= seglen[i]; i++; }
      const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length], t = d / (seglen[i] || 1);
      out.push([x0 + (x1 - x0) * t + (Math.random() - 0.5) * jitter * 2, y0 + (y1 - y0) * t + (Math.random() - 0.5) * jitter * 2]);
    }
    return out;
  };
  // points (with colours) → sorted typed arrays, with the sculpted bulge
  const pack = (list) => {
    list.sort((p, q) => p[2] - q[2]);
    const n = list.length;
    const pts = {x: new Float32Array(n), y: new Float32Array(n), z: new Float32Array(n), c: new Uint8Array(n)};
    list.forEach(([x, y, c], i) => {
      pts.x[i] = x; pts.y[i] = y; pts.c[i] = c;
      pts.z[i] = -(1 - Math.min(1, (x * x + y * y) * 4)) * 0.08 + (Math.random() - 0.5) * 0.04;
    });
    return pts;
  };
  const AEGIS_PALETTE = [[214, 232, 255], [110, 160, 255], [79, 164, 255], [90, 200, 250], [47, 211, 167], [60, 215, 120], [230, 252, 246]];
  // 1 · the document shield: a shield whose face is a page of text, one
  //     line lit — the field being read
  const shieldDoc = (count) => {
    const list = [];
    along(SHIELD, Math.round(count * 0.32)).forEach(([x, y]) => list.push([x, y, 0]));
    const inner = scaled(0.84);
    along(inner, Math.round(count * 0.14), 0.003).forEach(([x, y]) => list.push([x, y, 1]));
    const rows = [[-0.27, 0.44, 2], [-0.16, 0.3, 3], [-0.05, 0.4, 6], [0.06, 0.26, 4], [0.17, 0.15, 5]];
    const len = rows.reduce((a, r) => a + r[1], 0), n = Math.round(count * 0.46);
    rows.forEach(([y, l, c]) => {
      const m = Math.round((n * l) / len);
      for (let i = 0; i < m; i++) {
        const x = -0.22 + Math.random() * l, yy = y + (Math.random() - 0.5) * 0.042;
        if (inside(inner, x, yy)) list.push([x, yy, c]);
      }
    });
    return pack(list);
  };
  // 2 · scan A: an A in two strokes, its crossbar a scan line reaching past it
  const scanA = (count) => {
    const list = [], legs = Math.round(count * 0.72);
    for (let i = 0; i < legs; i++) {
      const t = Math.random(), side = i % 2 ? 1 : -1;
      const x = side * 0.36 * t + (Math.random() - 0.5) * 0.11, y = -0.46 + 0.92 * t;
      list.push([x, y, 2 + Math.min(3, Math.floor(t * 4))]);
    }
    for (let i = 0; i < count * 0.18; i++) list.push([-0.5 + Math.random(), 0.14 + (Math.random() - 0.5) * 0.014, 6]);
    for (let i = 0; i < count * 0.1; i++) list.push([-0.46 + Math.random() * 0.92, 0.14 + (Math.random() - 0.5) * 0.07, 3]);
    return pack(list);
  };
  // 3 · shield rings: three shields, one inside the next, like a signal
  const shieldRings = (count) => {
    const list = [];
    [[1, 0.44, 2], [0.7, 0.32, 4], [0.42, 0.24, 5]].forEach(([k, share, c]) => {
      along(scaled(k), Math.round(count * share)).forEach(([x, y]) => list.push([x, y, c]));
    });
    return pack(list);
  };
  const AEGIS_MARKS = {
    atom: (n) => Object.assign(new Mark(atom(n), ATOM_PALETTE, {spin: 0.16, tilt: 0.1, roll: 0}), {scene: 7.4}),
    shield: (n) => Object.assign(new Mark(shieldDoc(n), AEGIS_PALETTE), {scene: 2.2}),
    scan: (n) => Object.assign(new Mark(scanA(n), AEGIS_PALETTE), {scene: 2.2}),
    rings: (n) => Object.assign(new Mark(shieldRings(n), AEGIS_PALETTE), {scene: 2.2}),
    globe: (n) => Object.assign(new Mark(globe(n), [[120, 178, 255], [90, 200, 250], [47, 211, 167], [60, 215, 120], [214, 232, 255]],
      {spin: 0.35, tilt: 0.68, roll: -0.22}), {scene: 2.93}),
  };
  const AEGIS_MARK = 'atom';                 // the chosen design ('aegis-scan' etc. name the others)

  // the product marks, built once and shared by the story and the films
  const WHITE = [228, 236, 255], BLUE = [96, 170, 255];
  const marks = {};
  const product = (name, count) => marks[`${name}${count}`] || (marks[`${name}${count}`] = name.startsWith('aegis')
    ? Promise.resolve(AEGIS_MARKS[name.split('-')[1] || AEGIS_MARK](count))
    : load(new URL('tms/assets/axon-mark-light.png', HERE).href).then((img) => new Mark(fromImage(img, count), [WHITE, BLUE])));

  // older devices (4 cores or 4 GB and under) draw half the points everywhere
  const LITE = ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4);
  window.DionParticles = {LITE, load, fromImage, globe, Mark, product, ease, clamp};
})();
