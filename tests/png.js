import { inflateSync } from 'node:zlib';

// Independent decoder for the original indexed PNGs; no app extraction code reused.
export function decodePNG(uri) {
  const bytes = Buffer.from(uri.split(',')[1], 'base64');
  let width, height, depth, colorType, palette, transparency;
  const compressed = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); depth = data[8]; colorType = data[9]; if (data[12] !== 0) throw new Error('Interlaced image'); }
    if (type === 'PLTE') palette = data;
    if (type === 'tRNS') transparency = data;
    if (type === 'IDAT') compressed.push(data);
    offset += length + 12;
  }
  if (colorType !== 3) throw new Error(`Expected indexed PNG, got ${colorType}`);
  const raw = inflateSync(Buffer.concat(compressed)), stride = Math.ceil(width * depth / 8), pixels = [];
  let previous = Buffer.alloc(stride), offset = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[offset++], row = Buffer.from(raw.subarray(offset, offset + stride)); offset += stride;
    for (let x = 0; x < stride; x++) {
      const a = x ? row[x - 1] : 0, b = previous[x], c = x ? previous[x - 1] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const predictor = filter === 0 ? 0 : filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      row[x] = (row[x] + predictor) & 255;
    }
    for (let x = 0; x < width; x++) {
      const bit = x * depth, index = (row[Math.floor(bit / 8)] >> (8 - depth - bit % 8)) & ((1 << depth) - 1);
      pixels.push({ color: palette.subarray(index * 3, index * 3 + 3).toString('hex'), alpha: transparency?.[index] ?? 255 });
    }
    previous = row;
  }
  return { width, height, pixels };
}
