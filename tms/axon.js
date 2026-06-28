/* ════════════════════════════════════════════════════════════════
   Axon TMS — Dion Group product page
   v20 — client behaviour for the light/pastel redesign.
   CSP-safe: no inline handlers, served from 'self'. Ported from the
   design's componentDidMount logic + wired to the live site (real
   form submit, localized ticker, hover handler replacing style-hover).
   ════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  var D = document;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pointerFine = matchMedia('(pointer:fine)').matches;

  function ready(fn){
    if (D.readyState !== 'loading') fn();
    else D.addEventListener('DOMContentLoaded', fn);
  }

  ready(function(){

    /* ── Responsive layout toggles (the design's grids are set inline) ── */
    function applyResponsive(){
      var w = window.innerWidth;
      var nl = D.querySelector('[data-navlinks]');
      if (nl) nl.style.display = w >= 900 ? 'flex' : 'none';
      var lg = D.querySelector('[data-lifegrid]');
      if (lg){ var c = w >= 860 ? 6 : w >= 600 ? 3 : 2; lg.style.gridTemplateColumns = 'repeat(' + c + ',1fr)'; }
      var dg = D.querySelector('[data-deploygrid]');
      if (dg){ var dc = w >= 820 ? 5 : w >= 540 ? 3 : 2; dg.style.gridTemplateColumns = 'repeat(' + dc + ',1fr)'; }
      [].slice.call(D.querySelectorAll('[data-howrow]')).forEach(function(el){
        el.style.gridTemplateColumns = w >= 820 ? '0.92fr 1.08fr' : '1fr';
        el.style.direction = 'ltr';
      });
    }
    applyResponsive();
    var rRaf = null;
    window.addEventListener('resize', function(){ if (!rRaf) rRaf = requestAnimationFrame(function(){ rRaf = null; applyResponsive(); }); });

    /* ── Scroll reveal ── */
    (function(){
      var els = [].slice.call(D.querySelectorAll('[data-rv]'));
      if (!els.length) return;
      if (reduce || !('IntersectionObserver' in window)){ els.forEach(function(el){ el.classList.add('in'); }); return; }
      var io = new IntersectionObserver(function(es){
        es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
      }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });
      els.forEach(function(el){
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) el.classList.add('in');
        else io.observe(el);
      });
    })();

    /* ── Count-up stats ── */
    (function(){
      if (reduce || !('IntersectionObserver' in window)) return;
      var nums = [].slice.call(D.querySelectorAll('[data-count]'));
      if (!nums.length) return;
      function run(el){
        var raw = el.textContent.trim();
        var target = parseFloat(raw.replace(',', '.'));
        if (isNaN(target)) return;
        var decimals = (raw.split('.')[1] || '').length;
        var dur = 1100, t0 = null;
        function frame(ts){
          if (!t0) t0 = ts;
          var p = Math.min(1, (ts - t0) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = (target * e).toFixed(decimals);
          if (p < 1) requestAnimationFrame(frame); else el.textContent = raw;
        }
        requestAnimationFrame(frame);
      }
      var io = new IntersectionObserver(function(es){
        es.forEach(function(e){ if (e.isIntersecting){ run(e.target); io.unobserve(e.target); } });
      }, { threshold: 0.6 });
      nums.forEach(function(n){ io.observe(n); });
    })();

    /* ── Live "updated Ns ago" ticker (localized) ── */
    (function(){
      var tick = D.querySelector('[data-ticker]');
      if (!tick || reduce) return;
      var n = 14;
      setInterval(function(){
        n = n >= 15 ? 1 : n + 1;
        var lang = D.documentElement.lang || 'en';
        var txt = lang === 'de' ? ('Aktualisiert vor ' + n + ' Sek.')
                : lang === 'el' ? ('Ενημερώθηκε πριν ' + n + 's')
                : ('Updated ' + n + 's ago');
        tick.textContent = txt;
      }, 1000);
    })();

    /* ── Hover styling (replaces the design's style-hover pseudo attr) ── */
    function parseDecls(str){
      var out = [];
      (str || '').split(';').forEach(function(piece){
        var i = piece.indexOf(':');
        if (i < 0) return;
        var prop = piece.slice(0, i).trim();
        var val = piece.slice(i + 1).trim();
        if (prop) out.push({ prop: prop, val: val });
      });
      return out;
    }
    [].slice.call(D.querySelectorAll('[data-hover]')).forEach(function(el){
      var decls = parseDecls(el.getAttribute('data-hover'));
      if (!decls.length) return;
      var saved = null;
      el.addEventListener('mouseenter', function(){
        saved = {};
        decls.forEach(function(d){ saved[d.prop] = el.style.getPropertyValue(d.prop); el.style.setProperty(d.prop, d.val); });
      });
      el.addEventListener('mouseleave', function(){
        if (!saved) return;
        decls.forEach(function(d){ if (saved[d.prop]) el.style.setProperty(d.prop, saved[d.prop]); else el.style.removeProperty(d.prop); });
        saved = null;
      });
    });

    /* ── Magnetic buttons + hero parallax ── */
    if (!reduce && pointerFine){
      [].slice.call(D.querySelectorAll('[data-magnetic]')).forEach(function(btn){
        btn.addEventListener('mousemove', function(e){
          var r = btn.getBoundingClientRect();
          var x = e.clientX - r.left - r.width / 2;
          var y = e.clientY - r.top - r.height / 2;
          btn.style.transform = 'translate(' + (x * 0.12) + 'px,' + (y * 0.22) + 'px)';
        });
        btn.addEventListener('mouseleave', function(){ btn.style.transform = ''; });
      });

      var hero = D.querySelector('[data-hero]');
      var shot = D.querySelector('[data-hero-shot]');
      if (hero && shot){
        hero.addEventListener('mousemove', function(e){
          var r = hero.getBoundingClientRect();
          var x = ((e.clientX - r.left) / r.width) - 0.5;
          var y = ((e.clientY - r.top) / r.height) - 0.5;
          shot.style.transform = 'perspective(2200px) rotateX(' + (6 - y * 4) + 'deg) rotateY(' + (x * 4) + 'deg)';
        });
        hero.addEventListener('mouseleave', function(){ shot.style.transform = 'perspective(2200px) rotateX(6deg)'; });
      }
    }

    /* ── Pricing form: native POST to formsubmit.co (redirects via _next).
       No preventDefault — only a brief sending state on the button. ── */
    var form = D.getElementById('pricing-form');
    if (form){
      form.addEventListener('submit', function(){
        var btn = form.querySelector('button[type=submit]');
        if (btn){
          var lang = D.documentElement.lang || 'en';
          btn.textContent = lang === 'de' ? 'Wird gesendet…' : lang === 'el' ? 'Αποστολή…' : 'Sending…';
          btn.style.opacity = '0.7';
          setTimeout(function(){ btn.style.opacity = ''; }, 6000);
        }
      });
    }
  });
})();
