import test from 'node:test';
import assert from 'node:assert/strict';
import { gridPoint, characterDrag } from '../dist/grid.js';

const level = { width: 22, height: 17, columns: 4, rows: 3, cells: Array(12).fill(0) };

test('snapping follows the sprite center even when a corner grab puts the cursor in another cell', () => {
  const drag = characterDrag(level, [11.1, 6.1], [.1, .1]);
  assert.equal(gridPoint(level, [11.1, 6.1]).cell, 6);
  assert.deepEqual(drag, { origin: [11, 6], target: 6 });
  const oppositeCorner = characterDrag(level, [15.9, 10.9], [4.9, 4.9]);
  assert.deepEqual(oppositeCorner, drag);
  const offsetGrab = characterDrag(level, [10.9, 5.9], [4.9, 4.9]);
  assert.equal(gridPoint(level, [10.9, 5.9]).cell, 1);
  assert.deepEqual(offsetGrab, { origin: [6, 1], target: 1 });
  const crossed = characterDrag(level, [11.1, 6.1], [4.9, 4.9]);
  assert.equal(gridPoint(level, [11.1, 6.1]).cell, 6);
  assert.deepEqual(crossed, { origin: [6, 1], target: 1 });
});

test('preview target uses the rendered integer sprite position at cell boundaries', () => {
  assert.equal(characterDrag(level, [8.49, 3], [0, 0]).target, 1);
  assert.equal(characterDrag(level, [8.51, 3], [0, 0]).target, 2);
  assert.equal(characterDrag(level, [3, 8.49], [0, 0]).target, 4);
  assert.equal(characterDrag(level, [3, 8.51], [0, 0]).target, 8);
});

test('a cursor over a separator still snaps if the sprite center is on editable terrain', () => {
  const divided = { ...level, cells: level.cells.map((tile, i) => i === 6 ? null : tile) };
  assert.equal(gridPoint(divided, [11.1, 6.1]).cell, null);
  assert.equal(characterDrag(divided, [11.1, 6.1], [4.9, 4.9]).target, 1);
  assert.equal(characterDrag(divided, [10.9, 5.9], [0, 0]).target, null);
});

test('border centers and release outside the board cancel rather than clamping to a cell', () => {
  for (const pixel of [[-0.1, 5], [22, 5], [5, -0.1], [5, 17]]) {
    assert.equal(characterDrag(level, pixel, [2.5, 2.5]).target, null);
  }
  assert.equal(characterDrag(level, [.1, 5], [4.9, 2.5]).target, null);
  assert.equal(characterDrag(level, [21.9, 5], [0, 2.5]).target, null);
  assert.equal(characterDrag(level, [5, .1], [2.5, 4.9]).target, null);
  assert.equal(characterDrag(level, [5, 16.9], [2.5, 0]).target, null);
});
