export interface TextMeasureOptions {
  fontSizePt: number;
  fontFamily?: string;
  fontWeight?: string;
  maxWidthPt?: number;
  lineHeight?: number; // multiplier, e.g. 1.2
  letterSpacingPt?: number;
}

export interface WrappedTextResult {
  lines: string[];
  totalHeightPt: number;
  maxLineWidthPt: number;
  lineHeightPt: number;
}

/**
 * Text metric calculation for headless environments.
 * Uses font-metrics heuristics standard for typography engines.
 */
export function measureAndWrapText(
  text: string,
  options: TextMeasureOptions
): WrappedTextResult {
  const { fontSizePt, maxWidthPt = Infinity, lineHeight = 1.25, letterSpacingPt = 0 } = options;
  const lineHeightPt = fontSizePt * lineHeight;

  if (!text) {
    return {
      lines: [''],
      totalHeightPt: lineHeightPt,
      maxLineWidthPt: 0,
      lineHeightPt
    };
  }

  // Average character width factor relative to font size (for standard proportional sans/serif)
  const charWidthFactor = 0.52;
  const avgCharWidth = fontSizePt * charWidthFactor + letterSpacingPt;

  const rawParagraphs = text.split(/\r\n|\r|\n/);
  const resultLines: string[] = [];
  let maxLineWidth = 0;

  for (const paragraph of rawParagraphs) {
    if (paragraph.length === 0) {
      resultLines.push('');
      continue;
    }

    const words = paragraph.split(' ');
    let currentLine = '';
    let currentLineWidth = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i]!;
      const wordWidth = word.length * avgCharWidth;
      const spaceWidth = avgCharWidth;

      if (currentLine === '') {
        currentLine = word;
        currentLineWidth = wordWidth;
      } else {
        const testWidth = currentLineWidth + spaceWidth + wordWidth;
        if (testWidth <= maxWidthPt || maxWidthPt === Infinity) {
          currentLine += ' ' + word;
          currentLineWidth = testWidth;
        } else {
          resultLines.push(currentLine);
          maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
          currentLine = word;
          currentLineWidth = wordWidth;
        }
      }
    }

    if (currentLine !== '') {
      resultLines.push(currentLine);
      maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
    }
  }

  const totalHeightPt = Math.max(lineHeightPt, resultLines.length * lineHeightPt);

  return {
    lines: resultLines,
    totalHeightPt,
    maxLineWidthPt: maxLineWidth,
    lineHeightPt
  };
}
