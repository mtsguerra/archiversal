# Arch Guesser

Educational guessing game on architectural history. The player sees a building's drawings and photos as numbered sheets on a "drafting board", opens text tips, and guesses building, architect, country and era. No scores, no timers. A reveal shows an educational summary.

## Run

```
./gradlew bootRun            # Spring Boot API on :8090
cd frontend && npm run dev   # Vite on :5173, proxies /api to :8090
```

Checks before committing: `./gradlew test` and, in `frontend/`, `npx vitest run`, `npm run lint`, `npm run build`.

## Stack and layout

- Backend: Spring Boot 4 (Java 21 target, Jackson 3), Gradle 9 at the repo root (`src/`). Package `com.mtsguerra.archguesser`.
- Frontend: React 19 + Vite in `frontend/`, plain JSX, CSS Modules, Motion (`motion/react`), lucide icons, Archivo variable font.
- Data: `src/main/resources/data/buildings.json` (395 buildings: 50 world catalogue, 50 Portugal, 70 era/canon additions, 40 world icons, 70 works by named architects, 115 added for the Themed themes), loaded once at startup.
- i18n: UI copy in `frontend/src/strings/{en,pt-BR}.js` (same keys, tested); building text translated in `src/main/resources/data/pt-BR/*.json` (id → overlay of names, aliases, bios, labels, alts, hints, summary; list sizes must match the source). API takes `?lang=pt-BR`; the static build writes `public/api/pt-BR/`.
- Routes (URL hash, no router, `frontend/src/route.js`): `#/` home (`components/home/`: pencil title, the three modes as building levels, Today's sheet, streak, Library card, Archive), `#/play` Normal, `#/daily` Daily (`#/daily/<n>` plays an earlier day from "Other days" in the result card, `summary/PastDays.jsx`; results per day in `arch-guesser:daily-days`; a late day never counts for the streak), `#/themed` + `#/themed/play` (20 themes, three difficulties, 10 rounds; `game/themed.js`, `components/themed/`), `#/custom` + `#/custom/play` (architect, era, country filters; 10+ buildings; 3 to 50 rounds). All render `Game.jsx` except setup and home. Full detail: `docs/routes-and-library.md`.
- Library (`#/library`, `components/library/`, `game/library.js` + `game/libraryView.js`): a register of every building, locked until revealed in any mode (naming it adds Mastered). Unlocks live in localStorage `arch-guesser:library` (recorded by `useGameRound`); rows from `GET /api/buildings/library?lang=`. Locked rows show only era and sheet number; search/country filters never match them. Side rail cards (era progress, zoomable globe from `game/globe.js`) fold on wide screens; Compare dialog; "Play a locked one". `#/library/<id>` opens an unlocked building's summary. Full detail: `docs/routes-and-library.md`.
- API: `GET /api/buildings/random?exclude=a,b`, `GET /api/buildings/{id}`, `GET /api/buildings/library?lang=`, `GET /api/eras`. Errors are RFC 9457 problem+json.

## Data rules (enforced by `BuildingValidator`; the app refuses to start if any fail)

- ids are unique kebab-case; at least one architect with name and bio.
- `drawings` (cuts) are optional, but every `src` must be real: an `https://upload.wikimedia.org/` URL (or a local `/buildings/{id}/` path). Never a placeholder or null.
- `photos`: at least one `EXTERIOR`, plus an `INTERIOR` or a second `EXTERIOR` (when no free interior exists).
- `themes`: ids from `BuildingValidator.THEMES` (20: castles, churches-cathedrals, mosques, monasteries, palaces, museums, theatres-opera, railway-stations, bridges-towers, skyscrapers, libraries, houses-villas, stadiums, asian-temples, ancient-ruins, brutalism, art-nouveau, art-deco, portuguese-azulejo, modern-icons); a building may have several or none; a test requires 10+ per theme. UI names are in `strings.themed.themes`.
- `hints`: at least 2, text only, `order` 1..n. We write exactly 3, and they must not depend on looking at the photos.
- Optional `crop` `{x, y, w, h}` (fractions) on drawings and photos hides anything that names the building or architect (title blocks, captions, signatures, façade lettering). Check every image for spoilers.
- `credit` + `source` (Commons file page) on every image; credits are shown only after the reveal.
- `yearCompleted` may be null for unfinished works.
- `wikipedia` is required: the article URL (`https://en.wikipedia.org/wiki/...`, or `pt.wikipedia.org` when no English article exists), shown after the reveal as further reading. The pt-BR overlay may carry its own `wikipedia` URL.
- `era` is the style the building is known for, not its date (a 2015 building can be Brutalist). Non-Western works use `ANCIENT_EGYPTIAN`, `PRE_COLUMBIAN`, `INDIC`, `EAST_ASIAN` or `ISLAMIC`.
- Unknown JSON fields are rejected.

## Image sourcing

- Wikimedia Commons only, public domain or CC licences. Store `upload.wikimedia.org` URLs without `?utm_*` parameters; small originals may need the full-file URL instead of a thumbnail.
- Use the User-Agent `ArchGuesserBot/1.0 (https://github.com/mtsguerra/arch-guesser)` and keep 2 s between requests.
- Interiors of copyrighted buildings are a "lenient" grey zone the user accepted. On the frontend, a tab whose image fails to load removes itself (no error placeholder); while an image is still loading, the sheet shows `PlotLoader` (a drawing plotting itself).
- Facts come from Wikipedia pages fetched while writing; drop claims that can't be sourced.

## Game logic (frontend `src/game/`)

- `gameReducer.js`: phases loading → playing → revealed (or error); correct fields lock and show the canonical answer.
- `matchGuess.js`: typo-tolerant name matching (aliases, distinctive words, surnames only for people); any one architect counts; countries resolved through `Intl` (`countries.js`); each building stores exactly one `era`; a guess is correct only if it equals it. One of 14 neighbouring pairs (`CLOSE_ERAS`, both directions: Modernism/Brutalism, Modernism/Contemporary, Brutalism/Contemporary, Postmodernism/Contemporary, Historicism/Art Nouveau, Art Deco/Modernism, Neoclassical/Historicism, Manueline/Medieval, Manueline/Renaissance, Mannerism/Renaissance, Mannerism/Baroque, Islamic/Medieval, Industrial/Historicism, Russian/Byzantine) gives the field status `close` ("Close! Try the more specific style."): gold styling, not locked, not logged, the player tries again.
- Themed (`game/themed.js`): `fieldsFor(level, pool, building)` picks the fields of a round (a building with no `yearCompleted` skips century and decade, a BCE one skips the decade, the architect drops out when under half of the theme's architects are known, i.e. not named "Unknown ..."); the reducer takes them from `load/success`. Century: exact is correct, within 10 years of the guessed century is `close` (BCE centuries are negative, no year 0); decade: exact is correct, one decade either side is `close`. Century and decade are native selects in `GuessForm` with a rolling dial beside the label (`RollingNumber`) and the decades sweeping open after a century; century/decade maths and judging are in `game/dates.js`; the era list is limited to eras in the theme. The session lives in sessionStorage (sanitized on read); the recap draws the buildings on a timeline by year.
- After the reveal the summary always shows and the gallery (drawings, photos, notes) stays hidden until asked for; the Drawings button (reveal bar, phone board action, tapping the summary strip) expands the gallery to full width above it in place (`data-expanded` on `.summaryLayout`, no view swap) and scrolls to it; pressing again folds it back.
- Gallery (`components/board/DrawingBoard.jsx`, frameless carousel: stage, thumbnail strip, side notes with the image's `alt`/`caption`, and the credit after the reveal). Order from `sheets.js`: cuts first, numbered A-1xx plans, A-2xx elevations, A-3xx sections, A-0xx site plans; then P-1 exterior, P-2 interior.
- Seen buildings are stored in `sessionStorage` and sent as `exclude`.

## Tooling

- `frontend/scripts/break-protections.mjs` breaks each protection on purpose (CSP in `vercel.json`, stored-data validation, https-only recap links) and checks a test fails; every line must say CAUGHT. Run it after touching a protection. `frontend/scripts/make-icons.py` renders the PNG app icons from the logo. `frontend/scripts/make-country-shapes.py` rewrites `src/game/countryShapes.js` (country outlines for the veiled globe's silhouette, Natural Earth 50m) from the countries in the building data; rerun it after adding a country (the Vatican is too small to draw, so it gets the pin only).
- Reduced motion: `html[data-motion='reduced']` (set by `public/prepaint.js` from the saved choice, else the OS setting; toggled by `MotionToggle`, state in `src/motionPref.js`). `postcss-motion-attr.js` rewrites every `@media (prefers-reduced-motion: reduce)` block to that attribute, so write plain media queries; JS uses `isReduced()` / `useReducedMotion` from `motionPref.js`, never `matchMedia` or Motion's own hook. The line drawings (home era drawings, reveal overlay) and the theme-change wipe deliberately play even when reduced; `MotionNote` explains this once.
- Phones (640px and narrower): the header's theme, sound, motion and language controls are hidden and live in `Options` (a round sliders button that opens a bottom sheet, like lastfm-game's settings sheet); new settings go there too. The motion icon shows the state (pulse line = full, paused line = reduced). Language: a saved choice, else the device's first language (any `pt-*` gives pt-BR, everything else English).
- The site is installable (`public/manifest.webmanifest`); `public/prepaint.js` sets theme, text scale and lite mode before paint (it is a file because the CSP allows only `'self'` scripts).

## Design

`DESIGN.md` and `.impeccable/design.json` describe the visual system; `docs/design-log.md` records every layout decision, the visual review and what is still open. The idea is a drafting table: grid mat drawn by `ShapeGrid` in `PageBackground`, paper sheets, title blocks, level lines, instruments. Brief-pinned palette `#6F1D1B #BB9457 #432818 #99582A #FFE6A7` (oxblood, camel, chocolate, russet, cream); light is the default, dark ("blueprint night") is `data-theme="dark"` on `<html>` only, set by `public/prepaint.js`/`theme.js`. Use tokens from `frontend/src/styles/tokens.css`; all UI copy lives in `frontend/src/strings/` (same keys in en and pt-BR, tested).

Screens and pieces:
- Menu: the game and setup headers carry a Library button beside Menu (`LibraryLink`, wide screens). The game's veiled globe zooms in on small countries once found (`zoomFor` in `game/globe.js`).
- Game screen parts: the frameless gallery, `EraCombobox` (type a name, or browse the list) for the era guess, the one-row `HintTray` under the gallery, `RevealBuild` (the blueprint-rises reveal animation).
- Home and Custom float the controls at the top right on wide screens (no brown strip) via `AppShell floating`; the logo slot (5rem, a placeholder mark) is at the top left. The game uses the slim header, with no strip at any width (logo and controls float, with soft pills below 1024px, and hide on scroll). Home and Custom drop the strip on phones too. On phones the game's Menu and Check guess sit in a floating bottom pill (`.bar` in `App.module.css`).
- `useFitToScreen` (home, Custom) shrinks the root font size until the page fits the window height at 1024px and up; everything on those pages is in rem. Every media query in the app is px (1024, 640, 480, 900), never rem: Firefox resolves rem media queries against the root font size, and Safari's responsive mode skipped the game's rem phone rules (the header and bottom bar overlapped).
- Custom (`components/custom/`): one drafting sheet, three numbered steps (filter tabs with instrument icons, picker, rounds), two columns on wide screens; `RoundsSlider` draws a colonnade with one column per round (`game/colonnade.js`); `PickSketch` draws one sketch per pick; `Arch` places one stone per matching building and drops the keystone at 10; past five picks the chips fold behind "•••".
- Daily: `DailyShare` (popover in the reveal bar, wide screens) and `DailyCard` (title block: score, a badge per guess, a rolling countdown cell, and a wide `ShareMenu` button with Copy, WhatsApp and Other ways) in the reveal summary.
- Reveal summary (`components/summary/BuildingSummary.jsx`): image strip with section cut, scale bar and north arrow, dimension line, level marker, guess-versus-answer rows with drawn hatching, lede, margin note, sticky title, revision block. Animations are gated on the `play` prop so they run after the reveal overlay clears.
- Phones (640px and narrower): the play screen has a floating bottom pill (round Menu + Check guess), "Another building" at the page end behind a two-tap confirm, tips and earlier guesses under the form; the revealed screen has Menu in the reveal bar. Home, Custom and the game float the logo and controls on phones too.
- `components/ui/InstrumentIcons.jsx`: compass (legs close and open), hourglass (flips, sand runs), globe, building (windows light up), share, reveal. They play on hover, focus-within or when selected/correct, keyed on `button` or `[data-motion]`; used in the Custom tabs and the guess form.
- The playing screen is sized to fit one laptop viewport (about 1470×860 to 956) without scrolling; keep it that way. Hint cards: dark keeps the Skywalk render under the oxblood tint, light uses a greyscale render under a cream and camel wash with dark text.

Gotchas: the user views in Safari. CSS transforms on SVG groups inside a viewBox are placed differently there (pivots, units): animate SVG attributes (`attrX`), use `transform-box: fill-box`, or transform the whole `<svg>`. Headless Chromium cannot render the game page, but Playwright's cached WebKit can (see `docs/design-log.md`, Gotchas): use it to probe computed styles and take screenshots of the game, reveal and Daily states, and still say that feel and motion were checked only by the user in Safari.

## Working agreement

- Build in small batches; ask about logic requirements before starting a new component, and pause for review after each batch.
- Commit only when the user approves; leave the stray root `package-lock.json` and `.codegraph/` untracked.
- For any visual or UX change, give 3 options with previews first (AskUserQuestion) and build only the one picked; build exactly what is dictated when the user dictates it.
