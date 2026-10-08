import test from 'node:test';
import assert from 'node:assert/strict';
import { SOURCE } from '../dist/levels.js';
import { Editor, lineCells } from '../dist/editor.js';
import { loadEditor, saveEditor } from '../dist/storage.js';
import { decodePNG } from './png.js';

const make = (index = 1) => { const editor = new Editor(SOURCE); editor.visit(index); return editor; };

test('all 31 original images reconstruct pixel-for-pixel from the untouched layered boards', () => {
  const editor = make();
  assert.equal(SOURCE.levels.length, 31);
  assert.equal(SOURCE.tiles.length, 24);
  assert.equal(SOURCE.tiles.filter(tile => tile.character).length, 5);
  for (const level of SOURCE.levels) {
    const decoded = decodePNG(level.image);
    assert.equal(decoded.width, level.width); assert.equal(decoded.height, level.height);
    const actual = structuredClone(decoded.pixels);
    const board = editor.boards[level.index];
    const draw = (tileId, cell, transparent) => {
      SOURCE.tiles[tileId].pixels.forEach((color, i) => {
        if (transparent && color === '999999') return;
        const x = 1 + cell % level.columns * 5 + i % 5;
        const y = 1 + Math.floor(cell / level.columns) * 5 + Math.floor(i / 5);
        actual[y * level.width + x] = { color, alpha: 255 };
      });
    };
    board.terrain.forEach((tileId, cell) => { if (tileId !== null) draw(tileId, cell, false); });
    board.characters.forEach(actor => draw(actor.tileId, actor.cell, true));
    assert.deepEqual(actual, decoded.pixels, `Image ${level.index}`);
  }
});

test('palette reveals only tiles on visited images and retains previous discoveries', () => {
  const editor = new Editor(SOURCE);
  assert.deepEqual(editor.palette(), []);
  editor.visit(1); assert.equal(editor.palette().length, 4);
  editor.visit(16);
  const expected = new Set([...SOURCE.levels[1].cells, ...SOURCE.levels[16].cells].filter(id => id !== null));
  assert.deepEqual(new Set(editor.palette().map(tile => tile.id)), expected);
  assert.ok(!editor.palette().some(tile => tile.firstImage === 9));
  editor.visit(0); assert.equal(editor.palette().length, expected.size);
});

test('characters move freely onto walls, preserve terrain, and undo as one action', () => {
  const editor = make(), actor = editor.snapshot().characters[0], terrain = editor.snapshot().terrain;
  assert.ok(editor.move(actor.id, 0));
  assert.deepEqual(editor.snapshot().terrain, terrain);
  assert.equal(editor.snapshot().characters[0].cell, 0);
  assert.equal(editor.histories[1].undo.length, 1);
  editor.undo(); assert.equal(editor.snapshot().characters[0].cell, actor.cell);
  editor.redo(); assert.equal(editor.snapshot().characters[0].cell, 0);
});

test('overlapping characters remain separate and movable', () => {
  const editor = make(16), actors = editor.snapshot().characters;
  editor.move(actors[0].id, actors[1].cell);
  assert.equal(editor.snapshot().characters.filter(actor => actor.cell === actors[1].cell).length, 2);
  editor.move(actors[0].id, actors[0].cell);
  assert.equal(editor.snapshot().characters.length, 2);
});

test('out-of-bounds and separator moves leave state and history unchanged', () => {
  const editor = make(30), actor = editor.snapshot().characters[0], before = editor.snapshot();
  const separator = SOURCE.levels[30].cells.indexOf(null);
  assert.ok(separator >= 0);
  for (const cell of [-1, 10000, separator, 1.5]) assert.equal(editor.move(actor.id, cell), false);
  assert.deepEqual(editor.snapshot(), before); assert.equal(editor.histories[30].undo.length, 0);
});

test('background and character painting preserve each other', () => {
  const editor = make(), actor = editor.snapshot().characters[0];
  editor.paint(0, [actor.cell]);
  assert.deepEqual(editor.snapshot().characters, [actor]);
  assert.equal(editor.snapshot().terrain[actor.cell], 0);
  editor.paint(actor.tileId, [0]);
  assert.equal(editor.snapshot().terrain[0], 0);
  const painted = editor.snapshot().characters.find(character => character.cell === 0);
  editor.move(painted.id, 1);
  assert.equal(editor.snapshot().terrain[0], 0);
  editor.undo(); editor.undo(); editor.undo();
  assert.deepEqual(editor.snapshot(), editor.initial[1]);
});

