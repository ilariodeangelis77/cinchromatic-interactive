# Cinchromatic Interactive

A static image editor for [Cinchromatic by caveadventure](https://caveadventure.itch.io/cinchromatic), inspired by [Raymond Liu’s 0Player editor](https://raymondliu777.github.io/0Player/). It preserves the source artwork and leaves all puzzle rules to the player.

[Open Cinchromatic Interactive](https://ilariodeangelis77.github.io/cinchromatic-interactive/)

## Run

Install Node.js if necessary. No dependencies or build step are needed.

```powershell
cd D:\Cinchromatic_Playable
npm start
```

Open <http://127.0.0.1:4173>. Stop the server with Ctrl+C. Keep this same address when reopening to retain browser saves. Serve `dist/` with any static web server to host it later. Opening `index.html` directly as a file is not supported because the app uses JavaScript modules.

## GitHub Pages

Source repository: [ilariodeangelis77/cinchromatic-interactive](https://github.com/ilariodeangelis77/cinchromatic-interactive).

The `main` branch contains source, tests, and documentation. GitHub Pages publishes the root of `gh-pages`, which contains only the contents of `dist/`. The `.nojekyll` file keeps this a plain static site. Screenshots and local browser saves are not published.

After committing changes, publish updates with:

```powershell
npm test
git push origin main
npm run deploy:pages
```

Publishing uses the authenticated GitHub CLI account through Git's credential helper. GitHub Pages deploys after the `gh-pages` push. The online and localhost addresses have separate browser saves; publishing does not transfer local progress.

## Controls

- **Previous / Next**, the image selector, or **Left / Right**: browse images 0–30. Wheel-based image navigation is disabled; the wheel scrolls normally. Keyboard navigation leaves native select controls alone.
- **Move / M**: drag a character with mouse or touch. Release to snap it to a grid cell. Walls and overlapping characters are allowed. Dragging outside the grid cancels the move; Escape cancels an active gesture.
- **Delete / Backspace**: in Move mode, click a character, then press Delete or Backspace while the board has focus. Removes only that character and leaves the background intact. Deletion is undoable; no extra button is added.
- **Paint / P**: select a palette tile, then click or drag across cells. Background tiles paint underneath characters; character tiles replace characters in that cell and preserve the background.
- **Background edits**: toggle the single background edit layer. When hidden, the original background shows beneath the current characters. Painting a background tile shows the edit layer again. Each image remembers its visibility; undo/redo changes edits without changing this view preference.
- **Undo / Ctrl+Z** and **Redo / Ctrl+Shift+Z / Ctrl+Y**: reverse edits. Cmd shortcuts work on macOS. One stroke or drag is one edit, with up to 200 undo steps per image.
- **Reset image**: restore just this image. Reset is undoable.
- **Scale**: choose Fit or an integer pixel scale. Oversized boards can be scrolled inside their viewport.
- **Theme**: choose Light or Dark. Both use the original game's neutral colors. Initially the theme follows your operating system; an explicit choice is saved on this browser/device independently of puzzle progress. If saving is blocked, the choice still lasts for the current page session.

Image 0 is view-only. The palette contains only exact artwork from images you have actually visited; skipping ahead reveals tiles on that image, not on intervening images. Returning to an earlier image retains discovered tiles.

Palette color rows use the same relative order: Character, Block, Ring, Floor, with no visible row or column labels. Discovered tiles pack from the left within their color row; undiscovered tiles leave no gaps. Additional solid blocks, the multicolor ring, and plain floor appear in a separate row below. The four-column arrangement also stays aligned on narrow screens.

Edits, visited images, the last viewed image, and each image’s background visibility are saved automatically on this browser/device using the versioned `cinchromatic-editor-v1` storage key. Existing saves load with background edits visible. Undo history is session-only. If browser storage is unavailable, a message appears and editing continues in memory. Clearing browser site data removes saves.

## Source and checks

The original 31 images are bundled in `dist/levels.js`, with 24 distinct editable tile designs and five character designs. Black separator cells and outer borders cannot be edited. Once served, the app loads only its own static files; it does not contact itch.io, track usage, or use a backend.

```powershell
npm test
```

Tests independently decode the original PNGs to verify untouched artwork pixel-for-pixel, and check editing, discovery, undo/reset, saving, and invalid operations.

`tools/extract-assets.ps1` regenerates bundled assets from the [original online viewer](https://html-classic.itch.zone/html/18447195/index.html). It requires PowerShell, internet access, and Windows System.Drawing. Running the app does not require any of these. Artwork and puzzle design remain credited to the original creators; this project does not claim ownership of their assets.

Optional WebMCP browser tools expose read, navigate, move, delete character, paint, background visibility, and history actions using the same state as the interface. Unsupported browsers simply ignore this integration.

## Visual style and fonts

The interface uses flat black/gray surfaces, square controls, pixel-style headings, and readable monospace utility text. Source images and palette swatches keep their original colors in both themes. The separate `cinchromatic-theme-v1` preference contains only `light` or `dark`; changing it does not alter the editor save.

Headings use the locally bundled **VT323 Regular**, by The VT323 Project Authors, licensed under the **SIL Open Font License 1.1**. The original font and license are in `dist/fonts/VT323-Regular.ttf` and `dist/fonts/OFL.txt`, sourced from the [official Google Fonts repository](https://github.com/google/fonts/tree/main/ofl/vt323). Utility text uses installed monospace fonts. Font loading uses a readable fallback and never contacts an external font service.

The visual specification is in `STYLE_GUIDE.md`; the implementation checklist is in `STYLE_IMPLEMENTATION_PLAN.md`.

## Original credits

- Lead designer: Katelyn Delta
- Additional design: Panic, Cerise, Seren✩
- Feedback: Abi, carrie z, Jack Crawford, Jake Eakle, Noneuclidean, Septacube
- Original online viewer: winter
