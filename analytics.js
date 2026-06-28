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

  start();                                            // consent may already be granted
  window.addEventListener('dionConsentChange', start); // or granted later via the banner
})();