test('hiding background edits restores original terrain while moved characters stay on top', () => {
  const editor = make(), actor = editor.snapshot().characters[0];
  editor.move(actor.id, 0); editor.paint(editor.floor, [0]);
  const edited = editor.snapshot(), undoCount = editor.histories[1].undo.length;
  editor.setBackgroundVisible(false);
  assert.deepEqual(editor.visibleTerrain(), editor.initial[1].terrain);
  assert.deepEqual(editor.snapshot(), edited);
  assert.equal(editor.snapshot().characters[0].cell, 0);
  assert.equal(editor.visibleTerrain()[actor.cell], editor.floor);
  assert.equal(editor.histories[1].undo.length, undoCount);
  editor.setBackgroundVisible(true);
  assert.equal(editor.visibleTerrain()[0], editor.floor);
  editor.undo(); assert.equal(editor.visibleTerrain()[0], 0);
  editor.redo(); assert.equal(editor.visibleTerrain()[0], editor.floor);
});

test('background visibility is independent per image and survives saving with edits', () => {
  const editor = make(); editor.paint(0, [22]); editor.setBackgroundVisible(false);
  editor.visit(2); assert.equal(editor.backgroundVisible[2], true);
  editor.paint(0, [14]); editor.setBackgroundVisible(false);
  const restored = new Editor(SOURCE, JSON.parse(JSON.stringify(editor.serialize())));
  assert.equal(restored.current, 2);
  assert.equal(restored.backgroundVisible[1], false); assert.equal(restored.backgroundVisible[2], false);
  assert.deepEqual(restored.boards, editor.boards);
  restored.visit(1); restored.setBackgroundVisible(true);
  assert.equal(restored.visibleTerrain()[22], 0);
  assert.equal(restored.backgroundVisible[2], false);
  const legacy = editor.serialize(); delete legacy.hiddenBackgrounds;
  const migrated = new Editor(SOURCE, legacy);
  assert.ok(migrated.backgroundVisible.every(Boolean));
  assert.deepEqual(migrated.boards, editor.boards);
});

test('painting hidden terrain reveals it; character edits leave its visibility alone', () => {
  const editor = make(), actor = editor.snapshot().characters[0];
  editor.setBackgroundVisible(false); editor.paint(actor.tileId, [0]);
  assert.equal(editor.backgroundVisible[1], false);
  assert.equal(editor.snapshot().terrain[0], 0);
  editor.move(actor.id, 1); assert.equal(editor.backgroundVisible[1], false);
  const before = editor.snapshot();
  assert.throws(() => editor.paint(editor.floor, [0, -1]));
  assert.equal(editor.backgroundVisible[1], false); assert.deepEqual(editor.snapshot(), before);
  editor.paint(editor.floor, [0]);
  assert.equal(editor.backgroundVisible[1], true);
  assert.equal(editor.visibleTerrain()[0], editor.floor);
  assert.ok(editor.snapshot().characters.some(character => character.cell === 0));
  editor.setBackgroundVisible(false); editor.reset();
  assert.deepEqual(editor.snapshot(), editor.initial[1]);
  editor.undo(); assert.equal(editor.snapshot().terrain[0], editor.floor);
  assert.equal(editor.backgroundVisible[1], false);
});

test('background visibility validates saves and leaves the title view-only', () => {
  const title = new Editor(SOURCE);
  assert.equal(title.setBackgroundVisible(false), false);
  const editor = make(); assert.throws(() => editor.setBackgroundVisible('false'));
  for (const hiddenBackgrounds of [[0], [31], [2], ['1'], false]) {
    assert.throws(() => new Editor(SOURCE, { ...editor.serialize(), hiddenBackgrounds }));
  }
});

