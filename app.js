// JavaScript logic for Dion Group Homepage

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsHoverTilt = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const languageButtons = document.querySelectorAll('.lang-btn');
  const translatableElements = document.querySelectorAll('[data-en]');
  const ariaTranslatableElements = document.querySelectorAll('[data-aria-en]');
  const langBlocks = document.querySelectorAll('[data-lang-block]');

  // === Language switcher (EN / DE / GR) ===
  const supportedLanguages = ['en', 'de', 'gr'];
  const htmlLangMap = { en: 'en', de: 'de', gr: 'el' };

  const applyLanguage = (lang) => {
    const safeLang = supportedLanguages.includes(lang) ? lang : 'en';

    translatableElements.forEach((el) => {
      const translated = el.getAttribute(`data-${safeLang}`) || el.getAttribute('data-en');
      if (translated !== null) {
        if (el instanceof HTMLInputElement) {
          el.value = translated;
        } else if (el instanceof HTMLTextAreaElement) {
          el.value = translated;
        } else {
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

    languageButtons.forEach((btn) => {
      const isActive = btn.dataset.lang === safeLang;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    try {
      localStorage.setItem('dion_lang', safeLang);
    } catch (error) {
      // Ignore storage errors in private/incognito contexts.
    }

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

  if (languageButtons.length > 0 && translatableElements.length > 0) {
    let initialLang = 'en';
    const langParam = new URLSearchParams(window.location.search).get('lang');

    if (langParam && supportedLanguages.includes(langParam)) {
      initialLang = langParam;
    } else {
      try {
        const storedLang = localStorage.getItem('dion_lang');
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
        applyLanguage(btn.dataset.lang || 'en');
      });
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
