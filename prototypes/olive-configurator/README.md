# Olive Configurator — prototype

A customer-facing product configurator for Intercomm Foods: pick variety, preparation,
calibre, jar, fill and palletising, and the tool derives a complete specification —
weights, case counts, pallet build and container loading — while blocking combinations
that cannot be produced.

Open `index.html` in a browser. No build step, no server, no dependencies.

## What it demonstrates

- **Rules, not fields.** Nine choices produce ~41 specification fields. Everything
  downstream of a choice is derived, so it cannot be mistyped or self-contradictory.
- **Blocked options stay visible, with the reason.** A jar that cannot hold the chosen
  calibre to a stable drained weight is shown disabled and explains why, rather than
  silently disappearing.
- **Real physics.** Calibre dimensions are computed from count-per-kilo (mass → volume →
  prolate spheroid), not illustrated. Fill windows come from jar volume, headspace,
  packing fraction and the wall-effect loss that makes large fruit pack badly in small
  jars. Pallet layers are the smallest of stack height, pallet handling weight and
  corrugate compression — and the binding constraint is named.
- **Hands off to the Offer Builder.** The output is shaped as an `article` record, the
  same object `newLine(article)` already consumes, so pricing, freight and the customer
  offersheet continue in the existing tool with nothing retyped.

## Status

The specification matrix (varieties, calibres, jar geometry, case grids, fill limits) is
realistic **placeholder** data, marked as such in the UI. The production version reads
Intercomm's own matrix. The rules engine is generic and does not change.

Not linked from the site navigation or `sitemap.xml`.
