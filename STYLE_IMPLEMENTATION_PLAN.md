# Implement the Cinchro Inter style revision

Status: implemented and verified, 8 October 2026. The checklist below records the delivered revision.

## Goal and reference

Apply `STYLE_GUIDE.md` to the existing local editor. Provide Light and Dark modes using the original game's neutral colors, square geometry, and narrow pixel lettering while preserving readable controls, comfortable targets, and all current editing behavior. Keep this revision local; no publication or editor-save migration.

## 1. Typography and shared theme

- Download VT323 Regular and its SIL OFL license from the official Google Fonts repository into `dist/fonts/`. Use the original `VT323-Regular.ttf` and include `OFL.txt`; no font conversion or third-party package is needed.
- Define local `@font-face` with `font-display: swap`. Add the specification's shared font-role tokens and both complete color-token sets to `dist/styles.css`, selected by the root `data-theme` attribute.
- Assign VT323 only to the wordmark and Tools/Palette/dialog headings; use the specified monospace stack and minimum sizes for all utility text.
- Remove Georgia, tracked badge lettering, navy/gold colors, rounded corners, and unnecessary opacity treatment.
- Keep the app buildless. Add `.ttf: font/ttf` to `server.js` so the local preview serves the font with the correct MIME type.

### Theme control and initialization

- Add a labeled native Theme select with Light and Dark options beside Credits in `dist/index.html`; allow header controls to wrap on narrow screens.
- Add a small guarded initialization script before the stylesheet. Read `cinchromatic-theme-v1`; accept only `light` or `dark`. Otherwise use `prefers-color-scheme`, with light as the fallback. Set root `data-theme` and `color-scheme` before paint.
- Initialize the select from the root attribute and wire it to a dedicated theme-setting action. Persist only the explicit choice under the separate theme key; use in-memory preference tracking when storage fails.
- Follow operating-system changes only while there is no explicit stored or session choice. Do not add a third System option.
- Theme changes affect CSS tokens and the root color scheme only. Preserve canvas pixels, current image/tool/scale, gesture state, selection, undo history, discovered tiles, and the existing editor-save payload. Keep the board surround and palette-holder surface fixed as specified.

## 2. Controls, layout, and artwork treatment

- Apply the specified flat surfaces, square 1px boundaries, 44px control height, 60px palette targets, and 8px actionable gaps. Preserve the existing board/editor layout and 800px breakpoint.
- Define hover, selected, pressed, disabled, and focus styles explicitly. Put selected/palette-specific rules after generic hover rules so pointer hover cannot erase those states.
- Style secondary text according to its actual background: gray on black, white on dark gray, black on light gray. Use underlines for links and neutral, explicit save-error wording in both modes.
- Keep swatch canvases unchanged and use an inset selection border so choosing a tile never shifts the palette layout.
- Update the favicon background and corners in `dist/index.html`; preserve its existing character motif and accessible labels.
- Replace the gold cell outline in `dist/app.js` with the specified black/white perimeter strokes. Leave rendering, source assets, drag opacity, pointer math, palette discovery, and persistence logic intact.
- Preserve safe board centering, overflow, control wrapping, and reduced-motion handling.

## 3. Verification and acceptance

- Run `npm test` once after code changes. Require all existing 14 tests to pass, including original-image fidelity and saved-state compatibility.
- Check the title and image 1 in both modes at the normal desktop viewport, 390px and 320px widths, and 200% browser zoom. Confirm no clipped labels or page-wide horizontal scrolling; oversized boards must still scroll internally.
- Check every control's normal, hover, keyboard-focus, disabled, and selected states in both modes; include selected palette/Move/Paint controls while hovered and focused, plus the Theme select.
- Confirm each mode's specified text pairings meet the documented contrast targets, particularly footer text, dialog body, keycaps, and inactive controls.
- Visually check cell selection/destination outlines on gray floor, dark blocks, and already-discovered colored pieces at 4× and Fit scales. Confirm unchanged source appearance after deselection.
- Smoke-test drag snapping, paint/undo, navigation, reset, and saved edits after reload. Use existing discovered/test state; do not visit later images just to demonstrate the style.
- Verify first-use light/dark operating-system defaults, automatic system changes before explicit choice, both explicit choices, persistence across reloads, and independence from later operating-system changes. Test malformed theme values and unavailable storage; an explicit session choice must remain applied.
- Switch modes on an edited board and confirm the editor save, discovered palette, undo/redo, scale, source pixels, and selected tool are unchanged. Verify the initial theme appears without a flash of the other mode.
- Verify the local font loads and the fallback remains readable when the font request is blocked; inspect browser console/network errors and confirm there are no remote font requests.
- Restore temporary viewport/zoom settings and any theme preference used for testing, leave the existing local preview open, and save desktop and narrow-screen screenshots for both modes. Update the README with the local font/license attribution and theme behavior.

## Interfaces and delivery

No new public APIs, tools, or dependencies. Add the independent `cinchromatic-theme-v1` preference key containing `light` or `dark`; leave `cinchromatic-editor-v1` and its payload untouched. The only server interface addition is the font MIME mapping. Deliver the same local app, both themes and their select, the locally bundled font/license, updated styling and overlays, and review screenshots.

## Decisions fixed by this plan

- Light and Dark use different combinations of the same game grays and black; white supports readable text. Puzzle colors remain in source artwork and discovered swatches.
- Default follows the operating system until an explicit theme choice; that choice is saved independently of game progress.
- VT323 is a stylistic approximation, not the game’s identified original font.
- Pixel-style display headings plus readable monospace controls; no pixel font for small utility text.
- Square, flat styling with one Light/Dark select; no decorative texture, additional theme settings, new screens, or layout redesign.
- Original image assets and browser saves stay compatible. Usability overrides literal copying of low-contrast text or tiny bitmap lettering.

## Verification results

- All 20 automated tests pass: the original 14 editor tests plus six theme tests. Coverage includes image fidelity, saved-choice precedence, system changes, malformed values, blocked storage, independent progress storage, and prepaint initialization.
- Browser checks confirm both modes, preference persistence after reload, unchanged board/palette on switching, 44px controls, readable contrast, and keyboard focus. Live drag and paint strokes undo back to the exact pre-test board state.
- Both modes fit desktop, 390px, and 320px layouts without page-wide horizontal scrolling. Doubled (200%) text was verified using a temporary test stylesheet; native browser zoom shortcuts were unavailable in the preview. The temporary test files were removed.
- VT323 loads locally with the correct `font/ttf` MIME type. A simulated missing font confirmed that the monospace fallback remains usable. The final page reports no console errors or warnings.
- Review images are saved as `artifacts/style-dark-desktop.jpg`, `artifacts/style-light-desktop.jpg`, `artifacts/style-dark-mobile.jpg`, and `artifacts/style-light-mobile.jpg`. The local preview remains available at `http://127.0.0.1:4173/`.
