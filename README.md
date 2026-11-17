# The Book of Life: Beyond the Pages

A complete browser-based academic fan experience: a scroll-driven cemetery-to-afterlife prologue, a seven-spread Turn.js storybook, interactive details, and a book-to-world cinematic ending.

## Run locally

No application dependencies need installation. All runtime libraries, fonts, images, and the atmospheric video are included in `dist/`.

```powershell
cd "C:\Users\Windows 11\Desktop\BOL\beyond-the-pages"
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open `http://127.0.0.1:4173`. Serve over HTTP; opening `index.html` directly as a file will not load JavaScript modules correctly.

`npm run dev` runs the same server. `npm run check` validates syntax, referenced assets, the chapter/page structure, and the hosting manifest.

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
  styles.css
  js/
    main.js       # Story states, GSAP timeline, transitions, dialogs, credits
    book.js       # Turn.js adapter, responsive size, navigation, fallback
    content.js    # Seven chapter texts, page templates, discoveries
    effects.js    # Canvas fog, petals, dust, finale burst
    audio.js      # Original ambience and contextual effects
  assets/
    images/       # Optimized film-image candidates
    video/        # Original procedural atmospheric loop and poster
    fonts/        # Locally hosted fonts and OFL licenses
    vendor/       # GSAP, ScrollTrigger, jQuery, Turn.js and notices
    project-info.json
tools/
  check.mjs
  qa.py
  generate-atmosphere.py
```

## Technology and dependency choices

- Buildless semantic HTML, CSS, and JavaScript modules.
- GSAP / ScrollTrigger 3.14.2 for the cinematic opening and ending.
- Turn.js third release from the upstream `blasten/turn.js` repository, with jQuery 3.7.1. The fourth release was not silently substituted or assumed licensed.
- SVG gate and traced route, Canvas 2D atmosphere, and HTML5 muted looping video.
- Locally hosted Cormorant Garamond and Manrope.
- No external runtime API calls, accounts, analytics, or backend database.

The small MP4 is an original six-second loop of procedural fog and motes. Recreate it with `python tools/generate-atmosphere.py` after installing Pillow and imageio-ffmpeg if needed. Its use avoids introducing unrelated stock video or unlicensed movie footage.

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

The opening gate and magical book are original SVG/CSS constructions informed by the supplied production references. Film stills remain flattened images; the site uses pans, crops, lighting, and Canvas overlays rather than claiming independently animated film characters.

The project is an interpretive illustrated guide, not an official film companion. The Marigold Bridge is explicitly presented as a symbolic chapter. Narrative captions and discovery text are original to the website.

## Validation

`node tools/check.mjs` performs static checks. `python tools/qa.py` uses Playwright and an installed Chrome browser in isolated headless contexts. It checks the scroll scenes, real Turn.js initialization, navigation, audio controls, SVG path, candles, discovery dialog, explicit finale entry, editable academic credits, persistence, and replay at desktop, mobile, and reduced-motion settings.

The browser checks simulate mobile behavior; they are not a claim of testing on physical Android hardware. The report and screenshots are written to ignored `qa-output/`.

## Hosting

`.openai/hosting.json` identifies this private Sites project and deploys `dist/`. Keep its project ID when updating. Runtime libraries and assets are self-hosted.
