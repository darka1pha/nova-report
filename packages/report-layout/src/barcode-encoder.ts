/**
 * Pure TypeScript 1D Barcode Vector Encoder
 * Supports Code 128 (high-density alphanumeric), Code 39, and EAN-13.
 * Zero external dependencies. Emits boolean module patterns and SVG strings.
 */

export interface BarcodeResult {
  modules: boolean[];
  totalModules: number;
  value: string;
  format: string;
}

// ==================== CODE 128 ENCODER ====================
// Code 128 patterns: 107 symbols (each 11 bits, Stop is 13 bits)
// Represented as run-lengths [bar, space, bar, space, bar, space]
const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3], [1, 2, 1, 3, 2, 2], // 0-4
  [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3], // 5-9
  [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2], [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1], // 10-14
  [1, 1, 3, 2, 2, 2], [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], // 15-19
  [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1], [3, 1, 1, 2, 2, 2], // 20-24
  [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2], [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], // 25-29
  [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], // 30-34
  [1, 3, 1, 3, 2, 1], [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3], // 35-39
  [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], [1, 3, 2, 1, 3, 1], // 40-44
  [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1], [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], // 45-49
  [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3], [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3], // 50-54
  [3, 1, 1, 3, 2, 1], [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1], // 55-59
  [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4], [1, 1, 1, 4, 2, 2], // 60-64
  [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4], // 65-69
  [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4], [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], // 70-74
  [2, 4, 1, 2, 1, 1], [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], // 75-79
  [1, 1, 1, 2, 4, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2], [1, 2, 4, 1, 1, 2], // 80-84
  [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2], [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1], // 85-89
  [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], // 90-94
  [1, 1, 4, 1, 1, 3], [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1], // 95-99
  [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], [2, 1, 1, 2, 1, 4], // 100-104 (103=StartA, 104=StartB)
  [2, 1, 1, 2, 3, 2]  // 105 = StartC
];

// Stop pattern: [2, 3, 3, 1, 1, 1, 2] (106)
const CODE128_STOP = [2, 3, 3, 1, 1, 1, 2];

export function encodeCode128(text: string): BarcodeResult {
  const safeText = text || '0';
  const symbols: number[] = [];

  // Start with Code Set B (standard printable ASCII 32-126)
  symbols.push(104); // Start B

  for (let i = 0; i < safeText.length; i++) {
    const code = safeText.charCodeAt(i);
    if (code >= 32 && code <= 126) {
      symbols.push(code - 32);
    } else {
      // Fallback for non-ASCII
      symbols.push(0);
    }
  }

  // Calculate Checksum
  let checksum = symbols[0]!;
  for (let i = 1; i < symbols.length; i++) {
    checksum += i * symbols[i]!;
  }
  symbols.push(checksum % 103);

  // Convert symbols to modules
  const modules: boolean[] = [];
  for (const sym of symbols) {
    const pattern = CODE128_PATTERNS[sym]!;
    let isBar = true;
    for (const run of pattern) {
      for (let r = 0; r < run; r++) {
        modules.push(isBar);
      }
      isBar = !isBar;
    }
  }

  // Append Stop Pattern
  let isBar = true;
  for (const run of CODE128_STOP) {
    for (let r = 0; r < run; r++) {
      modules.push(isBar);
    }
    isBar = !isBar;
  }

  return {
    modules,
    totalModules: modules.length,
    value: safeText,
    format: 'CODE128'
  };
}

// ==================== CODE 39 ENCODER ====================
const CODE39_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const CODE39_ENCODINGS = [
  '000110100', '100100001', '001100001', '101100000', '000110001', // 0-4
  '100110000', '001110000', '000100101', '100100100', '001100100', // 5-9
  '100001001', '001001001', '101001000', '000011001', '100011000', // A-E
  '001011000', '000001101', '100001100', '001001100', '000011100', // F-J
  '100000011', '001000011', '101000010', '000010011', '100010010', // K-O
  '001010010', '000000111', '100000110', '001000110', '000010110', // P-T
  '110000001', '011000001', '111000000', '010010001', '110010000', // U-Y
  '011010000', '010000101', '110000100', '011000100', '010101000', // Z, -, ., ' ', $
  '010100010', '010001010', '000101010'                              // /, +, %
];
const CODE39_START_STOP = '010010100'; // Asterisk '*'

