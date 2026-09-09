/**
 * Pure TypeScript 2D QR Code Generator (ISO/IEC 18004)
 * Supports Byte Mode encoding, Versions 1-10, Error Correction Levels L, M, Q, H.
 * Zero external dependencies. Emits boolean 2D matrix, vector SVG, and coordinate rects.
 */

export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// Galois Field GF(256) with primitive polynomial 0x11d (285)
const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);
(function initGF() {
  let val = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = val;
    LOG_TABLE[val] = i;
    val <<= 1;
    if (val & 256) val ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    EXP_TABLE[i] = EXP_TABLE[i - 255]!;
  }
})();

function gfMul(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x]! + LOG_TABLE[y]!]!;
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = EXP_TABLE[i]!;
    for (let j = 0; j < poly.length; j++) {
      const pj = poly[j] ?? 0;
      next[j] = (next[j] ?? 0) ^ gfMul(pj, root);
      next[j + 1] = (next[j + 1] ?? 0) ^ pj;
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data: Uint8Array, ecLength: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLength);
  const remainder = new Uint8Array(ecLength);
  for (let i = 0; i < data.length; i++) {
    const r0 = remainder[0] ?? 0;
    const factor = (data[i] ?? 0) ^ r0;
    remainder.copyWithin(0, 1);
    remainder[ecLength - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecLength; j++) {
        const gj = gen[j] ?? 0;
        remainder[j] = (remainder[j] ?? 0) ^ gfMul(gj, factor);
      }
    }
  }
  return remainder;
}

// Version table capacities for Byte Mode (Version 1-10)
// [totalDataCodewords, ecCodewordsPerBlock, numBlocks]
interface VersionSpec {
  version: number;
  totalCodewords: number;
  dataCodewords: { [level in QRErrorCorrectionLevel]: number };
  ecCodewordsPerBlock: { [level in QRErrorCorrectionLevel]: number };
  blocks: { [level in QRErrorCorrectionLevel]: number };
}

const VERSION_SPECS: VersionSpec[] = [
  { version: 1, totalCodewords: 26, dataCodewords: { L: 19, M: 16, Q: 13, H: 9 }, ecCodewordsPerBlock: { L: 7, M: 10, Q: 13, H: 17 }, blocks: { L: 1, M: 1, Q: 1, H: 1 } },
  { version: 2, totalCodewords: 44, dataCodewords: { L: 34, M: 28, Q: 22, H: 16 }, ecCodewordsPerBlock: { L: 10, M: 16, Q: 22, H: 28 }, blocks: { L: 1, M: 1, Q: 1, H: 1 } },
  { version: 3, totalCodewords: 70, dataCodewords: { L: 55, M: 44, Q: 34, H: 26 }, ecCodewordsPerBlock: { L: 15, M: 26, Q: 18, H: 22 }, blocks: { L: 1, M: 1, Q: 2, H: 2 } },
  { version: 4, totalCodewords: 100, dataCodewords: { L: 80, M: 64, Q: 48, H: 36 }, ecCodewordsPerBlock: { L: 20, M: 18, Q: 26, H: 16 }, blocks: { L: 1, M: 2, Q: 2, H: 4 } },
  { version: 5, totalCodewords: 134, dataCodewords: { L: 108, M: 86, Q: 62, H: 46 }, ecCodewordsPerBlock: { L: 26, M: 24, Q: 18, H: 22 }, blocks: { L: 1, M: 2, Q: 4, H: 4 } },
  { version: 6, totalCodewords: 172, dataCodewords: { L: 136, M: 108, Q: 76, H: 60 }, ecCodewordsPerBlock: { L: 18, M: 16, Q: 24, H: 28 }, blocks: { L: 2, M: 4, Q: 4, H: 4 } },
  { version: 7, totalCodewords: 196, dataCodewords: { L: 156, M: 124, Q: 88, H: 66 }, ecCodewordsPerBlock: { L: 20, M: 18, Q: 18, H: 26 }, blocks: { L: 2, M: 4, Q: 6, H: 5 } },
  { version: 8, totalCodewords: 242, dataCodewords: { L: 194, M: 154, Q: 110, H: 86 }, ecCodewordsPerBlock: { L: 24, M: 22, Q: 22, H: 26 }, blocks: { L: 2, M: 4, Q: 6, H: 6 } },
  { version: 9, totalCodewords: 292, dataCodewords: { L: 232, M: 182, Q: 132, H: 100 }, ecCodewordsPerBlock: { L: 30, M: 22, Q: 20, H: 24 }, blocks: { L: 2, M: 5, Q: 8, H: 8 } },
  { version: 10, totalCodewords: 346, dataCodewords: { L: 274, M: 216, Q: 154, H: 122 }, ecCodewordsPerBlock: { L: 18, M: 26, Q: 24, H: 28 }, blocks: { L: 4, M: 5, Q: 8, H: 8 } }
];

