import React from 'react';
import type {
  RenderedPage,
  LayoutElement,
  LayoutTextElement,
  LayoutShapeElement,
  LayoutImageElement,
  LayoutBarcodeElement,
  LayoutQRCodeElement,
  LayoutTableElementInstance,
  LayoutChartElement,
  ResolvedBorders
} from '@report/engine';
import {
  encodeBarcode,
  barcodeToSvg,
  generateQRCodeMatrix,
  qrcodeToSvg,
  chartToSvg
} from '@report/engine';

export interface PageRendererProps {
  page: RenderedPage;
  scale?: number;
  searchQuery?: string;
}

export const PageRenderer: React.FC<PageRendererProps> = ({ page, scale = 1, searchQuery = '' }) => {
  return (
    <div
      className="report-rendered-page"
      style={{
        position: 'relative',
        width: `${page.widthPt * scale}px`,
        height: `${page.heightPt * scale}px`,
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
        margin: '0 auto 24px auto',
        overflow: 'hidden',
        direction: (page.direction === 'rtl' ? 'rtl' : 'ltr') as any,
        transformOrigin: 'top left'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${page.widthPt}px`,
          height: `${page.heightPt}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        {page.elements.map(el => (
          <ElementRenderer key={el.id} element={el} searchQuery={searchQuery} />
        ))}
      </div>
    </div>
  );
};

const ElementRenderer: React.FC<{ element: LayoutElement; searchQuery?: string }> = ({
  element,
  searchQuery
}) => {
  switch (element.type) {
    case 'text':
      return <TextRenderer element={element as LayoutTextElement} searchQuery={searchQuery} />;
    case 'shape':
      return <ShapeRenderer element={element as LayoutShapeElement} />;
    case 'image':
      return <ImageRenderer element={element as LayoutImageElement} />;
    case 'barcode':
      return <BarcodeRenderer element={element as LayoutBarcodeElement} />;
    case 'qrcode':
      return <QRCodeRenderer element={element as LayoutQRCodeElement} />;
    case 'table':
      return <TableRenderer element={element as LayoutTableElementInstance} searchQuery={searchQuery} />;
    case 'chart':
      return <ChartRenderer element={element as LayoutChartElement} />;
    default:
      return null;
  }
};

const TextRenderer: React.FC<{ element: LayoutTextElement; searchQuery?: string }> = ({
  element,
  searchQuery
}) => {
  const style = element.style || {};
  const textAlign = style.textAlign || 'left';
  const verticalAlign = style.verticalAlign || 'top';
  const displayAlign =
    verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';

  const isMatched =
    searchQuery && searchQuery.trim().length > 0 && element.text.toLowerCase().includes(searchQuery.toLowerCase());

  return (
    <div
      style={{
        position: 'absolute',
        left: `${element.xPt}px`,
        top: `${element.yPt}px`,
        width: `${element.widthPt}px`,
        height: `${element.heightPt}px`,
        fontFamily: style.fontFamily || 'inherit',
        fontSize: `${element.fontSizePt}px`,
        fontWeight: style.fontWeight || 'normal',
        fontStyle: style.fontStyle || 'normal',
        color: style.color || '#000000',
        backgroundColor: isMatched ? '#fef08a' : style.backgroundColor || 'transparent',
        textAlign: textAlign as any,
        direction: (element.direction === 'rtl' ? 'rtl' : 'ltr') as any,
        display: 'flex',
        alignItems: displayAlign,
        justifyContent:
          textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
        paddingTop: `${style.padding?.top || 0}px`,
        paddingRight: `${style.padding?.right || 0}px`,
        paddingBottom: `${style.padding?.bottom || 0}px`,
        paddingLeft: `${style.padding?.left || 0}px`,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        overflow: 'hidden',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        ...bordersToReactStyle(element.borders)
      }}
    >
      {element.text}
    </div>
  );
};

const ShapeRenderer: React.FC<{ element: LayoutShapeElement }> = ({ element }) => {
  if (element.shapeType === 'circle' || element.shapeType === 'ellipse') {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${element.xPt}px`,
          top: `${element.yPt}px`,
          width: `${element.widthPt}px`,
          height: `${element.heightPt}px`,
          borderRadius: '50%',
          backgroundColor: element.fillColor || 'transparent',
          border: `${element.strokeWidthPt}px solid ${element.strokeColor || 'transparent'}`
        }}
      />
    );
  }

  if (element.shapeType === 'line') {
    return (
      <div
        style={{
          position: 'absolute',
          left: `${element.xPt}px`,
          top: `${element.yPt}px`,
          width: `${element.widthPt}px`,
          height: `${Math.max(1, element.strokeWidthPt)}px`,
          backgroundColor: element.strokeColor || '#000000'
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: `${element.xPt}px`,
        top: `${element.yPt}px`,
        width: `${element.widthPt}px`,
        height: `${element.heightPt}px`,
        borderRadius: `${element.borderRadiusPt}px`,
        backgroundColor: element.fillColor || 'transparent',
        border: `${element.strokeWidthPt}px solid ${element.strokeColor || 'transparent'}`,
        ...bordersToReactStyle(element.borders)
      }}
    />
  );
};

const ImageRenderer: React.FC<{ element: LayoutImageElement }> = ({ element }) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: `${element.xPt}px`,
        top: `${element.yPt}px`,
        width: `${element.widthPt}px`,
        height: `${element.heightPt}px`,
        overflow: 'hidden',
        ...bordersToReactStyle(element.borders)
      }}
    >
      {element.src && (
        <img
          src={element.src}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: element.fit as any
          }}
        />
      )}
    </div>
  );
};

const BarcodeRenderer: React.FC<{ element: LayoutBarcodeElement }> = ({ element }) => {
  const barcode = encodeBarcode(element.format, element.value);
  const svg = barcodeToSvg(barcode, element.widthPt, element.heightPt, {
    barColor: element.barColor,
    backgroundColor: element.backgroundColor,
    includeText: element.includeText
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${element.xPt}px`,
        top: `${element.yPt}px`,
        width: `${element.widthPt}px`,
        height: `${element.heightPt}px`,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        ...bordersToReactStyle(element.borders)
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const QRCodeRenderer: React.FC<{ element: LayoutQRCodeElement }> = ({ element }) => {
  const matrix = generateQRCodeMatrix(element.value, (element.errorCorrectionLevel || 'M') as any);
  const svg = qrcodeToSvg(matrix, element.widthPt, element.heightPt, {
    darkColor: element.darkColor,
    lightColor: element.lightColor
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: `${element.xPt}px`,
        top: `${element.yPt}px`,
        width: `${element.widthPt}px`,
        height: `${element.heightPt}px`,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        ...bordersToReactStyle(element.borders)
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const ChartRenderer: React.FC<{ element: LayoutChartElement }> = ({ element }) => {
  const svg = chartToSvg(element.chart, element.widthPt, element.heightPt);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${element.xPt}px`,
        top: `${element.yPt}px`,
        width: `${element.widthPt}px`,
        height: `${element.heightPt}px`,
        transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
        ...bordersToReactStyle(element.borders)
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};

const TableRenderer: React.FC<{ element: LayoutTableElementInstance; searchQuery?: string }> = ({
  element,
  searchQuery
}) => {
  const table = element.table;
  const allRows = [...table.headerRows, ...table.bodyRows, ...table.footerRows];

  return (
    <div
      style={{
        position: 'absolute',
        left: `${element.xPt}px`,
        top: `${element.yPt}px`,
        width: `${element.widthPt}px`,
        height: `${element.heightPt}px`
      }}
    >
      <table
        style={{
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          width: `${element.widthPt}px`
        }}
      >
        <tbody>
          {allRows.map(row => (
            <tr key={row.id} style={{ height: `${row.heightPt}px` }}>
              {row.cells.map(cell => {
                const style = cell.style || {};
                const isMatched =
                  searchQuery &&
                  searchQuery.trim().length > 0 &&
                  cell.text.toLowerCase().includes(searchQuery.toLowerCase());

                return (
                  <td
                    key={cell.id}
                    colSpan={cell.colSpan || 1}
                    rowSpan={cell.rowSpan || 1}
                    style={{
                      width: `${cell.widthPt}px`,
                      height: `${cell.heightPt}px`,
                      fontFamily: style.fontFamily || 'inherit',
                      fontSize: `${style.fontSize || 10}px`,
                      fontWeight: style.fontWeight || 'normal',
                      color: style.color || '#000000',
                      backgroundColor: isMatched ? '#fef08a' : style.backgroundColor || 'transparent',
                      textAlign: (style.textAlign || 'left') as any,
                      direction: (cell.direction === 'rtl' ? 'rtl' : 'ltr') as any,
                      padding: `${style.padding?.top || 2}px ${style.padding?.right || 4}px ${style.padding?.bottom || 2}px ${style.padding?.left || 4}px`,
                      verticalAlign: style.verticalAlign || 'middle',
                      overflow: 'hidden',
                      ...bordersToReactStyle(cell.borders)
                    }}
                  >
                    {cell.text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function bordersToReactStyle(borders?: ResolvedBorders): React.CSSProperties {
  if (!borders) return {};
  const res: React.CSSProperties = {};
  if (borders.top) {
    res.borderTop = `${borders.top.widthPt}px ${borders.top.style} ${borders.top.color}`;
  }
  if (borders.right) {
    res.borderRight = `${borders.right.widthPt}px ${borders.right.style} ${borders.right.color}`;
  }
  if (borders.bottom) {
    res.borderBottom = `${borders.bottom.widthPt}px ${borders.bottom.style} ${borders.bottom.color}`;
  }
  if (borders.left) {
    res.borderLeft = `${borders.left.widthPt}px ${borders.left.style} ${borders.left.color}`;
  }
  return res;
}
