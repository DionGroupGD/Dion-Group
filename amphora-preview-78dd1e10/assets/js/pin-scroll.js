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
