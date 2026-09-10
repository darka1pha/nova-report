import { describe, it, expect } from 'vitest';
import {
  renderReport,
  exportReport,
  evaluateExpression,
  interpolateTemplate,
  discoverReportDataSchema,
  type ReportDefinition
} from '../packages/report-engine/src/index.js';

describe('Array Data Source Support & Binding', () => {
  it('evaluates array bracket indexing, dot indexing, and aggregations', () => {
    const context = {
      items: [
        { id: 1, name: 'Laptop', price: 1200 },
        { id: 2, name: 'Mouse', price: 40 },
        { id: 3, name: 'Keyboard', price: 90 }
      ],
      selectedIdx: 1
    };

    // Bracket indexing
    expect(evaluateExpression('items[0].name', context)).toBe('Laptop');
    // Dot numeric indexing
    expect(evaluateExpression('items.1.name', context)).toBe('Mouse');
    expect(evaluateExpression('items.2.price', context)).toBe(90);
    // Dynamic bracket indexing
    expect(evaluateExpression('items[selectedIdx].name', context)).toBe('Mouse');
    // Array length
    expect(evaluateExpression('items.length', context)).toBe(3);
    // Aggregation functions
    expect(evaluateExpression('SUM(items, "price")', context)).toBe(1330);
    expect(evaluateExpression('COUNT(items)', context)).toBe(3);
    expect(evaluateExpression('AVG(items, "price")', context)).toBeCloseTo(443.33, 1);
    expect(evaluateExpression('MIN(items, "price")', context)).toBe(40);
    expect(evaluateExpression('MAX(items, "price")', context)).toBe(1200);
  });

  it('renders a report with raw array data passed directly to renderReport', async () => {
    const rawArrayData = [
      { id: 'P1', name: 'Wireless Headphones', price: 150, stock: 12 },
      { id: 'P2', name: 'USB-C Cable', price: 15, stock: 85 },
      { id: 'P3', name: 'Mechanical Keyboard', price: 110, stock: 24 }
    ];

    const report: ReportDefinition = {
      id: 'rep-array-test',
      name: 'Array Test Report',
      version: '1.0',
      page: {
        width: 210,
        height: 297,
        orientation: 'portrait',
        unit: 'mm',
        margins: { top: 15, right: 15, bottom: 15, left: 15 }
      },
      dataSources: [],
      sections: [
        {
          id: 'sec-detail',
          type: 'detail',
          height: 100,
          elements: [
            {
              id: 'tbl-items',
              type: 'table',
              x: 0,
              y: 0,
              width: 180,
              height: 40,
              // dataSource omitted to test auto-binding to raw top-level array
              columns: [
                { id: 'c1', width: 40, headerText: 'ID' },
                { id: 'c2', width: 80, headerText: 'Product Name' },
                { id: 'c3', width: 60, headerText: 'Price' }
              ],
              headerRows: [
                {
                  id: 'r-header',
                  isHeader: true,
                  height: 10,
                  cells: [
                    { id: 'ch1', text: 'ID' },
                    { id: 'ch2', text: 'Product Name' },
                    { id: 'ch3', text: 'Price' }
                  ]
                }
              ],
              bodyRows: [
                {
                  id: 'r-body',
                  height: 10,
                  cells: [
                    // Test both unprefixed {{id}} and {{name}}, and prefixed {{item.price}}
                    { id: 'cb1', text: '{{id}}' },
                    { id: 'cb2', text: '{{name}}' },
                    { id: 'cb3', text: '${{item.price}}' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    const doc = await renderReport({
      report,
      data: rawArrayData
    });

    expect(doc.pages.length).toBe(1);
    const tableElem = doc.pages[0]?.elements.find(e => e.type === 'table') as any;
    expect(tableElem).toBeDefined();
    expect(tableElem.table).toBeDefined();

    // Verify 3 body rows rendered
    expect(tableElem.table.bodyRows.length).toBe(3);

    // Verify cell contents
    const row1 = tableElem.table.bodyRows[0];
    expect(row1.cells[0].text).toBe('P1');
    expect(row1.cells[1].text).toBe('Wireless Headphones');
    expect(row1.cells[2].text).toBe('$150');

    const row2 = tableElem.table.bodyRows[1];
    expect(row2.cells[0].text).toBe('P2');
    expect(row2.cells[1].text).toBe('USB-C Cable');
    expect(row2.cells[2].text).toBe('$15');

    const row3 = tableElem.table.bodyRows[2];
    expect(row3.cells[0].text).toBe('P3');
    expect(row3.cells[1].text).toBe('Mechanical Keyboard');
    expect(row3.cells[2].text).toBe('$110');
  });

  it('renders primitive array items using {{item}} in table cells', async () => {
    const fruitList = ['Apple', 'Banana', 'Cherry', 'Dragonfruit'];

    const report: ReportDefinition = {
      id: 'rep-primitive-array',
      name: 'Primitive Array Report',
      version: '1.0',
      page: {
        width: 210,
        height: 297,
        orientation: 'portrait',
        unit: 'mm',
        margins: { top: 15, right: 15, bottom: 15, left: 15 }
      },
      dataSources: [],
      sections: [
        {
          id: 'sec-detail',
          type: 'detail',
          height: 80,
          elements: [
            {
              id: 'tbl-fruits',
              type: 'table',
              x: 0,
              y: 0,
              width: 100,
              height: 40,
              columns: [{ id: 'c1', width: 100, headerText: 'Fruit' }],
              headerRows: [],
              bodyRows: [
                {
                  id: 'r-body',
                  height: 10,
                  cells: [{ id: 'cb1', text: 'Fruit: {{item}} (Index: {{index}})' }]
                }
              ]
            }
          ]
        }
      ]
    };

    const doc = await renderReport({
      report,
      data: fruitList
    });

    const tableElem = doc.pages[0]?.elements.find(e => e.type === 'table') as any;
    expect(tableElem.table.bodyRows.length).toBe(4);
    expect(tableElem.table.bodyRows[0].cells[0].text).toBe('Fruit: Apple (Index: 0)');
    expect(tableElem.table.bodyRows[1].cells[0].text).toBe('Fruit: Banana (Index: 1)');
    expect(tableElem.table.bodyRows[2].cells[0].text).toBe('Fruit: Cherry (Index: 2)');
    expect(tableElem.table.bodyRows[3].cells[0].text).toBe('Fruit: Dragonfruit (Index: 3)');
  });

  it('repeats Detail section for each record when repeatForEachRecord is true', async () => {
    const employeeData = [
      { id: 101, fullName: 'Alice Smith', role: 'Engineering Lead' },
      { id: 102, fullName: 'Bob Jones', role: 'Product Designer' },
      { id: 103, fullName: 'Carol Danvers', role: 'Security Analyst' }
    ];

    const report: ReportDefinition = {
      id: 'rep-detail-repeat',
      name: 'Detail Section Repeat Report',
      version: '1.0',
      page: {
        width: 210,
        height: 297,
        orientation: 'portrait',
        unit: 'mm',
        margins: { top: 15, right: 15, bottom: 15, left: 15 }
      },
      dataSources: [],
      sections: [
        {
          id: 'sec-detail',
          type: 'detail',
          height: 15,
          repeatForEachRecord: true,
          elements: [
            {
              id: 'txt-badge',
              type: 'text',
              x: 5,
              y: 2,
              width: 170,
              height: 10,
              text: 'Employee #{{id}}: {{fullName}} - {{role}}'
            }
          ]
        }
      ]
    };

    const doc = await renderReport({
      report,
      data: employeeData
    });

    expect(doc.pages.length).toBe(1);
    const textElements = doc.pages[0]?.elements.filter(e => e.type === 'text') as any[];
    expect(textElements.length).toBe(3);

    expect(textElements[0].text).toBe('Employee #101: Alice Smith - Engineering Lead');
    expect(textElements[1].text).toBe('Employee #102: Bob Jones - Product Designer');
    expect(textElements[2].text).toBe('Employee #103: Carol Danvers - Security Analyst');

    // Ensure Y positions advance down the page
    expect(textElements[1].yPt).toBeGreaterThan(textElements[0].yPt);
    expect(textElements[2].yPt).toBeGreaterThan(textElements[1].yPt);
  });

  it('exports report with raw array data to vector PDF and HTML', async () => {
    const inventory = [
      { sku: 'SKU-001', name: 'Widget Alpha', qty: 50 },
      { sku: 'SKU-002', name: 'Widget Beta', qty: 120 }
    ];

    const report: ReportDefinition = {
      id: 'rep-export-array',
      name: 'Array Export Report',
      version: '1.0',
      page: {
        width: 210,
        height: 297,
        orientation: 'portrait',
        unit: 'mm',
        margins: { top: 15, right: 15, bottom: 15, left: 15 }
      },
      dataSources: [],
      sections: [
        {
          id: 'sec-detail',
          type: 'detail',
          height: 40,
          elements: [
            {
              id: 'tbl-inv',
              type: 'table',
              x: 0,
              y: 0,
              width: 180,
              height: 30,
              columns: [
                { id: 'c1', width: 60, headerText: 'SKU' },
                { id: 'c2', width: 80, headerText: 'Name' },
                { id: 'c3', width: 40, headerText: 'Quantity' }
              ],
              headerRows: [],
              bodyRows: [
                {
                  id: 'r-body',
                  height: 10,
                  cells: [
                    { id: 'cb1', text: '{{sku}}' },
                    { id: 'cb2', text: '{{name}}' },
                    { id: 'cb3', text: '{{qty}}' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };

    // PDF Export
    const pdfBytes = await exportReport({
      report,
      data: inventory,
      format: 'pdf'
    });
    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 5));
    expect(pdfHeader).toBe('%PDF-');

    // HTML Export
    const htmlBytes = await exportReport({
      report,
      data: inventory,
      format: 'html'
    });
    const htmlStr = new TextDecoder().decode(htmlBytes);
    expect(htmlStr).toContain('Widget Alpha');
    expect(htmlStr).toContain('Widget Beta');
    expect(htmlStr).toContain('SKU-001');
  });

  it('discovers schema fields from array data source', () => {
    const dataSources = [
      {
        name: 'products',
        type: 'json' as const,
        data: [
          { id: 1, title: 'Item 1', price: 99.9, inStock: true },
          { id: 2, title: 'Item 2', price: 149.0, inStock: false }
        ]
      }
    ];

    const schema = discoverReportDataSchema(dataSources);

    // Discovered collections should include 'products'
    expect(schema.collections.some(c => c.name === 'products')).toBe(true);

    // Discovered collection should include item fields
    const productCol = schema.collections.find(c => c.name === 'products');
    expect(productCol).toBeDefined();
    const titleField = productCol?.itemFields.find(f => f.key === 'title');
    expect(titleField).toBeDefined();
    expect(titleField?.itemPath).toBe('item.title');

    // Should include count / length in fields
    const countField = schema.fields.find(f => f.expression.includes('COUNT(products)'));
    expect(countField).toBeDefined();
  });
});
