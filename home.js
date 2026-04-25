// Home-page-only JS — reveal-on-scroll + foundry sticky scroll engine.
// Kept separate from app.js so other pages (privacy/terms/cookies/thanks) don't load it.

(function () {
  // ── Reveal on scroll ─────────────────────────────────────────────
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('active'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((e) => io.observe(e));
  }

  // ── Foundry: scroll-scrubbed journey + sticky pin + per-product panel swap ──
  const tile = document.getElementById('foundry');
  const path = document.getElementById('journeyPath');
  const progress = document.getElementById('journeyProgress');
  const stops = document.querySelectorAll('.journey-stop');
  const panels = document.querySelectorAll('.product-panel');
  if (!tile || !path || !progress || !stops.length) return;

  const wrap = tile.closest('.foundry-pin-wrap');
  if (!wrap) return;

  const len = path.getTotalLength();
  progress.style.setProperty('--jlen', len);
  progress.style.strokeDasharray = len;

  const stopPositions = [0, 1 / 3, 2 / 3, 1];

  let raf = null;
  const update = () => {
    raf = null;
    const wrapRect = wrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = wrap.offsetHeight - vh;
    const scrolled = -wrapRect.top;
    const raw = total > 0 ? scrolled / total : 0;
    const p = Math.max(0, Math.min(1, raw));
    progress.style.setProperty('--jp', p);

    let active = 0;
    let bestDist = Infinity;
    stopPositions.forEach((sp, i) => {
      const d = Math.abs(sp - p);
      if (d < bestDist) {
        bestDist = d;
        active = i;
      }
    });
    stops.forEach((s, i) => {
      s.dataset.active = i === active ? '1' : '0';
      s.dataset.done = stopPositions[i] < p - 0.02 ? '1' : '0';
    });
    panels.forEach((panel, i) => {
      panel.dataset.active = i === active ? '1' : '0';
    });
  };
  const onScroll = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