// Alignment pattern centers for versions 1-10
const ALIGNMENT_LOCATIONS: number[][] = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
];

// Format Info with BCH(15, 5) code
const FORMAT_INFO: { [key: string]: number } = {
  'M-0': 0x5412, 'M-1': 0x5125, 'M-2': 0x5e7c, 'M-3': 0x5b4b,
  'L-0': 0x77c4, 'L-1': 0x72f3, 'L-2': 0x7daa, 'L-3': 0x789d,
  'H-0': 0x1689, 'H-1': 0x13be, 'H-2': 0x1ce7, 'H-3': 0x19d0,
  'Q-0': 0x355f, 'Q-1': 0x3068, 'Q-2': 0x3f31, 'Q-3': 0x3a06
};

class BitBuffer {
  private buffer: number[] = [];
  private length = 0;

  put(num: number, length: number) {
    for (let i = 0; i < length; i++) {
      this.putBit(((num >>> (length - i - 1)) & 1) === 1);
    }
  }

  putBit(bit: boolean) {
    const bufIndex = Math.floor(this.length / 8);
    if (this.buffer.length <= bufIndex) {
      this.buffer.push(0);
    }
    if (bit) {
      const cur = this.buffer[bufIndex] ?? 0;
      this.buffer[bufIndex] = cur | (0x80 >>> (this.length % 8));
    }
    this.length++;
  }

