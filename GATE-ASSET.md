# Image-based entrance gate

Updated 18 November 2026, replacing the programmatically drawn SVG gate only.

## Asset and source

- Production asset: `dist/assets/images/cemetery-gate-image.webp` (1394 × 1128, transparent alpha).
- Source: [Clipart Library, Gothic Cemetery Gate](https://clipart-library.com/clipart/cemetery-cliparts-22.htm).
- Source PNG: https://clipart-library.com/2023/png-transparent-gray-metal-gate-cemetery-halloween-graveyard-gate-happy-halloween-image-file-formats-fence.png
- Publisher describes the asset as personal-use imagery suitable for school projects. This is not an official Book of Life gate still. Broader reuse rights have not been independently verified.
- Original downloaded image and prepared transparent PNG are preserved in `../references/gate-candidates/`.

## Preparation

The downloaded source had an opaque checkerboard baked into the background. The built-in image tool was used in background-extraction mode to prepare a transparent cutout from that existing gate image. No API key or fallback CLI was used. The prepared output was inspected, copied into the workspace, and encoded as WebP with alpha preserved.

The image tool is an editing process and does not guarantee pixel-identical preservation of every fine source detail. The output is a prepared derivative of the sourced gate image, not a claim of original film artwork.

Final preparation prompt:

> Use case: background-extraction. Asset type: existing textured cemetery gate cutout for an animated website. Edit ONLY the supplied image. Remove the baked-in gray/white checkerboard from behind the gate AND from every hole between the iron bars. Output genuine transparent alpha, with no checkerboard, no white matte, no shadows outside the object. Preserve the supplied closed double gate, both stone posts and crosses, original weathered dark stone/metal textures, exact ornate scrollwork, straight-on front view, center seam, proportions and arrangement. This is background removal of the sourced image, not a new gate design. Keep every existing piece of ironwork and both stone posts, do not invent new ornaments, do not add scenery or text. Frame entire gate tightly with small transparent margins on all sides, neither post clipped. High-detail clean antialiased edges. The two leaves remain shut, meeting exactly in the middle, posts remain outside them.

## Integration

Four aligned image instances use one cached asset: two clipped fixed-post layers and two clipped moving-leaf layers. CSS clipping isolates the pieces at render time; the source raster is not sliced into separately repainted designs.

The two leaf containers rotate around their outside hinges using the existing scroll timeline. Reduced-motion mode keeps the gate still. The title, header, buttons, candle decorations, particle canvas, book, page interactions, audio, finale, and chapter navigation retain their existing implementation.

Gate-specific CSS lives in `dist/css/entrance-gate.css`, scoped to `.image-gate`. The obsolete gate-bar construction code was removed from `buildDecorations`; the flower and candle construction remains.

`tools/qa/gate.py` checks image loading, scroll opening, stationary posts, return-to-closed behavior, reduced motion, responsive layout, restart, and continued book access when the decorative image fails.
