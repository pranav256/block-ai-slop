const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crcBuf]);
}

function makePng(size, drawPixel) {
  const width = size;
  const height = size;
  
  // PNG signature
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);
  
  // Raw image data with 0 filter byte per scanline
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);
  
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixel(x, y, size);
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }
  
  const idatData = zlib.deflateSync(raw);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// Icon drawing function: A sleek dark rounded shield with an amber/crimson slash or no-slop symbol
function drawIcon(x, y, size) {
  const nx = (x / size) * 2 - 1; // -1 to 1
  const ny = (y / size) * 2 - 1;
  const dist = Math.sqrt(nx * nx + ny * ny);

  // Background rounded squircle / shield
  const rCorner = 0.85;
  const inBox = Math.abs(nx) < rCorner && Math.abs(ny) < rCorner;
  const dCornerX = Math.max(0, Math.abs(nx) - (rCorner - 0.25));
  const dCornerY = Math.max(0, Math.abs(ny) - (rCorner - 0.25));
  const cornerDist = Math.sqrt(dCornerX * dCornerX + dCornerY * dCornerY);

  if (cornerDist > 0.25) {
    return [0, 0, 0, 0]; // Transparent background
  }

  // Base background: Dark graphite slate #0f172a
  let r = 15, g = 23, b = 42, a = 255;

  // Thin outer border
  if (cornerDist > 0.21 || Math.abs(nx) > 0.8 || Math.abs(ny) > 0.8) {
    return [51, 65, 85, 255]; // Border #334155
  }

  // Inner symbol: A circle with a diagonal slash (The universal "Block / No" symbol)
  const symRadius = 0.55;
  const symDist = Math.sqrt(nx * nx + ny * ny);
  const ringWidth = 0.12;

  // Outer ring of the "no" symbol
  const onRing = Math.abs(symDist - symRadius) < ringWidth;
  // Diagonal slash: line y = x, distance = |y - x| / sqrt(2)
  const slashDist = Math.abs(ny - nx) / Math.SQRT2;
  const onSlash = slashDist < (ringWidth * 0.9) && symDist < symRadius;

  if (onRing || onSlash) {
    // Crisp amber-red accent (#f43f5e or #ef4444)
    return [244, 63, 94, 255];
  }

  // Center subtle "AI" representation inside
  return [r, g, b, a];
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const png = makePng(size, drawIcon);
  fs.writeFileSync(path.join(iconsDir, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png`);
});
