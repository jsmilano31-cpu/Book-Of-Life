# The Book of Life: Beyond the Pages

A complete browser-based academic fan experience: a scroll-driven cemetery-to-afterlife prologue, a seven-spread Turn.js storybook, interactive details, and a book-to-world cinematic ending.

## Run locally

No application dependencies need installation. All runtime libraries, fonts, images, and the atmospheric video are included in `dist/`.

```powershell
cd "C:\Users\Windows 11\Desktop\BOL\beyond-the-pages"
npm start
```

Open `http://127.0.0.1:4173`. Serve over HTTP; opening `index.html` directly as a file will not load JavaScript modules correctly.

`npm run dev`, `npm start`, and `npm run preview` run the same local server. It serves the project’s `dist/` folder with caching disabled so older JavaScript cannot be mixed with an updated page. Reload the page after making changes.

`npm run build` refreshes the entry script's content-based URL and validates the production-ready files in `dist/`; this buildless site does not require a compilation step. The versioned URL prevents an older cached entry script from being used with updated HTML after a deployment. `npm run check` validates JavaScript syntax, referenced assets, the chapter/page structure, and the hosting manifest without changing files.

## Experience

1. Scroll to open the cemetery gate and follow the story of Manolo, Joaquín, and María.
2. Enter the Land of the Remembered and click or tap the awakened book.
3. Explore seven two-page chapters on desktop. Narrow devices use fourteen individual interior pages.
4. Drag page corners, use previous/next buttons, use arrow keys, or swipe. The chapter menu can jump to any chapter.
5. Discover glowing details, trace the SVG marigold route, and light three candles.
6. Activate the final-page button to begin the cinematic farewell. A visible control can skip to credits.
7. Replay the opening or return to the book from the credits.

Sound starts only when the visitor selects **Play ambience** in the sound controls. Play/pause, mute, volume, and an atmosphere pause control are available. The ambient score and interaction sounds are original Web Audio compositions; no film soundtrack is included.

## Real academic credits

Set `dist/assets/project-info.json` to include the team, course, section, instructor, and institution for every visitor. Empty fields are omitted; no invented names or academic details appear.

The ending also has a **Personalize project credits** form. These entries are stored only in that visitor's browser and override the JSON file for that browser. They do not update the hosted source or other visitors' credits.

## Source layout

```text
dist/
  index.html
  js/
    main.js       # Application entry point
    models/       # Story content, page numbering, journey state, and credits storage
    views/        # Book templates, DOM updates, GSAP timelines, and Canvas effects
    controllers/  # Journey flow, reader input and Turn.js, and audio playback
  css/
    site.css           # Layout, reader, credits, and responsive design
    entrance-gate.css  # Image-gate layers and responsive framing
  assets/
    images/       # Optimized film-image candidates
    video/        # Original procedural atmospheric loop and poster
    fonts/        # Locally hosted fonts and OFL licenses
    vendor/       # GSAP, ScrollTrigger, jQuery, Turn.js and notices
    project-info.json
tools/
  build.mjs, check.mjs, serve.py
  lint/            # Validation and formatting rules for authored code
  qa/              # Browser suites, run through test.py
  media/           # Atmospheric video generator
```

## Technology and dependency choices

- Buildless semantic HTML, CSS, and JavaScript modules.
- GSAP / ScrollTrigger 3.14.2 for the cinematic opening and ending.
- Turn.js third release from the upstream `blasten/turn.js` repository, with jQuery 3.7.1. The fourth release was not silently substituted or assumed licensed.
- Image-based layered entrance gate, SVG traced route, Canvas 2D atmosphere, and HTML5 muted looping video.
- Locally hosted Cormorant Garamond and Manrope.
- No external runtime API calls, accounts, analytics, or backend database.

The small MP4 is an original six-second loop of procedural fog and motes. Recreate it with `python tools/media/generate-atmosphere.py` after installing Pillow and imageio-ffmpeg if needed. Its use avoids introducing unrelated stock video or unlicensed movie footage.

## Reliability and accessibility

- Keyboard controls, visible focus states, labeled interactions, modal focus management, and a keyboard-accessible chapter drawer.
- Reduced-motion mode simplifies movement and disables continuous particle/video effects.
- Audio is optional; all essential information is in text.
- Missing video retains a static poster, and the narrative does not wait for sound.
- Turn.js failure uses a simpler accessible page-navigation fallback. Missing GSAP uses scene switching based on scroll position.
- Canvas rendering pauses when the document is hidden; only visible book pages animate and receive focus.
- Long text pages scroll within their paper area. Short landscape viewports allow the reader layout itself to scroll.

## Assets and limitations

See [ASSET-SOURCES.md](ASSET-SOURCES.md) and [NOTICES.md](NOTICES.md).

The downloaded film imagery is attributed and optimized, but a reuse license or project-specific permission has not been established. Source attribution is not a license grant. The Sites publication is private to the owner by default. Confirm the basis for using those images before broader distribution.

A verified childhood-trio still was not available from the reviewed accessible sources. The prologue introduces their childhood in original text, then shows a clearly captioned later-life image. It does not misidentify the museum schoolchildren or the adult characters as the childhood trio.

The opening gate now uses a sourced textured image prepared with transparency, split into fixed posts and moving leaves through CSS clipping. Its scroll timing and the surrounding interface are preserved. See [GATE-ASSET.md](GATE-ASSET.md) for provenance, preparation method, and the exact editing prompt. The magical book remains a CSS construction. Film stills remain flattened images; the site uses pans, crops, lighting, and Canvas overlays rather than claiming independently animated film characters.

The project is an interpretive illustrated guide, not an official film companion. The Marigold Bridge is explicitly presented as a symbolic chapter. Narrative captions and discovery text are original to the website.

## Validation

Install the development tools from this folder with Node.js 24, Python, and Chrome available.

```powershell
npm ci
python -m pip install -r requirements-dev.txt
npm run lint
npm run build
npm test
```

Lint checks authored JavaScript, HTML (including generated book pages), CSS, Python, and source formatting. The browser suites start a temporary local preview and cover scrolling, the gate, Turn.js, audio controls, book interactions, the ending, credits persistence, and dependency fallbacks. They use headless Chrome with desktop, mobile emulation, and reduced-motion settings. Reports and screenshots go to the temporary folder printed by the test runner.

## Hosting

`.openai/hosting.json` identifies this private Sites project and deploys `dist/`. Keep its project ID when updating. Runtime libraries and assets are self-hosted.
