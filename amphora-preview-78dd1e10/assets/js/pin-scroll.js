/* Test copy only ("scroll-linked pins"): the pinned scenes are not sticky. Each sits at the top of its section and a
   scroll-driven animation (run by the browser, in step with the scroll) moves it down exactly as far as the page
   scrolls, from the moment its section reaches the top until the scene's foot meets the section's foot: what sticky
   does, without a pinned element at the screen edge for Safari to take its bar colour from. This measures where
   each hold starts and ends; the CSS does the moving. */
(() => {
  if (!CSS.supports('animation-timeline', 'scroll()')) return;
  const scenes = [...document.querySelectorAll('.view, .stick')];
  function measure() {
    scenes.forEach(el => {
      if (getComputedStyle(el).animationName === 'none') { el.style.removeProperty('--pin-a'); return; }
      const sec = el.parentElement, top = sec.getBoundingClientRect().top + scrollY + el.offsetTop;
      const travel = Math.max(0, sec.offsetHeight - el.offsetTop - el.offsetHeight);
      el.style.setProperty('--pin-a', top.toFixed(1) + 'px');
      el.style.setProperty('--pin-b', (top + travel).toFixed(1) + 'px');
      el.style.setProperty('--pin-t', travel.toFixed(1) + 'px');
    });
  }
  measure();
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if (document.fonts) document.fonts.ready.then(measure);
  new ResizeObserver(measure).observe(document.body);
})();

/* Behind Safari's bars the page just above and below the screen shows through. In the opening that is the opening's
   own ground, so while the photo fills the scene the ground takes the photo's colour (its median, cross-faded and
   darkened as the photos are); otherwise it stays paper. The scene is see-through around the photo, so the colour
   switches at once, never with a fade. */
(() => {
  const $ = id => document.getElementById(id);
  const story = $('story'), win = $('win'), shade = $('winShade');
  if (!story || !win) return;
  const PAPER = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  const clamp = v => Math.min(1, Math.max(0, v)), rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join(''), mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * clamp(k));
  const med = new WeakMap();
  const tone = img => { if (!med.has(img) && img.complete && img.naturalWidth) { const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data, ch = [[], [], []]; for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) ch[k].push(d[i + k]); med.set(img, ch.map(v => v.sort((p, q) => p - q)[v.length >> 1])); }
    return med.get(img); };
  const inPoly = (x, y, s) => { const p = (s.match(/-?[\d.]+/g) || []).map(Number); let ins = false;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) if ((p[i + 1] > y) !== (p[j + 1] > y) && x < (p[j] - p[i]) * (y - p[i + 1]) / (p[j + 1] - p[i + 1]) + p[i]) ins = !ins; return ins; };
  const fills = () => { if (win.style.visibility !== 'visible') return false; const r = win.getBoundingClientRect(), cp = win.style.clipPath || '';
    return [[.02, .01], [.5, .01], [.98, .01], [.02, .99], [.5, .99], [.98, .99]].every(([fx, fy]) => inPoly(r.width * fx, r.height * fy, cp)); };
  const photo = () => { let c = [21, 17, 14]; win.querySelectorAll('img.mac').forEach(img => { const o = +img.style.opacity || 0, a = o > 0 && tone(img); if (a) c = mix(c, a, o); });
    c = mix(c, [18, 14, 11], +shade.style.opacity || 0); return hex(mix(rgb(PAPER), c, +(win.style.opacity || 1))); };
  let shown = '';
  (function frame() {
    requestAnimationFrame(frame);
    const r = story.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return;
    const g = fills() ? photo() : PAPER;
    if (g !== shown) { shown = g; story.style.backgroundColor = g; }
  })();
})();
