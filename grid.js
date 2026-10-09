export function gridPoint(level, pixel) {
  const column = Math.floor((pixel[0] - 1) / 5), row = Math.floor((pixel[1] - 1) / 5);
  const cell = row * level.columns + column;
  const valid = column >= 0 && column < level.columns && row >= 0 && row < level.rows && level.cells[cell] !== null;
  return { pixel, coordinates: [column, row], cell: valid ? cell : null };
}

export function characterDrag(level, pixel, offset) {
  // Use the same integer origin for the drawn sprite and its snapping preview.
  const origin = pixel.map((value, axis) => Math.round(value - offset[axis]));
  const center = origin.map(value => value + 2.5);
  const inside = pixel[0] >= 0 && pixel[0] < level.width && pixel[1] >= 0 && pixel[1] < level.height;
  return { origin, target: inside ? gridPoint(level, center).cell : null };
}
