---
name: Archiversal
description: A modern digital drafting board. Each round is a drawing set on the table, documented sheet by sheet with a title block.
colors:
  oxblood: "#6f1d1b"
  oxblood-deep: "color-mix(in oklab, #6f1d1b 82%, black)"
  russet: "#99582a"
  camel: "#bb9457"
  chocolate: "#432818"
  chocolate-soft: "color-mix(in oklab, #432818 78%, #fff8e4)"
  cream: "#ffe6a7"
  paper: "#fff8e4"
  paper-shade: "color-mix(in oklab, #ffe6a7 55%, #fff8e4)"
  paper-rule: "color-mix(in oklab, #432818 70%, #fff8e4)"
  paper-hairline: "color-mix(in oklab, #bb9457 55%, #fff8e4)"
  mat-grid: "color-mix(in oklab, #bb9457 16%, transparent)"
  mat-grid-major: "color-mix(in oklab, #bb9457 34%, transparent)"
typography:
  display:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.4rem + 2.4vw, 3.25rem)"
    fontWeight: 750
    lineHeight: 1.05
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 112"
  headline:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.3
    fontVariation: "'wdth' 112"
  title:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "0.02em"
    fontFeature: "'tnum'"
    fontVariation: "'wdth' 112"
  body:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  lead:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.01em"
  label:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 118"
  section-label:
    fontFamily: "Archivo Variable, Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 118"
rounded:
  sm: "2px"
  md: "6px"
  pill: "999px"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  "7": "3rem"
  "8": "4rem"
components:
  button-primary:
    backgroundColor: "{colors.oxblood}"
    textColor: "{colors.paper}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.5rem"
  button-primary-hover:
    backgroundColor: "{colors.oxblood-deep}"
  button-ghost:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chocolate}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.5rem"
  button-rail:
    textColor: "{colors.cream}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0 1rem"
    height: "2.5rem"
  button-quiet:
    textColor: "{colors.russet}"
    typography: "{typography.ui}"
    padding: "0 0.5rem"
    height: "2.5rem"
  button-quiet-hover:
    textColor: "{colors.oxblood}"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chocolate}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 2.5rem 0 0.75rem"
    height: "2.75rem"
  input-field-locked:
    backgroundColor: "{colors.paper-shade}"
    textColor: "{colors.chocolate}"
    rounded: "{rounded.sm}"
    height: "2.75rem"
  sheet:
    backgroundColor: "{colors.paper}"
    padding: "1.125rem"
  title-block-cell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chocolate}"
    typography: "{typography.title}"
    padding: "0.5rem 0.75rem 0.75rem"
  sheet-tab:
    textColor: "{colors.chocolate-soft}"
    typography: "{typography.ui}"
    rounded: "{rounded.md}"
    padding: "0.5rem 1rem"
  sheet-tab-selected:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chocolate}"
  zoom-control:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.chocolate}"
    rounded: "{rounded.md}"
    padding: "0 0.75rem 0 0.5rem"
    height: "2.25rem"
  zoom-control-hover:
    backgroundColor: "{colors.chocolate}"
    textColor: "{colors.paper}"
  hint-slip:
    backgroundColor: "{colors.paper}"
    padding: "0.75rem"
  chip-got:
    backgroundColor: "{colors.russet}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem 0.25rem 0.5rem"
  chip-missed:
    textColor: "{colors.chocolate-soft}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.75rem 0.25rem 0.5rem"
---

# Design System: Archiversal

## Overview

**Creative North Star: "The Drawing Set on the Table"**

The screen is a drafting table. A chocolate rail runs across the top like the edge of the desk; below it lies a saturated cream drafting mat ruled with a faint camel grid (8px fine, 40px major). On the mat sit sheets of paler paper, each with a hairline inner frame and a soft, lifted shadow. A building is presented the way architects document it: sheet by sheet, numbered (A-101, A-301), with a title block along the bottom edge that stays blank until the player earns the answer and then plots in cell by cell.

Everything is lettered like a drawing set. Labels on documents use Archivo stretched wide, uppercase and tracked, like title-block lettering; prose, inputs and buttons stay at normal width so the game stays easy to read. Width comes from a four-step stretch scale, not from ad hoc percentages. Numbers that identify things (sheet numbers, counts, years) are tabular. Photographs join the drawing set as P-numbered sheets after the cuts (A-101, A-301… then P-1 exterior, P-2 interior).

Density is calm and generous. The game is a stress-free study session: there are no scores, timers or celebratory effects, and motion follows the drafting metaphor. Sheets slide in from the direction you flip, values draw in from left to right like a pen plotter, and the board steps aside into a reference column when the monograph opens.