test('fast painting interpolates cells and a whole stroke is one undo action', () => {
  const editor = make(), before = editor.snapshot();
  assert.deepEqual(lineCells([1, 3], [5, 3]), [[1, 3], [2, 3], [3, 3], [4, 3], [5, 3]]);
  const cells = lineCells([1, 3], [5, 3]).map(([x, y]) => y * 7 + x);
  editor.paint(0, cells);
  assert.ok(cells.every(cell => editor.snapshot().terrain[cell] === 0));
  assert.equal(editor.histories[1].undo.length, 1);
  editor.undo(); assert.deepEqual(editor.snapshot(), before);
});

test('invalid paint batches roll back, and unseen tiles cannot be painted', () => {
  const editor = make(), before = editor.snapshot();
  assert.throws(() => editor.paint(0, [22, -1]));
  assert.deepEqual(editor.snapshot(), before);
  const unseen = SOURCE.tiles.find(tile => tile.firstImage > 1).id;
  assert.throws(() => editor.paint(unseen, [22]));
  assert.deepEqual(editor.snapshot(), before); assert.equal(editor.histories[1].undo.length, 0);
});

test('reset affects only the current image and is undoable', () => {
  const editor = make(); editor.paint(0, [22]); const first = editor.snapshot();
  editor.visit(2); editor.paint(0, [14]); const second = editor.snapshot();
  editor.reset(); assert.deepEqual(editor.snapshot(), editor.initial[2]);
  editor.undo(); assert.deepEqual(editor.snapshot(), second);
  editor.visit(1); assert.deepEqual(editor.snapshot(), first);
});

test('new edits after undo discard redo and no-op moves create no history', () => {
  const editor = make(), actor = editor.snapshot().characters[0];
  assert.equal(editor.move(actor.id, actor.cell), false);
  assert.equal(editor.histories[1].undo.length, 0);
  editor.move(actor.id, 0); editor.undo(); editor.paint(0, [22]);
  assert.equal(editor.redo(), false);
});

test('save reload restores each board, visited palette, and image; undo history is session-only', () => {
  const editor = make(); editor.paint(0, [22]); editor.visit(16); editor.move(editor.snapshot().characters[0].id, 0);
  const reloaded = new Editor(SOURCE, JSON.parse(JSON.stringify(editor.serialize())));
  assert.equal(reloaded.current, 16); assert.deepEqual(reloaded.boards, editor.boards);
  assert.deepEqual(reloaded.palette(), editor.palette()); assert.equal(reloaded.undo(), false);
});

test('title is read-only and invalid navigation does not change discoveries', () => {
  const editor = new Editor(SOURCE); assert.equal(editor.validCell(0), false); assert.equal(editor.reset(), false);
  for (const index of [-1, 31, 1.5, '1']) assert.throws(() => editor.visit(index));
  assert.deepEqual([...editor.visited], [0]);
});

test('corrupt saves recover; inaccessible or full storage leaves editing functional', () => {
  const broken = loadEditor(SOURCE, () => ({ getItem: () => '{invalid' }));
  assert.ok(broken.warning); assert.equal(broken.editor.current, 0);
  const blocked = loadEditor(SOURCE, () => { throw new Error('Blocked'); });
  blocked.editor.visit(1); blocked.editor.paint(0, [22]);
  assert.match(saveEditor(blocked.editor, blocked.storage), /Saving unavailable/);
  assert.equal(blocked.editor.snapshot().terrain[22], 0);
  assert.match(saveEditor(blocked.editor, { setItem() { throw new Error('Quota exceeded'); } }), /Saving unavailable/);
  let saved;
  assert.equal(saveEditor(blocked.editor, { setItem(key, value) { saved = JSON.parse(value); } }), '');
  assert.equal(saved.edits[1].terrain[22], 0);
});

test('malformed terrain, actors, and save versions are rejected', () => {
  const editor = make(); editor.paint(0, [22]);
  const saved = editor.serialize();
  assert.throws(() => new Editor(SOURCE, { ...saved, version: 2 }));
  const bad = structuredClone(saved); bad.edits[1].terrain[0] = 999;
  assert.throws(() => new Editor(SOURCE, bad));
  const badActor = structuredClone(saved); badActor.edits[1].characters[0].cell = -1;
  assert.throws(() => new Editor(SOURCE, badActor));
});
