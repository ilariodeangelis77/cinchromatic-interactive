# Cinchro Inter — style specification

Status: implemented, 8 October 2026. This document records the visual specification used by the local editor's Light and Dark modes.

## 1. Design objective

Make the editor feel like an extension of Cinchromatic: black and gray surfaces, crisp square shapes, narrow pixel lettering, and occasional strong color supplied by the game itself. Offer light and dark modes using different combinations of those same neutral game colors. Keep the board as the main activity and prioritize legibility, clear interaction states, and comfortable targets over literal imitation of tiny bitmap text.

Preserve the existing workflow, image artwork, local saves, discovered palette, and responsive board/editor arrangement. This is a visual revision, not a change to puzzle mechanics or editing behavior.

## 2. Source observations

The bundled original images in `dist/levels.js` are the source of truth. Their visible pixels contain these colors:

| Original color | Appearance in the artwork | Interface policy |
| --- | --- | --- |
| `#000000` | Black surround and separators | Dark page, light-mode text, and unchanged board surround |
| `#333333` | Dark blocks and outlines | Dark controls, light selected controls, and structural surfaces |
| `#888888` | Small grid marks | Dark secondary text/borders and light control surfaces |
| `#999999` | Main floor/background | Light page, dark active controls, and dark secondary text |
| `#BE2633` | Red pieces; title-page credit lettering | Preserve in original artwork and favicon |
| `#1D57F7` | Blue puzzle artwork | Artwork and discovered swatches only |
| `#9900DD` | Purple puzzle artwork | Artwork and discovered swatches only |
| `#F7E26B` | Yellow puzzle artwork | Artwork and discovered swatches only |
| `#BB7777` | Small rose mark | Artwork and discovered swatches only |
| `#9977CC` | Small lavender mark | Artwork and discovered swatches only |
| `#BBBB77` | Small olive mark | Artwork and discovered swatches only |
| `#6688CC` | Small blue mark | Artwork and discovered swatches only |

The 5×5-pixel tiles use square geometry, flat fills, sparse outlines, and no gradients. The title image contains tall, narrow bitmap lettering. It does not include a font file or font name; any replacement web font is an approximation, not an identified original typeface.