**Key Characteristics:**
- Cream mat with a two-weight camel grid; paler paper sheets lifted above it.
- Sheets with a 1.5px inner frame, zone references in the margins, and a ruled title block.
- Archivo variable: wide uppercase caps for document lettering, normal width for UI and prose.
- Oxblood for acting and selecting; russet for links, focus and correct answers.
- Photographs filed as numbered sheets of the set (P-1, P-2), never as decoration.
- Ease-out motion that follows drafting gestures (flip, plot, pin).

## Colors

A warm, brief-pinned five-colour drafting palette: light colours are grounds and paper, dark reds and browns are ink and accents.

### Primary
- **Oxblood** (`oxblood`): primary actions ("Check guess"), the selected sheet tab's top edge and number, the wrong-answer field rule and message, hint slip labels, the monograph byline, text selection, and the wordmark tile. It darkens to **Deep Oxblood** (`oxblood-deep`) on hover.

### Secondary
- **Russet** (`russet`): links and quiet text buttons ("Reveal answer"), the focus ring and focus halo on every control, and the filled badge or chip that marks a correct field.

### Tertiary
- **Camel** (`camel`): drafting-mat grid lines, paper hairlines and the scrollbar thumb. Decorative and structural only.

### Neutral
- **Chocolate** (`chocolate`): the header rail and all ink: body text, headings, title-block values. Inverted fills (zoom control hover, selected combobox option) use chocolate behind paper text.
- **Soft Chocolate** (`chocolate-soft`): secondary ink: field labels, captions, unselected tabs, muted title-block values, zone references.
- **Cream** (`cream`): the drafting mat itself and the type on the rail.
- **Drafting Paper** (`paper`): every sheet, worksheet, slip, input and monograph page.
- **Paper Shade** (`paper-shade`): locked (correct) answer fields and empty print frames.
- **Paper Rule** (`paper-rule`): sheet frames, title-block cell rules, input borders and zone ticks.
- **Paper Hairline** (`paper-hairline`): softer dividers, ghost button borders, and missed-field chips.

### Named Rules
**The Camel Never Speaks Rule.** Camel is too light to read on cream. It draws grids, hatching and hairlines; it is never used for text or icons.

**The Two Accents Rule.** Oxblood means act, select or wrong. Russet means go somewhere, focus, or correct. Do not swap them.

## Typography

**Display Font:** Archivo Variable (with Archivo, ui-sans-serif, system-ui, sans-serif)
**Body Font:** Archivo Variable, same family
**Label/Mono Font:** Archivo Variable at wide width (no separate mono)

**Character:** One variable family does two jobs. Stretched wide and uppercased it is title-block lettering; at normal width it is a plain, legible reading face. The width axis, not a second typeface, separates the drawing set from the interface.

### Hierarchy
- **Display** (750, `clamp(2rem, 1.4rem + 2.4vw, 3.25rem)`, 1.05, semi 112% width): the building name heading the monograph. Once per screen.
- **Headline** (700, 1.25rem, semi 112% width): architect names in the monograph, the board error title. The byline uses the same size at weight 500 in oxblood.
- **Title** (650, 0.875rem, semi 112% width, 0.02em, uppercase, tabular): title-block values and the zoom control. The full-width PROJECT cell steps up to 1rem.
- **Body** (400, 1rem, 1.5): prose and inputs. Monograph lead paragraphs use the `md` scale step (1.1875rem) at 1.6, and lead text and biographies are capped at 62ch.
- **UI** (600, 0.875rem, 0.01em): button labels and sheet tab names (tab names at 500).
- **Label** (600-650, 0.6875rem, 0.06em, uppercase, wide 118% width): title-block cell labels, guess field labels, fact strip labels, hint slip labels.
- **Section label** (700, 0.75rem, 0.06em, uppercase, wide 118% width): hint tray and monograph section headings. The worksheet heading ("Your guess") is the larger variant, 0.875rem at extra 125% width and 0.08em tracking, sitting on a 1.5px ruled line.

### Named Rules
**The Title-Block Lettering Rule.** Wide uppercase caps are reserved for lettering on the drawing set: cell labels, field labels, section heads and sheet numbers. Sentences, buttons, inputs and prose stay at normal width and in sentence case.

**The Four Widths Rule.** Archivo's width axis takes only four values: normal (100%) for prose, inputs, buttons and the compact wordmark under 30rem; semi (112%) for display, headlines, title-block values and sheet numbers; wide (118%) for caps labels; extra (125%) for the wordmark and the worksheet heading. Never set an in-between percentage.

**The Tabular Figures Rule.** Sheet numbers, counts (2/3), years and dates use tabular numerals so they align like a drawing register.

## Layout