export function encodeCode39(text: string): BarcodeResult {
  const upper = (text || '0').toUpperCase();
  const modules: boolean[] = [];

  const addCharPattern = (pattern: string) => {
    // 9 elements: 5 bars (idx 0,2,4,6,8) and 4 spaces (idx 1,3,5,7)
    // 0 = narrow (1 module), 1 = wide (2 modules)
    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const width = pattern[i] === '1' ? 2 : 1;
      for (let w = 0; w < width; w++) {
        modules.push(isBar);
      }
    }
    // Inter-character space (1 narrow space module)
    modules.push(false);
  };

  // Start symbol '*'
  addCharPattern(CODE39_START_STOP);

  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i]!;
    const idx = CODE39_CHARS.indexOf(ch);
    if (idx !== -1) {
      addCharPattern(CODE39_ENCODINGS[idx]!);
    }
  }

  // Stop symbol '*'
  addCharPattern(CODE39_START_STOP);

  return {
    modules,
    totalModules: modules.length,
    value: upper,
    format: 'CODE39'
  };
}

// ==================== EAN-13 ENCODER ====================
// EAN-13 tables: 7-module encodings for digits 0-9
const EAN_L = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011'
];
const EAN_G = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111'
];
const EAN_R = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100'
];
const EAN_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'
];

export function encodeEan13(digits: string): BarcodeResult {
  let clean = digits.replace(/\D/g, '');
  if (clean.length < 12) {
    clean = clean.padStart(12, '0');
  } else if (clean.length > 13) {
    clean = clean.substring(0, 13);
  }

  // If 12 digits, calculate 13th check digit
  if (clean.length === 12) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const d = parseInt(clean[i]!, 10);
      sum += i % 2 === 0 ? d : d * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    clean += checkDigit.toString();
  }

  const firstDigit = parseInt(clean[0]!, 10);
  const parity = EAN_PARITY[firstDigit]!;
  const modules: boolean[] = [];

  // Left guard: 101
  modules.push(true, false, true);

  // Left 6 digits
  for (let i = 1; i <= 6; i++) {
    const digit = parseInt(clean[i]!, 10);
    const mode = parity[i - 1];
    const pattern = mode === 'L' ? EAN_L[digit]! : EAN_G[digit]!;
    for (const bit of pattern) {
      modules.push(bit === '1');
    }
  }

  // Center guard: 01010
  modules.push(false, true, false, true, false);

  // Right 6 digits (R mode)
  for (let i = 7; i <= 12; i++) {
    const digit = parseInt(clean[i]!, 10);
    const pattern = EAN_R[digit]!;
    for (const bit of pattern) {
      modules.push(bit === '1');
    }
  }

  // Right guard: 101
  modules.push(true, false, true);

  return {
    modules,
    totalModules: modules.length,
    value: clean,
    format: 'EAN13'
  };
}

// ==================== UNIFIED BARCODE ENCODER ====================
export function encodeBarcode(format: string, value: string): BarcodeResult {
  const fmt = (format || 'CODE128').toUpperCase();
  switch (fmt) {
    case 'EAN13':
    case 'EAN8':
    case 'UPCA':
      return encodeEan13(value);
    case 'CODE39':
      return encodeCode39(value);
    case 'CODE128':
    default:
      return encodeCode128(value);
  }
}

/**
 * Generate clean vector SVG markup for barcode
 */
export function barcodeToSvg(
  barcode: BarcodeResult,
  width: number,
  height: number,
  options?: {
    barColor?: string;
    backgroundColor?: string;
    includeText?: boolean;
  }
): string {
  const barColor = options?.barColor || '#000000';
  const bgColor = options?.backgroundColor || '#ffffff';
  const includeText = options?.includeText ?? true;

  const totalModules = barcode.totalModules;
  if (totalModules === 0) return '';

  const textHeight = includeText ? Math.min(14, height * 0.25) : 0;
  const barHeight = height - textHeight;
  const moduleWidth = width / totalModules;

  let rectsSvg = '';
  let inBar = false;
  let barStart = 0;

  for (let i = 0; i < totalModules; i++) {
    if (barcode.modules[i]) {
      if (!inBar) {
        inBar = true;
        barStart = i;
      }
    } else {
      if (inBar) {
        const barW = (i - barStart) * moduleWidth;
        const barX = barStart * moduleWidth;
        rectsSvg += `<rect x="${barX.toFixed(2)}" y="0" width="${barW.toFixed(2)}" height="${barHeight.toFixed(2)}" fill="${barColor}" />`;
        inBar = false;
      }
    }
  }

  if (inBar) {
    const barW = (totalModules - barStart) * moduleWidth;
    const barX = barStart * moduleWidth;
    rectsSvg += `<rect x="${barX.toFixed(2)}" y="0" width="${barW.toFixed(2)}" height="${barHeight.toFixed(2)}" fill="${barColor}" />`;
  }

  const textSvg = includeText
    ? `<text x="${(width / 2).toFixed(2)}" y="${height.toFixed(2)}" font-family="monospace" font-size="${(textHeight * 0.85).toFixed(2)}" text-anchor="middle" fill="${barColor}">${barcode.value}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
  <rect width="${width}" height="${height}" fill="${bgColor}" />
  ${rectsSvg}
  ${textSvg}
</svg>`;
}
