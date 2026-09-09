# Nova Report — Architectural Roadmap & Implementation Strategy

This document defines the comprehensive engineering roadmap for **Nova Report**, a production-grade visual report designer and headless reporting platform inspired by industry standards such as *Stimulsoft Reports*, *FastReport*, and *Crystal Reports*.

---

## 1. Executive Summary & Core Architectural Tenet

Nova Report is designed from the ground up as a **commercial-grade, decoupled reporting ecosystem**. Unlike legacy solutions that couple the designer directly to rendering routines or embed HTML output into reporting files, Nova Report enforces a strict architectural boundary:

```text
                ┌──────────────────────────────────────┐
                │          Nova Report Studio          │
                │     Desktop Designer (Electron + UI) │
                └──────────────────┬───────────────────┘
                                   │
                                   │ 1. Produces/Edits JSON AST
                                   ▼
               ┌────────────────────────────────────────┐
               │    Report Definition (*.report.json)   │
               │        Standardized JSON Schema        │
               └───────────────────┬────────────────────┘
                                   │
                                   │ 2. Consumed by headless engine
                                   ▼
               ┌────────────────────────────────────────┐
               │         Core Reporting Engine          │
               │   Framework-Agnostic TypeScript Core   │
               └───────────────────┬────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│  Interactive     │      │   High-Fidelity  │      │ Headless SDKs    │
│  React Preview   │      │   Exporters      │      │ & Cloud Server   │
│  (@report/react) │      │ (PDF, DOCX, XLSX)│      │ (@report/engine) │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

### Architectural Guiding Principles

1. **Zero Framework Dependencies in Core**: The engine (`@report/core`, `@report/engine`, `@report/layout`, `@report/pagination`, `@report/expression`) must never depend on React, Next.js, or Electron. It executes deterministically in Node.js, Next.js API routes, AWS Lambda, Docker workers, and the browser.
2. **Deterministic Layout & Pagination**: Same report JSON + same dataset = 100% identical page count, element positions, and split boundaries across all target formats.
3. **AST Expression Sandboxing**: Absolute prohibition of `eval()` or `new Function()`. All report expressions execute within an isolated AST interpreter.
4. **First-Class RTL & Unicode**: Native bidirectional support for Persian and Arabic text shaping, number localization, and mirrored column layouts.

---

## 2. Technical Risk Analysis & Mitigation Strategies

| Risk Area | Challenge | Architectural Mitigation |
| :--- | :--- | :--- |
| **1. Text Measurement & Font Metrics** | Discrepancies between browser font rendering (canvas/DOM) and export engines (PDF vector, DOCX points) cause unexpected word wrapping and layout overflow. | Implement a unified `FontMetricsService` with font metrics tables (ascent, descent, advance widths) and calibrated points-per-character approximation; normalize all coordinates to points (`1 pt = 1/72 inch`) across layout and exporters. |
| **2. Table Pagination & Row Splitting** | Large tables spanning multiple pages risk orphan rows, clipping cells, or losing table headers upon page breaks. | Dedicated `TableLayoutEngine` calculates row heights prior to pagination; emits `keepWithNext` constraints and inserts repeating `headerRows` on every new page segment. |
| **3. Exporter Parity across Formats** | Replicating complex nested box models with borders and backgrounds in Word (`.docx`) and Excel (`.xlsx`) without native CSS support. | Dedicated OOXML and OpenXML generators translate the intermediate layout tree (`RenderedDocument`) into native Word tables (`w:tbl`) and Excel cell grids (`c`), mapping pixel/mm margins to twips and column widths. |
| **4. RTL & Bidirectional Text Shaping** | Persian and Arabic require letter cursive shaping (initial, medial, final, isolated), zero-width non-joiners (ZWNJ), and right-to-left table column reversal. | Native `direction: "rtl"` property at page and element level; layout engine mirrors column indexing from right to left (`pageWidth - x - width`), ensuring consistent layout in PDF, HTML, and designer. |
| **5. Safe Dynamic Expressions** | Arbitrary expression evaluation could expose remote code execution (RCE) in multi-tenant SaaS environments. | Hand-crafted tokenizer and recursive-descent parser producing a sandboxed AST with white-listed mathematical, string, date, and aggregation functions (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`). |

