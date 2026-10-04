/* Homepage v3 interactions. Language switching, consent and scroll
   reveals live in app.js; this file only drives what is unique to the
   home page. */
(() => {
  'use strict';
  const html = document.documentElement;
  const language = () => ({en: 'en', de: 'de', el: 'gr'}[html.lang] || 'en');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // the wordmark face loads like Inter: non-blocking, switched on here (CSP-safe)
  const wordmarkFont = document.getElementById('gfont2');
  if (wordmarkFont) wordmarkFont.media = 'all';

  // ── The story's screenshots load after the page (or at the first scroll) ──
  // They sit, invisible, in the first screen, so the browser would fetch them
  // straight away and they would compete with the opening and the headline.
  const later = [...document.querySelectorAll('img[data-src]')];
  const loadLater = () => {
    later.forEach((img) => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
      }
    });
    window.removeEventListener('scroll', loadLater);
  };
  if (later.length) {
    if (document.readyState === 'complete') setTimeout(loadLater, 150);
    else window.addEventListener('load', () => setTimeout(loadLater, 150), {once: true});
    window.addEventListener('scroll', loadLater, {passive: true});
  }

  // ── Phones: a sticky "Start a project" ─────────────────────────────
  // Shown once the opening screen has scrolled away; hidden over the contact
  // form itself, while the menu or the cookie choices are open.
  const stickyCta = document.querySelector('.m-cta');
  const contactSection = document.getElementById('contact');
  if (stickyCta && contactSection) {
    let contactSeen = false, queued = false;
    const updateCta = () => {
      queued = false;
      const banner = document.querySelector('.cookie-consent');
      const menu = document.getElementById('mobile-nav');
      // the Live scene has its own "Start your project" button: one is enough
      const liveCap = document.querySelector('.st-caps .st-cap:last-child');
      const liveCta = liveCap && +(liveCap.style.opacity || 0) > 0.4 && liveCap.getBoundingClientRect().bottom > 0;
      const on = window.scrollY > window.innerHeight * 0.9 && !contactSeen && !liveCta
        && !(banner && !banner.hidden) && !(menu && menu.classList.contains('is-open'));
      if (stickyCta.classList.contains('on') === on) return;
      stickyCta.classList.toggle('on', on);
      stickyCta.setAttribute('aria-hidden', String(!on));
      stickyCta.tabIndex = on ? 0 : -1;
    };
    const queueCta = () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(updateCta);
      }
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => {
        contactSeen = entry.isIntersecting;
        queueCta();
      }, {threshold: 0.12}).observe(contactSection);
    }
    window.addEventListener('scroll', queueCta, {passive: true});
    window.addEventListener('resize', queueCta);
    window.addEventListener('dionConsentChange', queueCta);
    document.addEventListener('click', queueCta);
    queueCta();
  }

  // ── Mobile menu ────────────────────────────────────────────────────
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  if (menuButton && mobileNav) {
    const setMenu = (open) => {
      menuButton.setAttribute('aria-expanded', String(open));
      mobileNav.classList.toggle('is-open', open);
    };
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    mobileNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuButton.focus();
      }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', (event) => {
      if (event.matches) setMenu(false);
    });
  }

  // ── "Start a … project" links preselect the contact form topic ─────
  // Read at click time: the service picker rewrites the CTA's value.
  const projectType = document.getElementById('project-type');
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-project]');
    if (!link || !projectType) return;
    const value = link.getAttribute('data-project');
    if ([...projectType.options].some((option) => option.value === value)) {
      projectType.value = value;
      projectType.dispatchEvent(new Event('change', {bubbles: true}));
    }
  });
  // Other pages link here with ?topic= (Aegis: index.html?topic=aegis#contact).
  const topic = new URLSearchParams(window.location.search).get('topic');
  if (topic && projectType && [...projectType.options].some((option) => option.value === topic)) {
    projectType.value = topic;
    projectType.dispatchEvent(new Event('change', {bubbles: true}));
  }

  // ── The story: one scroll-progress value drives every stage ────────
  // q runs 0→1 across the pinned section. Each beat reads its own slice
  // of q (seg) and writes CSS custom properties that styles-v3.css turns
  // into position, opacity and depth.
  //   .055     Axon's entrance: its mark forms out of light (story paused)
  //   .06–.35  Axon: product shot, then a walk through its real screens
  //   .38      Aegis's entrance, the same way
  //   .38–.53  Aegis: an invoice scanned into a structured record
  //   .50–.57  the turn — "And yours."
  //   .57–1    yours: sketch → wireframe → real UI → every screen → live
  const story = document.querySelector('.story');
  if (story) {
    const all = (sel) => [...story.querySelectorAll(sel)];
    const clamp = (x) => Math.max(0, Math.min(1, x));
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    // caption windows, in the order the .st-cap elements appear
    const windows = [[0.06, 0.19], [0.19, 0.35], [0.38, 0.50], [0.50, 0.57], [0.57, 0.66],
      [0.66, 0.75], [0.75, 0.84], [0.84, 0.92], [0.92, 1.01]];
    // The product entrances are extra scroll: at each pause q stands still for
    // HOLD screens while the mark forms, holds and flies apart. The section is
    // 10 + 2 × HOLD screens of scroll (styles-v3.css: .story height).
    // After the story, the Live scene stays pinned for END screens while the
    // window and the phone step through what else we build, with the scroll.
    const HOLD = 0.8, PAUSES = [0.055, 0.38], PRE = 0.15, POST = 0.25, END = 1.8;
    const RUN = 10 + HOLD * PAUSES.length + END;
    const LIVE_FROM = 9.65 + HOLD * PAUSES.length;   // the scroll where the Live pages start (q .965)
    const toQ = (P) => {
      let q = P;
      PAUSES.forEach((at) => { if (q > at * 10) q = Math.max(at * 10, q - HOLD); });
      return Math.min(1, q / 10);
    };
    const caps = all('.st-cap');
    const sketch = all('.st-sketch mask path');   // the pen; the dots show through it
    const wire = all('.st-wire path');
    const shots = all('.ax-view img');
    const feats = all('.ax-feats span');
    const fields = all('.ae-f');
    const highlights = all('.ae-hl');
    const confidence = story.querySelector('.ae-conf');
    const set = (name, value) => story.style.setProperty(name, value);
    // strokes are drawn one after another: path i draws while prog*n runs i→i+1
    // "Live": once the site has gone live, the window and the phone take turns
    // showing what else we build: a website, a configurator, a business app
    const slides = all('.st-real .sl'), phoneSlides = all('.st-phone .ps'), kinds = all('.st-kinds span');
    const urlEl = story.querySelector('.st-chrome .url'), phoneEl = story.querySelector('.st-phone');
    let slide = 0;
    const showSlide = (k) => {
      if (k === slide) return;
      slide = k;
      [slides, phoneSlides, kinds].forEach((list) => list.forEach((el, i) => el.classList.toggle('on', i === k)));
      if (urlEl && slides[k]) urlEl.textContent = slides[k].dataset.url;
      if (phoneEl && slides[k]) phoneEl.classList.toggle('iph-dark', slides[k].dataset.dark === '1');
    };
    const draw = (list, prog) => list.forEach((el, i) => {
      el.style.strokeDashoffset = 100 - clamp(prog * list.length - i) * 100;
    });

    // ── the entrances: each product's mark in particles (particles-v3.js) ──
    const fx = story.querySelector('.st-fx');
    const fxc = fx && fx.getContext('2d');
    const beats = all('.st-logo').map((el) => ({el, name: el.dataset.mark, u: 0, mark: null}));
    let fxW = 0, fxH = 0, fxDpr = 1, fxRaf = 0, fxDrawn = false;
    const placement = (beat) => {
      const phone = fxW <= 760;
      const size = phone ? Math.min(fxW * 0.62, fxH * 0.3) : Math.min(fxW * 0.3, fxH * 0.36);
      const globe = beat.name === 'aegis';
      return {cx: fxW / 2, cy: fxH * (phone ? 0.4 : 0.42), size: globe ? size * 1.45 : size, half: globe ? size * 0.4 : size * 0.5};
    };
    // where each mark flows when its scene arrives: Axon into the MacBook's
    // screen, Aegis into the invoice it reads (after the reference's streams)
    const targets = {axon: '.ax-laptop .mbp-scr', aegis: '.ae-paper.p1'};
    const intoRect = (beat) => {
      const el = targets[beat.name] && story.querySelector(targets[beat.name]);
      if (!el) return null;
      const r = el.getBoundingClientRect(), c = fx.getBoundingClientRect();
      return r.width > 4 ? {x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height} : null;
    };
    const paint = () => {
      fxRaf = 0;
      if (!fxc) return;
      const live = beats.filter((beat) => beat.u > 0 && beat.u < 1 && beat.mark);
      if (!live.length && !fxDrawn) return;
      fxc.setTransform(fxDpr, 0, 0, fxDpr, 0, 0);
      fxc.clearRect(0, 0, fxW, fxH);
      fxDrawn = live.length > 0;
      const t = performance.now() / 1000;
      live.forEach((beat) => {
        const u = beat.u, at = placement(beat);
        const form = reducedMotion ? 1 : seg(u, 0, 0.5);
        const into = reducedMotion || u < 0.66 ? null : intoRect(beat);
        beat.mark.draw(fxc, {...at, t, form, into, pour: into ? seg(u, 0.7, 1) : 0,
          burst: reducedMotion || into ? 0 : seg(u, 0.74, 1),
          alpha: reducedMotion ? seg(u, 0, 0.2) * (1 - seg(u, 0.78, 1)) : 1,
          turn: reducedMotion ? 0 : 0.5 * (1 - ease(form)),
          sweep: reducedMotion ? 0 : seg(u, 0.44, 0.68), still: reducedMotion,
          wave: reducedMotion ? 0 : seg(u, 0.46, 0.52) * (1 - seg(u, 0.68, 0.74)), dot: fxW <= 760 ? 1 : 1.15});
      });
      // keep breathing (and the globe turning) while a mark is on screen
      if (live.length && !reducedMotion) fxRaf = requestAnimationFrame(paint);
    };
    const wake = () => {
      if (!fxRaf) fxRaf = requestAnimationFrame(paint);
    };
    if (window.DionParticles && fxc) {
      const count = Math.round((window.innerWidth < 700 ? 3600 : 7000) * (window.DionParticles.LITE ? 0.5 : 1));
      const build = () => beats.forEach((beat) => window.DionParticles.product(beat.name, count).then((mark) => {
        beat.mark = mark;
        wake();
      }, () => {}));
      // after the page and its opening have settled
      if (document.readyState === 'complete') setTimeout(build, 300);
      else window.addEventListener('load', () => setTimeout(build, 300), {once: true});
    }

    let frame = 0;
    // A fast flick must not skip the scenes: the story's clock follows the
    // scroll with a short glide and a speed limit (in screens of story per
    // second, slower while a mark forms and streams), so every transition
    // still plays. Jumps via a link, or with the story out of view, snap.
    let shownP = null, lastT = 0, snapNext = false;
    const GLIDE = 0.12, FAST = 3.0, SLOW = 0.75;
    document.addEventListener('click', (event) => { if (event.target.closest('a[href^="#"]')) snapNext = true; });
    const update = (now = performance.now()) => {
      frame = 0;
      const total = story.offsetHeight - window.innerHeight;
      const rect = story.getBoundingClientRect();
      const target = (total > 0 ? clamp(-rect.top / total) : 0) * RUN;
      const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0;
      lastT = now;
      const outOfView = rect.bottom < 0 || rect.top > window.innerHeight;
      if (shownP === null || reducedMotion || snapNext || outOfView || !dt) {
        shownP = target;
        snapNext = false;
      } else {
        const inBeat = beats.some((beat) => beat.u > 0.02 && beat.u < 0.98);
        const cap = (inBeat ? SLOW : FAST) * dt;
        const gap = target - shownP;
        const step = Math.max(-cap, Math.min(cap, gap * (1 - Math.exp(-dt / GLIDE))));
        shownP = Math.abs(gap) < 0.0005 ? target : shownP + step;
      }
      const P = shownP;
      const p = toQ(P);

      // the entrances run on the real scroll, around their pauses
      beats.forEach((beat, i) => {
        const start = PAUSES[i] * 10 + i * HOLD - PRE;
        beat.u = clamp((P - start) / (PRE + HOLD + POST));
        const o = seg(beat.u, 0.36, 0.5) * (1 - seg(beat.u, 0.7, 0.8));
        beat.el.style.opacity = o;
        beat.el.style.transform = `translateY(${(1 - seg(beat.u, 0.36, 0.5)) * 14 - seg(beat.u, 0.7, 0.8) * 10}px)`;
      });
      wake();

      set('--heroO', 1 - seg(p, 0.02, 0.05));
      set('--heroY', -40 * seg(p, 0.02, 0.05));

      // Axon
      set('--ax', ease(seg(p, 0.06, 0.10)));
      set('--axT', ease(seg(p, 0.19, 0.35)));
      set('--axOut', ease(seg(p, 0.33, 0.38)));
      const feature = p < 0.20 ? -1 : Math.min(3, Math.floor(seg(p, 0.20, 0.34) * 4));
      shots.forEach((img, i) => img.classList.toggle('on', i === feature + 1));
      feats.forEach((chip, i) => chip.classList.toggle('on', i === feature));

      // Aegis
      set('--ae', ease(seg(p, 0.385, 0.43)));
      set('--scan', seg(p, 0.40, 0.46));
      set('--scanDone', seg(p, 0.46, 0.48));
      set('--aeOut', ease(seg(p, 0.49, 0.53)));
      const filled = seg(p, 0.415, 0.48);
      fields.forEach((field, i) => field.classList.toggle('on', filled * fields.length > i + 0.2));
      if (confidence) confidence.classList.toggle('on', filled > 0.97);
      const scanned = seg(p, 0.40, 0.46) * 5;
      highlights.forEach((hl) => hl.classList.toggle('on', scanned >= +hl.getAttribute('data-f') - 0.4 && p < 0.49));

      // the turn: "And yours." as a statement in the middle of the screen. It comes
      // into focus, settles, then grows past the viewer as the lights come up;
      // a single point of light is left where the next drawing begins
      const stIn = ease(seg(p, 0.497, 0.532)), stOut = ease(seg(p, 0.553, 0.572));
      set('--stO', stIn * (1 - stOut));
      set('--stS', 0.84 + 0.16 * stIn + 0.2 * stOut);
      set('--stB', 14 * (1 - stIn) + 10 * stOut);
      set('--stSub', seg(p, 0.518, 0.54) * (1 - stOut));
      set('--pen', seg(p, 0.558, 0.572) * (1 - seg(p, 0.58, 0.60)));

      // the studio lights come up for the second act: black gives way to light grey
      set('--light', ease(seg(p, 0.555, 0.60)));

      // yours
      draw(sketch, ease(seg(p, 0.57, 0.66)));
      set('--skO', 1 - seg(p, 0.69, 0.74));
      draw(wire, ease(seg(p, 0.665, 0.735)));
      set('--wrO', 1 - seg(p, 0.79, 0.83));
      set('--chrome', ease(seg(p, 0.71, 0.76)));
      set('--skel', seg(p, 0.755, 0.78) * (1 - seg(p, 0.80, 0.83)));
      set('--real', ease(seg(p, 0.795, 0.84)));
      const turn = ease(seg(p, 0.76, 0.84));
      set('--rx', 9 * turn);
      set('--ry', -15 * turn);
      const devices = ease(seg(p, 0.845, 0.90));
      set('--dev', devices);
      set('--objX', -9 * devices);
      set('--sc', 1 - 0.12 * devices);
      set('--live', ease(seg(p, 0.925, 0.95)));
      set('--live2', ease(seg(p, 0.94, 0.97)));
      if (slides.length) showSlide(Math.min(slides.length - 1, Math.floor(clamp((P - LIVE_FROM) / (RUN - LIVE_FROM)) * slides.length)));

      caps.forEach((cap, i) => {
        if (cap.classList.contains('st-statement')) {
          const on = seg(p, 0.497, 0.532) * (1 - seg(p, 0.553, 0.572));
          cap.style.pointerEvents = 'none';
          cap.style.visibility = on > 0.01 ? 'visible' : 'hidden';
          return;
        }
        const [a, b] = windows[i];
        const fadeIn = seg(p, a, a + 0.03);
        const fadeOut = 1 - seg(p, b - 0.03, b);
        const o = i === caps.length - 1 ? fadeIn : Math.min(fadeIn, fadeOut);
        cap.style.opacity = o;
        cap.style.transform = `translateY(${(1 - fadeIn) * 18}px)`;
        cap.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
        // hidden captions leave the accessibility tree and the tab order
        cap.style.visibility = o > 0.01 ? 'visible' : 'hidden';
      });
      if (shownP !== target && !frame) frame = requestAnimationFrame(update);
    };
    // Captions and stage share the pinned screen. Their text length depends on
    // the language and the window, so measure the tallest caption and put the
    // stage underneath it, keeping the stage's proportions on wide screens.
    const stageEl = story.querySelector('.st-stage');
    const capsEl = story.querySelector('.st-caps');
    const layout = () => {
      const vh = window.innerHeight, vw = window.innerWidth, phone = vw <= 760;
      // the statement ("And yours.") centres itself on the screen, so only the top captions count
      const tallest = Math.max(...caps.filter((cap) => !cap.classList.contains('st-statement')).map((cap) => cap.offsetHeight));
      const top = Math.max(vh * (phone ? 0.43 : 0.38), capsEl.offsetTop + tallest + (phone ? 18 : 28));
      // the phone in the last scenes reaches ~16% below the stage on wide screens: keep it on screen
      const height = Math.max(phone ? 200 : 240, Math.min(phone ? vh * 0.42 : Math.min(500, vh * 0.54), (vh - top - (phone ? 16 : 24)) / (phone ? 1 : 1.16)));
      stageEl.style.top = `${top}px`;
      stageEl.style.height = `${height}px`;
      stageEl.style.width = phone ? '' : `${Math.min(880, vw * 0.84, height * 1.76)}px`;
      // the entrances: a canvas the size of the screen, names under the marks
      if (fx) {
        fxDpr = Math.min(2, window.devicePixelRatio || 1);
        fxW = fx.clientWidth || vw; fxH = fx.clientHeight || vh;
        fx.width = Math.round(fxW * fxDpr); fx.height = Math.round(fxH * fxDpr);
        fxDrawn = true;
        beats.forEach((beat) => {
          const at = placement(beat);
          beat.el.style.top = `${Math.round(at.cy + at.half + (phone ? 22 : 34))}px`;
        });
        wake();
      }
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', request, {passive: true});
    window.addEventListener('resize', () => {
      layout();
      request();
    });
    new MutationObserver(layout).observe(html, {attributes: true, attributeFilter: ['lang']});
    if (document.fonts) document.fonts.ready.then(layout);   // web font metrics change caption heights
    layout();
    update();
    window.DionStory = {update, layout, beats};
  }

  // ── Services: the "get to know" gallery ───────────────────────────
  const gallery = document.querySelector('.gk');
  if (gallery) {
    const track = gallery.querySelector('.gk-track');
    const cards = [...track.querySelectorAll('.gk-card')];
    const prev = gallery.querySelector('.gk-prev');
    const next = gallery.querySelector('.gk-next');
    const step = () => cards[0].offsetWidth + 20;
    // Pinned (the usual case): while the cards are on screen the page's own
    // scroll walks them sideways, and after the last one the page moves on.
    // Where the row doesn't fit the screen, it scrolls sideways by itself.
    const pin = gallery.querySelector('.gk-pin');
    const clipOK = window.CSS && CSS.supports('overflow-x', 'clip');
    let pinned = false, run = 0, top = 0, x = 0;
    const edges = () => {
      if (pinned) {
        x = Math.max(0, Math.min(run, top - gallery.getBoundingClientRect().top));
        gallery.style.setProperty('--gkX', x.toFixed(1));
        gallery.style.setProperty('--gkP', run ? (x / run).toFixed(4) : '0');
        prev.disabled = x < 4;
        next.disabled = x > run - 4;
        return;
      }
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
    };
    // The row pins between the floating header and the cookie-settings button
    // (bottom left, on every page once a choice is saved); on short screens
    // the cards give up a little height first, down to what their text needs.
    const COOKIE = 62, MAX_CUT = () => (window.innerWidth <= 760 ? 88 : 50);
    const place = () => {
      gallery.classList.add('pinned');
      gallery.style.setProperty('--gkCut', '0px');
      const vh = window.innerHeight;
      const head = parseFloat(getComputedStyle(html).getPropertyValue('--header')) || 72;
      const room = vh - (head - 6) - COOKIE;       // the track's 6px top padding may pass under the header's margin
      let h = pin.offsetHeight;
      const cut = Math.max(0, h - room);
      run = Math.max(0, track.offsetWidth - pin.clientWidth);
      pinned = clipOK && run > 0 && cut <= MAX_CUT();
      gallery.classList.toggle('pinned', pinned);
      if (pinned) {
        if (cut) {
          gallery.style.setProperty('--gkCut', `${Math.ceil(cut)}px`);
          h = pin.offsetHeight;
        }
        top = Math.round(head - 6 + Math.max(0, (room - h) / 2));
        gallery.style.setProperty('--gkTop', `${top}px`);
        gallery.style.height = `${h + run}px`;
      } else {
        gallery.style.removeProperty('--gkCut');
        gallery.style.height = '';
      }
      edges();
    };
    // the page position that shows the row moved sideways by `offset`
    const scrollTo = (offset, smooth) => window.scrollTo({
      top: window.scrollY + gallery.getBoundingClientRect().top - top + Math.max(0, Math.min(run, offset)),
      behavior: smooth && !reducedMotion ? 'smooth' : 'auto'});
    const go = (dir) => {
      if (pinned) scrollTo((Math.round(x / step()) + dir) * step(), true);
      else track.scrollBy({left: dir * step(), behavior: reducedMotion ? 'auto' : 'smooth'});
    };
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', () => requestAnimationFrame(edges), {passive: true});
    window.addEventListener('scroll', () => { if (pinned) requestAnimationFrame(edges); }, {passive: true});
    window.addEventListener('resize', place);
    // keyboard: a focused card is brought into view
    track.addEventListener('focusin', (event) => {
      const card = event.target.closest('.gk-card');
      if (!pinned || !card) return;
      const left = card.offsetLeft - cards[0].offsetLeft;
      if (left < x || left + card.offsetWidth > x + pin.clientWidth - cards[0].offsetLeft) scrollTo(left, false);
    });
    // a sideways swipe on a trackpad moves the row too, while it is pinned
    gallery.addEventListener('wheel', (event) => {
      if (!pinned || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      const r = gallery.getBoundingClientRect();
      if (r.top > top + 1 || r.bottom < top + pin.offsetHeight - 1) return;
      event.preventDefault();
      window.scrollBy(0, event.deltaX * (event.deltaMode === 1 ? 16 : 1));
    }, {passive: false});
    place();
    // each card's visual plays as the card comes into view
    if ('IntersectionObserver' in window) {
      const seen = new IntersectionObserver((entries) => entries.forEach((entry) => {
        entry.target.classList.toggle('on', entry.isIntersecting);
      }), {threshold: 0.5});
      cards.forEach((card) => seen.observe(card));
    } else {
      cards.forEach((card) => card.classList.add('on'));
    }
    // "+" opens the card's full story in a sheet; focus returns to the "+" on close
    const modal = document.querySelector('.gk-modal');
    const sheet = modal && modal.querySelector('.gk-sheet');
    let opener = null;
    if (modal && typeof modal.showModal === 'function') {
      cards.forEach((card) => card.querySelector('.gk-plus').addEventListener('click', (event) => {
        opener = event.currentTarget;
        // the sheet opens on the card's own picture, large and playing again,
        // then the story in three numbered steps: the problem, the build, the start
        const hero = document.createElement('div');
        hero.className = `gk-hero gk-card ${[...card.classList].filter((c) => c === 'dark' || c === 'grad').join(' ')}`;
        hero.setAttribute('aria-hidden', 'true');
        hero.append(card.querySelector('.gk-vis').cloneNode(true));
        const nodes = [...card.querySelector('.gk-more').children].map((node) => node.cloneNode(true));
        const steps = document.createElement('div');
        steps.className = 'gk-steps';
        nodes.filter((node) => node.classList.contains('gk-block')).forEach((block, i) => {
          block.insertAdjacentHTML('afterbegin', `<i class="gk-n" aria-hidden="true">${i + 1}</i>`);
          steps.append(block);
        });
        const rest = nodes.filter((node) => !node.classList.contains('gk-block'));
        const at = rest.findIndex((node) => node.classList.contains('gk-cta'));
        rest.splice(at < 0 ? rest.length : at, 0, steps);
        sheet.replaceChildren(hero, ...rest);
        const title = sheet.querySelector('h3');
        if (title) title.id = 'gk-title';
        modal.showModal();
        sheet.scrollTop = 0;
        requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('on')));
      }));
      modal.querySelector('.gk-close').addEventListener('click', () => modal.close());
      modal.addEventListener('click', (event) => {
        // a click on the backdrop, or on a link inside, closes the sheet
        if (event.target === modal || event.target.closest('a[href^="#"]')) modal.close();
      });
      modal.addEventListener('close', () => {
        if (opener) opener.focus({preventScroll: true});
      });
    } else {
      // no <dialog>: show the story inside the card instead
      cards.forEach((card) => card.querySelector('.gk-plus').addEventListener('click', () => {
        card.querySelector('.gk-more').hidden = false;
      }));
    }
  }

  // ── The Axon product film: "Watch the film" opens it in a player over the page ──
  {
    const dialog = document.querySelector('.pf-modal');
    const openers = document.querySelectorAll('[data-play-film]');
    if (dialog && openers.length) {
      const video = dialog.querySelector('video');
      let opener = null;
      // the voice is English: German and Greek visitors get subtitles in their language
      const captions = () => {
        const lang = document.documentElement.lang || 'en';
        [...video.textTracks].forEach((track) => { track.mode = lang !== 'en' && track.language === lang ? 'showing' : 'disabled'; });
      };
      const close = () => {
        video.pause();
        if (typeof dialog.close === 'function' && dialog.open) dialog.close();
        else dialog.removeAttribute('open');
      };
      openers.forEach((button) => button.addEventListener('click', () => {
        opener = button;
        if (video.dataset.poster && !video.poster) video.poster = video.dataset.poster;   // fetched only when the film opens
        captions();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        video.play().catch(() => {});
        if (window.dionTrack) window.dionTrack('film_play', {film: 'axon_product'});
      }));
      dialog.querySelector('.pf-close').addEventListener('click', close);
      dialog.addEventListener('click', (event) => {
        // a click on the backdrop, or on "Book a demo", closes the player
        if (event.target === dialog || event.target.closest('a[href^="#"]')) close();
      });
      dialog.addEventListener('close', () => {
        video.pause();
        if (opener) opener.focus({preventScroll: true});
      });
      video.addEventListener('ended', () => { if (window.dionTrack) window.dionTrack('film_complete', {film: 'axon_product'}); });
    }
  }

  // ── Measuring what works (GA4 via analytics.js, only with consent) ──
  // generate_lead on a sent enquiry, demo_click, film_play (trailers.js)
  const track = (name, params = {}) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  };
  window.dionTrack = track;
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-track]');
    if (link) track(link.dataset.track, {location: link.closest('section') ? link.closest('section').id : ''});
  });

  // ── The form: our own messages, in the page's language ─────────────
  const form = document.querySelector('.contact-form');
  if (form) {
    const MSG = {
      required: {en: 'Please fill this in.', de: 'Bitte ausfüllen.', gr: 'Συμπληρώστε αυτό το πεδίο.'},
      email: {en: 'Please enter a valid email address.', de: 'Bitte eine gültige E-Mail-Adresse eingeben.', gr: 'Εισάγετε έγκυρη διεύθυνση email.'},
      consent: {en: 'Please agree so we can reply to you.', de: 'Bitte stimmen Sie zu, damit wir antworten können.', gr: 'Χρειάζεται η συγκατάθεσή σας για να σας απαντήσουμε.'},
    };
    form.noValidate = true;
    const clear = (field) => {
      field.classList.remove('is-invalid');
      field.removeAttribute('aria-invalid');
      const note = field.closest('label') && field.closest('label').querySelector('.field-error');
      if (note) note.remove();
    };
    const flag = (field) => {
      const kind = field.type === 'checkbox' ? 'consent' : field.validity.typeMismatch ? 'email' : 'required';
      field.classList.add('is-invalid');
      field.setAttribute('aria-invalid', 'true');
      const note = document.createElement('small');
      note.className = 'field-error';
      note.setAttribute('role', 'alert');
      note.textContent = MSG[kind][language()];
      field.closest('label').appendChild(note);
    };
    form.addEventListener('input', (event) => clear(event.target));
    form.addEventListener('change', (event) => clear(event.target));
    // back from FormSubmit with the Back button: the page comes from the cache, button still busy
    window.addEventListener('pageshow', (event) => {
      const button = form.querySelector('[type="submit"]');
      if (event.persisted && button && button.disabled) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        if (button.dataset.label) button.textContent = button.dataset.label;
      }
    });
    // bots post the moment the page loads: anything sent within 3 s is dropped quietly
    const opened = Date.now();
    form.addEventListener('submit', (event) => {
      if (Date.now() - opened < 3000 || form.querySelector('.honeypot').value) {
        event.preventDefault();
        return;
      }
      const fields = [...form.querySelectorAll('input, select, textarea')].filter((f) => f.willValidate && !f.classList.contains('honeypot'));
      fields.forEach(clear);
      const bad = fields.filter((f) => !f.checkValidity());
      if (bad.length) {
        event.preventDefault();
        bad.forEach(flag);
        bad[0].focus();
        return;
      }
      const button = form.querySelector('[type="submit"]');
      if (button) {
        button.disabled = true;                     // no double sends
        button.setAttribute('aria-busy', 'true');
        button.dataset.label = button.textContent;
        button.textContent = {en: 'Sending…', de: 'Wird gesendet…', gr: 'Αποστολή…'}[language()];
      }
      const topic = form.querySelector('#project-type');
      track('generate_lead', {project_type: topic ? topic.value : ''});
    });
  }

  // ── Things app.js doesn't translate ────────────────────────────────
  const applyLanguage = () => {
    document.querySelectorAll('[data-placeholder-en]').forEach((field) => {
      field.placeholder = field.getAttribute(`data-placeholder-${language()}`) || field.getAttribute('data-placeholder-en');
    });
  };
  new MutationObserver(applyLanguage).observe(html, {attributes: true, attributeFilter: ['lang']});
  applyLanguage();
})();
