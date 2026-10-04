/* Aegis · coming soon: the product's mark (particles-v3.js) gathers out of the
   dark and keeps turning, like its entrance on the homepage. With reduced
   motion it is drawn once, still. */
(() => {
  'use strict';
  const canvas = document.querySelector('.cs-atom');
  const P = window.DionParticles;
  if (!canvas || !P) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mark = null, w = 0, h = 0, dpr = 1, start = 0, raf = 0;

  const fit = () => {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };
  const draw = (now) => {
    raf = 0;
    if (!mark || !w) return;
    const t = (now - start) / 1000;
    const form = reduced ? 1 : P.clamp(t / 2.2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    mark.draw(ctx, {cx: w / 2, cy: h / 2, size: w * 0.86, form, t, still: reduced,
      turn: reduced ? 0 : 0.5 * (1 - P.ease(form)),
      sweep: reduced ? 0 : P.clamp((t - 1.9) / 1.3),
      dot: w < 420 ? 1 : 1.15});
    if (!reduced) raf = requestAnimationFrame(draw);
  };
  const redraw = () => {
    if (!raf) raf = requestAnimationFrame(draw);
  };

  fit();
  window.addEventListener('resize', () => {
    fit();
    redraw();
  });
  P.product('aegis', Math.round((w < 420 ? 3600 : 6000) * (P.LITE ? 0.5 : 1))).then((m) => {
    mark = m;
    start = performance.now();
    redraw();
  }, () => {});
})();