---

## 3. Phased Implementation Strategy

```text
2026 Q1                  2026 Q2                  2026 Q3                  2026 Q4
┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│ Phase 1-3: Core & UI │ │ Phase 4-6: Tables,   │ │ Phase 7-9: Exporters,│ │ Phase 10: Enterprise │
│ Monorepo, Canvas,    │ │ Data Engine,         │ │ PDF/DOCX/XLSX,       │ │ RTL, System Fonts,   │
│ Elements, Schema     │ │ Multi-Page Paging    │ │ React Viewer, SDK    │ │ Subreports, Charts   │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

### Phase 1 — Architecture & Monorepo Foundation `[COMPLETED]`

**Goal**: Establish the extensible monorepo, define report schemas, and configure developer toolchains.

- [x] Monorepo orchestration using **pnpm workspaces**.
- [x] Base TypeScript 5.7 configuration with strict typing (`noImplicitAny`, `strictNullChecks`).
- [x] Standardized JSON report schema (`@report/schema`) with units (`mm`, `pt`, `in`, `cm`, `px`).
- [x] Core schema validation using Zod schemas for runtime validation.
- [x] Desktop app shell (`@report/desktop`) using Next.js 15, React 19, and Electron 34.
- [x] Vitest automated test harness across all packages.

---

### Phase 2 — Visual Designer Canvas & Interaction Engine `[COMPLETED]`

**Goal**: Deliver a desktop publishing canvas with fluid positioning, snapping, and undo/redo history.

- [x] Canvas coordinate transforms with millimeter/pixel unit converters.
- [x] Interactive zoom controls (25%, 50%, 75%, 100%, 125%, 150%, 200%, Fit Width, Fit Page).
- [x] Dynamic visual rulers with millimeter calibrations and live cursor trackers.
- [x] Element selection, bounding box highlighting, and multi-handle resizing (8 handles).
- [x] Drag-and-drop element repositioning with real-time coordinate inspection.
- [x] Command/History pattern for undo/redo (`AddElementCommand`, `MoveCommand`, `ResizeCommand`, `DeleteCommand`).
- [x] Keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+C`, `Ctrl+V`, `Delete`, `Arrow Keys` for nudging) and Interactive Shortcuts Cheat Sheet.
- [x] Magnetic snapping to grid (2mm / 5mm / 10mm increments) and dynamic magenta alignment guide lines.
- [x] Multi-element selection box (rubber-band marquee drag selection) and layer order operations.
- [x] Element rotation handle (0° to 360° free rotation with 15° Shift-snapping and angle badge).

---

### Phase 3 — Plugin-Oriented Element Architecture `[COMPLETED]`

**Goal**: Support a plugin-oriented component model for static and dynamic report controls.

- [x] **Text Element**:
  - [x] Single-line and multi-line text with word wrapping.
  - [x] Font family, font size, bold, italic, underline, strikethrough.
  - [x] Text alignment (left, center, right, justify) and vertical alignment (top, middle, bottom).
  - [x] Color, background color, padding, and letter spacing.
- [x] **Shape Element**:
  - [x] Rectangle and rounded rectangle (configurable border radius).
  - [x] Ellipse, circle, and linear separator lines.
  - [x] Fill color, border width, border style (solid, dashed, dotted), opacity.
- [x] **Image Element**:
  - [x] Local files, Base64 data URIs, and remote HTTPS URLs.
  - [x] Sizing modes: `fit`, `stretch`, `center`, and `preserveAspectRatio`.
