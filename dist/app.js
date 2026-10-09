import { SOURCE } from './levels.js';
import { lineCells } from './editor.js';
import { loadEditor, saveEditor } from './storage.js';
import { createThemeController } from './theme.js';
import { PALETTE_ROWS, paletteLabel } from './palette.js';
import { gridPoint, characterDrag } from './grid.js';
const $ = id => document.getElementById(id);
const theme = createThemeController({
  getStorage: () => window.localStorage,
  media: typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null,
  apply(value) {
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
    $('theme').value = value;
  },
});
$('theme').addEventListener('change', event => theme.choose(event.target.value));
const canvas = $('board');
const context = canvas.getContext('2d');
const loaded = loadEditor(SOURCE, () => window.localStorage);
const { editor, storage } = loaded;
let saveWarning = loaded.warning, mode = 'move', selectedTile = null, selectedCharacter = null, gesture = null;
// Kept available for future use; normal wheel scrolling must not change images.
const WHEEL_IMAGE_NAVIGATION_ENABLED = false;
let wheelAccumulator = 0, wheelTime = 0, wheelNavigationTime = 0;
const tileCanvases = SOURCE.tiles.map(tile => {
  const terrain = document.createElement('canvas'), actor = document.createElement('canvas');
  terrain.width = actor.width = 5; terrain.height = actor.height = 5;
  const full = terrain.getContext('2d'), transparent = actor.getContext('2d');
  tile.pixels.forEach((color, i) => {
    full.fillStyle = `#${color}`;
    full.fillRect(i % 5, Math.floor(i / 5), 1, 1);
    if (color !== '999999') { transparent.fillStyle = `#${color}`; transparent.fillRect(i % 5, Math.floor(i / 5), 1, 1); }
  });
  return { terrain, actor };
});
const images = SOURCE.levels.map(level => { const image = new Image(); image.src = level.image; return image; });
for (const level of SOURCE.levels) $('image-select').add(new Option(String(level.index), String(level.index)));
function persist() {
  const warning = saveEditor(editor, storage);
  if (warning || !saveWarning || saveWarning.startsWith('Saving unavailable')) saveWarning = warning;
  $('save-status').textContent = saveWarning || 'Saved on this device';
  $('save-status').classList.toggle('warning', !!saveWarning);
}
function resize() {
  const level = SOURCE.levels[editor.current];
  const viewport = $('board-viewport');
  const padding = window.innerWidth <= 800 ? 32 : 48;
  const scale = $('scale').value === 'auto' ? Math.max(1, Math.floor(Math.min((viewport.clientWidth - padding) / level.width, (viewport.clientHeight - padding) / level.height))) : Number($('scale').value);
  canvas.style.width = `${level.width * scale}px`; canvas.style.height = `${level.height * scale}px`;
}
function cellPosition(cell) {
  const level = SOURCE.levels[editor.current];
  return [1 + (cell % level.columns) * 5, 1 + Math.floor(cell / level.columns) * 5];
}
function actorAt(cell) { return editor.boards[editor.current].characters.findLast(actor => actor.cell === cell); }
function render() {
  const level = SOURCE.levels[editor.current];
  context.clearRect(0, 0, canvas.width, canvas.height); context.imageSmoothingEnabled = false;
  if (images[editor.current].complete && images[editor.current].naturalWidth) context.drawImage(images[editor.current], 0, 0);
  if (!editor.current) return;
  const board = editor.boards[editor.current];
  editor.visibleTerrain().forEach((tile, cell) => { if (tile !== null) context.drawImage(tileCanvases[tile].terrain, ...cellPosition(cell)); });
  for (const actor of board.characters) {
    if (gesture?.kind === 'move' && gesture.id === actor.id) continue;
    context.drawImage(tileCanvases[actor.tileId].actor, ...cellPosition(actor.cell));
  }
  if (gesture?.kind === 'move') {
    const actor = board.characters.find(actor => actor.id === gesture.id);
    if (actor) {
      if (gesture.target !== null) {
        context.globalAlpha = .5; context.drawImage(tileCanvases[actor.tileId].actor, ...cellPosition(gesture.target)); context.globalAlpha = 1;
      }
      context.drawImage(tileCanvases[actor.tileId].actor, ...gesture.origin);
    }
  }
}
function updateControls() {
  const index = editor.current, history = editor.histories[index];
  $('image-select').value = String(index); $('previous').disabled = index === 0; $('next').disabled = index === 30;
  $('image-label').textContent = `Image ${index}${index === 0 ? ' · Title' : ''}`;
  $('mode-label').textContent = index === 0 ? 'VIEW ONLY' : mode === 'move' ? 'SNAP TO GRID' : 'PAINT TILES';
  $('move').disabled = $('paint').disabled = index === 0;
  $('move').setAttribute('aria-pressed', String(mode === 'move')); $('paint').setAttribute('aria-pressed', String(mode === 'paint'));
  $('undo').disabled = !history.undo.length; $('redo').disabled = !history.redo.length; $('reset').disabled = index === 0;
  $('background-edits').disabled = index === 0;
  $('background-edits').setAttribute('aria-pressed', String(editor.backgroundVisible[index]));
  $('hint').textContent = index === 0 ? 'Browse the images to discover tiles.' : mode === 'move' ? selectedCharacter ? 'Character selected · Delete / Backspace to remove.' : 'Drag a character. Release to snap to a cell.' : 'Click or drag to paint. Each stroke is one edit.';
  canvas.classList.toggle('painting', mode === 'paint' && index > 0); canvas.classList.toggle('dragging', gesture?.kind === 'move');
  canvas.setAttribute('aria-label', index === 0 ? 'Cinchromatic title image, view only.' : `Cinchromatic image ${index}. ${mode === 'move' ? 'Drag characters onto grid cells.' : 'Click or drag to paint tiles.'}`);
}
function tileLabel(tile) {
  return `${paletteLabel(tile)} · tile ${tile.id + 1}`;
}
function updatePalette() {
  const tiles = editor.palette();
  if (selectedTile === null && tiles.length) selectedTile = tiles[0].id;
  $('palette').replaceChildren();
  const discovered = new Map(tiles.map(tile => [tile.id, tile]));
  for (const row of PALETTE_ROWS) {
    if (!row.tiles.some(id => discovered.has(id))) continue;
    const group = document.createElement('div');
    group.className = row.extra ? 'palette-row palette-extra' : 'palette-row';
    group.setAttribute('role', 'group'); group.setAttribute('aria-label', row.label);
    for (const id of row.tiles) {
      const tile = discovered.get(id);
      if (!tile) continue;
      const button = document.createElement('button'); button.className = 'tile'; button.dataset.tileId = tile.id; button.title = tileLabel(tile);
      button.setAttribute('aria-label', tileLabel(tile)); button.setAttribute('aria-pressed', String(selectedTile === tile.id));
      const preview = document.createElement('canvas'); preview.width = preview.height = 5; preview.setAttribute('aria-hidden', 'true');
      preview.getContext('2d').drawImage(tileCanvases[tile.id].terrain, 0, 0); button.append(preview);
      button.onclick = () => { cancelGesture(); selectedTile = tile.id; if (editor.current) mode = 'paint'; selectedCharacter = null; updatePalette(); updateControls(); render(); };
      group.append(button);
    }
    $('palette').append(group);
  }
  $('tile-count').textContent = `${tiles.length} ${tiles.length === 1 ? 'tile' : 'tiles'}`; $('palette-empty').hidden = tiles.length > 0;
}
function finishEdit() { persist(); updateControls(); render(); }
function cancelGesture() {
  if (!gesture) return;
  const active = gesture; gesture = null;
  if (active.kind === 'paint') editor.boards[editor.current] = active.before;
  if (canvas.hasPointerCapture(active.pointer)) canvas.releasePointerCapture(active.pointer);
  updateControls(); render();
}
function navigate(index) {
  cancelGesture(); editor.visit(index); selectedCharacter = null;
  const level = SOURCE.levels[index]; canvas.width = level.width; canvas.height = level.height;
  resize(); updatePalette(); updateControls(); render(); persist();
}
function point(event) {
  const rect = canvas.getBoundingClientRect();
  const pixel = [(event.clientX - rect.left) * canvas.width / rect.width, (event.clientY - rect.top) * canvas.height / rect.height];
  return gridPoint(SOURCE.levels[editor.current], pixel);
}
canvas.addEventListener('pointerdown', event => {
  if (!editor.current || gesture || event.button !== 0) return;
  const hit = point(event); if (hit.cell === null) return;
  canvas.focus({ preventScroll: true }); event.preventDefault();
  if (mode === 'move') {
    const actor = actorAt(hit.cell); selectedCharacter = actor?.id || null;
    if (actor) { const origin = cellPosition(hit.cell); gesture = { kind: 'move', id: actor.id, pointer: event.pointerId, target: hit.cell, origin, offset: [hit.pixel[0] - origin[0], hit.pixel[1] - origin[1]] }; }
  } else if (selectedTile !== null) {
    gesture = { kind: 'paint', pointer: event.pointerId, before: editor.snapshot(), last: hit.coordinates }; editor.paintCell(selectedTile, hit.cell);
  }
  if (gesture) canvas.setPointerCapture(event.pointerId);
  updateControls(); render();
});
function updateGesture(event) {
  if (!gesture || event.pointerId !== gesture.pointer) return;
  const hit = point(event);
  if (gesture.kind === 'move') Object.assign(gesture, characterDrag(SOURCE.levels[editor.current], hit.pixel, gesture.offset));
  else if (hit.cell === null) gesture.last = null;
  else {
    const level = SOURCE.levels[editor.current], cells = gesture.last ? lineCells(gesture.last, hit.coordinates) : [hit.coordinates];
    for (const [column, row] of cells) editor.paintCell(selectedTile, row * level.columns + column);
    gesture.last = hit.coordinates;
  }
  render();
}
canvas.addEventListener('pointermove', updateGesture);
canvas.addEventListener('pointerup', event => {
  if (!gesture || event.pointerId !== gesture.pointer) return;
  updateGesture(event); const active = gesture; gesture = null;
  if (active.kind === 'move') { if (active.target !== null) editor.move(active.id, active.target); } else editor.commit(active.before);
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  finishEdit();
});
canvas.addEventListener('pointercancel', cancelGesture);
canvas.addEventListener('lostpointercapture', () => { if (gesture) cancelGesture(); });
window.addEventListener('blur', cancelGesture);
function changeMode(next) { cancelGesture(); mode = next; selectedCharacter = null; updateControls(); render(); }
function historyAction(action) { cancelGesture(); selectedCharacter = null; editor[action](); finishEdit(); }
function deleteCharacter(id) { cancelGesture(); const removed = editor.deleteCharacter(id); if (removed) selectedCharacter = null; finishEdit(); return removed; }
function backgroundVisibility(visible) { cancelGesture(); editor.setBackgroundVisible(visible); finishEdit(); }
$('previous').onclick = () => navigate(Math.max(0, editor.current - 1));
$('next').onclick = () => navigate(Math.min(30, editor.current + 1));
$('image-select').onchange = event => navigate(Number(event.target.value));
$('scale').onchange = () => { cancelGesture(); resize(); };
$('move').onclick = () => changeMode('move'); $('paint').onclick = () => changeMode('paint');
$('undo').onclick = () => historyAction('undo'); $('redo').onclick = () => historyAction('redo'); $('reset').onclick = () => historyAction('reset');
$('background-edits').onclick = () => backgroundVisibility(!editor.backgroundVisible[editor.current]);
$('credits-button').onclick = () => { cancelGesture(); $('credits').showModal(); }; $('close-credits').onclick = () => $('credits').close();
$('credits').addEventListener('click', event => { if (event.target === $('credits')) { const r = $('credits').getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) $('credits').close(); } });
window.addEventListener('keydown', event => {
  if ($('credits').open || event.target.closest('select,input,textarea,[contenteditable="true"]')) return;
  if (event.key === 'Escape') { cancelGesture(); selectedCharacter = null; render(); return; }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); historyAction(event.shiftKey ? 'redo' : 'undo'); }
  else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); historyAction('redo'); }
  else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
    if ((event.key === 'Delete' || event.key === 'Backspace') && event.target === canvas && mode === 'move' && editor.current) { event.preventDefault(); if (selectedCharacter) deleteCharacter(selectedCharacter); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); navigate(Math.max(0, Math.min(30, editor.current + (event.key === 'ArrowLeft' ? -1 : 1)))); }
    else if (event.key.toLowerCase() === 'm' && editor.current) changeMode('move');
    else if (event.key.toLowerCase() === 'p' && editor.current) changeMode('paint');
  }
});
if (WHEEL_IMAGE_NAVIGATION_ENABLED) {
  canvas.addEventListener('wheel', event => {
    if (event.ctrlKey || gesture) return; event.preventDefault();
    const now = performance.now(); if (now - wheelTime > 180) wheelAccumulator = 0; wheelTime = now;
    wheelAccumulator += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
    if (Math.abs(wheelAccumulator) >= 60 && now - wheelNavigationTime > 240) { const direction = Math.sign(wheelAccumulator); wheelAccumulator = 0; wheelNavigationTime = now; navigate(Math.max(0, Math.min(30, editor.current + direction))); }
  }, { passive: false });
}
new ResizeObserver(resize).observe($('board-viewport'));
Promise.all(images.map(image => image.decode())).then(render).catch(() => { $('hint').textContent = 'An image could not load. Reload to try again.'; });
window.addEventListener('pagehide', () => { cancelGesture(); persist(); });
navigate(editor.current);

