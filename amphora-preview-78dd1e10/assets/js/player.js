/* Amphora film player, the way Apple does it: under the film only a pill of chapter dots (the current
   one stretches and fills as it plays, click any dot to jump) and a round play and pause button.
   Sound is left to the visitor's device. Keyboard: space or K plays and pauses, left and right step
   five seconds, comma and full stop jump chapters. */
(() => {
  const $ = id => document.getElementById(id);
  const EL = document.documentElement.lang === 'el', BASE = new URL('../', document.currentScript.src).href, FILM = BASE + (EL ? 'video/el/' : 'video/en/');
  const box = $('player'); if (!box) return;
  const v = $('pv'), big = $('pBig'), cap = $('pCap'), dotsEl = $('pDots'), playIco = $('pPlayIco'), playBtn = $('pPlay');
  const ICON = { play: '<path d="M8 5v14l11-7z"/>', pause: '<path d="M7 5h4v14H7zm6 0h4v14h-4z"/>' };
  const clamp01 = x => Math.min(1, Math.max(0, x));
  let chapters = [], cues = [], dur = 100, dots = [], shownCh = -1;

  fetch(FILM + 'chapters.json', { cache: 'no-cache' }).then(r => r.json()).then(j => {
    chapters = j.chapters; dur = j.duration; drawDots(); update();
    // a film with a voice-over speaks its lines; a film with music only shows them as captions, drawn by the page to match the design
    if (j.voice) return;
    return fetch(FILM + (EL ? 'amphora-promo.el.vtt' : 'amphora-promo.en.vtt')).then(r => r.text()).then(t => {
      const sec = s => { const p = s.split(':').map(Number); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
      t.split(/\n\n+/).forEach(b => { const m = b.match(/([\d:.]+)\s*-->\s*([\d:.]+)\s*\n([\s\S]+)/); if (m) cues.push({ a: sec(m[1]), b: sec(m[2]), text: m[3].trim() }); });
    });
  }).catch(() => {});

  const chapterAt = t => { let i = 0; chapters.forEach((c, k) => { if (t >= c.start - .05) i = k; }); return i; };
  const chEnd = i => i + 1 < chapters.length ? chapters[i + 1].start : (v.duration || dur);
  function drawDots() {
    dotsEl.innerHTML = chapters.map((c, i) => `<button class="p-dot" type="button" aria-label="${EL ? 'Κεφάλαιο' : 'Chapter'} ${i + 1}: ${c.title}"><i><b></b></i><em>${c.title}</em></button>`).join('');
    dots = [...dotsEl.querySelectorAll('.p-dot')];
    dots.forEach((d, i) => d.addEventListener('click', () => { go(chapters[i].start + .02); if (!box.classList.contains('started')) start(); }));
    shownCh = -1;
  }
  function update() {
    const t = v.currentTime || 0;
    if (chapters.length) {
      const i = chapterAt(t);
      if (i !== shownCh) { shownCh = i; dots.forEach((el, k) => el.classList.toggle('on', k === i)); }
      const k = clamp01((t - chapters[i].start) / Math.max(.1, chEnd(i) - chapters[i].start)), bar = dots[i] && dots[i].querySelector('b');
      if (bar) bar.style.width = (k * 100).toFixed(2) + '%';
    }
    const cue = t > 0 ? cues.find(c => t >= c.a && t <= c.b) : null;
    if (cue) { if (cap.textContent !== cue.text) cap.textContent = cue.text; cap.classList.add('on'); } else cap.classList.remove('on');
  }
  function start() { box.classList.add('started'); v.muted = false; play(); }
  function play() { v.play().catch(() => {}); box.classList.add('started'); }
  function toggle() { v.paused ? play() : v.pause(); }
  function go(t) { v.currentTime = Math.min((v.duration || dur) - .05, Math.max(0, t)); update(); }
  function chapter(dir) {
    if (!chapters.length) return; const t = v.currentTime, i = chapterAt(t);
    if (dir < 0) go(t - chapters[i].start > 1.5 ? chapters[i].start : chapters[Math.max(0, i - 1)].start);
    else go(chapters[Math.min(chapters.length - 1, i + 1)].start);
  }
  function setIcons() { playIco.innerHTML = v.paused ? ICON.play : ICON.pause; playBtn.setAttribute('aria-label', v.paused ? (EL ? 'Αναπαραγωγή' : 'Play') : (EL ? 'Παύση' : 'Pause')); }

  big.addEventListener('click', start);
  playBtn.addEventListener('click', () => { if (!box.classList.contains('started')) start(); else toggle(); });
  v.addEventListener('click', () => { if (!box.classList.contains('started')) start(); else toggle(); });
  ['play', 'pause', 'ended'].forEach(e => v.addEventListener(e, setIcons));
  v.addEventListener('timeupdate', update); v.addEventListener('seeked', update); v.addEventListener('loadedmetadata', () => { dur = v.duration || dur; update(); });
  (function tick() { requestAnimationFrame(tick); if (!v.paused) update(); })();   // smooth fill for the current dot

  // keyboard, while the player is on screen; the film pauses when you scroll away
  let onScreen = false;
  new IntersectionObserver(es => es.forEach(e => { onScreen = e.isIntersecting && e.intersectionRatio > .35; if (!e.isIntersecting && !v.paused) v.pause(); }), { threshold: [0, .35, .6] }).observe(box);
  addEventListener('keydown', e => {
    if (!onScreen || /input|textarea|select/i.test(document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); if (!box.classList.contains('started')) start(); else toggle(); }
    else if (k === 'arrowright') go(v.currentTime + 5); else if (k === 'arrowleft') go(v.currentTime - 5);
    else if (k === ',') chapter(-1); else if (k === '.') chapter(1);
  });
  setIcons(); update();
})();
