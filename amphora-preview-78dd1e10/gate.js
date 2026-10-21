/* Unlocks the private Amphora preview: derives the key from the password and decrypts the page.
   The password is kept for this browser tab only, so switching language does not ask again. */
(() => {
  const STORE = 'amphora-preview-key', $ = id => document.getElementById(id);
  const [iter, salt, iv, data] = $('payload').textContent.trim().split('.');
  const bytes = b => Uint8Array.from(atob(b), c => c.charCodeAt(0));
  const form = $('gate'), input = $('pw'), err = $('err'), btn = form.querySelector('button'), label = btn.textContent;
  async function unlock(pw) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(salt), iterations: +iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const html = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(iv) }, key, bytes(data)));
    try { sessionStorage.setItem(STORE, pw); } catch (e) {}
    document.open(); document.write(html); document.close();
  }
  function show() { document.body.classList.remove('checking'); input.focus(); }
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.hidden = true; btn.disabled = true; btn.textContent = form.dataset.busy;
    try { await unlock(input.value.trim()); }
    catch (x) { btn.disabled = false; btn.textContent = label; err.hidden = false; input.select(); }
  });
  let saved = null; try { saved = sessionStorage.getItem(STORE); } catch (e) {}
  if (saved) unlock(saved).catch(show); else show();
})();
