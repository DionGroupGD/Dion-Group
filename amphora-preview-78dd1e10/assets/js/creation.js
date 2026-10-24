/* Amphora, the opening: through the pack.
   1 Two hands from the Sistine ceiling reach for each other. The spark draws a pack: an empty glass jar.
   2 The jar becomes a window. Scroll and you dive through it, into what it holds: olives, fruit, anything,
     with the words for each written huge across them.
   3 You come back out through a real jar, finished and labelled. Then the same line turns into a tin, a bottle
     and a bag: everything that goes in a jar, a tin, a bottle or a bag can be configured. */
(() => {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EL = document.documentElement.lang === 'el', BASE = new URL('../', document.currentScript.src).href;   // Greek page; the folder of this script, so the page can live anywhere
  const $ = id => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp = (a, b, t) => a + (b - a) * t;
  const phase = (v, a, b) => clamp((v - a) / (b - a));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const out3 = t => 1 - Math.pow(1 - t, 3);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  /* ───────── what the story is made of ───────── */
  const JAR = { k: 'olive', f: 'jar', cap: EL ? 'Γυάλινο βάζο · για ελιές' : 'Glass jar · for olives', v: 1 };
  const INSIDE = [   // seen from inside the pack
    { img: 'green-pitted', word: EL ? 'Ελιές' : 'Olives', say: EL ? 'Κάθε συσκευασία περιέχει ένα προϊόν.' : 'Every pack holds a product.' },
    { img: 'peach-halves-syrup', word: EL ? 'Φρούτα' : 'Fruit', say: EL ? 'Το Amphora διαμορφώνει τη συσκευασία γύρω του.' : 'Amphora configures the pack around it.' },
    { orbit: true, word: EL ? 'Οτιδήποτε' : 'Anything', say: EL ? 'συσκευάζετε.' : 'you pack.' },
  ];
  // what circles the word Anything: things a configurator could be built for
  const WORDS = EL ? ['Ελιές', 'Ροδάκινα', 'Τόνος', 'Κάπαρη', 'Μέλι', 'Αγγουράκια', 'Βερίκοκα', 'Ελαιόλαδο', 'Αγκινάρες', 'Σαρδέλες', 'Πέστο', 'Ψητές πιπεριές', 'Ρεβίθια', 'Μαρμελάδα',
    'Αντζούγιες', 'Ντομάτες', 'Αχλάδια', 'Ταχίνι', 'Μανιτάρια', 'Σκουμπρί', 'Κεράσια', 'Φασόλια', 'Ξινολάχανο', 'Ξίδι', 'Σύκα', 'Φακές', 'Κομπόστα', 'Ζυμαρικά', 'Καλαμπόκι', 'Καφές',
    'Παντζάρια', 'Χούμους', 'Μανταρίνια', 'Φέτα', 'Χαλβάς', 'Πελτές', 'Χουρμάδες', 'Αμύγδαλα', 'Κρεμμυδάκια', 'Τσάι', 'Τσάτνεϊ', 'Αλάτι', 'Ανανάς', 'Χαλούμι', 'Ρύζι', 'Καρύδια'] : ['Olives', 'Peaches', 'Tuna', 'Capers', 'Honey', 'Gherkins', 'Apricots', 'Olive oil', 'Artichokes', 'Sardines', 'Pesto', 'Roasted peppers', 'Chickpeas', 'Jam',
    'Anchovies', 'Tomatoes', 'Pears', 'Tahini', 'Mushrooms', 'Mackerel', 'Cherries', 'Beans', 'Sauerkraut', 'Vinegar', 'Figs', 'Lentils', 'Marmalade', 'Pasta', 'Sweetcorn', 'Coffee',
    'Beetroot', 'Hummus', 'Mandarins', 'Feta', 'Jalapeños', 'Passata', 'Dates', 'Almonds', 'Pickled onions', 'Tea', 'Chutney', 'Sea salt', 'Pineapple', 'Halloumi', 'Rice', 'Walnuts',
    'Dolmades', 'Syrups', 'Fruit cocktail', 'Soups', 'Spices', 'Coconut milk', 'Caponata', 'Tomato paste', 'Baby food', 'Sauces', 'Yogurt', 'Juice'];
  const FORMATS = [JAR,
    { k: 'tuna',  f: 'tin',    cap: EL ? 'Κονσέρβα · για τόνο' : 'Tin · for tuna',                v: .5 },
    { k: 'oil',   f: 'bottle', cap: EL ? 'Μπουκάλι · για ελαιόλαδο' : 'Bottle · for olive oil',   v: 1.42 },
    { k: 'pasta', f: 'bag',    cap: EL ? 'Σακούλα · για ζυμαρικά' : 'Bag · for pasta',            v: 1.3 },
  ];
  const ADAM = { w: 661, h: 284, tx: .9939, ty: .4982 }, GOD = { w: 519, h: 306, tx: .0058, ty: .4608 };
  // the scroll timeline, in percent of the story
  const U = { textOut: [3, 9], sideOut: [0, 4], reveal: [2, 9], dive: [8, 24], inside: [22, 55], exit: [55, 67], formats: [68, 90], mIn: [64, 71], endLine: [86, 91], cta: [89, 96] };
  let introStart = null, OL = null;

  /* ───────── build ───────── */
  const view = $('view'), adam = $('adam'), god = $('god'), packs = $('packLayer'), svg = $('packSvg');
  const spark = $('spark'), sparkCore = spark.querySelector('i'), sparkRing = spark.querySelector('b'), flash = $('flash');
  const oL = $('oL'), oR = $('oR'), cue = $('cue'), skip = $('skip'), ocenter = $('ocenter');
  const mline = $('mline'), fname = $('fname'), mont = $('mont'), mcta = $('mcta');
  const win = $('win'), shade = $('winShade'), giant = $('giant'), say = $('say');
  const mEnd = mline.querySelector('em i'), mWords = [...mline.querySelectorAll('[data-f]')];
  const lineR = svg.querySelector('.ln-r'), lineL = svg.querySelector('.ln-l'), blank = svg.querySelector('.blank'), axis = svg.querySelector('.axis');
  INSIDE.forEach(c => { if (!c.img) return; c.el = Object.assign(document.createElement('img'), { className: 'mac', src: `${BASE}images/food/${c.img}.webp`, alt: '', draggable: false }); win.insertBefore(c.el, shade); });
  // two tilted rings of words turn slowly around the giant word: the near half passes in front of it, the far half behind
  const orbit = $('orbit');
  const RINGS = [
    { n: 14, nPhone: 8,  rx: .37, rxPhone: .3,  max: 560, ryk: .24, rykPhone: .95, tilt: -.06, w: .07,  off: 0,  size: 1 },
    { n: 18, nPhone: 10, rx: .47, rxPhone: .4,  max: 720, ryk: .3,  rykPhone: .85, tilt: .07,  w: -.05, off: .4, size: .8 },
  ];
  const OW = []; let wi = 0;
  RINGS.forEach((ring, ri) => { for (let i = 0; i < ring.n; i++) {
    const el = document.createElement('span'); el.textContent = WORDS[wi++ % WORDS.length]; if (ri === 1 && i % 3 === 1) el.className = 'm';
    orbit.appendChild(el); OW.push({ el, ring, i, d: (i * 5 % ring.n) / ring.n });
  } });
  let clock = 0;
  FORMATS.forEach(p => {
    p.wrap = Object.assign(document.createElement('div'), { className: 'pk' });
    p.img = Object.assign(document.createElement('img'), { src: `${BASE}images/packs/${p.k}.webp`, alt: p.cap.replace(' · ', ', '), draggable: false });
    p.wrap.appendChild(p.img); packs.appendChild(p.wrap);
  });

  /* ───────── sizes ───────── */
  let W = 1, H = 1, portrait = false, armW = 600, ctaBottom = 0;
  function layout() {
    W = view.clientWidth; H = view.clientHeight; portrait = W / H < .85;
    armW = clamp(W * (portrait ? .62 : .44), 240, 760);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    fname.style.top = (H * .905) + 'px';
    mcta.style.top = (mline.offsetTop + mline.offsetHeight + (portrait ? 18 : 26)) + 'px';
    ctaBottom = mcta.offsetTop + mcta.offsetHeight;
  }
  function rect(p) {   // where a pack stands: on one floor line, centred on its own axis, sized as in life
    const o = OL[p.k], floor = H * (portrait ? .84 : .86);
    const hgt = Math.min(H * (portrait ? .34 : .44) * Math.min(1.25, Math.pow(p.v, .5)), floor - ctaBottom - 18);
    const ih = hgt / (o.box[3] - o.box[1]), iw = ih * o.w / o.h;
    return { x: W / 2 - o.cx * iw, y: floor - o.box[3] * ih, w: iw, h: ih };
  }

  /* ───────── the hands and the spark ───────── */
  const INTRO_END = 5.2;
  function hands(t) {
    const s = armW / ADAM.w, aw = ADAM.w * s, ah = ADAM.h * s, gw = GOD.w * s, gh = GOD.h * s;
    const cx = W / 2, ty = H * (portrait ? .44 : .46);
    const approach = out3(phase(t, 0, 2.4)), creep = ease(phase(t, 2.4, 2.9));
    let gap = lerp(W * .9, aw * .16, approach); gap = lerp(gap, aw * .055, creep);
    const leave = ease(phase(t, 3.3, 4.6)), drift = REDUCE ? 0 : Math.sin(t * 1.1) * 3;
    const ax = cx - gap / 2 - ADAM.tx * aw - leave * W * .55, ay = ty - ADAM.ty * ah + drift;
    const gx = cx + gap / 2 - GOD.tx * gw + leave * W * .55, gy = ty - GOD.ty * gh - drift;
    const o = introStart ? clamp(phase(t, 0, .7)) * (1 - leave) : 0;
    adam.style.width = aw + 'px'; god.style.width = gw + 'px';
    adam.style.transform = `translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px)`; god.style.transform = `translate(${gx.toFixed(1)}px, ${gy.toFixed(1)}px)`;
    adam.style.opacity = god.style.opacity = o.toFixed(3);
    adam.style.visibility = god.style.visibility = o > .002 ? 'visible' : 'hidden';
    spark.style.transform = `translate(${cx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
    const glow = ease(phase(t, 2.5, 2.9)), burst = phase(t, 2.9, 3.6);
    sparkCore.style.transform = `translate(-50%,-50%) scale(${(glow * .5 + out3(burst) * 2.6).toFixed(3)})`;
    sparkCore.style.opacity = (glow * (1 - phase(t, 3.2, 4))).toFixed(3);
    sparkRing.style.transform = `translate(-50%,-50%) scale(${(out3(burst) * 1.6).toFixed(3)})`;
    sparkRing.style.opacity = (burst > 0 ? (1 - burst) * .9 : 0).toFixed(3);
    flash.style.opacity = (phase(t, 2.88, 2.96) * (1 - phase(t, 2.96, 3.5)) * .55).toFixed(3);
  }

  /* ───────── drawing a pack outline, morphing, filling ───────── */
  const len = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  const d = pts => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L');
  // the two halves of a pack outline (a morphing into b by m) in screen pixels, then scaled by s around c and moved to c + (to - c)
  function halves(a, b, m, ra, rb, s = 1, to = null) {
    const r = { x: lerp(ra.x, rb.x, m), y: lerp(ra.y, rb.y, m), w: lerp(ra.w, rb.w, m), h: lerp(ra.h, rb.h, m) };
    const oa = OL[a.k], ob = OL[b.k], box = [lerp(oa.box[0], ob.box[0], m), lerp(oa.box[1], ob.box[1], m), lerp(oa.box[2], ob.box[2], m), lerp(oa.box[3], ob.box[3], m)];
    const c = [r.x + (box[0] + box[2]) / 2 * r.w, r.y + (box[1] + box[3]) / 2 * r.h], t = to || c;
    const map = pt => [t[0] + (r.x + pt[0] * r.w - c[0]) * s, t[1] + (r.y + pt[1] * r.h - c[1]) * s];
    const side = k => oa[k].map((pt, i) => map([lerp(pt[0], ob[k][i][0], m), lerp(pt[1], ob[k][i][1], m)]));
    return { R: side('R'), L: side('L'), c, size: [(box[2] - box[0]) * r.w, (box[3] - box[1]) * r.h] };
  }
  function stroke(R, L, drawK, lineK, blankK) {
    [[lineR, R], [lineL, L]].forEach(([el, pts]) => { const l = len(pts); el.setAttribute('d', d(pts)); el.style.strokeDasharray = `${l.toFixed(1)} ${l.toFixed(1)}`; el.style.strokeDashoffset = (l * (1 - drawK)).toFixed(1); el.style.opacity = lineK.toFixed(3); });
    blank.setAttribute('d', d(R.concat(L.slice().reverse())) + 'Z'); blank.style.opacity = blankK.toFixed(3);
    const top = R[0], bot = R[R.length - 1];
    axis.setAttribute('d', `M${top[0].toFixed(1)} ${(top[1] - 16).toFixed(1)}L${bot[0].toFixed(1)} ${(bot[1] + 16).toFixed(1)}`); axis.style.opacity = clamp(blankK * 1.5 * drawK).toFixed(3);
  }
  function fillTo(p, r, f, mode = 'rise') {   // the photo rises inside the line from the bottom, or simply appears
    p.wrap.style.visibility = f > .002 ? 'visible' : 'hidden';
    if (f <= .002) return;
    p.wrap.style.width = r.w.toFixed(1) + 'px'; p.wrap.style.transform = `translate(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px)`;
    if (mode === 'fade') { p.wrap.style.opacity = f.toFixed(3); p.img.style.webkitMaskImage = p.img.style.maskImage = 'none'; return; }
    p.wrap.style.opacity = '1';
    const o = OL[p.k], top = o.box[1] * 100, bot = o.box[3] * 100, lvl = bot - (bot - top + 6) * f;
    const mk = f >= 1 ? 'none' : `linear-gradient(to bottom, transparent ${(lvl - 1.5).toFixed(2)}%, #000 ${(lvl + 1.5).toFixed(2)}%)`;
    p.img.style.webkitMaskImage = p.img.style.maskImage = mk;
  }

  /* ───────── the story frame by frame ───────── */
  let capShown = '', sayShown = -1, giantShown = -1;
  function story(u, t) {
    if (!OL) return;
    const jr = rect(JAR), center = [W / 2, H / 2];
    // how far we are inside the jar: 0 outside, 1 the window fills the screen
    const dive = ease(phase(u, ...U.dive)), exit = ease(phase(u, ...U.exit));
    const depth = u < U.exit[0] ? dive : 1 - exit;
    const probe = halves(JAR, JAR, 1, jr, jr), need = 1.25 * Math.max(W / (probe.size[0] * .62), H / (probe.size[1] * .62));
    const S = Math.exp(Math.log(need) * depth), toward = [lerp(probe.c[0], center[0], depth), lerp(probe.c[1], center[1], depth)];
    const hw = halves(JAR, JAR, 1, jr, jr, S, toward);
    // the window: what the pack holds, seen through its outline
    const drawK = introStart ? ease(phase(t, 2.95, 4.3)) : 0, reveal = ease(phase(u, ...U.reveal));
    const inFormats = u >= U.formats[0] - 1, landed = ease(phase(u, U.exit[1] - 3, U.exit[1] + 1));
    const winK = inFormats ? 0 : reveal * (1 - landed);
    win.style.visibility = winK > .002 ? 'visible' : 'hidden';
    if (winK > .002) {
      const poly = hw.R.concat(hw.L.slice().reverse()).map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',');
      win.style.clipPath = win.style.webkitClipPath = `polygon(${poly})`;
      win.style.opacity = winK.toFixed(3);
      // which product is inside, cross-fading as you scroll; on the way out it returns to olives for the jar
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      hw.R.concat(hw.L).forEach(p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
      const rw = Math.max(1, x1 - x0), rh = Math.max(1, y1 - y0), iw = Math.max(rw, rh * 2 / 3) * (1.04 + .08 * depth), ih = iw * 1.5;
      const ix = (x0 + x1) / 2 - iw / 2, iy = (y0 + y1) / 2 - ih / 2;
      const span = (U.inside[1] - U.inside[0]) / INSIDE.length, back = ease(phase(u, U.exit[0], U.exit[0] + 2.5));
      INSIDE.forEach((c, i) => {
        if (!c.el) return;
        const a = U.inside[0] + i * span, inK = i === 0 ? 1 : ease(phase(u, a - 1.5, a + 1.5)), outK = 1 - ease(phase(u, a + span - 1.5, a + span + 1.5));
        let o = u < U.inside[0] ? (i === 0 ? 1 : 0) : inK * outK;
        if (i === 0 && u >= U.exit[0]) o = back;
        c.el.style.opacity = o.toFixed(3); c.el.style.transform = `translate(${ix.toFixed(1)}px, ${iy.toFixed(1)}px) scale(${(iw / 1000).toFixed(5)})`;
      });
      const dark = ease(phase(u, U.inside[0] + 2 * span - 1.5, U.inside[0] + 2 * span + 1.5)) * (1 - back);   // the tunnel happens in the dark
      shade.style.opacity = Math.max(.42 * depth * (1 - phase(u, U.exit[0], U.exit[0] + 6)), .96 * dark).toFixed(3);
    }
    // the outline: drawn by the spark, travels with the window, fades as we go in, returns as we land
    const lineIn = 1 - phase(u, 12, 19), lineBack = phase(u, U.exit[1] - 6, U.exit[1] - 2) * (1 - phase(u, U.exit[1], U.exit[1] + 2));
    if (!inFormats) stroke(hw.R, hw.L, drawK, (drawK > 0 ? 1 : 0) * Math.max(lineIn, lineBack), ease(phase(t, 3.6, 4.6)) * (1 - reveal) * .9);
    // the giant word and the line for each product inside
    const span = (U.inside[1] - U.inside[0]) / INSIDE.length, k = clamp(Math.floor((u - U.inside[0]) / span), 0, INSIDE.length - 1), l = (u - U.inside[0]) / span - k;
    const insideK = depth > .92 && u >= U.inside[0] - 1 && u < U.exit[0] + 2 ? 1 : 0;
    if (k !== giantShown) { giantShown = k; giant.textContent = INSIDE[k].word; }
    const lastOut = 1 - ease(phase(u, U.exit[0] - 2, U.exit[0] + .3));   // gone before the photo turns back to olives for the jar
    const isOrb = !!INSIDE[k].orbit;
    const gIn = isOrb ? insideK * ease(phase(l, .1, .32)) * lastOut : insideK * Math.min(ease(phase(l, 0, .22)), 1 - ease(phase(l, .82, 1)));
    giant.style.opacity = clamp(gIn).toFixed(3);
    // the giant word stays whole and in the middle, with a slow push in while you scroll
    const fit = Math.min(1, W * .9 / Math.max(1, giant.offsetWidth));
    giant.style.transform = `translate(-50%, -50%) scale(${(fit * lerp(.95, 1.02, clamp(l))).toFixed(4)})`;
    if (k !== sayShown) { sayShown = k; say.innerHTML = INSIDE[k].say.split(' ').map(w => `<b>${w}</b>`).join(' '); say.style.top = isOrb ? '73%' : '65%'; }
    const words = say.querySelectorAll('b'), sp = isOrb ? phase(l, .3, .5) : phase(l, .12, .6);
    words.forEach((b, i) => b.style.opacity = (.18 + .82 * clamp(sp * words.length - i)).toFixed(3));
    say.style.opacity = clamp(gIn * 1.2).toFixed(3);
    // the rings of words: they leave the giant word one after another, then keep turning slowly, readable at any scroll speed
    const ringK = isOrb ? insideK * ease(phase(l, .16, .5)) * lastOut : 0;
    orbit.style.visibility = ringK > .003 ? 'visible' : 'hidden';
    if (ringK > .003) {
      const cy = H * .44, base = portrait ? 15 : 24;
      OW.forEach(w => {
        const R = w.ring, n = portrait ? R.nPhone : R.n;
        if (w.i >= n) { w.el.style.opacity = '0'; return; }
        if (w.fs !== base) { w.fs = base; w.el.style.fontSize = (base * (w.el.className === 'm' ? .62 : 1)) + 'px'; w.ow = w.el.offsetWidth; }
        const rx = Math.min(W * (portrait ? R.rxPhone : R.rx), R.max), ry = rx * (portrait ? R.rykPhone : R.ryk);
        const a = w.i / n * Math.PI * 2 + clock * R.w + R.off, z = Math.sin(a);   // z +1 is the nearest point, in front of the word
        const grow = ease(clamp((ringK - w.d * .3) / .7));
        const ex = Math.cos(a) * rx, ey = z * ry, ct = Math.cos(R.tilt), st = Math.sin(R.tilt);
        const near = (z + 1) / 2, sc = (.6 + .5 * near) * R.size * lerp(.4, 1, grow), half = (w.ow || 60) * sc / 2 + 10;
        const X = clamp(W / 2 + (ex * ct - ey * st) * grow, half, W - half), Y = cy + (ex * st + ey * ct) * grow;   // never cut by the screen edge
        w.el.style.transform = `translate(${X.toFixed(1)}px, ${Y.toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
        w.el.style.opacity = ((.24 + .76 * near) * clamp(grow * 1.6) * ringK).toFixed(3);
        w.el.style.zIndex = z > 0 ? '3' : '1';
      });
    }
    // after we land: the real jar, then a tin, a bottle and a bag
    const fseg = (U.formats[1] - U.formats[0]) / (FORMATS.length - 1);
    let cur = JAR, prev = JAR, m = 1, f = landed, fk = 0, fl = 0;
    if (inFormats) {
      fk = clamp(Math.floor((u - U.formats[0]) / fseg), 0, FORMATS.length - 2); fl = (u - U.formats[0]) / fseg - fk;
      const last = fk === FORMATS.length - 2;
      if (u >= U.formats[1]) { prev = cur = FORMATS[FORMATS.length - 1]; m = 1; f = 1; }
      else {
        prev = FORMATS[fk]; cur = FORMATS[fk + 1];
        const drain = 1 - ease(phase(fl, 0, .22)), grow = ease(phase(fl, .5, .92));
        m = ease(phase(fl, .18, .5));
        FORMATS.forEach(p => { if (p !== prev && p !== cur) fillTo(p, rect(p), 0); });
        fillTo(prev, rect(prev), drain); fillTo(cur, rect(cur), grow);
        const hf = halves(prev, cur, m, rect(prev), rect(cur));
        stroke(hf.R, hf.L, 1, 1 - .8 * Math.max(drain, grow), (1 - Math.max(drain, grow)) * .9);
        f = -1;   // handled
      }
    }
    if (f >= 0) {
      FORMATS.forEach(p => { if (p !== cur) fillTo(p, rect(p), 0); });
      fillTo(cur, rect(cur), f, cur === JAR && !inFormats ? 'fade' : 'rise');
      if (inFormats) { const hf = halves(cur, cur, 1, rect(cur), rect(cur)); stroke(hf.R, hf.L, 1, .2, 0); }
    }
    // the caption under the pack
    let cap = '';
    if (u < U.reveal[0]) cap = EL ? 'Γυάλινο βάζο · 720 ml · άδειο' : 'Glass jar · 720 ml · empty';
    else if (u < U.dive[0] + 4) cap = JAR.cap;
    else if (u >= U.exit[1] - 1 && !inFormats) cap = JAR.cap;
    else if (inFormats) cap = u >= U.endLine[0] ? (EL ? 'Κάθε συσκευασία · ό,τι συσκευάζετε' : 'Any pack · anything you pack') : (fl > .45 || u >= U.formats[1] ? cur.cap : prev.cap);
    if (cap !== capShown) { capShown = cap; fname.textContent = cap; }
    const capK = cap ? (u < U.reveal[0] ? ease(phase(t, 4, 4.8)) : 1) * (inFormats && u < U.endLine[0] ? Math.min(clamp(Math.abs(fl - .45) * 8), 1) : 1) : 0;
    fname.style.opacity = capK.toFixed(3);
    fname.classList.toggle('on-dark', depth > .5 && !inFormats);
    document.body.dataset.storyDark = depth > .55 && !inFormats ? '1' : '0';   // the header turns light over the photo
    const fmt = inFormats ? (fl > .45 || u >= U.formats[1] ? cur.f : prev.f) : 'jar';
    mWords.forEach(w => w.classList.toggle('on', (u >= U.mIn[0] && w.dataset.f === fmt) || u >= U.endLine[1]));
  }

  /* ───────── the words at the end ───────── */
  function words(u) {
    const mIn = ease(phase(u, ...U.mIn));
    mline.style.opacity = mIn.toFixed(3); mline.style.transform = `translateY(${((1 - mIn) * 24).toFixed(1)}px)`;
    mont.style.visibility = u > U.mIn[0] ? 'visible' : 'hidden';
    mEnd.style.transform = `translateY(${((1 - ease(phase(u, ...U.endLine))) * 105).toFixed(1)}%)`;
    const cta = ease(phase(u, ...U.cta)); mcta.style.opacity = cta.toFixed(3); mcta.style.transform = `translateY(${((1 - cta) * 18).toFixed(1)}px)`; mcta.style.pointerEvents = cta > .5 ? 'auto' : 'none';
  }

  /* ───────── the loop ───────── */
  const storyEl = $('story'); let u = 0, last = performance.now(), introT = REDUCE ? INTRO_END : 0, introHold = false;
  const target = () => clamp(-storyEl.getBoundingClientRect().top / (storyEl.offsetHeight - innerHeight)) * 100;
  const skipIntro = () => { if (introT < INTRO_END) introT = Math.max(introT, INTRO_END - .01); };
  skip.addEventListener('click', skipIntro);
  addEventListener('wheel', () => { if (introStart && introT > .3) skipIntro(); }, { passive: true });
  addEventListener('touchmove', () => { if (introStart && introT > .3) skipIntro(); }, { passive: true });
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(.05, (now - last) / 1000); last = now; clock += REDUCE ? 0 : dt;
    if (!introHold && introStart && now >= introStart && introT < INTRO_END) introT = Math.min(INTRO_END, introT + dt);
    const tg = target(), step = Math.max(.3, Math.abs(tg - u) * (1 - Math.exp(-dt * 9)));
    u = Math.abs(tg - u) <= step ? tg : u + Math.sign(tg - u) * step;
    if (storyEl.getBoundingClientRect().bottom < 0) return;
    hands(introT);
    story(u, introT);
    const txtIn = ease(phase(introT, 3.9, 4.8)), txt = txtIn * (1 - phase(u, ...U.textOut));
    ocenter.style.opacity = txt.toFixed(3); ocenter.style.transform = `translate(-50%, ${((1 - txtIn) * 18).toFixed(1)}px)`;
    const side = ease(phase(introT, 4.3, 5)) * (1 - phase(u, ...U.sideOut));
    oL.style.opacity = oR.style.opacity = cue.style.opacity = side.toFixed(3);
    skip.style.opacity = introStart && introT < INTRO_END - .2 && introT > .2 ? '1' : '0';
    skip.style.pointerEvents = introT < INTRO_END - .2 ? 'auto' : 'none';
    words(u);
  }

  // no loader: the page is the opening. The hands start as soon as they and the first pack are decoded.
  fetch(BASE + 'images/packs/outlines.json').then(r => r.json()).then(j => { OL = j; }).catch(() => {}).then(() => {
    layout(); addEventListener('resize', layout);
    requestAnimationFrame(frame);
    const imgs = [adam.querySelector('img'), god.querySelector('img'), INSIDE[0].el];
    return Promise.race([Promise.all(imgs.map(im => im.decode ? im.decode().catch(() => {}) : 0)), new Promise(r => setTimeout(r, 3500))]);
  }).then(() => { introStart = introStart || performance.now() + 150; if (document.fonts) document.fonts.ready.then(layout); });
  window.__creation = { seekIntro: (v, hold) => { introT = v; introHold = !!hold; introStart = introStart || performance.now(); }, go: v => { scrollTo(0, v / 100 * (storyEl.offsetHeight - innerHeight)); u = v; }, get u() { return u; }, get t() { return introT; } };
})();
