/* Amphora site: the sections after the opening. Headlines rise word by word, key copy lights up as you
   scroll, the hidden-cost card opens (weeks of email, then the ten real steps of the app), the four steps
   play on an iPad Pro, the film grows, and one jar zooms out to a full container. */
(() => {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), phase = (v, a, b) => clamp((v - a) / (b - a)), lerp = (a, b, t) => a + (b - a) * t;
  const put = (el, k, v) => { if (el['_' + k] !== v) { el['_' + k] = v; el.style[k] = v; } };   // write a style only when it changes
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const prog = el => { const r = el.getBoundingClientRect(), span = r.height - innerHeight; return span > 0 ? clamp(-r.top / span) : clamp((innerHeight - r.top) / (innerHeight + r.height)); };
  const mobile = () => innerWidth <= 820;
  const EL = document.documentElement.lang === 'el', BASE = new URL('../', document.currentScript.src).href;   // Greek page; the folder of this script

  /* headlines: each word rises from a mask */
  document.querySelectorAll('[data-split]').forEach(el => {
    let k = 0; const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) { const frag = document.createDocumentFragment(); n.textContent.split(/(\s+)/).forEach(w => { if (!w) return; if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
        const o = document.createElement('span'), i = document.createElement('i'); o.className = 'rw'; i.textContent = w; i.style.transitionDelay = (k++ * .045) + 's'; o.appendChild(i); frag.appendChild(o); }); n.replaceWith(frag); }
      else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n); });
    walk(el);
  });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .25 });
  document.querySelectorAll('[data-split],[data-split-in]').forEach(el => io.observe(el));

  /* full screen statements: the words light up as you scroll, the giant word drifts across */
  const says = [...document.querySelectorAll('[data-say]')].map(pin => {
    const line = pin.querySelector('.line'), g = pin.querySelector('.ghost'), ghost = g && getComputedStyle(g).display !== 'none' ? g : null;   // the CSS may hide the giant word
    line.innerHTML = line.textContent.trim().split(/\s+/).map(w => `<b>${w}</b>`).join(' ');
    return { pin, ghost, bs: [...line.querySelectorAll('b')] };
  });
  function sayFrame({ pin, ghost, bs }) {
    const p = prog(pin), k = phase(p, .06, .62), n = bs.length;
    bs.forEach((b, i) => put(b, 'opacity', (.14 + .86 * clamp(k * n - i)).toFixed(3)));
    if (!ghost) return;
    const gw = ghost.offsetWidth;
    put(ghost, 'transform', `translate(${lerp(innerWidth * .55, innerWidth * .2 - gw, p).toFixed(1)}px, -50%)`);
  }

  /* key copy lights up word by word with the scroll */
  const scrubs = [...document.querySelectorAll('[data-scrub]')].map(el => { const words = el.textContent.trim().split(/\s+/); el.innerHTML = words.map(w => `<b>${w}</b>`).join(' '); return { el, bs: [...el.querySelectorAll('b')] }; });

  /* ───────── 02 the hidden cost ───────── */
  const costPin = $('costPin'), costCard = $('costCard'), costA = $('costA'), costB = $('costB'), thread = [...document.querySelectorAll('#thread li')], ticks = [...document.querySelectorAll('#ticks li')];
  const tickRail = $('tickRail'), tickTrack = $('tickTrack'), sent = $('sent'), dayN = $('dayN');
  function railFit() {
    const a = ticks[0], b = ticks[ticks.length - 1], ia = a.querySelector('i'), ib = b.querySelector('i');
    const top = a.offsetTop + ia.offsetTop + ia.offsetHeight / 2, bot = b.offsetTop + ib.offsetTop + ib.offsetHeight / 2;
    [tickTrack, tickRail].forEach(el => { el.style.top = top.toFixed(1) + 'px'; el.style.height = Math.max(0, bot - top).toFixed(1) + 'px'; });
  }
  addEventListener('resize', railFit); railFit();
  function cost() {
    if (mobile()) {   // phones: the thread and then the steps, each lighting up as it scrolls in
      costCard.style.clipPath = 'none'; costA.style.opacity = ''; costB.style.opacity = ''; costB.style.transform = '';
      let day = 1, lastOk = -1;
      thread.forEach(li => { const k = ease(clamp((innerHeight * .92 - li.getBoundingClientRect().top) / (innerHeight * .16))); li.style.opacity = k.toFixed(3); li.style.transform = `translateY(${((1 - k) * 14).toFixed(1)}px)`; if (k > .5) day = +li.dataset.d; });
      dayN.textContent = (EL ? 'Ημέρα ' : 'Day ') + day;
      ticks.forEach((li, i) => { const on = li.getBoundingClientRect().top < innerHeight * .8; li.classList.toggle('ok', on); if (on) lastOk = i; });
      tickRail.style.transform = `scaleY(${clamp(lastOk / (ticks.length - 1)).toFixed(4)})`;
      sent.classList.toggle('on', lastOk === ticks.length - 1);
      return;
    }
    const cp = prog(costPin), open = REDUCE ? 1 : ease(phase(cp, 0, .16)), inset = 1 - open, m = false;
    costCard.style.clipPath = `inset(${(inset * 9).toFixed(2)}vh ${(inset * 8).toFixed(2)}vw round ${(28 * inset).toFixed(1)}px)`;
    let day = 1;
    thread.forEach((li, i) => { const k = ease(phase(cp, .1 + i * .042, .15 + i * .042)); li.style.opacity = k.toFixed(3); li.style.transform = `translateY(${((1 - k) * 14).toFixed(1)}px)`; if (k > .5) day = +li.dataset.d; });
    dayN.textContent = (EL ? 'Ημέρα ' : 'Day ') + day;
    if (m) { const sb = ease(phase(cp, .46, .56)); costB.style.transform = `translateY(${((1 - sb) * 102).toFixed(2)}%)`; costA.style.opacity = (1 - .5 * sb).toFixed(3); }
    else { costB.style.transform = ''; costA.style.opacity = (1 - .55 * ease(phase(cp, .44, .54))).toFixed(3); costB.style.opacity = (.35 + .65 * ease(phase(cp, .44, .54))).toFixed(3); }
    const t0 = .54, dt = .036;
    ticks.forEach((li, i) => li.classList.toggle('ok', cp > t0 + i * dt));
    tickRail.style.transform = `scaleY(${clamp((cp - t0) / (dt * (ticks.length - 1))).toFixed(4)})`;
    sent.classList.toggle('on', cp > .9);
  }

  /* ───────── 03 how it works: four steps on an iPad Pro ───────── */
  const howPin = $('howPin'), steps = [...document.querySelectorAll('#steps .step')], screens = [...document.querySelectorAll('#howScr > [data-s]')];
  const howN = $('howN'), howBar = $('howBar'), toast = $('toast'), pdfPage = $('pdfPage'), pdfv = $('pdfv'), ipad = document.querySelector('.ipad');
  const perStep = [0, 1, 2, 3].map(s => screens.filter(el => +el.dataset.s === s));
  let howShown = -1, scrShown = null, rotShown = -1;
  addEventListener('resize', () => { rotShown = -1; });
  function how() {
    const hp = prog(howPin), f = clamp(hp * 4, 0, 3.999), hi = Math.floor(f), local = f - hi;
    if (hi !== howShown) { howShown = hi; steps.forEach((s, i) => s.classList.toggle('on', i === hi)); howN.textContent = String(hi + 1).padStart(2, '0'); }
    const list = perStep[hi], el = list[Math.min(list.length - 1, Math.floor(local * list.length))];
    if (el !== scrShown) { scrShown = el; screens.forEach(s => s.classList.toggle('on', s === el)); }
    toast.classList.toggle('on', hi === 2 && local > .3);
    // step 4: the iPad turns upright and the whole offer shows, page and totals
    const rot = hi === 3 ? (REDUCE ? 1 : ease(phase(local, .1, .48))) : 0;
    if (Math.abs(rot - rotShown) > .0004) { rotShown = rot; orient(rot); }
    howBar.style.transform = `scaleX(${hp.toFixed(4)})`;
  }

  function orient(rot) {
    const Wd = ipad.offsetWidth, scr = pdfv.parentElement, sw = scr.clientWidth, sh = scr.clientHeight;
    const fit = mobile() ? .78 : Math.min(1, (innerHeight - 150) / Wd), phi = rot * Math.PI / 2;
    const sc = lerp(1, fit, rot) * (1 - .18 * Math.sin(Math.PI * rot));   // a little smaller mid turn, so the corners stay on screen
    ipad.style.transform = rot ? `rotate(${(-90 * rot).toFixed(2)}deg) scale(${sc.toFixed(4)})` : '';
    // the shadow keeps falling down while the frame turns
    ipad.style.setProperty('--sh1', `${(-60 * Math.sin(phi)).toFixed(1)}px ${(60 * Math.cos(phi)).toFixed(1)}px`);
    ipad.style.setProperty('--sh2', `${(-22 * Math.sin(phi)).toFixed(1)}px ${(22 * Math.cos(phi)).toFixed(1)}px`);
    // the viewer turns the other way, so the page stays upright, and reflows from landscape to portrait
    const w = lerp(sw, sh, rot), h = lerp(sh, sw, rot), paneH = h * (1 - .072);
    pdfv.style.width = w.toFixed(1) + 'px'; pdfv.style.height = h.toFixed(1) + 'px';
    pdfv.style.transform = `translate(-50%,-50%) rotate(${(90 * rot).toFixed(2)}deg)`;
    pdfPage.style.width = lerp(w * .64, Math.min(w * .9, paneH * .93 / (1590 / 1240)), rot).toFixed(1) + 'px';
    pdfPage.style.top = (paneH * lerp(.05, .035, rot)).toFixed(1) + 'px';
  }

  /* ───────── 04 the film grows towards you ───────── */
  const filmPin = $('filmPin'), filmWrap = $('filmWrap');
  function film() { const g = REDUCE ? 1 : ease(phase(prog(filmPin), 0, .5)); if (!document.fullscreenElement) filmWrap.style.transform = `scale(${(.8 + .2 * g).toFixed(4)})`; }

  /* ───────── 05 from one jar to a full container ─────────
     Five sheets drawn by the app. Between two levels the camera pulls back: the drawing you were looking at
     shrinks into its place inside the next one (the jar into the tray, the tray into the layer, the layer onto
     the pallet, the pallet into the container) while the count climbs 1, 12, 96, 960, 10,560. */
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
  const R = L.map(s => s.replace(/./g, b => b === '0' ? '1' : '0')), G = R.map(s => [...s].reverse().join(''));
  const PAR = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
  function ean13(code) {
    const d = [...code].map(Number), p = PAR[d[0]]; let bits = '101';
    for (let i = 1; i <= 6; i++) bits += (p[i - 1] === 'L' ? L : G)[d[i]];
    bits += '01010'; for (let i = 7; i <= 12; i++) bits += R[d[i]]; bits += '101';
    const q = 11, mw = 1, h = 52, gh = 58, guard = i => i < 3 || (i >= 45 && i < 50) || i >= 92;
    let bars = ''; for (let i = 0; i < bits.length; i++) if (bits[i] === '1') bars += `<rect x="${q + i * mw}" y="0" width="${mw}" height="${guard(i) ? gh : h}"/>`;
    const tx = (s, x) => `<text x="${x}" y="68" text-anchor="middle">${s}</text>`;
    let digits = tx(code[0], 5); for (let i = 0; i < 6; i++) digits += tx(code[1 + i], q + 3 + i * 7 + 3.5); for (let i = 0; i < 6; i++) digits += tx(code[7 + i], q + 50 + i * 7 + 3.5);
    return `<svg viewBox="0 0 ${q + 95 + 7} 71" role="img" aria-label="${EL ? 'Γραμμωτός κώδικας EAN 13' : 'EAN 13 barcode'} ${code}"><g fill="#111">${bars}</g><g font-family="ui-monospace,Menlo,monospace" font-size="9" fill="#111">${digits}</g></svg>`;
  }
  const LV = [
    { n: 1, unit: 'jar', name: 'The jar.', tb: 'Sheet 1 of 5 · Pack and lid', img: 'jar', ar: 1550 / 1180,
      facts: [['Pack', 'Standard glass jar, 720 ml'], ['Closure', 'Twist off, 82 mm, gold, glossy'], ['Fill', '335 g drained · 685 g net'], ['Inside', 'About 78 olives, 181/200']],
      code: ['ean', 'Unit EAN 13', '2001234567893'] },
    { n: 12, unit: 'jars', name: 'The case.', tb: 'Sheet 2 of 5 · Secondary pack', img: 'case', ar: 1941 / 1120, slot: { x: .366, y: .048, w: .265, h: .56 },
      facts: [['Case', 'Display tray, 3 across, 4 deep'], ['Size', '276 × 368 × 141 mm'], ['Cover', 'Film shrinking'], ['Gross', '12.38 kg']],
      code: ['ean', 'Case EAN 13', '2001234567909'] },
    { n: 96, unit: 'jars', name: 'The layer.', tb: 'Sheet 3 of 5 · Pallet layer', img: 'layer', ar: 1656 / 1280, slot: { x: .072, y: .162, w: .186, h: .321 },
      facts: [['Pallet', 'Europallet 80 × 120'], ['Layer', '8 trays in a 4 × 2 grid'], ['Footprint', '1,200 × 800 mm']],
      code: ['text', 'Per layer', '8 trays · 96 jars'] },
    { n: 960, unit: 'jars', name: 'The pallet.', tb: 'Sheet 4 of 5 · Loaded pallet', img: 'pallet', ar: 941 / 1270, slot: { x: .203, y: .254, w: .597, h: .037 },
      facts: [['Layers', '10, limited by pallet weight'], ['Height', '1,554 mm, limit 1,950 mm'], ['Weight', '1,015 kg'], ['Wrap', 'Stretch wrap, labels on two sides']],
      code: ['text', 'Pallet SSCC', '(00) 0 2001234 000000001 7'] },
    { n: 10560, unit: 'jars', name: 'The container.', tb: 'Sheet 5 of 5 · Container plan', img: 'container', ar: 1943 / 2000, slot: { x: .071, y: .065, w: .18, h: .116 },
      facts: [['Container', '20 ft dry, floor layout'], ['Load', '11 pallets · 10,560 jars'], ['Payload', '11.2 t'], ['Status', 'Planning estimate for logistics']],
      code: ['text', 'Ready for the offer', 'One container · 10,560 jars'] },
  ];
  if (EL) [   // the same five sheets, in Greek (Greek numbers: 1.015 kg, 12,38 kg)
    { name: 'Το βάζο.', tb: 'Φύλλο 1 από 5 · Συσκευασία και καπάκι', facts: [['Συσκευασία', 'Τυπικό γυάλινο βάζο, 720 ml'], ['Κλείσιμο', 'Twist off, 82 mm, χρυσό, γυαλιστερό'], ['Γέμισμα', '335 g στραγγισμένο · 685 g καθαρό'], ['Περιεχόμενο', 'Περίπου 78 ελιές, 181/200']], code: ['ean', 'EAN 13 μονάδας', '2001234567893'] },
    { name: 'Το κιβώτιο.', tb: 'Φύλλο 2 από 5 · Δευτερογενής συσκευασία', facts: [['Κιβώτιο', 'Δίσκος display, 3 σε πλάτος, 4 σε βάθος'], ['Διαστάσεις', '276 × 368 × 141 mm'], ['Κάλυψη', 'Θερμοσυρρικνούμενο φιλμ'], ['Μικτό βάρος', '12,38 kg']], code: ['ean', 'EAN 13 κιβωτίου', '2001234567909'] },
    { name: 'Η στρώση.', tb: 'Φύλλο 3 από 5 · Στρώση παλέτας', facts: [['Παλέτα', 'Europallet 80 × 120'], ['Στρώση', '8 δίσκοι σε κάνναβο 4 × 2'], ['Αποτύπωμα', '1.200 × 800 mm']], code: ['text', 'Ανά στρώση', '8 δίσκοι · 96 βάζα'] },
    { name: 'Η παλέτα.', tb: 'Φύλλο 4 από 5 · Φορτωμένη παλέτα', facts: [['Στρώσεις', '10, με όριο το βάρος της παλέτας'], ['Ύψος', '1.554 mm, όριο 1.950 mm'], ['Βάρος', '1.015 kg'], ['Περιτύλιξη', 'Stretch φιλμ, ετικέτες σε δύο πλευρές']], code: ['text', 'SSCC παλέτας', '(00) 0 2001234 000000001 7'] },
    { name: 'Το κοντέινερ.', tb: 'Φύλλο 5 από 5 · Σχέδιο κοντέινερ', facts: [['Κοντέινερ', '20 ft dry, φόρτωση στο δάπεδο'], ['Φορτίο', '11 παλέτες · 10.560 βάζα'], ['Ωφέλιμο φορτίο', '11,2 t'], ['Κατάσταση', 'Εκτίμηση σχεδιασμού για την εφοδιαστική']], code: ['text', 'Έτοιμο για την προσφορά', 'Ένα κοντέινερ · 10.560 βάζα'] },
  ].forEach((t, i) => Object.assign(LV[i], t));
  const lvPin = $('lvPin'), stage = $('lvStage'), lvNum = $('lvNum'), lvUnit = $('lvUnit'), lvName = $('lvName'), lvFacts = $('lvFacts'), lvCode = $('lvCode'), lvTb = $('lvTb');
  const lvSteps = [...document.querySelectorAll('#lvSteps li')], lvText = [lvName, lvFacts, lvCode];
  LV.forEach(l => { l.el = Object.assign(document.createElement('img'), { src: `${BASE}images/levels/${l.img}.webp`, alt: `${l.name.replace('.', '')}, ${EL ? 'σχέδιο του Amphora' : 'drawn by Amphora'}`, draggable: false, loading: 'lazy' }); stage.appendChild(l.el); });
  let lvShown = -1, SW = 1, SH = 1;
  const fit = l => { const pad = .07, bw = SW * (1 - 2 * pad), bh = SH * (1 - 2 * pad); const w = Math.min(bw, bh * l.ar), h = w / l.ar; return { x: (SW - w) / 2, y: (SH - h) / 2, w, h }; };
  const place = (l, r, o) => { l.el.style.width = r.w.toFixed(1) + 'px'; l.el.style.transform = `translate(${r.x.toFixed(1)}px, ${r.y.toFixed(1)}px)`; l.el.style.opacity = o.toFixed(3); l.el.style.visibility = o > .003 ? 'visible' : 'hidden'; };
  function showText(i) {
    const l = LV[i];
    lvName.textContent = l.name; lvTb.textContent = l.tb;
    lvFacts.innerHTML = l.facts.map(([k, v]) => `<li><em>${k}</em><span>${v}</span></li>`).join('');
    const [type, label, v] = l.code;
    lvCode.innerHTML = type === 'ean' ? `${ean13(v)}<p class="mono">${label}<b>${v}</b></p>` : `<p class="mono">${label}<b>${v}</b></p>`;
    lvSteps.forEach((s, k) => s.classList.toggle('on', k === i));
  }
  function levels() {
    SW = stage.clientWidth; SH = stage.clientHeight; if (!SW) return;
    const p = prog(lvPin), f = clamp(p / .86) * 4, i = Math.min(3, Math.floor(f)), frac = f - i;
    const e = f >= 4 ? 1 : REDUCE ? (frac > .5 ? 1 : 0) : ease(phase(frac, .42, 1));
    const cur = f >= 4 ? 4 : i, nx = f >= 4 ? 4 : i + 1;
    LV.forEach((l, k) => { if (k !== cur && k !== nx) place(l, fit(l), 0); });
    if (cur === nx || e <= 0) { place(LV[cur], fit(LV[cur]), 1); if (cur !== nx) place(LV[nx], fit(LV[nx]), 0); }
    else {
      const a = LV[cur], b = LV[nx], P = fit(a), N = fit(b);
      const S = { x: N.x + b.slot.x * N.w, y: N.y + b.slot.y * N.h, w: b.slot.w * N.w, h: b.slot.h * N.h }, Sc = { x: S.x + S.w / 2, y: S.y + S.h / 2 };
      const z = P.w / S.w, s = Math.exp(lerp(Math.log(z), 0, e)), Q = { x: lerp(P.x + P.w / 2, Sc.x, e), y: lerp(P.y + P.h / 2, Sc.y, e) };
      const cam = r => ({ x: (r.x - Sc.x) * s + Q.x, y: (r.y - Sc.y) * s + Q.y, w: r.w * s, h: r.h * s });
      const inSlot = { x: Sc.x - S.w / 2, y: Sc.y - S.w / a.ar / 2, w: S.w, h: S.w / a.ar };
      place(b, cam(N), ease(phase(e, 0, .38)));
      place(a, cam(inSlot), 1 - ease(phase(e, .3, .78)));
    }
    // the count climbs with the camera, the words swap at the turn
    const n = cur === nx ? LV[cur].n : Math.round(lerp(LV[cur].n, LV[nx].n, ease(phase(e, .25, .9))));
    lvNum.textContent = n.toLocaleString(EL ? 'el-GR' : 'en-US');
    lvUnit.textContent = EL ? (n === 1 ? 'βάζο' : 'βάζα') : (n === 1 ? 'jar' : 'jars');
    const showing = e < .5 ? cur : nx;
    if (showing !== lvShown) { lvShown = showing; showText(showing); }
    const dip = cur === nx ? 1 : clamp(Math.abs(e - .5) * 7);
    lvText.forEach(el => { el.style.opacity = dip.toFixed(3); el.style.transform = `translateY(${((1 - dip) * (e < .5 ? -8 : 8)).toFixed(1)}px)`; });
  }

  /* ───────── all of it: the real specification, read section by section ─────────
     The sheet is captured at 3x in tiles. A camera frames one section at a time so it can be read, moving
     between them as you scroll; the whole page stays visible beside it, with the part you are reading marked. */
  const spPin = $('specSec'), spView = $('spView'), spDoc = $('spDoc'), spBox = $('spBox'), spStops = [...document.querySelectorAll('#spStops li')];
  const SHEET = { w: 896, h: 4632, tiles: [[0, 600], [600, 600], [1200, 600], [1800, 600], [2400, 600], [3000, 600], [3600, 600], [4200, 431.6]] };
  const STOPS = [   // in px of the sheet, 896 wide
    { x: 16, y: 0, w: 864, h: 480 },      // at a glance
    { x: 451, y: 545, w: 420, h: 410 },   // product
    { x: 451, y: 1152, w: 420, h: 432 },  // pack and weights
    { x: 26, y: 1572, w: 420, h: 330 },   // closure
    { x: 451, y: 1905, w: 420, h: 450 },  // pallet
    { x: 26, y: 2352, w: 420, h: 560 },   // loading and codes
    { x: 26, y: 3195, w: 846, h: 1420 },  // drawings
  ];
  const SP_END = .92, spBeats = STOPS.map((_, i) => i === STOPS.length - 1 ? SP_END : (i + .12) / (STOPS.length - 1) * SP_END);
  let spLoaded = false, spShown = -1;
  function specLoad() {
    if (spLoaded) return; spLoaded = true;
    SHEET.tiles.forEach(([y, h], i) => { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = `${BASE}images/spec/sheet-${i}.webp`; im.style.top = y + 'px'; im.style.height = h + 'px'; spDoc.appendChild(im); });
  }
  const frame0 = (r, Vw, Vh) => { const pad = Math.min(Vw, Vh) * (mobile() ? .02 : .045); return { s: Math.min((Vw - 2 * pad) / r.w, (Vh - 2 * pad) / r.h), cx: r.x + r.w / 2, cy: r.y + r.h / 2 }; };
  const spMini = spBox.parentElement;
  function spec() {
    specLoad();
    const reserve = mobile() ? 0 : spMini.offsetWidth + 22, Vw = spView.clientWidth - reserve, Vh = spView.clientHeight, n = STOPS.length;   // keep the page clear of the minimap
    const ST = mobile() ? STOPS.map((r, k) => k === 5 ? { x: 26, y: 2652, w: 420, h: 262 } : r) : STOPS;   // phones: the codes alone, so they can be read
    const p = prog(spPin), f = clamp(p / SP_END) * (n - 1), i = Math.min(n - 2, Math.floor(f)), fr = f - i;
    const e = f >= n - 1 ? 1 : REDUCE ? (fr > .5 ? 1 : 0) : ease(phase(fr, .35, 1));
    const A = frame0(ST[i], Vw, Vh), B = frame0(ST[i + 1], Vw, Vh);
    const s = Math.exp(lerp(Math.log(A.s), Math.log(B.s), e)), cx = lerp(A.cx, B.cx, e), cy = lerp(A.cy, B.cy, e);
    const tx = Vw / 2 - cx * s, ty = Vh / 2 - cy * s;
    spDoc.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${s.toFixed(4)})`;
    const mk = spBox.parentElement.clientWidth / SHEET.w, x0 = Math.max(0, -tx / s), y0 = Math.max(0, -ty / s);
    spBox.style.left = (x0 * mk).toFixed(1) + 'px'; spBox.style.top = (y0 * mk).toFixed(1) + 'px';
    spBox.style.width = (Math.min(SHEET.w - x0, (Vw + reserve) / s) * mk).toFixed(1) + 'px'; spBox.style.height = (Math.min(SHEET.h - y0, Vh / s) * mk).toFixed(1) + 'px';
    const cur = f >= n - 1 ? n - 1 : e > .5 ? i + 1 : i;
    if (cur !== spShown) { spShown = cur; spStops.forEach((li, k) => li.classList.toggle('on', k === cur)); }
  }
  spStops.forEach((li, k) => li.addEventListener('click', () => { const top = spPin.getBoundingClientRect().top + scrollY; glide(top + spBeats[k] * (spPin.offsetHeight - innerHeight)); }));

  /* one flick, one step: in the opening, in "from one jar to a container" and in the spec sheet the scroll moves from
     one composed moment to the next at a steady pace, however hard you flick. A whole gesture counts once, the
     trackpad's momentum included: its tail is swallowed, so it never takes a second step nor creeps off the moment.
     A flick that starts outside and carries in is left to run, then settles on the nearest moment. Outside them the
     page scrolls freely. */
  const STEPS = [
    { el: $('story'), unit: 100, beats: [0, 28.6, 39.6, 51.4, 67, 74.9, 82.2, 96] },
    { el: $('lvPin'), unit: 1, beats: [.043, .258, .473, .688, .93] },
    { el: $('specSec'), unit: 1, beats: spBeats },
  ].filter(s => s.el);
  let stepping = false, queued = 0, touchY = null, touchStep = null, settleTimer = 0, lastMove = 0;
  const gest = { last: 0, start: 0, abs: 0, peak: 0, dir: 0, mode: '', fromZone: false };   // the wheel gesture in progress: 'step' (ours) or 'free' (the page's own)
  const span = s => { const top = s.el.getBoundingClientRect().top + scrollY; return { a: top, b: top + s.el.offsetHeight - innerHeight }; };
  function where() { for (const s of STEPS) { const { a, b } = span(s); if (scrollY >= a - 4 && scrollY <= b + 4) return { s, a, b, p: (scrollY - a) / Math.max(1, b - a) * s.unit }; } return null; }
  function target(w, dir) { const bs = w.s.beats; return dir > 0 ? bs.find(x => x > w.p + w.s.unit * .004) : [...bs].reverse().find(x => x < w.p - w.s.unit * .004); }
  function glide(y) {
    const y0 = scrollY, t0 = performance.now(), D = Math.min(1500, Math.max(420, 120 + Math.abs(y - y0) * .85));   // a steady pace, about 1.2 px per ms
    stepping = true; clearTimeout(settleTimer);
    (function f(now) { const k = Math.min(1, (now - t0) / D); scrollTo(0, y0 + (y - y0) * ease(k)); if (k < 1) requestAnimationFrame(f); else { stepping = false; if (queued) { const d = queued; queued = 0; step(d); } } })(t0);
  }
  const demoOpen = () => document.documentElement.classList.contains('demo-lock');
  function step(dir) {
    const w = where(); if (!w) return false;
    const to = target(w, dir); if (to === undefined) return false;   // past the last moment: let the page go on
    glide(w.a + to / w.s.unit * (w.b - w.a)); return true;
  }
  // after a free scroll comes to rest inside a stepped scene, it glides to the nearest moment
  addEventListener('scroll', () => { lastMove = performance.now(); }, { passive: true });
  function settleLater() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(function check() {
      if (stepping || touchY !== null) return;
      const now = performance.now(); if (now - lastMove < 120 || now - gest.last < 120) { settleTimer = setTimeout(check, 80); return; }
      const w = where(); if (!w) return;
      const near = w.s.beats.reduce((a, b) => Math.abs(b - w.p) < Math.abs(a - w.p) ? b : a), y = w.a + near / w.s.unit * (w.b - w.a);
      if (Math.abs(y - scrollY) > 2) glide(y);
    }, 160);
  }
  addEventListener('wheel', e => {
    if (REDUCE || demoOpen()) return;
    const now = performance.now(), a = Math.abs(e.deltaY), dir = Math.sign(e.deltaY);
    // a new gesture: after a pause, on a change of direction, or a fresh push once the last one's momentum has faded
    const fresh = now - gest.last > 180 || (dir && gest.dir && dir !== gest.dir) || (now - gest.start > 300 && gest.abs < gest.peak * .45 && a > gest.abs * 1.8 && a >= 10);
    gest.last = now;
    if (fresh) { gest.start = now; gest.dir = dir; gest.mode = ''; gest.peak = 0; clearTimeout(settleTimer); }
    if (a) { gest.abs = a; gest.peak = Math.max(gest.peak, a); if (!gest.dir) gest.dir = dir; }
    if (gest.mode === 'step') { e.preventDefault(); return; }   // the rest of a gesture that already took its step, momentum included
    const w = where();
    if (gest.mode === 'free') { if (w && !gest.fromZone) settleLater(); return; }
    if (stepping) { gest.mode = 'step'; if (dir) queued = dir; e.preventDefault(); return; }   // a new flick during a glide: its step follows
    if (w && a < 3) { e.preventDefault(); return; }   // too small to decide yet
    if (w && step(dir)) { gest.mode = 'step'; e.preventDefault(); return; }
    gest.mode = 'free'; gest.fromZone = !!w;   // outside, or leaving a scene past its last moment
  }, { passive: false });
  addEventListener('touchstart', e => { touchY = e.touches[0].clientY; touchStep = where() ? true : null; clearTimeout(settleTimer); }, { passive: true });
  addEventListener('touchmove', e => {
    if (REDUCE || touchY === null || !touchStep || demoOpen()) return;
    const w = where(); if (!w) return;
    const dir = Math.sign(touchY - e.touches[0].clientY);
    if (stepping || (dir && target(w, dir) !== undefined)) e.preventDefault();
  }, { passive: false });
  addEventListener('touchend', e => {
    if (touchY === null || demoOpen()) { touchY = null; return; }
    const dy = touchY - e.changedTouches[0].clientY; touchY = null;
    if (!touchStep) { if (!REDUCE) settleLater(); return; }   // a swipe from outside: its momentum runs, then settles
    if (!stepping && Math.abs(dy) > 30) step(Math.sign(dy));
  }, { passive: true });
  addEventListener('keydown', e => {
    if (demoOpen() || /input|textarea|select/i.test(document.activeElement.tagName) || stepping && /Arrow|Page| /.test(e.key)) { if (stepping) e.preventDefault(); return; }
    const dir = /ArrowDown|PageDown|^ $/.test(e.key) ? 1 : /ArrowUp|PageUp/.test(e.key) ? -1 : 0;
    if (dir && where() && step(dir)) e.preventDefault();
  });

  /* book a demo: every demo link opens the sheet; in the artifact preview the form says it cannot send */
  const demo = $('demo'), demoForm = $('demoForm'), demoWant = $('demoWant');
  const WANT = EL ? {
    demo: { k: 'Κλείστε demo', h: 'Δείτε το Amphora με ένα από <span>τα δικά σας προϊόντα.</span>', s: 'Amphora demo request · GR', go: 'Ζητήστε demo' },
    pilot: { k: 'Πιλοτική εφαρμογή', h: 'Δοκιμάστε το Amphora σε μία από <span>τις γραμμές σας.</span>', s: 'Amphora pilot request · GR', go: 'Ζητήστε πιλοτική εφαρμογή' },
    licence: { k: 'Άδεια χρήσης', h: 'Το Amphora σε όλη <span>τη γκάμα σας.</span>', s: 'Amphora licence enquiry · GR', go: 'Συζητήστε την άδεια χρήσης' },
  } : {
    demo: { k: 'Book a demo', h: 'See Amphora with one of <span>your own products.</span>', s: 'Amphora demo request', go: 'Request a demo' },
    pilot: { k: 'Start a pilot', h: 'Run Amphora on one of <span>your product lines.</span>', s: 'Amphora pilot request', go: 'Request a pilot' },
    licence: { k: 'Licence Amphora', h: 'Run Amphora across <span>your whole range.</span>', s: 'Amphora licence enquiry', go: 'Talk about a licence' },
  };
  function openDemo(kind) {
    const w = WANT[kind] || WANT.demo; demoWant.value = WANT[kind] ? kind : 'demo';
    $('demoKind').textContent = w.k; $('demoTitle').innerHTML = w.h; $('demoSubject').value = w.s; $('demoGo').lastChild.textContent = w.go;
    demo.classList.add('open'); document.documentElement.classList.add('demo-lock');
    setTimeout(() => { const f = demo.querySelector('input[name=name]'); f && f.focus({ preventScroll: true }); }, 380);
  }
  function closeDemo() { demo.classList.remove('open'); document.documentElement.classList.remove('demo-lock'); }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-demo]'); if (a) { e.preventDefault(); openDemo(a.dataset.want); return; }
    if (e.target.closest('[data-close]') || e.target === demo) closeDemo();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && demo.classList.contains('open')) closeDemo(); });
  if (location.hash === '#demo') openDemo();
  demoForm.addEventListener('submit', e => { if (window.__PREVIEW) { e.preventDefault(); $('demoNote').textContent = EL ? 'Αυτή είναι προεπισκόπηση. Στον κανονικό ιστότοπο το αίτημα πηγαίνει στην ομάδα μας.' : 'This is a preview. On the live site this sends your request to our team.'; } });

  /* pinned scenes: where the CSS holds them with a scroll-linked animation (not sticky), each hold starts when its
     section reaches the top and ends when the scene's foot meets the section's foot; this measures those points */
  if (CSS.supports('animation-timeline', 'scroll()')) {
    const scenes = [...document.querySelectorAll('.view, .stick')];
    const measure = () => scenes.forEach(el => {
      if (getComputedStyle(el).animationName === 'none') return;
      const sec = el.parentElement, top = sec.getBoundingClientRect().top + scrollY + el.offsetTop, travel = Math.max(0, sec.offsetHeight - el.offsetTop - el.offsetHeight);
      el.style.setProperty('--pin-a', top.toFixed(1) + 'px'); el.style.setProperty('--pin-b', (top + travel).toFixed(1) + 'px'); el.style.setProperty('--pin-t', travel.toFixed(1) + 'px');
    });
    measure(); addEventListener('resize', measure); addEventListener('load', measure);
    if (document.fonts) document.fonts.ready.then(measure);
    new ResizeObserver(measure).observe(document.body);
  }

  /* behind Safari's bars on iPhone the page just above and below the screen shows through; in the opening that is the
     opening's own ground, so while the photo fills the scene the ground takes the photo's colour (its median,
     cross-faded and darkened as the photos are), otherwise paper. The scene is see-through around the photo, so the
     colour switches at once, never with a fade. */
  const story0 = $('story'), win = $('win'), winShade = $('winShade');
  const PAPER = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * clamp(k));
  const med = new WeakMap();
  const tone = img => { if (!med.has(img) && img.complete && img.naturalWidth) { const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data, ch = [[], [], []]; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) ch[k].push(d[i + k]); med.set(img, ch.map(v => v.sort((p, q) => p - q)[v.length >> 1])); }
    return med.get(img); };
  const inPoly = (x, y, p) => { let ins = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > y) !== (p[j + 1] > y) && x < (p[j] - p[i]) * (y - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) ins = !ins; return ins; };
  // each photo's colour is worked out ahead, while the page is idle, so it never costs a frame during a scroll
  const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
  addEventListener('load', () => idle(() => { if (win) win.querySelectorAll('img.mac').forEach(img => img.decode ? img.decode().then(() => idle(() => tone(img))).catch(() => {}) : tone(img)); }));
  let groundKey = '';
  function ground() {
    if (!story0 || !win) return;
    const r = story0.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
    const cp = win.style.clipPath || '', key = `${win.style.visibility}|${win.style.opacity}|${winShade.style.opacity}|${cp.length}|${cp.slice(0, 60)}|${[...win.querySelectorAll('img.mac')].map(i => i.style.opacity).join()}`;
    if (key === groundKey) return; groundKey = key;   // nothing in the window changed since the last frame
    let g = PAPER;
    if (win.style.visibility === 'visible') {
      const w = win.getBoundingClientRect(), pts = (cp.match(/-?[\d.]+/g) || []).map(Number);
      if ([[.02, .01], [.5, .01], [.98, .01], [.02, .99], [.5, .99], [.98, .99]].every(([fx, fy]) => inPoly(w.width * fx, w.height * fy, pts))) {
        let c = [21, 17, 14];   // the window's own ground, #15110e
        win.querySelectorAll('img.mac').forEach(img => { const o = +img.style.opacity || 0, a = o > 0 && tone(img); if (a) c = mix(c, a, o); });
        g = hex(mix(rgb(PAPER), mix(c, [18, 14, 11], +winShade.style.opacity || 0), +(win.style.opacity || 1)));
      }
    }
    put(story0, 'backgroundColor', g);
  }

  /* the header follows the tone of whatever is under it */
  const top = $('top'), story = $('story');
  const isDark = el => { for (let n = el; n && n !== document.body; n = n.parentElement) { if (n.classList && (n.classList.contains('dk') || n.classList.contains('film-pin') || n.classList.contains('foot') || n.classList.contains('cost-card'))) return true; if (n === story) return document.body.dataset.storyDark === '1'; } return false; };
  function frame() {
    requestAnimationFrame(frame);
    const under = document.elementsFromPoint(innerWidth / 2, 36).find(n => !top.contains(n)); top.classList.toggle('on-dark', !!under && isDark(under));
    ground();
    scrubs.forEach(({ el, bs }) => { const r = el.getBoundingClientRect(); if (r.bottom < -innerHeight * .5 || r.top > innerHeight * 1.5) return;
      const p = phase(innerHeight - r.top, innerHeight * .1, innerHeight * .1 + r.height + innerHeight * .45), n = bs.length;
      bs.forEach((b, i) => put(b, 'opacity', (.16 + .84 * clamp(p * n - i)).toFixed(3))); });
    const near = el => { const r = el.getBoundingClientRect(); return r.bottom > -innerHeight && r.top < innerHeight * 2; };
    says.forEach(s => { if (near(s.pin)) sayFrame(s); });
    if (near(costPin)) cost();
    if (near(howPin)) how();
    if (near(filmPin)) film();
    if (near(lvPin)) levels();
    if (near(spPin)) spec();
  }
  requestAnimationFrame(frame);
  window.__site = { levels, how, cost };
})();
