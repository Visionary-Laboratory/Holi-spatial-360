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
- `assets/site/spatial.js`: synchronized RGB-with-boxes and depth playback, with three thumbnail selectors.
- `assets/teaser.pdf` and `assets/teaser.png`: supplied teaser and its 2800-pixel-wide preview. The original PDF is unchanged.
- `assets/videos/`: comparison videos. The first collection and apartment walkthrough are trimmed as described below; other cases are copied without transcoding.
- `assets/posters/`: preview frames extracted at 0.5 seconds.
- `assets/panoramas/`: two representative full panoramas per case, copied unchanged from `four_cases_full_reference_panoramas.zip`.
- `assets/panorama-manifest.json`: selected panorama mappings, dimensions, and archive checksums.
- `assets/media-manifest.json`: original archive paths, current checksums, media metadata, and edit records (including source checksums for edited videos).
- `assets/spatial/`: three paired spatial examples and preview frames extracted at 1 second.
- `assets/spatial-manifest.json`: spatial video archive mappings, checksums, and frame counts.

The page opens with the title, a concise overview of the motivation, method, and dataset, then the teaser and framework, followed by video comparisons and spatial examples. The teaser and framework each have a single caption; the previous three-step method cards are removed. Click either figure to open its original PDF.

The source is `four_cases_all_baselines.zip`. The comparison includes our final output and five baselines. Our GS input and adapted DiFix intermediate outputs are excluded. GSFixer uses only the direct repair outputs. The four older GSFixer reconstruction videos are intentionally excluded from the page assets.

## Comparison behavior

Select a case, choose a baseline, and use the shared play, seek, speed, and restart controls. Slider mode overlays the matched views with a draggable divider. The page includes the supplied framework.

Qualitative comparison notes preserve the supplied information about native input differences, training splits, and deliberate clip cuts.

## First collection edit

The original 12-second Realsee collection has its 3–6 second segment removed from all six displayed method videos. The page now shows three clips, 135 frames at 15 fps, for 9 seconds total. Kept source frame ranges are [0, 45) and [90, 180). Videos are re-encoded at H.264 High / CRF 16 with no resolution or frame-rate change. The original ZIP is unchanged. The historical `case01_realsee_12s` directory name is retained for stable paths.

## Representative input panoramas

Two images change with the selected case. They are illustrative source observations, not a complete or equal-budget list of model inputs. Multi-clip cases show references for the opening clip; case 1 uses scene 00028, avoiding the deleted scene 00791 segment. Click either image to open the full panorama. Realsee JPGs are original ERPs; Ziroom JPGs are the supplied reprojections of original cube faces.

## Spatial examples

The three examples come from `selected_00862_00924_00527_rgb_bbox_depth_refs.zip`. Each pairs the final refined RGB video with 3D boxes (`04_shuffled_difix_wan_bbox.mp4`) with its matching GS camera-Z depth (`06_shuffled_gs_depth.mp4`). The MP4s are copied without transcoding. Each pair has matching frame counts and 30 fps; example 3 has a sub-millisecond container-duration difference, so playback uses the shorter duration. Depth uses the supplied fixed reversed-TURBO scale from 0.15 to 8 meters, with invalid pixels black.

Thumbnail buttons switch the paired videos without displaying dataset scene IDs. Shared controls handle playback, seeking, speed, restart, and full screen. Videos load when this section enters view. Starting either video section pauses the other. Open http://127.0.0.1:8765/#spatial to preview this section directly.

## Apartment walkthrough edit

The final 0.2 seconds are removed from all six `case02_ziroom_microwave` videos. Each now retains source frames [0, 134), with frames [134, 140) removed: 134 frames at 30 fps, or 4.466667 seconds. Resolution remains 512 × 512; the clips are re-encoded at H.264 High / CRF 16 and checked against the retained source frames. The page duration, route labels, and media manifest match the edited clips. Original archive files are unchanged.