- [x] **Barcode & QR Code Element**:
  - [x] 2D QR Code generator (built into `@report/layout` without external binary dependencies; ISO/IEC 18004 standard).
  - [x] 1D Linear Barcodes (Code 128, Code 39, EAN-13, UPC-A) rendered as vector SVG and vector PDF.
- [x] **Native Vector Chart Element**:
  - [x] Bar Chart, Line Chart, Pie Chart, Donut Chart with customizable palettes, axes, and legends.
  - [x] Dynamic data source binding (`dataSource`, `categoryField`, `valueField`) or inline static data.
  - [x] Vector parity across React Viewer, HTML Exporter, and PDF Exporter.

---

### Phase 4 — Advanced Tabular Layout & Cell Merging `[COMPLETED]`

**Goal**: Build a professional data-driven table component matching Crystal Reports & Stimulsoft capabilities.

- [x] Multi-column, multi-row table schema (`columns`, `headerRows`, `detailRows`, `footerRows`).
- [x] Dynamic data source binding (`dataSource: "invoice.items"`).
- [x] Explicit column width allocation and responsive cell padding.
- [x] Independent cell borders: top, right, bottom, left with custom colors and line styles (`none`, `solid`, `dashed`, `dotted`, `double`).
- [x] Cell merging (`colSpan` and `rowSpan`) with adjacent border reconciliation.
- [x] Automatic row expansion based on bounded data collection arrays.
- [ ] Interactive in-designer table grid editor (drag column widths, context menu cell merge/split).
- [ ] Cell-level conditional formatting (e.g., color cell red if `{{item.total < 0}}`).

---

### Phase 5 — Safe Sandboxed Expression Engine & Data Providers `[COMPLETED]`

**Goal**: Provide dynamic calculation and data evaluation with zero security vulnerabilities.

- [x] Custom tokenizer and AST parser for expression evaluation.
- [x] Dynamic field path resolution (e.g., `{{invoice.customer.name}}`, `{{item.quantity * item.price}}`).
- [x] Sandboxed execution: blocked prototype traversal, blocked `Function`, `eval`, `process`, `window`.
- [x] Built-in string, date, and currency formatting helpers:
  - `formatCurrency(val, currency, locale)`
  - `formatDate(val, format)`
  - `upper(str)`, `lower(str)`, `trim(str)`
- [x] Collection aggregations across repeated rows:
  - `SUM(path)`
  - `COUNT(path)`
  - `AVG(path)`
  - `MIN(path)`
  - `MAX(path)`
- [x] Report Parameters (`parameters: { startDate, customerId }`) and internal Variables.
- [ ] REST API and SQL data provider connectors with authentication headers.

---

### Phase 6 — Deterministic Layout & Multi-Page Pagination `[COMPLETED]`

**Goal**: Deliver automatic multi-page splitting without relying on browser printing engines.

- [x] Professional report section model:
  - `Report Header` (once at start of document)
  - `Page Header` (top of every printed page)
  - `Group Header` (upon group key transition)
  - `Detail` (repeats per record)
  - `Group Footer` (subtotals per group)
  - `Report Footer` (grand totals at end of document)
  - `Page Footer` (bottom of every printed page)
- [x] Automatic multi-page pagination when content height exceeds printable page boundary.
- [x] Repeating table headers across multi-page table continuation.
- [x] Dynamic page number tracking (`pageNumber`, `totalPages`) resolved in two-pass pagination.
- [ ] Section keep-together rules (`keepTogether: true`) to prevent awkward orphan headings.
- [ ] Explicit page breaks (`breakBefore: true`, `breakAfter: true`).

---

### Phase 7 — Universal Deterministic Rendering Pipeline `[COMPLETED]`

**Goal**: Unified intermediate layout tree consumed by preview and exporters alike.

```text
Report Definition (*.report.json) + Data Payload
                     │
                     ▼
             Layout Calculator
                     │
                     ▼
             Pagination Engine
                     │
                     ▼
         RenderedDocument (Intermediate AST)
         ├── pages: RenderedPage[]
         │    ├── widthPt, heightPt, direction
         │    └── elements: RenderedElement[]
         └── metadata
```

