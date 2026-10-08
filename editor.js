export const STORAGE_KEY = 'cinchromatic-editor-v1';
const clone = value => structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function lineCells(from, to) {
  const result = [];
  let [x, y] = from;
  const [tx, ty] = to;
  const dx = Math.abs(tx - x), dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    result.push([x, y]);
    if (x === tx && y === ty) return result;
    const twice = 2 * error;
    if (twice >= dy) { error += dy; x += sx; }
    if (twice <= dx) { error += dx; y += sy; }
  }
}

export class Editor {
  constructor(source, saved = null) {
    this.source = source;
    this.floor = source.tiles.find(tile => tile.pixels.every((pixel, i) => pixel === (i === 12 ? '888888' : '999999'))).id;
    this.initial = source.levels.map(level => {
      const characters = [];
      const terrain = level.cells.map((tileId, cell) => {
        if (tileId !== null && source.tiles[tileId].character) {
          characters.push({ id: `original-${cell}`, tileId, cell });
          return this.floor;
        }
        return tileId;
      });
      return { terrain, characters };
    });
    this.boards = clone(this.initial);
    this.backgroundVisible = source.levels.map(() => true);
    this.histories = source.levels.map(() => ({ undo: [], redo: [] }));
    this.visited = new Set();
    this.current = 0;
    this.sequence = 0;
    if (saved) this.restore(saved);
    this.visit(this.current);
  }
  validCell(cell, index = this.current) {
    return Number.isInteger(cell) && cell >= 0 && cell < this.source.levels[index].cells.length && this.source.levels[index].cells[cell] !== null;
  }
  visit(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.source.levels.length) throw new Error('Image must be between 0 and 30.');
    this.current = index;
    this.visited.add(index);
  }
  palette() {
    const seen = new Set();
    for (const index of this.visited) for (const tile of this.source.levels[index].cells) if (tile !== null) seen.add(tile);
    return this.source.tiles.filter(tile => seen.has(tile.id));
  }
  visibleTerrain() {
    return this.backgroundVisible[this.current] ? this.boards[this.current].terrain : this.initial[this.current].terrain;
  }
  setBackgroundVisible(visible) {
    if (typeof visible !== 'boolean') throw new Error('Background visibility must be true or false.');
    if (!this.current || this.backgroundVisible[this.current] === visible) return false;
    this.backgroundVisible[this.current] = visible;
    return true;
  }
  snapshot() { return clone(this.boards[this.current]); }
  commit(before) {
    if (same(before, this.boards[this.current])) return false;
    const history = this.histories[this.current];
    history.undo.push(clone(before));
    if (history.undo.length > 200) history.undo.shift();
    history.redo = [];
    return true;
  }
  move(id, cell) {
    if (!this.validCell(cell)) return false;
    const board = this.boards[this.current];
    const character = board.characters.find(actor => actor.id === id);
    if (!character || character.cell === cell) return false;
    const before = this.snapshot();
    character.cell = cell;
    board.characters = board.characters.filter(actor => actor.id !== id).concat(character);
    return this.commit(before);
  }
  deleteCharacter(id) {
    const board = this.boards[this.current];
    if (!board.characters.some(actor => actor.id === id)) return false;
    const before = this.snapshot();
    board.characters = board.characters.filter(actor => actor.id !== id);
    return this.commit(before);
  }
  paintCell(tileId, cell) {
    if (!this.validCell(cell)) return false;
    if (!this.palette().some(tile => tile.id === tileId)) throw new Error('Choose a tile from the discovered palette.');
    const board = this.boards[this.current];
    const tile = this.source.tiles[tileId];
    const actors = board.characters.filter(actor => actor.cell === cell);
    if (tile.character) {
      if (actors.length === 1 && actors[0].tileId === tileId) return false;
      board.characters = board.characters.filter(actor => actor.cell !== cell);
      board.characters.push({ id: `painted-${++this.sequence}`, tileId, cell });
    } else {
      // Reveal the edited background when painting it; character edits do not change visibility.
      this.setBackgroundVisible(true);
      if (board.terrain[cell] === tileId) return false;
      board.terrain[cell] = tileId;
    }
    return true;
  }
  paint(tileId, cells) {
    const before = this.snapshot();
    const backgroundWasVisible = this.backgroundVisible[this.current];
    try {
      for (const cell of cells) {
        if (!this.validCell(cell)) throw new Error('Paint cells must be inside the editable board.');
        this.paintCell(tileId, cell);
      }
      return this.commit(before);
    } catch (error) { this.boards[this.current] = before; this.backgroundVisible[this.current] = backgroundWasVisible; throw error; }
  }
  reset() {
    const before = this.snapshot();
    this.boards[this.current] = clone(this.initial[this.current]);
    return this.commit(before);
  }
  undo() { return this.historyStep('undo', 'redo'); }
  redo() { return this.historyStep('redo', 'undo'); }
  historyStep(from, to) {
    const history = this.histories[this.current];
    if (!history[from].length) return false;
    history[to].push(this.snapshot());
    this.boards[this.current] = history[from].pop();
    return true;
  }
  serialize() {
    const edits = {};
    this.boards.forEach((board, index) => { if (!same(board, this.initial[index])) edits[index] = board; });
    const hiddenBackgrounds = this.backgroundVisible.flatMap((visible, index) => visible ? [] : [index]);
    return { version: 1, current: this.current, visited: [...this.visited], sequence: this.sequence, edits, hiddenBackgrounds };
  }
  restore(saved) {
    if (saved.version !== 1) throw new Error('Unsupported save version.');
    if (!Number.isInteger(saved.current) || saved.current < 0 || saved.current > 30 || !Array.isArray(saved.visited) || !saved.visited.every(i => Number.isInteger(i) && i >= 0 && i <= 30)) throw new Error('Invalid saved navigation.');
    this.current = saved.current;
    this.visited = new Set(saved.visited);
    const hiddenBackgrounds = saved.hiddenBackgrounds ?? [];
    if (!Array.isArray(hiddenBackgrounds) || !hiddenBackgrounds.every(index => Number.isInteger(index) && index >= 1 && index <= 30 && this.visited.has(index))) throw new Error('Invalid saved background visibility.');
    for (const index of hiddenBackgrounds) this.backgroundVisible[index] = false;
    this.sequence = Number.isSafeInteger(saved.sequence) && saved.sequence >= 0 ? saved.sequence : 0;
    const permitted = new Set(this.palette().map(tile => tile.id));
    for (const [key, board] of Object.entries(saved.edits || {})) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 1 || index > 30 || !this.visited.has(index) || !Array.isArray(board.terrain) || !Array.isArray(board.characters) || board.terrain.length !== this.initial[index].terrain.length) throw new Error('Invalid saved board.');
      board.terrain.forEach((tileId, cell) => {
        if (this.source.levels[index].cells[cell] === null ? tileId !== null : !permitted.has(tileId) || this.source.tiles[tileId].character) throw new Error('Invalid saved terrain.');
      });
      const ids = new Set();
      for (const actor of board.characters) {
        if (typeof actor.id !== 'string' || ids.has(actor.id) || !permitted.has(actor.tileId) || !this.source.tiles[actor.tileId].character || !this.validCell(actor.cell, index)) throw new Error('Invalid saved character.');
        ids.add(actor.id);
      }
      this.boards[index] = clone(board);
    }
  }
}
