import type { ReportDefinition, SectionDefinition, TextElement, ShapeElement, TableElement } from './types.js';

export function createBlankReport(name = 'New Report'): ReportDefinition {
  const pageHeader: SectionDefinition = {
    id: 'sec-page-header',
    type: 'pageHeader',
    name: 'Page Header',
    height: 25,
    elements: []
  };

  const detail: SectionDefinition = {
    id: 'sec-detail',
    type: 'detail',
    name: 'Detail',
    height: 227,
    elements: []
  };

  const pageFooter: SectionDefinition = {
    id: 'sec-page-footer',
    type: 'pageFooter',
    name: 'Page Footer',
    height: 15,
    elements: []
  };

  return {
    version: '1.0',
    name,
    title: name,
    description: 'Report created with NovaReport Designer',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    page: {
      width: 210,
      height: 297,
      unit: 'mm',
      orientation: 'portrait',
      margins: {
        top: 15,
        right: 15,
        bottom: 15,
        left: 15
      },
      direction: 'ltr'
    },
    dataSources: [],
    parameters: [],
    variables: [],
    sections: [pageHeader, detail, pageFooter]
  };
}

export function createDefaultTextElement(partial: Partial<TextElement> = {}): TextElement {
  return {
    id: `elem-text-${Math.random().toString(36).substring(2, 9)}`,
    type: 'text',
    name: 'Text',
    x: 10,
    y: 10,
    width: 60,
    height: 10,
    text: 'New Text',
    style: {
      fontFamily: 'Arial',
      fontSize: 11,
      fontWeight: 'normal',
      color: '#111827',
      textAlign: 'left',
      verticalAlign: 'middle',
      padding: { top: 2, right: 2, bottom: 2, left: 2 }
    },
    ...partial
  };
}

export function createDefaultShapeElement(partial: Partial<ShapeElement> = {}): ShapeElement {
  return {
    id: `elem-shape-${Math.random().toString(36).substring(2, 9)}`,
    type: 'shape',
    name: 'Rectangle',
    shapeType: 'rectangle',
    x: 10,
    y: 10,
    width: 50,
    height: 30,
    fillColor: '#f3f4f6',
    strokeColor: '#374151',
    strokeWidth: 0.5,
    strokeStyle: 'solid',
    ...partial
  };
}

export function createDefaultTableElement(partial: Partial<TableElement> = {}): TableElement {
  return {
    id: `elem-table-${Math.random().toString(36).substring(2, 9)}`,
    type: 'table',
    name: 'Data Table',
    x: 10,
    y: 10,
    width: 180,
    height: 40,
    columns: [
      { id: 'col-1', width: 60 },
      { id: 'col-2', width: 60 },
      { id: 'col-3', width: 60 }
    ],
    headerRows: [
      {
        id: 'row-hdr-1',
        height: 10,
        isHeader: true,
        cells: [
          { id: 'cell-h1', text: 'Column 1', style: { fontWeight: 'bold', backgroundColor: '#e5e7eb', textAlign: 'left', padding: { top: 2, right: 4, bottom: 2, left: 4 } } },
          { id: 'cell-h2', text: 'Column 2', style: { fontWeight: 'bold', backgroundColor: '#e5e7eb', textAlign: 'left', padding: { top: 2, right: 4, bottom: 2, left: 4 } } },
          { id: 'cell-h3', text: 'Column 3', style: { fontWeight: 'bold', backgroundColor: '#e5e7eb', textAlign: 'right', padding: { top: 2, right: 4, bottom: 2, left: 4 } } }
        ]
      }
    ],
    bodyRows: [
      {
        id: 'row-body-1',
        height: 10,
        cells: [
          { id: 'cell-b1', text: '{{item.name}}', style: { textAlign: 'left', padding: { top: 2, right: 4, bottom: 2, left: 4 } } },
          { id: 'cell-b2', text: '{{item.category}}', style: { textAlign: 'left', padding: { top: 2, right: 4, bottom: 2, left: 4 } } },
          { id: 'cell-b3', text: '{{formatCurrency(item.price)}}', style: { textAlign: 'right', padding: { top: 2, right: 4, bottom: 2, left: 4 } } }
        ]
      }
    ],
    ...partial
  };
}

export function createDefaultChartElement(partial: Partial<import('./types.js').ChartElement> = {}): import('./types.js').ChartElement {
  return {
    id: `elem-chart-${Math.random().toString(36).substring(2, 9)}`,
    type: 'chart',
    name: 'Sales Chart',
    chartType: 'bar',
    x: 10,
    y: 10,
    width: 90,
    height: 55,
    title: 'Monthly Performance',
    data: [
      { label: 'Q1', value: 45000 },
      { label: 'Q2', value: 68000 },
      { label: 'Q3', value: 82000 },
      { label: 'Q4', value: 115000 }
    ],
    colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
    showLegend: true,
    showLabels: true,
    showGrid: true,
    ...partial
  };
}