- [x] Clean intermediate representation (`RenderedDocument`, `RenderedPage`, `RenderedElement`).
- [x] Pixel-exact coordinates and typography tokens preserved.
- [x] Visual preview uses the exact same `RenderedDocument` as PDF and DOCX exports.

---

### Phase 8 — Multi-Format Exporters `[COMPLETED]`

**Goal**: Production-ready, native file generation across enterprise formats.

- [x] **Vector PDF Exporter (`@report/exporter-pdf`)**:
  - High-precision coordinate placement and standard font dictionary embedding.
  - Native vector shapes, lines, and borders.
  - Multi-page document catalog generation.
- [x] **Microsoft Word Exporter (`@report/exporter-docx`)**:
  - OOXML `.docx` container generation.
  - Native Word tables with column widths and cell borders.
  - Text formatting (bold, italic, font family, font size, alignment).
- [x] **Microsoft Excel Exporter (`@report/exporter-xlsx`)**:
  - Native OpenXML `.xlsx` spreadsheet container.
  - Automatic column classification, row extraction, cell values, and formatted headers.
- [x] **Semantic HTML Exporter (`@report/exporter-html`)**:
  - Standalone, self-contained HTML page with embedded styles.
  - `@media print` rules for physical printing.
- [ ] **Raster Image Exporters**:
  - High-DPI PNG and SVG page rasterization.

---

### Phase 9 — Developer SDKs, React Viewer & CLI Tooling `[IN PROGRESS]`

**Goal**: Enable seamless embedding in external applications and automation pipelines.

- [x] Headless Node.js SDK (`@report/engine`) with `exportReport()` and `renderReport()`.
- [x] Embeddable React component (`@report/react`) featuring `<ReportViewer />` with zoom and export actions.
- [x] Base CLI tooling (`@report/cli`) for scriptable headless report processing.
- [ ] Published npm packages with clean entry points and TypeScript `.d.ts` declaration maps.
- [ ] Interactive online playground / demo documentation site.

---

### Phase 10 — Enterprise & Commercial Polish `[IN PROGRESS]`

**Goal**: Commercial-grade differentiator features matching legacy desktop platforms.

- [x] **System Font Detection**: Electron IPC scanner detecting installed fonts on Windows, macOS, and Linux.
- [x] **RTL / Persian / Arabic Support**: Native right-to-left direction, table header inversion, and Unicode support.
- [x] **Built-in Commercial Templates**:
  - Professional Invoice (`templates/invoice.report.json`)
  - Persian/Arabic RTL Invoice (`templates/invoice-rtl-persian.report.json`)
  - Multi-page Sales Summary (`templates/sales-summary.report.json`)
- [ ] **Advanced Data Visualizations**:
  - Native vector charts (Bar, Line, Pie, Area, Donut) embedded into report bands.
- [ ] **Subreports**:
  - Nested report execution embedded inside a parent report detail band.
- [ ] **Report Server & Scheduling**:
  - Background cron queue for automated report generation and email dispatch.

---

## 4. Definition of Done Checklist

Every feature in the initial release must satisfy the **30 Definition of Done Criteria** outlined in the platform specification:

