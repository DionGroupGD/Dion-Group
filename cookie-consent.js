(function () {
  const storageKey = 'dion_cookie_consent';
  const legacyPreferenceKeys = ['dion_lang'];
  const supportedLanguages = ['en', 'de', 'gr'];

  const copy = {
    en: {
      eyebrow: 'Privacy choices',
      title: 'Cookie and storage preferences',
      body: 'With your consent, we remember your language and count visits with Google Analytics.',
      body2: 'Necessary storage only keeps your choice, which you can change anytime with the cookie button.',
      reject: 'Reject optional',
      manage: 'Manage choices',
      accept: 'Accept all',
      save: 'Save choices',
      settings: 'Cookie settings',
      necessary: 'Necessary',
      necessaryText: 'Required for consent records and basic website operation.',
      preferences: 'Preferences',
      preferencesText: 'Remembers your language choice on this device.',
      analytics: 'Analytics',
      analyticsText: 'Google Analytics counts visits and pages (cookies from Google, kept up to 2 years).',
      policy: 'Cookie Policy'
    },
    de: {
      eyebrow: 'Datenschutz-Auswahl',
      title: 'Cookie- und Speicher-Einstellungen',
      body: 'Mit Ihrer Einwilligung merken wir uns Ihre Sprache und zählen Besuche mit Google Analytics.',
      body2: 'Notwendiger Speicher sichert nur Ihre Auswahl, die Sie jederzeit über die Cookie-Schaltfläche ändern können.',
      reject: 'Optionale ablehnen',
      manage: 'Auswahl verwalten',
      accept: 'Alle akzeptieren',
      save: 'Auswahl speichern',
      settings: 'Cookie-Einstellungen',
      necessary: 'Notwendig',
      necessaryText: 'Erforderlich für Einwilligungsnachweise und Grundfunktionen der Website.',
      preferences: 'Präferenzen',
      preferencesText: 'Speichert Ihre Sprachauswahl auf diesem Gerät.',
      analytics: 'Analytics',
      analyticsText: 'Google Analytics zählt Besuche und Seitenaufrufe (Cookies von Google, bis zu 2 Jahre gespeichert).',
      policy: 'Cookie-Richtlinie'
    },
    gr: {
      eyebrow: 'Επιλογές απορρήτου',
      title: 'Ρυθμίσεις cookies και αποθήκευσης',
      body: 'Με τη συγκατάθεσή σας θυμόμαστε τη γλώσσα σας και μετράμε τις επισκέψεις με το Google Analytics.',
      body2: 'Η απαραίτητη αποθήκευση κρατά μόνο την επιλογή σας, που μπορείτε να αλλάξετε όποτε θέλετε από το κουμπί cookies.',
      reject: 'Απόρριψη προαιρετικών',
      manage: 'Διαχείριση επιλογών',
      accept: 'Αποδοχή όλων',
      save: 'Αποθήκευση επιλογών',
      settings: 'Ρυθμίσεις cookies',
      necessary: 'Απαραίτητα',
      necessaryText: 'Απαιτούνται για την καταγραφή συγκατάθεσης και τη βασική λειτουργία.',
      preferences: 'Προτιμήσεις',
      preferencesText: 'Θυμάται την επιλογή γλώσσας σε αυτή τη συσκευή.',
      analytics: 'Analytics',
      analyticsText: 'Το Google Analytics μετρά επισκέψεις και σελίδες (cookies της Google, διατηρούνται έως 2 χρόνια).',
      policy: 'Πολιτική Cookies'
    }
  };

  const getPageLang = () => {
    const queryLang = new URLSearchParams(window.location.search).get('lang');
    if (supportedLanguages.includes(queryLang)) return queryLang;
    const htmlLang = document.documentElement.lang;
    if (htmlLang === 'de') return 'de';
    if (htmlLang === 'el') return 'gr';
    return 'en';
  };

  const readConsent = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
      return saved && saved.version === 1 ? saved : null;
    } catch (error) {
      return null;
    }
  };

  const writeConsent = (choices) => {
    const consent = {
      version: 1,
      necessary: true,
      preferences: Boolean(choices.preferences),
      analytics: Boolean(choices.analytics),
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(storageKey, JSON.stringify(consent));
      if (!consent.preferences) {
        legacyPreferenceKeys.forEach((key) => localStorage.removeItem(key));
      }
    } catch (error) {
      // If storage is unavailable, the banner remains functional for this page view.
    }

    window.dispatchEvent(new CustomEvent('dionConsentChange', { detail: consent }));
    return consent;
  };

  window.DionConsent = {
    get: readConsent,
    allows(category) {
      if (category === 'necessary') return true;
      const consent = readConsent();
      return Boolean(consent && consent[category]);
    },
    save: writeConsent,
    reset() {
      try {
        localStorage.removeItem(storageKey);
      } catch (error) {
        // Ignore storage errors.
      }
      window.dispatchEvent(new CustomEvent('dionConsentReset'));
    }
  };

  const optionMarkup = (id, label, text, checked, disabled) => `
    <label class="cookie-consent__option" for="${id}">
      <span><strong>${label}</strong><span>${text}</span></span>
      <input id="${id}" type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
    </label>`;

  const buildDialog = () => {
    const lang = getPageLang();
    const t = copy[lang] || copy.en;
    const saved = readConsent();
    const preferencesChecked = saved ? saved.preferences : false;
    const analyticsChecked = saved ? saved.analytics : false;

    const dialog = document.createElement('section');
    dialog.className = 'cookie-consent';
    dialog.id = 'dion-cookie-consent';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'false');
    dialog.setAttribute('aria-labelledby', 'dion-cookie-title');
    dialog.setAttribute('aria-describedby', 'dion-cookie-copy dion-cookie-copy2');
    dialog.innerHTML = `
      <span class="cookie-consent__eyebrow">${t.eyebrow}</span>
      <h2 id="dion-cookie-title">${t.title}</h2>
      <p id="dion-cookie-copy">${t.body}</p>
      <p id="dion-cookie-copy2" class="cookie-consent__more">${t.body2} <a href="/cookies.html">${t.policy}</a>.</p>
      <div class="cookie-consent__choices" hidden>
        ${optionMarkup('dion-cookie-necessary', t.necessary, t.necessaryText, true, true)}
        ${optionMarkup('dion-cookie-preferences', t.preferences, t.preferencesText, preferencesChecked, false)}
        ${optionMarkup('dion-cookie-analytics', t.analytics, t.analyticsText, analyticsChecked, false)}
      </div>
      <div class="cookie-consent__actions">
        <button type="button" class="cookie-consent__btn cookie-consent__btn--primary" data-cookie-action="reject">${t.reject}</button>
        <button type="button" class="cookie-consent__btn" data-cookie-action="manage">${t.manage}</button>
        <button type="button" class="cookie-consent__btn cookie-consent__btn--primary" data-cookie-action="accept">${t.accept}</button>
      </div>`;

    const settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.className = 'cookie-settings-trigger';
    settingsButton.setAttribute('aria-label', t.settings);
    settingsButton.title = t.settings;
    settingsButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9 3.2 3.2 0 0 1-3.7-3.2A3.2 3.2 0 0 1 14.4 5 3 3 0 0 1 12 3z"/><circle cx="8.6" cy="10" r="1.1"/><circle cx="10.4" cy="15.2" r="1.1"/><circle cx="15.4" cy="14.6" r="1.1"/></svg>';
    settingsButton.hidden = !saved;

    const choices = dialog.querySelector('.cookie-consent__choices');
    const manageButton = dialog.querySelector('[data-cookie-action="manage"]');
    const rejectButton = dialog.querySelector('[data-cookie-action="reject"]');
    const acceptButton = dialog.querySelector('[data-cookie-action="accept"]');

    const closeDialog = () => {
      dialog.hidden = true;
      settingsButton.hidden = false;
      settingsButton.focus({ preventScroll: true });
    };

    const openDialog = () => {
      const consent = readConsent();
      dialog.querySelector('#dion-cookie-preferences').checked = Boolean(consent && consent.preferences);
      dialog.querySelector('#dion-cookie-analytics').checked = Boolean(consent && consent.analytics);
      choices.hidden = false;
      manageButton.textContent = t.save;
      dialog.hidden = false;
      settingsButton.hidden = true;
      rejectButton.focus({ preventScroll: true });
    };

    rejectButton.addEventListener('click', () => {
      writeConsent({ preferences: false, analytics: false });
      closeDialog();
    });

    acceptButton.addEventListener('click', () => {
      writeConsent({ preferences: true, analytics: true });
      closeDialog();
    });

    manageButton.addEventListener('click', () => {
      if (choices.hidden) {
        choices.hidden = false;
        manageButton.textContent = t.save;
        dialog.querySelector('#dion-cookie-preferences').focus({ preventScroll: true });
        return;
      }

      writeConsent({
        preferences: dialog.querySelector('#dion-cookie-preferences').checked,
        analytics: dialog.querySelector('#dion-cookie-analytics').checked
      });
      closeDialog();
    });

    settingsButton.addEventListener('click', openDialog);

    if (saved) {
      dialog.hidden = true;
    }

    document.body.append(dialog, settingsButton);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildDialog, { once: true });
  } else {
    buildDialog();
  }
})();
