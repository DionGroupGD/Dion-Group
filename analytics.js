/* ════════════════════════════════════════════════════
   Google Analytics 4 loader — CSP-safe + consent-gated.
   → Replace G-XXXXXXXXXX below with your GA4 Measurement ID.
   GA only loads after the visitor allows "Analytics" in the
   cookie banner (window.DionConsent). Until a real ID is set,
   this is a no-op.
   ════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ID = 'G-1CRLCBS70Z';                 // ← GA4 Measurement ID (Dion Group)
  if (!ID || /^G-XXXX/.test(ID)) return;   // not configured yet → do nothing

  var started = false;
  function start() {
    if (started) return;
    if (!(window.DionConsent && window.DionConsent.allows && window.DionConsent.allows('analytics'))) return;
    started = true;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', ID, { anonymize_ip: true });
  }

  // Consent withdrawn: stop Google Analytics on this page at once and remove
  // its cookies (_ga, _ga_<id>) from every domain level they may sit on.
  function stop() {
    window['ga-disable-' + ID] = true;
    var names = document.cookie.split(';').map(function (c) { return c.split('=')[0].trim(); })
      .filter(function (n) { return n === '_ga' || n.indexOf('_ga_') === 0 || n === '_gid'; });
    var parts = location.hostname.split('.');
    var domains = [''];
    for (var i = 0; i < parts.length - 1; i++) domains.push('; domain=.' + parts.slice(i).join('.'));
    names.forEach(function (n) {
      domains.forEach(function (d) { document.cookie = n + '=; Max-Age=0; path=/' + d; });
    });
  }
  function update() {
    var allowed = window.DionConsent && window.DionConsent.allows && window.DionConsent.allows('analytics');
    if (allowed) {
      window['ga-disable-' + ID] = false;
      start();
    } else {
      stop();
    }
  }

  update();                                             // consent may already be granted (or withdrawn earlier: clean up)
  window.addEventListener('dionConsentChange', update); // granted or withdrawn via the banner
})();