  getBuffer(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  getLength(): number {
    return this.length;
  }
}

export function generateQRCodeMatrix(
  text: string,
  errorCorrectionLevel: QRErrorCorrectionLevel = 'M'
): boolean[][] {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(text || ' ');

  // Determine minimum version
  let selectedSpec = VERSION_SPECS[0]!;
  let found = false;
  for (const spec of VERSION_SPECS) {
    const maxDataBytes = spec.dataCodewords[errorCorrectionLevel];
    // Mode indicator (4 bits) + character count indicator (8 or 16 bits)
    const headerBits = 4 + (spec.version < 10 ? 8 : 16);
    const requiredBits = headerBits + dataBytes.length * 8;
    if (requiredBits <= maxDataBytes * 8) {
      selectedSpec = spec;
      found = true;
      break;
    }
  }

  if (!found) {
    selectedSpec = VERSION_SPECS[VERSION_SPECS.length - 1]!;
  }

  const version = selectedSpec.version;
  const size = 17 + 4 * version;

  // 1. Build Data BitStream (Byte Mode: 0100)
  const bitBuffer = new BitBuffer();
  bitBuffer.put(0b0100, 4); // Byte Mode
  const charCountBits = version < 10 ? 8 : 16;
  bitBuffer.put(dataBytes.length, charCountBits);
  for (const byte of dataBytes) {
    bitBuffer.put(byte, 8);
  }

  // Terminator (up to 4 zeroes)
  const capacityBits = selectedSpec.dataCodewords[errorCorrectionLevel] * 8;
  const padBits = Math.min(4, capacityBits - bitBuffer.getLength());
  bitBuffer.put(0, padBits);

  // Byte alignment padding
  while (bitBuffer.getLength() % 8 !== 0) {
    bitBuffer.putBit(false);
  }

  // Pad bytes: 0xEC, 0x11
  let padByte = 0xec;
  while (bitBuffer.getLength() < capacityBits) {
    bitBuffer.put(padByte, 8);
    padByte = padByte === 0xec ? 0x11 : 0xec;
  }

  // 2. Error Correction Codewords Generation
  const rawData = bitBuffer.getBuffer();
  const numBlocks = selectedSpec.blocks[errorCorrectionLevel];
  const totalDataBytes = selectedSpec.dataCodewords[errorCorrectionLevel];
  const ecLength = selectedSpec.ecCodewordsPerBlock[errorCorrectionLevel];

  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  const blockSize = Math.floor(totalDataBytes / numBlocks);

  for (let b = 0; b < numBlocks; b++) {
    const start = b * blockSize;
    const end = b === numBlocks - 1 ? totalDataBytes : (b + 1) * blockSize;
    const slice = rawData.slice(start, end);
    dataBlocks.push(slice);
    ecBlocks.push(rsEncode(slice, ecLength));
  }

  // Interleave data and EC codewords
  const allCodewords: number[] = [];
  const maxBlockLen = Math.max(...dataBlocks.map(d => d.length));
  for (let i = 0; i < maxBlockLen; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < dataBlocks[b]!.length) {
        allCodewords.push(dataBlocks[b]![i]!);
      }
    }
  }
  for (let i = 0; i < ecLength; i++) {
    for (let b = 0; b < numBlocks; b++) {
      if (i < ecBlocks[b]!.length) {
        allCodewords.push(ecBlocks[b]![i]!);
      }
    }
  }

  // 3. Populate Matrix
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );

  // Helper: Place 7x7 Finder Pattern with 1-module separator
  const placeFinderPattern = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const mr = row + r;
        const mc = col + c;
        if (mr >= 0 && mr < size && mc >= 0 && mc < size) {
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
            const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
            matrix[mr]![mc] = isBorder || isCenter;
          } else {
            matrix[mr]![mc] = false; // Separator
          }
        }
      }
    }
  };

  // Three finder patterns
  placeFinderPattern(0, 0);
  placeFinderPattern(0, size - 7);
  placeFinderPattern(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6]![i] === null) matrix[6]![i] = i % 2 === 0;
    if (matrix[i]![6] === null) matrix[i]![6] = i % 2 === 0;
  }

  // Alignment patterns (for version >= 2)
  const alignCoords = ALIGNMENT_LOCATIONS[version - 1] || [];
  for (const r of alignCoords) {
    for (const c of alignCoords) {
      if (matrix[r]![c] !== null) continue; // Skip if collides with finder
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const isEdge = Math.abs(dr) === 2 || Math.abs(dc) === 2;
          const isCenter = dr === 0 && dc === 0;
          matrix[r + dr]![c + dc] = isEdge || isCenter;
        }
      }
    }
  }

  // Dark module
  matrix[4 * version + 9]![8] = true;

  // Format info area reservation
  for (let i = 0; i < 9; i++) {
    if (matrix[8]![i] === null) matrix[8]![i] = false;
    if (matrix[i]![8] === null) matrix[i]![8] = false;
    if (matrix[8]![size - 1 - i] === null) matrix[8]![size - 1 - i] = false;
    if (matrix[size - 1 - i]![8] === null) matrix[size - 1 - i]![8] = false;
  }

  // 4. Place Data Bits (Zigzag traversal)
  const bitStream: boolean[] = [];
  for (const cw of allCodewords) {
    for (let b = 7; b >= 0; b--) {
      bitStream.push(((cw >>> b) & 1) === 1);
    }
  }

  let bitIdx = 0;
  let dir = -1; // Upwards
  let c = size - 1;

  while (c > 0) {
    if (c === 6) c--; // Skip vertical timing pattern
    for (let i = 0; i < size; i++) {
      const curRow = dir === -1 ? size - 1 - i : i;
      for (const curCol of [c, c - 1]) {
        if (matrix[curRow]![curCol] === null) {
          const bit = bitIdx < bitStream.length ? bitStream[bitIdx++]! : false;
          // Mask 0: (row + col) % 2 === 0
          const mask = (curRow + curCol) % 2 === 0;
          matrix[curRow]![curCol] = mask ? !bit : bit;
        }
      }
    }
    dir = -dir;
    c -= 2;
  }

  // 5. Write Format Information (Mask 0)
  const formatKey = `${errorCorrectionLevel}-0`;
  const formatBits = FORMAT_INFO[formatKey] ?? 0x5412;

  // Top-left format placement
  for (let i = 0; i < 6; i++) matrix[8]![i] = ((formatBits >>> (14 - i)) & 1) === 1;
  matrix[8]![7] = ((formatBits >>> 8) & 1) === 1;
  matrix[8]![8] = ((formatBits >>> 7) & 1) === 1;
  matrix[7]![8] = ((formatBits >>> 6) & 1) === 1;
  for (let i = 0; i < 6; i++) matrix[5 - i]![8] = ((formatBits >>> (5 - i)) & 1) === 1;

  // Mirrored format placement near other finders
  for (let i = 0; i < 7; i++) matrix[size - 1 - i]![8] = ((formatBits >>> i) & 1) === 1;
  for (let i = 0; i < 8; i++) matrix[8]![size - 8 + i] = ((formatBits >>> (7 + i)) & 1) === 1;

  // Convert to boolean[][]
  return matrix.map(row => row.map(cell => cell ?? false));
}

