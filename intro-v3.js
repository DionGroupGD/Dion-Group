/* Opening screen. On black, the DG monogram assembles from ~13,000
   particles sampled from the logo itself (dg-mark-1200.png), the DION GROUP
   wordmark settles beneath it, a light sweeps across once, and the particles
   fly apart toward the viewer as the page appears behind them.

   It gets out of the way: any scroll, touch, click or key skips it; it
   doesn't replay when arriving from another page of this site or at a
   #section; with reduced motion it shows the finished mark briefly. */
(() => {
  'use strict';
  const intro = document.querySelector('.intro');
  if (!intro) return;
  const canvas = intro.querySelector('.intro-canvas');
  const ctx = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── when to skip ─────────────────────────────────────────────────────
  // skipped when coming back from another page of this site, when it has
  // already played this session, or at a #section; a reload always replays it
  let fromOtherPage = false;
  try {
    const ref = document.referrer && new URL(document.referrer);
    fromOtherPage = !!ref && ref.origin === location.origin && ref.pathname !== location.pathname;
  } catch (e) { /* no referrer */ }
  let seen = false;
  try { seen = !!(window.DionConsent && window.DionConsent.allows('preferences')) && sessionStorage.getItem('dion_intro') === '1'; } catch (e) { /* storage blocked */ }
  let reload = false;
  try { reload = (performance.getEntriesByType('navigation')[0] || {}).type === 'reload'; } catch (e) { /* older browsers */ }
  const skipAtOnce = location.hash.length > 1 || (!reload && (fromOtherPage || seen));

  let done = false, running = false, raf = 0;
  const finish = (fast) => {
    if (done) return;
    done = true;
    intro.classList.add('gone', 'out');
    if (fast) intro.style.transitionDuration = '.3s';
    try { if (window.DionConsent && window.DionConsent.allows('preferences')) sessionStorage.setItem('dion_intro', '1'); } catch (e) { /* ignore */ }
    setTimeout(() => {
      running = false;
      intro.remove();
    }, fast ? 350 : 1000);
  };
  if (skipAtOnce) {
    finish(true);
    return;
  }
  // impatient visitors: skip on the first sign of intent
  const skip = () => finish(true);
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) => window.addEventListener(ev, skip, {once: true, passive: true}));

  // ── the particles ────────────────────────────────────────────────────
  // older or smaller devices get fewer points (4 cores or 4 GB and under: half)
  const LITE = ((navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4);
  const COUNT = Math.round((window.innerWidth < 700 ? 5200 : 13000) * (LITE ? 0.5 : 1));
  const WARM = [244, 228, 186], COOL = [205, 222, 255];
  let W = 0, H = 0, dpr = 1, size = 0;
  let px, py, pz, vx, vy, vz, tx, ty, tz, seed, cool, delay;
  let dust = [];

  const sample = (img) => {
    const S = 420, off = document.createElement('canvas');
    off.width = off.height = S;
    const o = off.getContext('2d');
    o.drawImage(img, 0, 0, S, S);
    const data = o.getImageData(0, 0, S, S).data;
    const inside = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (data[(y * S + x) * 4 + 3] > 128) inside.push(x, y);
    const pts = new Float32Array(COUNT * 2);
    for (let i = 0; i < COUNT; i++) {
      const k = (Math.random() * (inside.length / 2)) | 0;
      pts[i * 2] = (inside[k * 2] + Math.random() - 0.5) / S - 0.5;
      pts[i * 2 + 1] = (inside[k * 2 + 1] + Math.random() - 0.5) / S - 0.5;
    }
    return pts;
  };
  const build = (pts) => {
    const F = () => new Float32Array(COUNT);
    px = F(); py = F(); pz = F(); vx = F(); vy = F(); vz = F(); tx = F(); ty = F(); tz = F(); seed = F(); delay = F();
    cool = new Uint8Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const x = pts[i * 2], y = pts[i * 2 + 1], r2 = (x * x + y * y) * 4;
      tx[i] = x; ty[i] = y;
      tz[i] = -(1 - Math.min(1, r2)) * 0.09 + (Math.random() - 0.5) * 0.05;   // a sculpted bulge, with grain
      const a = Math.random() * Math.PI * 2, b = Math.acos(Math.random() * 2 - 1), d = 0.9 + Math.random() * 1.4;
      px[i] = Math.sin(b) * Math.cos(a) * d; py[i] = Math.cos(b) * d * 0.7; pz[i] = Math.sin(b) * Math.sin(a) * d;
      if (reducedMotion) { px[i] = tx[i]; py[i] = ty[i]; pz[i] = tz[i]; }
      seed[i] = Math.random() * 1000;
      cool[i] = Math.random() < 0.18 ? 1 : 0;
      delay[i] = Math.random() * 0.8;
    }
    dust = Array.from({length: 180}, () => ({x: Math.random(), y: Math.random(), s: Math.random() * 1.4 + 0.4,
      v: Math.random() * 0.012 + 0.004, p: Math.random() * 6.28}));
  };
  const resize = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    size = W < 700 ? Math.min(W * 0.78, H * 0.46) : Math.min(W * 0.5, H * 0.66);
    // the wordmark sits just under the mark's letters (they fill ~58% of the box height)
    intro.style.setProperty('--mark-below', `${Math.round(size * 0.31)}px`);
  };

  // ── the timeline (seconds) ───────────────────────────────────────────
  const WORD = 1.5, SWEEP = 1.8, BURST = 2.7, FADE = 3.05, END = 3.8;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  let start = 0, last = 0, wordShown = false, fading = false;

  const frame = (now) => {
    raf = 0;
    if (!running) return;
    if (!start) start = last = now;
    const t = (now - start) / 1000, dt = Math.min(0.05, (now - last) / 1000) * 60;
    last = now;
    if (!wordShown && t > WORD) { wordShown = true; intro.classList.add('word'); }
    if (!fading && t > FADE) { fading = true; finish(false); }
    const burst = t > BURST ? Math.min(1, (t - BURST) / 0.9) : 0;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgb(240,228,196)';
    for (const d of dust) {
      d.y -= d.v * 0.02 * dt; if (d.y < -0.02) d.y = 1.02;
      ctx.globalAlpha = (0.2 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.3 + d.p))) * (1 - burst);
      ctx.fillRect(d.x * W, d.y * H, d.s, d.s);
    }
    // the mark turns to face us as it forms, then holds with a slight breath
    const turn = 0.62 * (1 - ease(Math.min(1, t / 1.8))) + Math.sin(t * 0.8) * 0.03;
    const cT = Math.cos(turn), sT = Math.sin(turn);
    // a light passes across the letters once, just before they let go
    const sweep = t > SWEEP ? Math.min(1, (t - SWEEP) / 1.1) : 0;
    const hx = -0.6 + sweep * 1.2;
    const cx = W / 2, cy = H * (W < 700 ? 0.42 : 0.46), f = 2.4;
    const spring = 0.045 * dt, damp = Math.pow(0.86, dt);
    for (let pass = 0; pass < 2; pass++) {
      const c = pass ? COOL : WARM;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      for (let i = 0; i < COUNT; i++) {
        if (cool[i] !== pass) continue;
        if (burst > 0) {
          // fly apart, outward and toward the viewer
          const r = Math.hypot(px[i], py[i]) + 0.001;
          vx[i] += (px[i] / r) * 0.0035 * dt; vy[i] += (py[i] / r) * 0.0035 * dt; vz[i] -= 0.0025 * dt;
          px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt;
        } else if (t > delay[i]) {
          const breathe = Math.sin(t * 0.9 + seed[i]) * 0.0022;
          vx[i] = (vx[i] + (tx[i] + breathe - px[i]) * spring) * damp;
          vy[i] = (vy[i] + (ty[i] - py[i]) * spring) * damp;
          vz[i] = (vz[i] + (tz[i] + breathe - pz[i]) * spring) * damp;
          px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt;
        }
        const x1 = px[i] * cT + pz[i] * sT, z1 = -px[i] * sT + pz[i] * cT;
        const k = Math.min(1.8, f / Math.max(0.8, f + z1));          // near-camera dots stay small
        const band = sweep > 0 && sweep < 1 ? Math.max(0, 1 - Math.abs(px[i] - hx) * 7) : 0;
        ctx.globalAlpha = Math.min(1, (0.46 + 0.5 * (1 - z1 * 3)) * (0.85 + band * 1.5)) * (1 - burst * burst);
        const s = Math.min(2.6, (1.15 + band * 0.9) * k);
        ctx.fillRect(cx + x1 * size * k, cy + py[i] * size * k, s, s);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (t < END && running) raf = requestAnimationFrame(frame);
  };

  const img = new Image();
  img.onload = () => {
    if (done) return;
    build(sample(img));
    resize();
    running = true;
    if (reducedMotion) {
      // no motion: the finished mark and wordmark, briefly, then the page
      intro.classList.add('word');
      start = performance.now() - 2600;
      frame(performance.now());
      running = false;
      setTimeout(() => finish(false), 1400);
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  img.onerror = () => finish(true);
  img.src = canvas.dataset.src;
  window.addEventListener('resize', resize);
  // never leave the page covered (a slow image, a background tab)
  setTimeout(() => finish(false), 7000);
})();
