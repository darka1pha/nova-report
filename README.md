# Nova Report (NovaReport Platform)

[![CI Tests](https://img.shields.io/badge/tests-18%20passing-brightgreen.svg)](#testing)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7%20Strict-blue.svg)](https://www.typescriptlang.org/)
[![Monorepo](https://img.shields.io/badge/monorepo-pnpm%20workspaces-orange.svg)](https://pnpm.io/)
[![Platform](https://img.shields.io/badge/platform-Electron%20%7C%20Next.js%20%7C%20Node.js-indigo.svg)](#architecture)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Nova Report** is an enterprise-grade visual report designer and headless reporting engine, inspired by industry benchmarks such as *Stimulsoft Reports*, *FastReport*, and *Crystal Reports*.

Nova Report combines a **desktop visual designer** (Electron + Next.js + React + TypeScript) with a **framework-agnostic reporting engine SDK** for Node.js, Next.js, and server-side environments. It delivers pixel-perfect reports across PDF, Microsoft Word (`.docx`), Microsoft Excel (`.xlsx`), and semantic HTML—complete with auto-pagination, repeating section headers, sandboxed expressions, table cell-merging, system font detection, and first-class **RTL / Persian / Arabic** typography.

---

## Key Highlights

- **Visual Desktop Studio**: Desktop report builder with drag-and-drop canvas, magnetic alignment guides, rulers, zoom controls (25%–200%, fit-width, fit-page), property inspectors, layer tree, and command-based undo/redo.
- **Framework-Agnostic Core Engine**: Zero dependencies on Electron or React inside `@report/core` and `@report/engine`. Runs seamlessly in Node.js backend services, Next.js server actions, AWS Lambda/Docker workers, or CLI tools.
- **Single Source of Truth**: Unified JSON report schema (`.report.json`). No arbitrary HTML blobs or vendor lock-in.
- **Deterministic Multi-Page Pagination**: Automatic page calculation, repeating table headers, page/report/group headers & footers, and keep-together rules.
- **Multi-Format Export Pipeline**:
  - **PDF**: Vector graphics, exact font embedding, vector lines/borders, and multi-page flows.
  - **Word (DOCX)**: Native OOXML document tables, borders, paragraphs, and styles.
  - **Excel (XLSX)**: Native OpenXML sheets, columns, rows, cell formatting, merged ranges, and number precision.
  - **HTML**: Clean, self-contained semantic markup with CSS print styles.
- **Sandboxed Expression Engine**: Safe AST expression evaluation supporting dynamic fields (`{{customer.name}}`), mathematical formulas (`{{quantity * price}}`), formatting (`formatCurrency`, `formatDate`), and aggregations (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`). No unsafe `eval()` or `Function()`.
- **First-Class RTL & Persian/Arabic**: Full bidirectional text handling, font family fallback, and mirrored table/column flows.
- **Electron Security**: Context isolation enabled, Node integration disabled, typed IPC bridge for OS filesystem access and system font enumeration.

---

## Architecture Overview

Nova Report enforces a strict decoupling between the **Visual Designer** and the **Reporting Engine**. The designer is merely one client consumer of the report schema:

```text
               ┌─────────────────────────────────────────┐
               │    Nova Report Studio (Desktop App)     │
               │        Electron + Next.js + React       │
               └────────────────────┬────────────────────┘
                                    │
                         Generates / Edits JSON
                                    │
                                    ▼
               ┌─────────────────────────────────────────┐
               │     Report Schema (*.report.json)       │
               │          Well-Defined JSON AST          │
               └────────────────────┬────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          │                                                   │
          ▼                                                   ▼
┌───────────────────┐                               ┌───────────────────┐
│ Node.js / Next.js │                               │   React Viewer    │
│ Headless SDK      │                               │  (@report/react)  │
└─────────┬─────────┘                               └─────────┬─────────┘
          │                                                   │
          └─────────────────────────┬─────────────────────────┘
                                    │
                                    ▼
               ┌─────────────────────────────────────────┐
               │          Report Engine Pipeline         │
               │                                         │
               │   Report Parser & Validator             │
               │              ↓                          │
               │   Data Binding (JSON / REST / SQL)      │
               │              ↓                          │
               │   Safe Expression Evaluator             │
               │              ↓                          │
               │   Layout & Dimension Engine             │
               │              ↓                          │
               │   Deterministic Pagination Engine       │
               └────────────────────┬────────────────────┘
                                    │
             ┌──────────────┬───────┴──────┬──────────────┐
             ▼              ▼              ▼              ▼
        Vector PDF     Word DOCX      Excel XLSX     HTML / Preview
```

---

## Monorepo Structure

The project is structured as a high-performance monorepo using **pnpm workspaces**:

```text
nova-report/
├── apps/
│   └── desktop/                  # Desktop Application (Electron + Next.js 15 + React 19)
│       ├── electron/             # Main process, preload bridge, system font discovery
│       └── src/                  # Next.js UI: Toolbar, Canvas, Toolbox, Properties, Layers
│
├── packages/
│   ├── report-schema/            # JSON Schema definitions, unit conversions, validation, types
│   ├── report-expression/        # Safe sandboxed AST expression parser and aggregations
│   ├── report-data/              # Data source providers (inline JSON, REST, async connectors)
│   ├── report-layout/            # Box model, element sizing, text measurement, layout tree
│   ├── report-pagination/        # Deterministic multi-page split, repeating headers/footers
│   ├── report-core/              # Pipeline orchestration: schema + data + layout -> rendered doc
│   ├── report-exporter/          # Exporter registry & unified IReportExporter interface
│   ├── report-exporter-pdf/      # Vector PDF exporter engine
│   ├── report-exporter-docx/     # Word OpenXML document exporter
│   ├── report-exporter-xlsx/     # Excel OpenXML workbook exporter
│   ├── report-exporter-html/     # Standalone semantic HTML exporter with print CSS
│   ├── report-engine/            # Umbrella Node.js SDK exportReport(), renderReport()
│   ├── report-react/             # Reusable <ReportViewer /> React component
│   └── report-cli/               # Command-line interface for CLI batch generation
│
├── templates/                    # Reference report definitions
│   ├── invoice.report.json       # Standard multi-item invoice template
│   ├── invoice-rtl-persian.report.json # Full RTL Persian invoice template
│   └── sales-summary.report.json # Financial summary report template
│
└── tests/                        # Vitest end-to-end and integration test suite
```

---

## Report Definition Format (`.report.json`)

Reports are defined strictly in JSON—never raw HTML strings. Every element has a deterministic ID, coordinates, styling tokens, and optional data-binding expressions:

```json
{
  "schemaVersion": "1.0",
  "metadata": {
    "name": "Commercial Invoice",
    "author": "Nova Report Studio",
    "createdAt": "2026-09-08T00:00:00.000Z"
  },
  "page": {
    "width": 210,
    "height": 297,
    "unit": "mm",
    "orientation": "portrait",
    "margins": { "top": 15, "right": 15, "bottom": 15, "left": 15 },
    "direction": "ltr"
  },
  "dataSources": [
    {
      "name": "invoice",
      "type": "json",
      "data": {
        "invoiceNumber": "INV-2026-0891",
        "customer": { "name": "Acme Corp Ltd" },
        "items": [
          { "description": "Cloud Migration Consulting", "qty": 10, "unitPrice": 150.0 }
        ]
      }
    }
  ],
  "sections": [
    {
      "id": "sec-header",
      "type": "pageHeader",
      "height": 25,
      "elements": [
        {
          "id": "el-title",
          "type": "text",
          "x": 0,
          "y": 0,
          "width": 100,
          "height": 10,
          "text": "INVOICE: {{invoice.invoiceNumber}}",
          "style": {
            "fontFamily": "Segoe UI",
            "fontSize": 18,
            "fontWeight": "bold",
            "color": "#1e293b"
          }
        }
      ]
    },
    {
      "id": "sec-detail",
      "type": "detail",
      "height": 60,
      "elements": [
        {
          "id": "el-table",
          "type": "table",
          "x": 0,
          "y": 5,
          "width": 180,
          "height": 40,
          "table": {
            "dataSource": "invoice.items",
            "columns": [{ "width": 100 }, { "width": 30 }, { "width": 50 }],
            "headerRows": [
              {
                "cells": [
                  { "text": "Description", "style": { "fontWeight": "bold" } },
                  { "text": "Qty", "style": { "fontWeight": "bold" } },
                  { "text": "Price", "style": { "fontWeight": "bold" } }
                ]
              }
            ],
            "detailRows": [
              {
                "cells": [
                  { "text": "{{item.description}}" },
                  { "text": "{{item.qty}}" },
                  { "text": "{{formatCurrency(item.unitPrice)}}" }
                ]
              }
            ]
          }
        }
      ]
    }
  ]
}
```

---

## Quick Start Guide

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **pnpm**: `v9.x` or `v10.x` (`npm install -g pnpm`)

### 1. Installation & Monorepo Setup

```bash
# Clone the repository
git clone https://github.com/darka1pha/nova-report.git
cd nova-report

# Install dependencies across all workspaces
pnpm install

# Build all TypeScript packages
pnpm build
```

### 2. Running Automated Tests

The test suite validates schema definitions, expression sandboxing, RTL/Persian rendering, multi-page pagination overflow, and all four exporters (PDF, DOCX, XLSX, HTML):

```bash
pnpm test
```

### 3. Running the Visual Report Designer

To start the Next.js web designer locally in your browser:

```bash
pnpm dev:desktop
# Open http://localhost:3000
```

To run the complete **Electron Desktop Application** with system font access and native file dialogs:

```bash
pnpm dev:electron
```

---

## SDK Usage Examples

### 1. Node.js Headless Export (PDF / Word / Excel / HTML)

Use `@report/engine` inside your backend APIs, microservices, or cloud workers:

```typescript
import { loadReport, exportReport } from '@report/engine';
import * as fs from 'node:fs/promises';

// 1. Load the report definition
const report = JSON.parse(await fs.readFile('./templates/invoice.report.json', 'utf-8'));

// 2. Export directly to vector PDF
const pdfBytes = await exportReport({
  report,
  format: 'pdf',
  data: {
    invoice: {
      invoiceNumber: 'INV-2026-9901',
      items: [
        { description: 'Enterprise License', qty: 1, unitPrice: 2400.00 },
        { description: 'Support Retainer', qty: 12, unitPrice: 300.00 }
      ]
    }
  }
});
await fs.writeFile('./output/invoice.pdf', pdfBytes);

// 3. Export to Word (.docx) or Excel (.xlsx)
const docxBytes = await exportReport({ report, format: 'docx' });
await fs.writeFile('./output/invoice.docx', docxBytes);

const xlsxBytes = await exportReport({ report, format: 'xlsx' });
await fs.writeFile('./output/invoice.xlsx', xlsxBytes);
```

### 2. React Report Viewer (`@report/react`)

Embed the interactive report viewer into any React or Next.js web application:

```tsx
'use client';

import React from 'react';
import { ReportViewer } from '@report/react';
import invoiceTemplate from './templates/invoice.report.json';

export default function InvoicePreviewPage() {
  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <ReportViewer
        report={invoiceTemplate}
        data={{
          invoice: {
            customer: { name: 'Acme International Ltd.' }
          }
        }}
        showToolbar={true}
        allowExport={true}
        defaultZoom={1.0}
        onExport={(format, bytes) => {
          console.log(`Exported report as ${format} (${bytes.byteLength} bytes)`);
        }}
      />
    </div>
  );
}
```

### 3. Command Line Interface (CLI)

Batch-render or validate reports from scripts and CI/CD pipelines:

```bash
# Validate report definition against schema
pnpm --filter @report/cli run cli validate ./templates/invoice.report.json

# Render report to PDF with external data payload
pnpm --filter @report/cli run cli export ./templates/invoice.report.json \
  --data ./data/invoice-data.json \
  --format pdf \
  --output ./build/invoice.pdf
```

---

## Exporters & Rendering Fidelity

| Exporter | Target File | Core Engine Technology | Features Supported |
| :--- | :--- | :--- | :--- |
| **PDF** | `.pdf` | Vector PDF Generator | Pixel-perfect coordinate placement, embedded standard fonts, borders, multi-page layout, tables, RTL |
| **Word** | `.docx` | Native OOXML Container | Tables, paragraphs, bold/italic, font sizing, cell borders, alignment |
| **Excel** | `.xlsx` | Native OpenXML Spreadsheet | Clean column-based conversion, cell values, formulas, header formatting, sheet naming |
| **HTML** | `.html` | Semantic HTML5 & CSS3 | Pure self-contained HTML, CSS `@media print`, flexbox/grid layout, responsive viewer, zero dependencies |

---

## Desktop Studio Features

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Nova Report Studio - [invoice.report.json]                        [-] [o] [x]│
├─────────────────────────────────────────────────────────────────────────────┤
│ File   Edit   Insert   Format   Data   View   Help                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ [New] [Open] [Save] | [Undo] [Redo] | [Zoom: 100% v] | [Grid #] | [Export v]│
├───────────────┬─────────────────────────────────────────────┬───────────────┤
│ TOOLBOX       │ REPORT CANVAS (Ruler: mm)                   │ PROPERTIES    │
│ ───────────── │ 0    20    40    60    80   100   120   140 │ ───────────── │
│ [T] Text      │ ┌─────────────────────────────────────────┐ │ Element: Text │
│ [田] Table    │ │ Page Header                             │ │ X: 15 mm      │
│ [口] Shape    │ │   [ ACME CORPORATION ]                  │ │ Y: 20 mm      │
│ [/] Line      │ ├─────────────────────────────────────────┤ │ W: 120 mm     │
│ [🖼] Image     │ │ Detail                                  │ │ H: 10 mm      │
│ [|||] Barcode │ │   ┌───────────────────────┬───────────┐ │ │ Font: Segoe UI│
│ [::] QR Code  │ │   │ Item                  │ Total     │ │ │ Size: 14 pt   │
│               │ │   ├───────────────────────┼───────────┤ │ │ Align: Left   │
│ LAYERS        │ │   │ {{item.description}}  │ {{total}} │ │ │ Border: 1px   │
│ ───────────── │ │   └───────────────────────┴───────────┘ │ │ Color: #000   │
│ v Page Header │ ├─────────────────────────────────────────┤ └───────────────┘
│   - Title     │ │ Page Footer                             │                 │
│ v Detail      │ │   Page {{pageNumber}} of {{totalPages}} │                 │
│   - ItemsTbl  │ └─────────────────────────────────────────┘                 │
├───────────────┴─────────────────────────────────────────────┴───────────────┤
│ Status: Ready | Page 1 of 3 | Zoom 100% | Unit: mm | Memory: 42 MB          │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Rulers & Units**: Real-time millimeters (`mm`), inches (`in`), or points (`pt`) with dynamic coordinates.
- **Magnetic Snapping**: Snap to 5mm/10mm grid or neighboring element boundary lines.
- **Layers & Hierarchy**: Visual tree view of elements across sections (`PageHeader`, `Detail`, `PageFooter`) with lock, hide, and re-order controls.
- **System Font Discovery**: Dynamically scans installed fonts on Windows (`Segoe UI`, `Calibri`, `Arial`, `Tahoma`, `B Nazanin`), macOS (`SF Pro`, `Helvetica`), and Linux (`DejaVu Sans`).
- **Templates Library**: Instant creation from pre-configured commercial templates (Invoice, Sales Summary, Persian RTL Billing).

---

## Security Model

Nova Report is designed for multi-tenant SaaS and enterprise environments where report definitions and data payloads may originate from untrusted users:

1. **Sandboxed Expression Engine**: Expressions are parsed into an Abstract Syntax Tree (AST) via a deterministic recursive-descent parser. Evaluation occurs in a safe environment without access to `window`, `document`, `process`, `require`, `eval`, or constructor prototypes.
2. **Electron Hardening**:
   - `nodeIntegration: false`
   - `contextIsolation: true`
   - `sandbox: true`
   - File system access and font queries are routed through strict, typed IPC contracts.
3. **Strict JSON Schema Validation**: Incoming `.report.json` documents are structurally validated before parsing to prevent prototype pollution or invalid element configurations.

---

## Roadmap

See the comprehensive [ROADMAP.md](file:///d:/Work/next-report/ROADMAP.md) for the complete 10-phase engineering trajectory, technical risk analyses, commercial feature progression, and definition of done.

---

## License

MIT © [Nova Report Contributors](https://github.com/darka1pha/nova-report).