/**
 * Generates crisp vector SVG markup for QR code
 */
export function qrcodeToSvg(
  matrix: boolean[][],
  width: number,
  height: number,
  options?: {
    darkColor?: string;
    lightColor?: string;
    margin?: number;
  }
): string {
  const darkColor = options?.darkColor || '#000000';
  const lightColor = options?.lightColor || '#ffffff';
  const margin = options?.margin ?? 2;

  const numModules = matrix.length;
  const totalSize = numModules + margin * 2;
  const cellSize = width / totalSize;

  let pathD = '';
  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (matrix[r]![c]) {
        const x = (c + margin) * cellSize;
        const y = (r + margin) * cellSize;
        pathD += `M${x.toFixed(2)},${y.toFixed(2)}h${cellSize.toFixed(2)}v${cellSize.toFixed(2)}h-${cellSize.toFixed(2)}z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
  <rect width="${width}" height="${height}" fill="${lightColor}" />
  <path d="${pathD}" fill="${darkColor}" />
</svg>`;
}

/**
 * Returns list of rects for PDFKit vector drawing
 */
export function qrcodeToRects(
  matrix: boolean[][],
  x: number,
  y: number,
  width: number,
  height: number,
  margin = 1
): { x: number; y: number; width: number; height: number }[] {
  const numModules = matrix.length;
  const totalSize = numModules + margin * 2;
  const cellSize = Math.min(width, height) / totalSize;
  const offsetX = x + (width - totalSize * cellSize) / 2;
  const offsetY = y + (height - totalSize * cellSize) / 2;

  const rects: { x: number; y: number; width: number; height: number }[] = [];
  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (matrix[r]![c]) {
        rects.push({
          x: offsetX + (c + margin) * cellSize,
          y: offsetY + (r + margin) * cellSize,
          width: cellSize + 0.05, // Slight overlap to eliminate subpixel hairline gaps
          height: cellSize + 0.05
        });
      }
    }
  }
  return rects;
}
