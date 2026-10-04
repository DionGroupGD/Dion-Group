// JavaScript logic for Dion Group Homepage

// Activate the web-font stylesheet (loaded non-render-blocking via media="print").
// Runs as soon as this deferred script executes, once the DOM is parsed.
(function () {
  var gf = document.getElementById('gfont');
  if (gf) gf.media = 'all';
})();

document.addEventListener('DOMContentLoaded', () => {
  // An address with a #section (a link from another page, a language switch)
  // opens at that section at once. With the page's smooth scrolling, the browser
  // would otherwise glide there from the top once everything has loaded.
  if (window.location.hash.length > 1) {
    let target = null;
    try {
      target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    } catch (error) {
      // a malformed address: leave it to the browser
    }
    if (target) {
      const root = document.documentElement;
      root.style.scrollBehavior = 'auto';
      target.scrollIntoView();
      const restore = () => setTimeout(() => { root.style.scrollBehavior = ''; }, 400);
      if (document.readyState === 'complete') restore();
      else window.addEventListener('load', restore, { once: true });
    }
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsHoverTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const languageButtons = document.querySelectorAll('.lang-btn');
  const translatableElements = document.querySelectorAll('[data-en]');
  const ariaTranslatableElements = document.querySelectorAll('[data-aria-en]');
  const langBlocks = document.querySelectorAll('[data-lang-block]');

  // === Language switcher (EN / DE / GR) ===
  const supportedLanguages = ['en', 'de', 'gr'];
  const htmlLangMap = { en: 'en', de: 'de', gr: 'el' };
  const fromHtmlLang = { en: 'en', de: 'de', el: 'gr' };

  // The home page and the Axon page also exist as static German and Greek pages
  // (/de/…, /gr/…), generated from the English ones by archive/site-tools/
  // lang_pages.cjs. They list each other as <link rel="alternate" hreflang>.
  // There the page's own language wins and the buttons go to the other version;
  // on every other page the language is switched in place, and links to those
  // pages lead to the version in the language being read.
  const versions = {};
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => {
    const lang = fromHtmlLang[link.getAttribute('hreflang')];
    try {
      if (lang) versions[lang] = new URL(link.getAttribute('href')).pathname;
    } catch (error) {
      // ignore a malformed link
    }
  });
  const staticLang = Object.keys(versions).length > 1 ? (fromHtmlLang[document.documentElement.lang] || 'en') : null;
  const staticPages = { '/': '', '/index.html': '', '/tms/axon.html': 'tms/axon.html' };
  const otherParams = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete('lang');
    const query = params.toString();
    return query ? `?${query}` : '';
  };

  const rememberLanguage = (lang) => {
    try {
      if (window.DionConsent?.allows('preferences')) {
        localStorage.setItem('dion_lang', lang);
      } else {
        localStorage.removeItem('dion_lang');
      }
    } catch (error) {
      // Ignore storage errors in private/incognito contexts.
    }
  };

  // to the same page in another language, at the section being read
  const goToVersion = (lang) => {
    let hash = window.location.hash;
    if (window.scrollY > 40) {
      let best = null;
      new Set([...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1))).forEach((id) => {
        const el = id && document.getElementById(id);
        const top = el ? el.getBoundingClientRect().top : Infinity;
        if (top <= window.innerHeight * 0.4 && (!best || top > best.top)) best = { id, top };
      });
      if (best) hash = `#${best.id}`;
    }
    window.location.href = `${versions[lang]}${otherParams()}${hash}`;
  };

  // pages switched in place: links to the static pages follow the language
  const localiseLinks = (lang) => {
    document.querySelectorAll('a[href]').forEach((a) => {
      if (!a.hasAttribute('data-href')) a.setAttribute('data-href', a.getAttribute('href'));
      const original = a.getAttribute('data-href');
      let url;
      try {
        url = new URL(original, window.location.href);
      } catch (error) {
        return;
      }
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      const rest = staticPages[url.pathname];
      if (lang === 'en' || (rest === undefined && !url.pathname.endsWith('.html'))) {
        a.setAttribute('href', original);
        return;
      }
      if (rest !== undefined) url.pathname = `/${lang}/${rest}`;
      else url.searchParams.set('lang', lang);
      a.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
    });
  };

  const applyLanguage = (lang) => {
    const safeLang = supportedLanguages.includes(lang) ? lang : 'en';

    translatableElements.forEach((el) => {
      const translated = el.getAttribute(`data-${safeLang}`) || el.getAttribute('data-en');
      if (translated !== null) {
        if (el instanceof HTMLInputElement) {
          el.value = translated;
        } else if (el instanceof HTMLTextAreaElement) {
          el.value = translated;
        } else if (el.textContent !== translated) {
          // only when it changes: rewriting identical text repaints it (and delays the page's first big paint)
          el.textContent = translated;
        }
      }
    });

    ariaTranslatableElements.forEach((el) => {
      const translatedAria = el.getAttribute(`data-aria-${safeLang}`) || el.getAttribute('data-aria-en');
      if (translatedAria) {
        el.setAttribute('aria-label', translatedAria);
      }
    });

    if (langBlocks.length > 0) {
      let hasVisibleBlock = false;
      langBlocks.forEach((block) => {
        const blockLang = block.getAttribute('data-lang-block');
        const isVisible = blockLang === safeLang;
        block.hidden = !isVisible;
        if (isVisible) {
          hasVisibleBlock = true;
        }
      });

      if (!hasVisibleBlock) {
        langBlocks.forEach((block) => {
          block.hidden = block.getAttribute('data-lang-block') !== 'en';
        });
      }
    }

    const body = document.body;
    const title = body.getAttribute(`data-title-${safeLang}`) || body.getAttribute('data-title-en');
    const description = body.getAttribute(`data-meta-description-${safeLang}`) || body.getAttribute('data-meta-description-en');
    const ogTitle = body.getAttribute(`data-meta-og-title-${safeLang}`) || body.getAttribute('data-meta-og-title-en');
    const ogDescription = body.getAttribute(`data-meta-og-description-${safeLang}`) || body.getAttribute('data-meta-og-description-en');
    const twitterTitle = body.getAttribute(`data-meta-twitter-title-${safeLang}`) || body.getAttribute('data-meta-twitter-title-en');
    const twitterDescription = body.getAttribute(`data-meta-twitter-description-${safeLang}`) || body.getAttribute('data-meta-twitter-description-en');

    if (title) {
      document.title = title;
    }
    if (description) {
      const descriptionMeta = document.querySelector('#meta-description');
      if (descriptionMeta) {
        descriptionMeta.setAttribute('content', description);
      }
    }
    if (ogTitle) {
      const ogTitleMeta = document.querySelector('#meta-og-title');
      if (ogTitleMeta) {
        ogTitleMeta.setAttribute('content', ogTitle);
      }
    }
    if (ogDescription) {
      const ogDescriptionMeta = document.querySelector('#meta-og-description');
      if (ogDescriptionMeta) {
        ogDescriptionMeta.setAttribute('content', ogDescription);
      }
    }
    if (twitterTitle) {
      const twitterTitleMeta = document.querySelector('#meta-twitter-title');
      if (twitterTitleMeta) {
        twitterTitleMeta.setAttribute('content', twitterTitle);
      }
    }
    if (twitterDescription) {
      const twitterDescriptionMeta = document.querySelector('#meta-twitter-description');
      if (twitterDescriptionMeta) {
        twitterDescriptionMeta.setAttribute('content', twitterDescription);
      }
    }

    document.documentElement.lang = htmlLangMap[safeLang] || 'en';

    // forms send the visitor on to a thank-you page in the same language
    document.querySelectorAll('input[name="_next"]').forEach((input) => {
      try {
        const next = new URL(input.value);
        if (safeLang === 'en') next.searchParams.delete('lang');
        else next.searchParams.set('lang', safeLang);
        input.value = next.toString();
      } catch (error) {
        // leave an unusual value as it is
      }
    });

    languageButtons.forEach((btn) => {
      const isActive = btn.dataset.lang === safeLang;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    rememberLanguage(safeLang);

    // a static language page keeps its own address
    if (staticLang) return;
    localiseLinks(safeLang);
    const currentUrl = new URL(window.location.href);
    if (safeLang === 'en') {
      currentUrl.searchParams.delete('lang');
    } else {
      currentUrl.searchParams.set('lang', safeLang);
    }
    const nextRelativeUrl = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    const currentRelativeUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextRelativeUrl !== currentRelativeUrl) {
      window.history.replaceState({}, '', nextRelativeUrl);
    }
  };

  // pages without a switcher (the thank-you pages) still follow ?lang= and the saved choice
  if (translatableElements.length > 0) {
    let initialLang = 'en';
    const langParam = new URLSearchParams(window.location.search).get('lang');

    if (staticLang) {
      // an older ?lang= link to a page that now has its own language versions
      if (langParam && langParam !== staticLang && versions[langParam]) {
        window.location.replace(`${versions[langParam]}${otherParams()}${window.location.hash}`);
        return;
      }
      if (langParam) {
        window.history.replaceState({}, '', `${window.location.pathname}${otherParams()}${window.location.hash}`);
      }
      initialLang = staticLang;
    } else if (langParam && supportedLanguages.includes(langParam)) {
      initialLang = langParam;
    } else {
      try {
        const storedLang = window.DionConsent?.allows('preferences') ? localStorage.getItem('dion_lang') : null;
        if (storedLang && supportedLanguages.includes(storedLang)) {
          initialLang = storedLang;
        }
      } catch (error) {
        // Keep default language when storage access is unavailable.
      }
    }

    applyLanguage(initialLang);

    languageButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang || 'en';
        if (staticLang) {
          if (lang !== staticLang && versions[lang]) {
            rememberLanguage(lang);
            goToVersion(lang);
          }
          return;
        }
        applyLanguage(lang);
      });
    });

    window.addEventListener('dionConsentChange', (event) => {
      if (!event.detail?.preferences) return;
      const activeButton = document.querySelector('.lang-btn.is-active');
      const activeLang = activeButton?.dataset.lang || initialLang;
      if (supportedLanguages.includes(activeLang)) {
        try {
          localStorage.setItem('dion_lang', activeLang);
        } catch (error) {
          // Ignore storage errors in private/incognito contexts.
        }
      }
    });
  }

  // === 3D Tilt effect for glass panels ===
  const cards = document.querySelectorAll('.glass-panel:not(.disabled):not(.contact-panel)');

  if (supportsHoverTilt && !prefersReducedMotion) {
    cards.forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const rotateX = (y / rect.height) * -10;
        const rotateY = (x / rect.width) * 10;
        card.style.transform = `perspective(1000px) translateY(-8px) scale(1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // === Scroll Reveal Animation (Intersection Observer) ===
  const revealElements = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    revealElements.forEach((el) => {
      el.classList.add('active');
    });
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, {
    root: null,
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  if (!prefersReducedMotion) {
    revealElements.forEach((el) => {
      revealObserver.observe(el);
    });
  } else {
    revealElements.forEach((el) => {
      el.classList.add('active');
    });
  }

});
