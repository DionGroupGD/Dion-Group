/* Test copy only ("Match"): Safari on iPhone (iOS 26) colours its bars from the background colour of pinned elements
   at the screen edges. Each pinned scene paints its section colour (CSS); this keeps the opening's scene colour on
   the photo while the photo fills the screen, and the page background on the colour at the bottom edge. */
(() => {
  const $ = id => document.getElementById(id);
  const view = $('view'), win = $('win'), shade = $('winShade'), story = $('story'), top = $('top'), demo = $('demo');
  const css = getComputedStyle(document.documentElement), PAPER = css.getPropertyValue('--bg').trim(), DARK = css.getPropertyValue('--dark').trim();
  const meta = document.querySelector('meta[name="theme-color"]');
  const clamp = v => Math.min(1, Math.max(0, v)), rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''), mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * clamp(k));
  const med = new WeakMap();
  const tone = img => { if (!med.has(img) && img.complete && img.naturalWidth) { const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data, ch = [[], [], []]; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) ch[k].push(d[i + k]); med.set(img, ch.map(v => v.sort((p, q) => p - q)[v.length >> 1])); }
    return med.get(img); };
  const inPoly = (x, y, s) => { const p = (s.match(/-?[\d.]+/g) || []).map(Number); let ins = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > y) !== (p[j + 1] > y) && x < (p[j] - p[i]) * (y - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) ins = !ins; return ins; };
  // the photo window fills the whole scene: check the scene's corners and edge midpoints
  const fills = () => { if (!win || win.style.visibility !== 'visible') return false; const r = win.getBoundingClientRect(), cp = win.style.clipPath || '';
    return [[.02, .02], [.5, .01], [.98, .02], [.02, .98], [.5, .99], [.98, .98]].every(([fx, fy]) => inPoly(r.width * fx, r.height * fy, cp)); };
  const photo = () => { let c = [21, 17, 14]; win.querySelectorAll('img.mac').forEach(img => { const o = +img.style.opacity || 0, a = o > 0 && tone(img); if (a) c = mix(c, a, o); });
    c = mix(c, [18, 14, 11], +shade.style.opacity || 0); return hex(mix(rgb(PAPER), c, +(win.style.opacity || 1))); };
  const dark = el => { for (let n = el; n && n !== document.body; n = n.parentElement) if (n.classList && /\b(dk|film-pin|foot|cost-card)\b/.test(n.className)) return true; return false; };
  let scene = '', bottom = '', head = '';
  function frame() {
    requestAnimationFrame(frame);
    const s = fills() ? photo() : PAPER;
    if (s !== scene) { scene = s; view.style.backgroundColor = s; }
    const under = y => document.elementsFromPoint(innerWidth / 2, y).find(n => !top.contains(n) && !demo.contains(n));
    const at = y => { const n = under(y); return !n ? PAPER : story.contains(n) ? (y < view.getBoundingClientRect().bottom ? scene : PAPER) : dark(n) ? DARK : PAPER; };
    const b = at(innerHeight - 2), t = at(1);
    if (b !== bottom) { bottom = b; document.documentElement.style.backgroundColor = document.body.style.backgroundColor = b; }
    if (t !== head) { head = t; if (meta) meta.content = t; }
  }
  requestAnimationFrame(frame);
})();