The app shell is a sticky 3.5rem chocolate rail over a padded main area (gutter `clamp(1rem, 2.5vw, 2rem)`, 1.5rem top, 3rem bottom). Spacing follows a 4px base scale (`spacing.1` to `spacing.8`); 2rem is the gap between major columns and 0.75rem between stacked slips.

**Play.** The board takes the flexible column and a 22.5rem aside holds the guess worksheet above the hint tray. The board is sized so a whole ISO A-series landscape sheet (ratio 1.414) fits under the rail and tabs, never narrower than 36rem on desktop, and it stays pinned while the aside scrolls. Below 70rem everything stacks and the worksheet and hint tray sit side by side (auto-fit, 18rem minimum).

**Reveal.** The board steps back into a pinned 18-26rem reference column on the left and the monograph sheet takes the rest. Below 52rem the monograph leads and the board follows.

**Narrow board.** When the board's container is under 40rem (a phone, or the reference column), the sheet turns portrait (0.8), margins shrink to 0.625rem, zone references hide, tabs show sheet numbers only, and the title block folds into a 2 by 2 grid. The layout responds to the board's own width (container queries), not just the viewport.

## Elevation & Depth

Depth is physical: paper lies on the mat, and the rail is the edge of the desk above it. Every shadow is tinted with chocolate (`rgb(67 40 24 / a)`, with a deeper `rgb(40 22 12 / a)` for the rail's edge line), never neutral grey or black. Paper has two lift levels. The rail and the selected tab each have their own seam shadow. Interactive lift is a small pressed translate on buttons, not a deeper shadow.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 1px rgb(67 40 24 / 0.08), 0 10px 24px -8px rgb(67 40 24 / 0.28), 0 28px 56px -20px rgb(67 40 24 / 0.24)`): full sheets. Covers drawing sheets, the guess worksheet, the monograph and the combobox listbox.
- **Raised** (`box-shadow: 0 1px 2px rgb(67 40 24 / 0.12), 0 4px 10px -4px rgb(67 40 24 / 0.22)`): small paper objects on the mat or a sheet: hint slips, photo prints, the zoom control, the primary button.
- **Rail** (`box-shadow: 0 1px 0 rgb(40 22 12 / 0.5), 0 6px 16px -10px rgb(67 40 24 / 0.6)`): the header rail only. A crisp dark edge line plus a short fall onto the mat.
- **Tab** (`box-shadow: 0 -4px 10px -6px rgb(67 40 24 / 0.25)`): the selected sheet tab's paper only. It casts upward so the tab reads as part of the sheet below it.

### Named Rules
**The Paper-on-Mat Rule.** Paper lifts at one of two levels (sheet or raised); the mat never casts a shadow. Beyond those, only the rail and the selected tab carry shadows, each its own token. No other shadows.

## Shapes

Drafting is crisp. Corners are 2px on inputs, listbox options and small notes, and 6px on buttons, tab tops and the zoom control. Sheets, slips, prints and the monograph have square corners. The one round form is the pill on outcome chips in the monograph recap, plus circular check badges.

Frames carry the identity. Every full sheet has a 1.5px `paper-rule` inner frame, drawn as a border on drawing sheets and as an inset outline (0.625-0.75rem offset) on the worksheet and monograph. Inside a frame, 1px rules divide cells. Margins carry zone references (numbers across the top, letters down the side) with short tick marks. Feature bullets are small rotated squares outlined in oxblood, like survey points on a plan.

### Named Rules
**The Inner Frame Rule.** A surface that is a document (drawing sheet, worksheet, monograph) carries a 1.5px inner frame. Slips and prints do not.

## Components

### Buttons
Compact, firm and inked: a 2.5rem control in weight 600 that presses down 1px and scales to 0.98 when clicked.
- **Shape:** gently squared (6px radius), hairline border.
- **Primary:** oxblood fill, paper text, raised shadow; deep oxblood on hover. One per context ("Check guess").
- **Rail:** transparent on the chocolate rail, cream text, cream border at 35% that goes solid with a 10% cream wash on hover; focus outline turns cream.
- **Ghost:** paper fill, chocolate text, hairline border that darkens to soft chocolate on hover ("Back to drawings", hint actions).
- **Quiet:** an underlined russet text link with tight padding that turns oxblood on hover ("Reveal answer").
- **Focus / Disabled:** global 2px russet outline at a 2px offset; disabled at 55% opacity with a progress cursor.
- Icons are inline Lucide SVG at 1.05em.

### Chips
- **Style:** pill-shaped, 0.75rem weight 600, with a leading 0.875rem icon.
- **State:** a correct field is a russet fill with paper text; a missed field is an unfilled pill with a paper-hairline inset ring and soft chocolate text.

### Cards / Containers
- **Drawing sheet:** paper, square corners, sheet shadow, 1.125rem margin holding zone references, 1.5px inner frame, drawing area above a ruled title block.
- **Worksheet / Monograph:** paper, sheet shadow, inset 1.5px outline frame; the monograph inset is `clamp(1.5rem, 4vw, 3rem)`.
- **Hint slip:** paper, raised shadow, 0.75rem padding, no frame; oxblood caps label on top.
- **Photo print:** paper mount with raised shadow, 4:3 print area, tilted -0.6 or +0.5 degrees and squared on hover (flat under reduced motion).

### Inputs / Fields
- **Style:** paper fill, 1px paper-rule border, 2px radius, 2.75rem tall, 1rem text; uppercase wide label above.
- **Hover / Focus:** border goes to chocolate on hover; on focus the border turns russet with a 3px russet halo at 28%.
- **Wrong:** oxblood border doubled by a 1px oxblood ring, with an oxblood x-icon message below.
- **Correct (locked):** the input becomes a paper-shade slab in weight 650 with a filled russet check badge. A field filled in by reveal is a transparent slab with a hairline ring and a soft check.
- **Combobox / Select:** listbox in paper with the sheet shadow; the active option inverts to chocolate with paper text. Selects use a custom chevron.

### Navigation
- **Rail:** sticky chocolate header, 3.5rem, with the rail shadow. On the left are the plan-mark tile (oxblood square, cream plan lines) and the wordmark in 700 weight caps at extra (125%) width with 0.1em tracking, dropping to normal width with 0.06em tracking under 30rem. Rail buttons sit on the right.
- **Sheet tabs:** sheet number (0.75rem, 700, tabular) plus drawing name. Unselected tabs are soft chocolate and get a translucent paper wash on hover. The selected tab is a paper tongue with a 2px oxblood top edge that slides between tabs on a soft spring and joins the sheet below, and its number turns oxblood. On a narrow board only numbers show.

### Title Block (signature)
A four-cell strip ruled into the bottom of every drawing sheet: PROJECT, ARCHITECT, DRAWING, SHEET n OF N. Unknown values show a muted dash. When a guess locks or the answer is revealed, the canonical value plots in from left to right with a clip-path wipe (0.784s, ease-out). The monograph's fact strip reuses the same ruled-cell construction.

### Photo Sheets (signature)
Every building carries at least one exterior and one interior photograph, shown as sheets P-1 and P-2 after the cuts. Photos sit on the paper at their own aspect (no multiply blend, unlike scans). There is no placeholder: a sheet whose image fails to load removes its own tab, and the gallery print disappears the same way.

### Zoom Control
A paper chip in the corner of the sheet with a 1px rule, raised shadow and wide caps label. It inverts to chocolate on hover and while pressed. Zoom happens in place and follows the pointer, with zoom-in and zoom-out cursors.

### Loading
Loading drawings are shown by a pen-plotter carriage: a 1.5px oxblood line at 50% that sweeps down the sheet every 2.4s and is hidden under reduced motion.

### Motion
One ease-out curve (`cubic-bezier(0.16, 1, 0.3, 1)`) and three durations (160ms state, 320ms enter/exit, 560ms sheet and image). Sheets flip in from the direction of travel (6% offset, 0.5 degree tilt) and exit the opposite way. The selected tab paper uses the soft spring (stiffness 260, damping 32). Reduced motion is honoured app-wide.

## Do's and Don'ts

### Do:
- **Do** put new documents on paper (`paper`) over the mat, with the sheet shadow and a 1.5px `paper-rule` inner frame.
- **Do** letter labels on documents in Archivo at wide (118%) width, uppercase, 0.06em tracking, in soft chocolate; keep prose, inputs and buttons at normal width.
- **Do** take every font width from the four-step stretch scale (100 / 112 / 118 / 125%).
- **Do** use oxblood for the one primary action and selected state, and russet for links, focus and correct.
- **Do** let a sheet with a broken image remove itself; never show a placeholder.
- **Do** number sheets in the A-101 / A-301 convention with tabular figures.
- **Do** animate with `cubic-bezier(0.16, 1, 0.3, 1)` at 160 / 320 / 560ms, making motion follow a drafting gesture (flip, plot, pin).

### Don't:
- **Don't** set text or icons in camel; it is for grids, hatching and hairlines only.
- **Don't** use neutral grey or black shadows, or add shadows beyond the four tokens (sheet, raised, rail, tab).
- **Don't** round sheets, slips or prints, or go above 6px on controls; pills are only for the recap outcome chips.
- **Don't** add a second typeface; vary Archivo's width axis instead.
- **Don't** add scores, timers, streaks or celebratory effects to the game.
- **Don't** tilt anything except photographic prints laid on the monograph.
