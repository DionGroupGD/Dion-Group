# offer-lock

Packages the Intercomm Foods **Offer Builder** into a single passphrase-encrypted
HTML file, so it can be handed to colleagues without handing over the source.

```
src/Offer Sheet INT/          →   Offer Sheet INT (Locked).html
  index.html                        one file · 241 KB · works offline
  styles.css                        opens with a passphrase
  calc.js                           no readable source inside
  app.js
```

---

## What this actually protects

**The file on disk is ciphertext.** The whole app — markup, styles, the Excel
costing engine, the pricing logic — is stored as a single AES-256-GCM blob. With
no passphrase there is nothing to read, edit, re-brand or feed to a tool. Opening
the file in a text editor, a decompiler or an AI assistant yields base64 and
nothing else. That is not obfuscation you can peel back; it is encryption, and
the key is not in the file.

**Tampering is detected, not tolerated.** AES-GCM is authenticated. Change one
byte of the ciphertext and the tag check fails: the file refuses to open rather
than opening a modified app. Nobody can splice their own code in, strip the
copyright line, or alter the calculations without the passphrase.

**Authorship travels inside the encryption.** The copyright notice on the unlock
screen sits in the plaintext shell, but the credit rendered in the app's sidebar
is *inside* the encrypted payload, along with a build id. Removing it means
decrypting, editing and re-encrypting — which needs the passphrase and this tool.

**Brute force is not a route in.** The key is derived with PBKDF2-HMAC-SHA256 at
1,000,000 iterations, and `--gen-passphrase` issues 100-bit passphrases. Guessing
one is not a matter of a fast computer or a patient attacker; the search space is
larger than the problem allows.

## What it does not protect — read this before you promise anything

Once a colleague types the passphrase, the app is running in their browser. At
that moment the decrypted code exists in that browser's memory, and anyone
determined and technical enough can recover it from there with developer tools.
That is true of every in-browser application, protected or not, and no amount of
encryption changes it — the code has to be readable by the machine that runs it.

So the honest boundary is:

| | Protected |
|---|---|
| Someone you send the file to who does **not** have the passphrase | Yes — completely |
| The file leaking, being forwarded, or ending up in a shared drive | Yes — it is useless without the passphrase |
| Someone pasting it into an AI and asking it to explain or rewrite the code | Yes — there is nothing to read |
| Casual copying, re-branding, "I made this" | Yes — the credit cannot be edited out |
| A skilled developer **with** the passphrase who is willing to dig through browser internals | **No** |

For that last row the protection is not technical, it is the copyright notice,
the build id (which identifies exactly which copy leaked) and the fact that
you are handing it to named colleagues rather than publishing it. Treat the
passphrase as the licence: it goes to people you have decided to trust.

---

## Usage

```bash
npm install

# a strong passphrase — store it in a password manager, it cannot be recovered
node build.mjs --gen-passphrase

# build
node build.mjs \
  --src  "./src/Offer Sheet INT" \
  --out  "./dist/Offer Sheet INT (Locked).html" \
  --owner "George Dionysiou · Dion Group"

# prove the build is both sealed and still the same app (42 checks, real browser)
OFFER_LOCK_PASSPHRASE='...' node verify.mjs
```

The passphrase is read from `--passphrase-file`, then `$OFFER_LOCK_PASSPHRASE`,
then an interactive prompt. It is never written to disk by the build.

### Options

| Flag | Default | |
|---|---|---|
| `--src <dir>` | `./src/Offer Sheet INT` | folder with the four source files |
| `--out <file>` | `./dist/Offer Sheet INT (Locked).html` | where to write |
| `--owner <text>` | `George Dionysiou — Dion Group` | name in the copyright notice |
| `--title <text>` | `Offer Builder · Intercomm Foods` | tab title |
| `--brand-top` / `--brand-sub` | `INTERCOMM` / `FOODS` | lock-screen wordmark |
| `--iterations <n>` | `1000000` | PBKDF2 iterations |
| `--passphrase-file <f>` | — | read passphrase from a file |
| `--no-obfuscate` | off | minify only, skip obfuscation |
| `--no-compress` | off | skip gzip before encrypting |
| `--gen-passphrase` | — | print a 100-bit passphrase and exit |

## How the build works

1. **Bundle.** `calc.js` and `app.js` are concatenated and minified as one unit —
   they share the global scope (`app.js` reads `calc.js`'s `XL`), so mangling
   them separately would rename that reference in one file and not the other.
2. **Obfuscate.** A conservative `javascript-obfuscator` pass: string array with
   base64 encoding, rotation, shuffling and wrappers. Control-flow flattening and
   dead-code injection stay **off** — they cost real speed in a UI this
   interactive and buy nothing against someone who already has the passphrase.
3. **Payload.** `{html, css, js}` as JSON, gzipped, SHA-256 recorded.
4. **Encrypt.** PBKDF2-SHA256 (1,000,000 iterations, 128-bit salt) derives a
   256-bit key; AES-256-GCM with a 96-bit IV produces the ciphertext.
5. **Shell.** The ciphertext, the KDF parameters and the digest are embedded in
   an unlock page that decrypts in the browser via WebCrypto.

On unlock the shell replaces the document, then attaches the CSS and the bundle
as DOM nodes with `textContent` rather than writing markup — the payload never
passes through the HTML parser, so no `</script>` escaping tricks are needed and
nothing in the source can break out of its container.

## Verification

`verify.mjs` drives a real Chromium over `file://` — exactly how a colleague
opens the file — and asserts in both directions:

- **sealed** — no sampled source line survives in the output, no external
  resource is referenced, a wrong passphrase is rejected, and a single flipped
  byte in the ciphertext makes the file refuse to open
- **intact** — the unlocked app renders *byte-identical* markup to the
  unprotected original across a 12-screen scripted tour (all four sections plus
  the six builder steps, with the clock and RNG frozen so the comparison is
  exact), writes to `localStorage`, and still exports and re-imports a backup

Run it after every rebuild. A green run is what lets you send the file out.

## Distributing

Send the locked HTML. Send the passphrase **separately** — a different channel
from the file, so one intercepted message is not enough.

Colleagues need nothing installed: unzip, double-click, type the passphrase.
Their data stays in their own browser exactly as before, and **Backup** /
**Restore** work unchanged — that remains the only way to move offers between
people, and the only thing standing between them and a cleared browser.

To rotate the passphrase, rebuild with a new one and reissue the file. Old copies
keep working with the old passphrase, so rotation is a re-distribution, not a
revocation — the build id on the lock screen tells you which copy someone has.

## Repository hygiene

This is a public repository. `src/`, `dist/` and any passphrase file are
gitignored and **must stay that way** — committing the plaintext sources or the
passphrase would undo everything above. Only the tooling is versioned here.