Reference: [original game](https://caveadventure.itch.io/cinchromatic), [original image viewer](https://html-classic.itch.zone/html/18447195/index.html), and bundled `artifacts/original-title.png`.

## 3. Interface color tokens

Use this explicit role mapping rather than spreading new color literals through component rules. Typography, geometry, spacing, and interactions are identical in both modes:

| CSS token | Dark | Light | Role |
| --- | --- | --- | --- |
| `--page` | `#000000` | `#999999` | Page background |
| `--surface` | `#000000` | `#999999` | Board frame, toolbar, footer, editor background |
| `--surface-raised` | `#333333` | `#888888` | Inactive buttons/selects and dialog |
| `--control-active` | `#999999` | `#333333` | Selected Move/Paint control; hovered inactive control |
| `--text` | `#FFFFFF` | `#000000` | Main labels and text on raised surfaces |
| `--text-secondary` | `#999999` | `#000000` | Instructions and metadata on the page surface |
| `--text-muted` | `#888888` | `#000000` | Disabled text and supporting text on the page surface |
| `--text-on-active` | `#000000` | `#FFFFFF` | Text on active/hovered controls |
| `--line` | `#333333` | `#333333` | Nonessential dividers |
| `--control-border` | `#888888` | `#000000` | Default interactive control boundaries |
| `--selection` | `#FFFFFF` | `#FFFFFF` | Selected swatch border on the fixed dark palette holder |
| `--focus` | `#FFFFFF` | `#000000` | Keyboard focus outline |
| `--focus-gap` | `#000000` | `#999999` | Separator between the focused control and its outline |
| `--link` | `#FFFFFF` | `#000000` | Underlined links |
| `--board-surround` | `#000000` | `#000000` | Canvas viewport background; preserve the original black surround |
| `--palette-surface` | `#333333` | `#333333` | Swatch holders; consistent contrast with the original tile artwork |

White is a supporting interface color chosen for readability; it is not a newly introduced puzzle tile. Do not add blue-tinted surfaces, the current gold accent, gradients, colored glows, or color-coded status messages.

### Theme selection and persistence

- Add a visible, labeled **Theme** select in the header with exactly two options: **Light** and **Dark**. Its selected value always reflects the displayed mode.
- On first use, follow `prefers-color-scheme`: dark when the operating system requests dark, light otherwise. Until the user chooses explicitly, follow subsequent operating-system preference changes.
- Once the user chooses, apply that mode immediately and retain it independently of the operating system.
- Save the string `light` or `dark` under a separate `cinchromatic-theme-v1` browser-storage key. Do not modify or migrate the editor save key or its payload.
- Apply the initial `data-theme` attribute and matching CSS `color-scheme` on the root element before the stylesheet paints, using a small inline initialization script. Invalid/missing saved values fall back to the operating-system preference. Guard unavailable storage; an explicit choice must still last for the open page session.
- Theme changes do not reset the image, undo history, edits, current tool, selection, scale, or palette discoveries. Do not cancel a canvas gesture in the theme-setting action itself.
- Keep the select alongside Credits when space allows and permit it to wrap on narrow screens. It uses the same fonts, 44px target height, labels, and keyboard behavior as other selects.
- Do not invert, filter, tint, or redraw source pixels when changing themes. The viewport remains black in both modes; only the surrounding interface changes.
- The favicon and black/white canvas selection overlays remain identical in both modes. Do not animate the overall theme transition.

### Contrast constraints

The following ratios were calculated from the specified sRGB colors:

| Foreground / background | Ratio | Use |
| --- | --- | --- |
| `#FFFFFF` / `#000000` | 21.00:1 | Main text and focus rings around black surfaces |
| `#FFFFFF` / `#333333` | 12.63:1 | Dark raised text; light selected/hovered control text |
| `#999999` / `#000000` | 7.37:1 | Dark supporting text |
| `#888888` / `#000000` | 5.92:1 | Dark muted text |
| `#000000` / `#999999` | 7.37:1 | Light page text; dark selected/hovered control text |
| `#000000` / `#888888` | 5.92:1 | Light inactive controls and dialog text |
| `#999999` / `#333333` | 4.43:1 | Do not use for ordinary-size text |

Acceptance targets: at least 4.5:1 for ordinary text and at least 3:1 for essential control boundaries against their surroundings. A dark divider may remain subtle because it is decorative. Palette artwork retains its original colors even where individual pixel colors have lower contrast; labels and interaction indicators must remain readable independently.

In light mode, do not use `#333333` as ordinary text on `#999999`, or as secondary text on `#888888`: those combinations miss the text target. Use black text and differentiate supporting copy by size, placement, and weight. For palette tooltips, use native tooltip behavior; any custom tooltip must use theme-safe text/surface tokens.

## 4. Typography

### Display face

Bundle **VT323 Regular** locally. It provides a narrow pixel/terminal appearance compatible with the source lettering without rebuilding letters as CSS shapes or shrinking an image of the title.

- Wordmark: `2rem` / `1`, normal weight, normal letter spacing.
- Tools, Palette, and dialog heading: `1.5rem` / `1.2`, normal weight.
- Do not apply synthetic bold, condensed transforms, text shadows, or forced pixel effects.
- Fallback: the utility monospace stack below.

VT323 is a deliberate approximation. The [Google Fonts description](https://raw.githubusercontent.com/google/fonts/main/ofl/vt323/DESCRIPTION.en_us.html) describes its terminal origins; the [bundled license source](https://raw.githubusercontent.com/google/fonts/main/ofl/vt323/OFL.txt) is SIL Open Font License 1.1. Fetch the original font and license from that official repository during implementation, store both locally, and use `font-display: swap`. Do not make runtime font requests.

### Utility face

Use `"Cascadia Mono", Consolas, "Liberation Mono", monospace` for buttons, selects, image numbers, instructions, status, badges, shortcuts, and credits body text. This gives the editor a related, restrained character while keeping frequent reading easier than small pixel lettering.

- Instructions and credits body: `1rem` / `1.6`.
- Buttons, main selects, palette count, and mode label: `0.875rem` / `1.4` minimum. The compact board toolbar uses `0.8125rem` / `1.35`; its footer uses `0.75rem` / `1.35`.
- Shortcut keycaps and INTERACTIVE badge: `0.875rem`; no wide tracking.
- Native input/select text inherits the utility face.
- Permit wrapping and natural control growth at increased browser text sizes. Do not truncate essential labels or shrink text to fit.

Do not use Georgia, cursive, or the current widely spaced uppercase badge treatment. Keep the original title image untouched.

## 5. Geometry, spacing, and layout

- Use square corners: radius `0` for buttons, selects, panels, palette holders, keycaps, empty state, and dialog.
- Use flat fills and 1px borders. Selection adds a 2px border or inset outline without changing element dimensions.
- No card shadows, rounded pills, bevels, gradients, scanlines, CRT blur, or decorative pixel borders made from repeated tiny elements.
- Keep the current desktop structure: navigation above, board on the left, tools and palette on the right. Retain the existing maximum workspace width and 292px editor column.
- Keep the 800px breakpoint and stack the editor below the board on narrow screens.
- Retain the existing 32px desktop / 16px mobile outer padding and 24px workspace gap. Use an 8px rhythm for local groups where feasible; do not constrain layout spacing to the artwork’s 5px tile size.
- Buttons and main selects: at least 44px high. The board scale select is 32px high with a fine pointer and 44px with a coarse pointer. Palette targets: at least 60×60px. Maintain at least 8px between adjacent actionable controls, including history buttons.
- Board toolbar and footer use 4px vertical / 10px horizontal padding. Their recovered height goes into the board viewport (56px with a fine pointer, 44px with a coarse pointer), preserving roughly the same total panel height while giving Fit more room.
- Keep the image picker and navigation labels visible. Let navigation and history controls wrap when necessary.
- Preserve `place-items: safe center` and internal board scrolling so enlarged images remain reachable at their top and left edges.
- Add only the specified Light/Dark theme select. Do not add a hero section, decorative background grid, artwork outside the current image/palette, or additional theme settings.
- Background edits use a 44px square toggle in the Palette heading, with an accessible name and tooltip. Filled means visible; outlined means hidden. The palette has no explanatory paragraph; desktop windows under 760px high also omit the redundant Tools heading and mode caption and tighten control spacing to keep all six palette rows visible.

## 6. Component treatments and interaction states

| Component / state | Required treatment |
| --- | --- |
| Header and workspace | Theme page surface, flat, thin neutral separators; pixel-style wordmark |
| Board toolbar/footer | Theme surface; main and supporting text tokens; viewport stays black |
| Inactive button/select | Raised surface, main text, control-border token |
| Hovered inactive control | Active surface, active text; keep boundary visible |
| Selected Move/Paint | Active surface and text; white boundary in dark mode, black boundary in light mode; retain `aria-pressed` |
| Selected control on hover | Keep its selected treatment; hover must not erase selection |
| Pointer active/pressed state | Keep the appropriate hover/selected treatment; no displacement or flashing |
| Disabled control | Page-surface fill, muted text, control-border token; no blanket opacity; native `disabled` remains the functional distinction |
| Keyboard focus | 2px theme-focus outline with a 3px offset; separate it from the control with the focus-gap color so it stays visible on raised and selected surfaces |
| Palette button | Fixed 65×65px square: 35px artwork at 7× scale, 7px `#999999` surround, 7px dark surround, and 1px border on every side; hover keeps dark fill and changes its border to white |
| Selected palette tile | Persistent 2px white inset border plus existing pressed state; no recoloring of the swatch |
| Shortcut keycap | Square outline; use its parent control's text color: white on dark gray, black on light gray; supporting text tokens elsewhere |
| Empty palette | Theme surface, solid control-border outline, readable supporting text; no decorative pattern |
| Save/status text | Neutral text; failures distinguished by explicit wording and weight, not a new color |
| Credits dialog | Raised theme surface, main text throughout, square control border; black translucent backdrop; existing focus/modal behavior retained |
| Links | Theme-link color, always underlined; clear focus; do not reuse a puzzle color as link styling |

### Board overlays

Do not recolor source pixels or characters. Replace the current gold selection/destination line with a two-tone neutral outline: black outer contrast stroke, white inner stroke. Use narrow source-coordinate strokes around the cell edge, no fill, and no change to hit testing. The pair must remain visible over gray floors and colored tiles without covering the character silhouette.

Keep the current drag preview opacity and cursor states. Overlays exist only during selection/dragging; with no active selection the board must still reproduce the original PNG exactly.

### Motion

Keep only the existing short color/border transition, at most 120ms, under `prefers-reduced-motion: no-preference`. No movement animations, blinking cursor effects, pulsing palette items, or animated background.

## 7. Favicon, accessibility, and constraints

- Preserve the favicon’s red character motif; change its background to black and remove the rounded background rectangle. Red already appears on the original title page.
- Keep button names, canvas descriptions, select labels, visible keyboard shortcuts, `role="status"`, and dialog semantics.
- Make selection distinguishable by border and pressed state, rather than color alone.
- At 320px width and at 200% browser zoom/text enlargement, all controls and text must remain reachable without page-wide horizontal scrolling. A deliberately enlarged board may scroll within its own viewport.
- Font load failure must leave the interface usable with monospace fallbacks.
- UI chrome must never introduce later puzzle colors or reveal an undiscovered palette tile.
- Both modes must meet the same readability, target-size, focus, and responsive requirements. Native selects and scrollbars use the matching root `color-scheme`.
- Preserve local-only operation, original credits, image data, editor storage format, and all existing editor actions. Store only the theme preference separately.

## 8. Completion criteria

The final interface offers Light and Dark with the specified neutral color combinations, pixel-style display headings, readable utility typography, square controls, and clear interaction states. The theme follows the operating system initially and retains an explicit choice across reloads. There are no leftover navy/gold tokens, rounded containers, or Georgia headings. Original artwork, undiscovered tiles, and saved edits remain unaffected. Responsive, focus, hover, disabled, selected, dialog, and board-overlay states pass the implementation plan’s checks in both modes.
