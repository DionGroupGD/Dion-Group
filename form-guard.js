// Spam guard for the FormSubmit forms (homepage contact + Axon TMS pricing).
//
// Bots read a form's action URL from the HTML and POST to it directly, skipping the
// honeypot and everything else on the page. So the forms ship without an action, and
// this script attaches the FormSubmit endpoint at submit time, only when the
// submission looks human:
//   - the honeypot (_honey) is empty,
//   - the visitor really used the form (trusted pointer/keyboard/input events, which
//     page scripts cannot fake), and
//   - at least MIN_FILL_MS passed between that first interaction and the submit.
// A blocked visitor (e.g. a very fast autofill) sees the form's [data-guard-note]
// and can simply submit again.

(function () {
  const ENDPOINT = 'https://formsubmit.co/georgedion@dion-group.com';
  const MIN_FILL_MS = 3000;

  const guard = (form) => {
    const note = form.querySelector('[data-guard-note]');
    let startedAt = 0;

    const markStart = (event) => {
      if (event.isTrusted && !startedAt) startedAt = Date.now();
    };
    ['pointerdown', 'keydown', 'input', 'click'].forEach((type) => {
      form.addEventListener(type, markStart, true);
    });

    // Capture phase, so this runs before the form's other submit handlers
    // (e.g. the "Sending…" button state on the Axon page).
    form.addEventListener('submit', (event) => {
      const honey = form.elements.namedItem('_honey');
      const looksHuman = startedAt > 0
        && Date.now() - startedAt >= MIN_FILL_MS
        && !(honey && honey.value);

      if (looksHuman) {
        form.setAttribute('action', ENDPOINT);
        if (note) note.hidden = true;
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      if (note) note.hidden = false;
    }, true);
  };

  document.querySelectorAll('form[data-guard]').forEach(guard);
})();