| # | Acceptance Criteria | Status | Package / Area |
| :-: | :--- | :---: | :--- |
| **1** | Open desktop application shell | :white_check_mark: Complete | `@report/desktop` |
| **2** | Create blank report with default settings | :white_check_mark: Complete | `@report/desktop` |
| **3** | Set custom page size, orientation, and margins | :white_check_mark: Complete | `@report/schema`, PropertiesPanel |
| **4** | Drag text element onto report canvas | :white_check_mark: Complete | Canvas, Toolbox |
| **5** | Select system fonts detected from operating system | :white_check_mark: Complete | Electron IPC, PropertiesPanel |
| **6** | Modify font size, weight, italic, and decoration | :white_check_mark: Complete | PropertiesPanel |
| **7** | Configure text and background color pickers | :white_check_mark: Complete | PropertiesPanel |
| **8** | Modify background fill color and opacity | :white_check_mark: Complete | PropertiesPanel |
| **9** | Configure independent borders (top, right, bottom, left) | :white_check_mark: Complete | `@report/schema`, PropertiesPanel |
| **10** | Draw vector lines and rectangular shapes | :white_check_mark: Complete | Toolbox, Canvas |
| **11** | Insert local or remote images with aspect ratio modes | :white_check_mark: Complete | Toolbox, Canvas |
| **12** | Create data-bound and static tables | :white_check_mark: Complete | `@report/layout`, Toolbox |
| **13** | Adjust table column widths and row heights | :white_check_mark: Complete | Table Component |
| **14** | Merge and split table cells across columns/rows | :white_check_mark: Complete | `@report/schema`, `@report/layout` |
| **15** | Bind tables to structured array datasets | :white_check_mark: Complete | `@report/core`, `@report/data` |
| **16** | Add and configure headers and footers | :white_check_mark: Complete | `@report/pagination` |
| **17** | Add dynamic data fields (`{{variable}}`) | :white_check_mark: Complete | `@report/expression` |
| **18** | Evaluate mathematical and string expressions safely | :white_check_mark: Complete | `@report/expression` |
| **19** | Automatically split multi-record content across pages | :white_check_mark: Complete | `@report/pagination` |
| **20** | Preview multi-page output with real layout engine | :white_check_mark: Complete | `@report/react`, Canvas Preview |
| **21** | Save report definition to `.report.json` | :white_check_mark: Complete | Electron IPC, Toolbar |
| **22** | Re-open existing `.report.json` without corruption | :white_check_mark: Complete | Electron IPC, Toolbar |
| **23** | Export pixel-accurate vector PDF | :white_check_mark: Complete | `@report/exporter-pdf` |
| **24** | Export native Microsoft Word (`.docx`) document | :white_check_mark: Complete | `@report/exporter-docx` |
| **25** | Export native Microsoft Excel (`.xlsx`) spreadsheet | :white_check_mark: Complete | `@report/exporter-xlsx` |
| **26** | Execute headless report generation in Node.js | :white_check_mark: Complete | `@report/engine` |
| **27** | Embed interactive report viewer inside React applications | :white_check_mark: Complete | `@report/react` |
| **28** | Render and export reports in backend API workers | :white_check_mark: Complete | `@report/engine` |
| **29** | Render RTL and Persian/Arabic reports with correct direction | :white_check_mark: Complete | `@report/layout`, `@report/exporter-html` |
| **30** | Maintain visual layout parity between preview and exports | :white_check_mark: Complete | Unified Rendering Pipeline |

---

## 5. Release Milestones & Versioning

Nova Report follows **Semantic Versioning (SemVer)**:

- **v1.0.0 (MVP Release)**:
  - Full desktop designer with text, shapes, images, and tables.
  - Multi-page pagination engine with repeating table headers.
  - Exporters: PDF, DOCX, XLSX, HTML.
  - Core Node.js SDK and React viewer component.
  - RTL Persian invoice template.
- **v1.1.0 (Vector Graphics & Barcodes)**:
  - Native 1D barcodes and 2D QR codes.
  - Multi-element group/ungroup operations.
  - Magnetic guide lines and snap-to-edge.
- **v1.2.0 (Data Connectors & Visual Charts)**:
  - Built-in SQL & REST data provider wizards.
  - Embedded vector chart element (Bar, Line, Pie).
  - Subreport nesting.
- **v2.0.0 (Enterprise Cloud & Collaboration)**:
  - Multi-user web designer (cloud-hosted Next.js).
  - Centralized report repository with role-based access control (RBAC).
  - Scheduled report generation server with webhook/email delivery.