// Optional browser agent interface; all mutations share the visible editor actions.
const modelContext = document.modelContext;
if (modelContext?.registerTool) {
  const schema = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
  const integer = { type: 'integer' };
  const requireInput = (input, fields) => { if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !fields.includes(key)) || fields.some(key => !(key in input))) throw new Error('Invalid tool input.'); };
  const summary = () => ({ image: editor.current, columns: SOURCE.levels[editor.current].columns, rows: SOURCE.levels[editor.current].rows, palette: editor.palette().map(tile => ({ id: tile.id, character: tile.character })), backgroundEditsVisible: editor.backgroundVisible[editor.current], board: editor.snapshot() });
  const tools = [
    { name: 'read_editor', description: 'Read the current board and tiles discovered by visiting images.', inputSchema: schema({}), annotations: { readOnlyHint: true }, execute(input) { requireInput(input, []); return summary(); } },
    { name: 'navigate_image', description: 'Visit an image numbered 0 through 30, revealing its tiles in the palette.', inputSchema: schema({ image: { ...integer, minimum: 0, maximum: 30 } }), execute(input) { requireInput(input, ['image']); navigate(input.image); return summary(); } },
    { name: 'set_background_visibility', description: 'Show or hide the single background edit layer. Characters always remain above the visible background.', inputSchema: schema({ visible: { type: 'boolean' } }), execute(input) { requireInput(input, ['visible']); backgroundVisibility(input.visible); return summary(); } },
    { name: 'move_character', description: 'Move a character to an editable cell. Cells are indexed from zero in row order.', inputSchema: schema({ id: { type: 'string' }, cell: integer }), execute(input) { requireInput(input, ['id', 'cell']); cancelGesture(); if (typeof input.id !== 'string' || !editor.validCell(input.cell) || !editor.boards[editor.current].characters.some(actor => actor.id === input.id)) throw new Error('Unknown character or invalid cell.'); editor.move(input.id, input.cell); selectedCharacter = null; finishEdit(); return summary(); } },
    { name: 'delete_character', description: 'Delete one character from the current image without changing its background. Deletion is undoable.', inputSchema: schema({ id: { type: 'string' } }), execute(input) { requireInput(input, ['id']); cancelGesture(); if (typeof input.id !== 'string' || !editor.boards[editor.current].characters.some(actor => actor.id === input.id)) throw new Error('Unknown character.'); deleteCharacter(input.id); return summary(); } },
    { name: 'paint_cells', description: 'Paint discovered tiles in one undoable edit. Background tiles paint beneath characters and reveal background edits; character tiles preserve the background.', inputSchema: schema({ tileId: integer, cells: { type: 'array', items: integer, minItems: 1 } }), execute(input) { requireInput(input, ['tileId', 'cells']); cancelGesture(); if (!Number.isInteger(input.tileId) || !Array.isArray(input.cells) || !input.cells.length) throw new Error('Supply a tile and at least one cell.'); editor.paint(input.tileId, input.cells); selectedCharacter = null; finishEdit(); return summary(); } },
    { name: 'edit_history', description: 'Undo, redo, or reset the current image. Reset is undoable.', inputSchema: schema({ action: { type: 'string', enum: ['undo', 'redo', 'reset'] } }), execute(input) { requireInput(input, ['action']); if (!['undo', 'redo', 'reset'].includes(input.action)) throw new Error('Unknown history action.'); historyAction(input.action); return summary(); } },
  ];
  const lifecycle = new AbortController();
  for (const tool of tools) {
    try { Promise.resolve(modelContext.registerTool({ ...tool, annotations: { readOnlyHint: false, untrustedContentHint: false, ...tool.annotations } }, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Ordinary browsers remain fully usable. */ }
  }
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
}
