// Original tile IDs: arrange artwork without changing discovery or saved edits.
export const PALETTE_ROWS = [
  { label: 'Dark', tiles: [8, 0, 2, 1] },
  { label: 'Red', tiles: [3, 4, 5, 18] },
  { label: 'Blue', tiles: [7, 6, 22, 23] },
  { label: 'Purple', tiles: [10, 11, 9, 19] },
  { label: 'Yellow', tiles: [13, 14, 21, 20] },
  { label: 'Other tiles', tiles: [12, 15, 16, 17], extra: true },
];
export const PALETTE_TYPES = ['Character', 'Block', 'Ring', 'Floor'];

export function paletteLabel(tile) {
  const row = PALETTE_ROWS.find(row => row.tiles.includes(tile.id));
  if (row.extra) {
    return ({ 12: 'Dark solid block', 15: 'Yellow solid block', 16: 'Multicolor ring', 17: 'Plain floor' })[tile.id];
  }
  return `${row.label} ${PALETTE_TYPES[row.tiles.indexOf(tile.id)].toLowerCase()}`;
}
