# Instagram kit (working files, not part of the website)

Source for the @dion_group Instagram launch: 3 carousels to pin, a vertical Reel of the Axon film, highlight covers and a profile picture. Keep this folder off `main`: GitHub Pages would publish it on dion-group.com.

- Rendered kit and captions: https://claude.ai/artifact/Xt3LSafxG1dziBTd9pPwvf (private to the owner)
- Profile copy and captions: `captions.md`

## Where it stands

The posts copy the look of the website that is live today (`index.html`, `styles-v3.css`): black and #f5f5f7 sections, centred type, Axon on the site's own MacBook and iPhone frames (`devices.css` is copied from `styles-v3.css`).

**Open task:** the new website at https://dion-group-preview.dion-film-tools.workers.dev (behind a preview code) has a different design. Its code page shows a warm off-white ground (#fcfaf8) with peach, lavender and mint glows, near-black ink (#16131d) and lighter headline weights. Rebuild the posts in that design:

1. Look at the new site's home and Axon pages (the local source, or the preview in a browser) and note its colours, type, spacing, buttons and how it shows the product.
2. Change `base2.css` (tokens, `.dark` / `.light` grounds, type) and the slide markup in `gen.py` to match. Keep the copy, slide order and counts unless the new site's wording differs.
3. Render, check every slide, then rebuild the Reel and the kit.

## Render

Needs Python 3, Node with Playwright (Chromium) and ffmpeg. From this folder:

```bash
python3 gen.py                       # writes v2-*.html
mkdir -p out2
OUT=out2 node render.js v2-post1-intro.html v2-post2-axon.html v2-post3-problems.html v2-extras.html
```

Slides are 1080 × 1350 (safe for the 3:4 profile grid crop); the Reel frame, Reel cover and highlight covers are 1080 × 1920; the profile picture is 1080 × 1080.

Reel (the film sits in the frame's black box at y 656–1264):

```bash
ffmpeg -y -loop 1 -framerate 30 -i out2/reel-frame.png -i ../../film/axon/axon-promo-en.mp4 \
  -filter_complex "[1:v]scale=1080:608:flags=lanczos,fps=30[v];[0:v][v]overlay=0:656:shortest=1,format=yuv420p[o]" \
  -map "[o]" -map 1:a -c:v libx264 -preset medium -crf 19 -c:a aac -b:a 160k -movflags +faststart out2/axon-reel.mp4
```

## Files

| File | What it is |
| --- | --- |
| `gen.py` | Builds every slide's HTML: intro (5), Axon (8), "Sound familiar?" (8), extras |
| `base2.css` | Slide design: grounds, type, buttons, pills, service cards |
| `devices.css` | MacBook and iPhone frames, copied from `styles-v3.css` |
| `render.js` | Screenshots each slide to PNG at exact size |
| `captions.md` | Profile fields and the four launch captions |

Images come from `tms/assets/`, the logo from `favicon-512x512.png`, fonts from `fonts/`. Nothing in the posts invents clients, numbers or results; the private Amphora preview is left out until the client agrees.
