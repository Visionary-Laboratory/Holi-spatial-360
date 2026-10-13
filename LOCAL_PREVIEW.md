# Local project-page preview

This checkout uses the local `page` branch. The page is a static website: no build or package installation is required.

From this directory, start the preview:

```sh
node scripts/serve.mjs
```

Open http://127.0.0.1:8765. The preview server supports byte-range requests for accurate video seeking. You can also open `index.html` directly for a basic file preview.

## Where to edit

- `index.html`: page content and sections.
- `assets/site/style.css`: layout, colors, and responsive styles.
- `assets/site/app.js`: case metadata, baseline labels, and synchronized playback.
- `assets/videos/`: comparison videos. The first collection is trimmed as described below; other cases are copied without transcoding.
- `assets/posters/`: preview frames extracted at 0.5 seconds.
- `assets/panoramas/`: two representative full panoramas per case, copied unchanged from `four_cases_full_reference_panoramas.zip`.
- `assets/panorama-manifest.json`: selected panorama mappings, dimensions, and archive checksums.
- `assets/media-manifest.json`: original archive paths, current checksums, media metadata, and edit records (including source checksums for edited videos).

The source is `four_cases_all_baselines.zip`. The comparison includes our final output and five baselines. Our GS input and adapted DiFix intermediate outputs are excluded. GSFixer uses only the direct repair outputs. The four older GSFixer reconstruction videos are intentionally excluded from the page assets.

## Comparison behavior

Select a case, choose a baseline, and use the shared play, seek, speed, and restart controls. Slider mode overlays the matched views with a draggable divider. The page includes the supplied framework.

Qualitative comparison notes preserve the supplied information about native input differences, training splits, and deliberate clip cuts.

## First collection edit

The original 12-second Realsee collection has its 3–6 second segment removed from all six displayed method videos. The page now shows three clips, 135 frames at 15 fps, for 9 seconds total. Kept source frame ranges are [0, 45) and [90, 180). Videos are re-encoded at H.264 High / CRF 16 with no resolution or frame-rate change. The original ZIP is unchanged. The historical `case01_realsee_12s` directory name is retained for stable paths.

## Representative input panoramas

Two images change with the selected case. They are illustrative source observations, not a complete or equal-budget list of model inputs. Multi-clip cases show references for the opening clip; case 1 uses scene 00028, avoiding the deleted scene 00791 segment. Click either image to open the full panorama. Realsee JPGs are original ERPs; Ziroom JPGs are the supplied reprojections of original cube faces.
