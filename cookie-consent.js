(function () {
  const storageKey = 'dion_cookie_consent';
  const legacyPreferenceKeys = ['dion_lang'];
  const supportedLanguages = ['en', 'de', 'gr'];

  const copy = {
    en: {
      eyebrow: 'Privacy choices',
      title: 'Cookie and storage preferences',
      body: 'We use necessary browser storage to remember your consent. Optional preferences can remember your language. Analytics are currently not active, but this choice keeps future tracking blocked unless you allow it.',
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
      analyticsText: 'Allows privacy-respecting analytics if added later.',
      policy: 'Cookie Policy'
    },
    de: {
      eyebrow: 'Datenschutz-Auswahl',
      title: 'Cookie- und Speicher-Einstellungen',
      body: 'Wir verwenden notwendigen Browser-Speicher, um Ihre Einwilligung zu merken. Optionale Präferenzen können Ihre Sprache speichern. Analytics sind aktuell nicht aktiv, bleiben aber blockiert, solange Sie sie nicht erlauben.',
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
      analyticsText: 'Erlaubt datenschutzfreundliche Analytics, falls sie später ergänzt werden.',
      policy: 'Cookie-Richtlinie'
    },
    gr: {
      eyebrow: 'Επιλογές απορρήτου',
      title: 'Ρυθμίσεις cookies και αποθήκευσης',
      body: 'Χρησιμοποιούμε απαραίτητη αποθήκευση στον browser για να θυμόμαστε τη συγκατάθεσή σας. Προαιρετικές προτιμήσεις μπορούν να θυμούνται τη γλώσσα σας. Analytics δεν είναι ενεργά τώρα, αλλά η επιλογή αυτή τα κρατά μπλοκαρισμένα εκτός αν τα επιτρέψετε.',
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
      analyticsText: 'Επιτρέπει privacy-respecting analytics αν προστεθούν αργότερα.',
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
    dialog.setAttribute('aria-describedby', 'dion-cookie-copy');
    dialog.innerHTML = `
      <span class="cookie-consent__eyebrow">${t.eyebrow}</span>
      <h2 id="dion-cookie-title">${t.title}</h2>
      <p id="dion-cookie-copy">${t.body} <a href="/cookies.html">${t.policy}</a>.</p>
      <div class="cookie-consent__choices" hidden>
        ${optionMarkup('dion-cookie-necessary', t.necessary, t.necessaryText, true, true)}
        ${optionMarkup('dion-cookie-preferences', t.preferences, t.preferencesText, preferencesChecked, false)}
        ${optionMarkup('dion-cookie-analytics', t.analytics, t.analyticsText, analyticsChecked, false)}
      </div>
      <div class="cookie-consent__actions">
        <button type="button" class="cookie-consent__btn cookie-consent__btn--text" data-cookie-action="reject">${t.reject}</button>
        <button type="button" class="cookie-consent__btn" data-cookie-action="manage">${t.manage}</button>
        <button type="button" class="cookie-consent__btn cookie-consent__btn--primary" data-cookie-action="accept">${t.accept}</button>
      </div>`;

    const settingsButton = document.createElement('button');
    settingsButton.type = 'button';
    settingsButton.className = 'cookie-settings-trigger';
    settingsButton.textContent = t.settings;
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
