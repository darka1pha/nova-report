'use client';

import React, { useMemo } from 'react';
import { useDesigner } from './DesignerContext';
import type {
  ReportElement,
  SectionDefinition,
  TextElement,
  ShapeElement,
  TableElement,
  BarcodeElement,
  QRCodeElement,
  ChartElement
} from '@report/schema';
import {
  Sliders,
  Type,
  Layout,
  Maximize2,
  Box,
  Palette,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  BarChart3,
  Barcode,
  QrCode,
  Table as TableIcon,
  Database,
  Trash2,
  Plus
} from 'lucide-react';
import { FieldPickerDropdown } from './FieldPickerDropdown';
import { discoverReportDataSchema, previewExpressionTemplate, detectPaperSize, getPaperDimensions, type PaperSizeName } from '@report/engine';

export const PropertiesPanel: React.FC = () => {
  const {
    report,
    selectedElementIds,
    selectedSectionId,
    systemFonts,
    updateElement,
    updateReport,
    reorderElement
  } = useDesigner();

  const schema = useMemo(() => {
    return discoverReportDataSchema(report.dataSources, report.parameters, report.variables);
  }, [report.dataSources, report.parameters, report.variables]);

  // Find currently selected element and section
  let selectedElement: ReportElement | null = null;
  let currentSection: SectionDefinition | null = null;

  for (const sec of report.sections) {
    if (selectedSectionId === sec.id) {
      currentSection = sec;
    }
    for (const elem of sec.elements) {
      if (selectedElementIds.includes(elem.id)) {
        selectedElement = elem;
        currentSection = sec;
        break;
      }
    }
  }

  const isLandscape = report.page.orientation === 'landscape';
  const pageWidthMm = isLandscape ? Math.max(report.page.width, report.page.height) : report.page.width;
  const pageHeightMm = isLandscape ? Math.min(report.page.width, report.page.height) : report.page.height;
  const margins = report.page.margins;
  const totalSectionsHeightMm = report.sections.reduce((sum, s) => sum + s.height, 0);
  const printableHeightMm = Math.max(0, pageHeightMm - margins.top - margins.bottom);
  const unallocatedBodyMm = Math.max(0, printableHeightMm - totalSectionsHeightMm);

  const handleUpdateStyle = (partialStyle: any) => {
    if (!selectedElement) return;
    const currentStyle = selectedElement.style || {};
    updateElement(selectedElement.id, {
      style: { ...currentStyle, ...partialStyle }
    });
  };

  const handleUpdateBorder = (side: 'top' | 'right' | 'bottom' | 'left', partial: any) => {
    if (!selectedElement) return;
    const currentBorders = selectedElement.style?.borders || {};
    const sideBorder = currentBorders[side] || { style: 'solid', width: 0.5, color: '#000000' };

    handleUpdateStyle({
      borders: {
        ...currentBorders,
        [side]: { ...sideBorder, ...partial }
      }
    });
  };

  return (
    <aside className="w-72 bg-studio-900 border-l border-studio-800 flex flex-col select-none text-studio-200 overflow-y-auto">
      <div className="p-3 border-b border-studio-800 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-studio-400 flex items-center gap-1.5">
          <Sliders size={13} />
          Properties
        </span>
      </div>

      <div className="p-3 space-y-4 text-xs">
        {/* 1. If an element is selected */}
        {selectedElement ? (
          <>
            {/* Header: Element Type & ID */}
            <div className="bg-studio-950 p-2 rounded border border-studio-800">
              <div className="flex items-center justify-between font-medium text-white">
                <span className="capitalize text-blue-400">{selectedElement.type} Element</span>
                <span className="text-[10px] text-studio-500 font-mono">{selectedElement.id}</span>
              </div>
            </div>

            {/* Position & Geometry */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                <Maximize2 size={12} />
                Position & Size (mm)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-studio-500">X</label>
                  <input
                    type="number"
                    value={selectedElement.x}
                    onChange={e => updateElement(selectedElement!.id, { x: Number(e.target.value) })}
                    className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-studio-500">Y</label>
                  <input
                    type="number"
                    value={selectedElement.y}
                    onChange={e => updateElement(selectedElement!.id, { y: Number(e.target.value) })}
                    className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-studio-500">Width</label>
                  <input
                    type="number"
                    value={selectedElement.width}
                    onChange={e => updateElement(selectedElement!.id, { width: Number(e.target.value) })}
                    className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-studio-500">Height</label>
                  <input
                    type="number"
                    value={selectedElement.height}
                    onChange={e => updateElement(selectedElement!.id, { height: Number(e.target.value) })}
                    className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                  />
                </div>
              </div>

              {/* Quick Fill Dimension Actions */}
              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const printableW = Math.round((pageWidthMm - margins.left - margins.right) * 10) / 10;
                    updateElement(selectedElement!.id, {
                      x: margins.left,
                      width: printableW
                    });
                  }}
                  className="flex-1 py-1 px-1.5 bg-studio-950 hover:bg-studio-800 text-[10px] text-studio-300 hover:text-white rounded border border-studio-800 transition text-center cursor-pointer flex items-center justify-center gap-1"
                  title="Expand element width to fill printable page width"
                >
                  <span>⤢ Fill Width</span>
                </button>
                {currentSection && (
                  <button
                    type="button"
                    onClick={() => {
                      const availH = Math.round((currentSection!.height - selectedElement!.y) * 10) / 10;
                      updateElement(selectedElement!.id, {
                        height: Math.max(5, availH)
                      });
                    }}
                    className="flex-1 py-1 px-1.5 bg-studio-950 hover:bg-studio-800 text-[10px] text-studio-300 hover:text-white rounded border border-studio-800 transition text-center cursor-pointer flex items-center justify-center gap-1"
                    title="Expand element height to fill section bottom"
                  >
                    <span>⤢ Fill Height</span>
                  </button>
                )}
              </div>

              {/* Rotation Stepper and Slider */}
              <div className="pt-2 border-t border-studio-800/80 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-studio-400">
                  <span>Rotation</span>
                  <span className="font-mono text-studio-300 font-semibold">{selectedElement.rotation || 0}°</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={selectedElement.rotation || 0}
                    onChange={e => updateElement(selectedElement!.id, { rotation: Number(e.target.value) })}
                    className="flex-1 accent-blue-500 cursor-pointer h-1 bg-studio-950 rounded"
                  />
                  <input
                    type="number"
                    min={0}
                    max={360}
                    value={selectedElement.rotation || 0}
                    onChange={e => updateElement(selectedElement!.id, { rotation: Number(e.target.value) })}
                    className="w-12 bg-studio-950 border border-studio-800 rounded px-1 py-0.5 text-[11px] text-studio-200 text-center font-mono"
                  />
                </div>
              </div>

              {/* Layer Order Controls */}
              <div className="pt-2 border-t border-studio-800/80 space-y-1.5">
                <span className="text-[10px] text-studio-500 uppercase font-semibold tracking-wider">Arrange Layer</span>
                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  <button
                    onClick={() => reorderElement(selectedElement!.id, 'front')}
                    className="px-1.5 py-1 bg-studio-950 hover:bg-studio-800 text-studio-300 hover:text-white rounded border border-studio-800 transition text-center"
                    title="Bring to Front"
                  >
                    Front
                  </button>
                  <button
                    onClick={() => reorderElement(selectedElement!.id, 'forward')}
                    className="px-1.5 py-1 bg-studio-950 hover:bg-studio-800 text-studio-300 hover:text-white rounded border border-studio-800 transition text-center"
                    title="Bring Forward"
                  >
                    Forward
                  </button>
                  <button
                    onClick={() => reorderElement(selectedElement!.id, 'backward')}
                    className="px-1.5 py-1 bg-studio-950 hover:bg-studio-800 text-studio-300 hover:text-white rounded border border-studio-800 transition text-center"
                    title="Send Backward"
                  >
                    Backward
                  </button>
                  <button
                    onClick={() => reorderElement(selectedElement!.id, 'back')}
                    className="px-1.5 py-1 bg-studio-950 hover:bg-studio-800 text-studio-300 hover:text-white rounded border border-studio-800 transition text-center"
                    title="Send to Back"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>

            {/* Text Element Properties */}
            {selectedElement.type === 'text' && (() => {
              const textElem = selectedElement as TextElement;
              const hasBinding = textElem.text && textElem.text.includes('{{');
              const previewValue = previewExpressionTemplate(textElem.text, report.dataSources);

              return (
                <div className="space-y-2.5 pt-2 border-t border-studio-800">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                      <Type size={12} />
                      Text & Data Binding
                    </div>
                    {hasBinding && (
                      <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    )}
                  </div>

                  {/* Prominent Quick Connect Button */}
                  <FieldPickerDropdown
                    triggerLabel="⚡ Connect Data Field"
                    onSelect={expr => {
                      const isDefault =
                        textElem.text === 'New Text' || textElem.text === '' || textElem.text === 'Text';
                      const newText = isDefault ? expr : `${textElem.text} ${expr}`;
                      updateElement(textElem.id, { text: newText } as any);
                    }}
                  />

                  {/* Textarea */}
                  <textarea
                    rows={3}
                    value={textElem.text}
                    onChange={e => updateElement(selectedElement!.id, { text: e.target.value } as any)}
                    className="w-full bg-studio-950 border border-studio-800 rounded p-2 text-studio-200 text-xs font-mono focus:border-blue-500 focus:outline-hidden"
                    placeholder="e.g. Invoice #{{invoice.invoiceNumber}}"
                  />

                  {/* Live Resolved Preview Badge */}
                  {textElem.text && (
                    <div className="p-2 rounded bg-studio-950/80 border border-studio-800/80 space-y-0.5">
                      <div className="text-[10px] text-studio-500 uppercase font-semibold flex items-center gap-1">
                        <Sparkles size={10} className="text-blue-400" />
                        Live Evaluation Preview
                      </div>
                      <div className="text-xs text-studio-200 font-mono break-all line-clamp-2">
                        {previewValue || '(empty string)'}
                      </div>
                    </div>
                  )}
                  {/* Font Typography */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[10px] text-studio-500">Font Family (System Installed)</label>
                    <select
                      value={selectedElement.style?.fontFamily || 'Arial'}
                      onChange={e => handleUpdateStyle({ fontFamily: e.target.value })}
                      className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                    >
                      {systemFonts.map(f => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] text-studio-500">Font Size (pt)</label>
                        <input
                          type="number"
                          value={selectedElement.style?.fontSize || 10}
                          onChange={e => handleUpdateStyle({ fontSize: Number(e.target.value) })}
                          className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-studio-500">Text Color</label>
                        <input
                          type="color"
                          value={selectedElement.style?.color || '#000000'}
                          onChange={e => handleUpdateStyle({ color: e.target.value })}
                          className="w-full h-7 bg-studio-950 border border-studio-800 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Font Styles & Alignments */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1 bg-studio-950 p-0.5 rounded border border-studio-800">
                        <button
                          onClick={() =>
                            handleUpdateStyle({
                              fontWeight: selectedElement?.style?.fontWeight === 'bold' ? 'normal' : 'bold'
                            })
                          }
                          className={`p-1 rounded ${
                            selectedElement.style?.fontWeight === 'bold'
                              ? 'bg-blue-600 text-white'
                              : 'text-studio-400 hover:text-white'
                          }`}
                        >
                          <Bold size={13} />
                        </button>
                        <button
                          onClick={() =>
                            handleUpdateStyle({
                              fontStyle: selectedElement?.style?.fontStyle === 'italic' ? 'normal' : 'italic'
                            })
                          }
                          className={`p-1 rounded ${
                            selectedElement.style?.fontStyle === 'italic'
                              ? 'bg-blue-600 text-white'
                              : 'text-studio-400 hover:text-white'
                          }`}
                        >
                          <Italic size={13} />
                        </button>
                      </div>

                      <div className="flex items-center gap-1 bg-studio-950 p-0.5 rounded border border-studio-800">
                        <button
                          onClick={() => handleUpdateStyle({ textAlign: 'left' })}
                          className={`p-1 rounded ${
                            selectedElement.style?.textAlign === 'left' || !selectedElement.style?.textAlign
                              ? 'bg-blue-600 text-white'
                              : 'text-studio-400 hover:text-white'
                          }`}
                        >
                          <AlignLeft size={13} />
                        </button>
                        <button
                          onClick={() => handleUpdateStyle({ textAlign: 'center' })}
                          className={`p-1 rounded ${
                            selectedElement.style?.textAlign === 'center'
                              ? 'bg-blue-600 text-white'
                              : 'text-studio-400 hover:text-white'
                          }`}
                        >
                          <AlignCenter size={13} />
                        </button>
                        <button
                          onClick={() => handleUpdateStyle({ textAlign: 'right' })}
                          className={`p-1 rounded ${
                            selectedElement.style?.textAlign === 'right'
                              ? 'bg-blue-600 text-white'
                              : 'text-studio-400 hover:text-white'
                          }`}
                        >
                          <AlignRight size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Direction LTR / RTL */}
                    <div className="pt-2">
                      <label className="text-[10px] text-studio-500">Text Direction</label>
                      <select
                        value={selectedElement.style?.direction || 'ltr'}
                        onChange={e => handleUpdateStyle({ direction: e.target.value as any })}
                        className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                      >
                        <option value="ltr">Left to Right (LTR)</option>
                        <option value="rtl">Right to Left (RTL / Persian)</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Shape Properties */}
            {selectedElement.type === 'shape' && (
              <div className="space-y-2 pt-2 border-t border-studio-800">
                <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                  <Palette size={12} />
                  Fill & Stroke
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-studio-500">Fill Color</label>
                    <input
                      type="color"
                      value={(selectedElement as ShapeElement).fillColor || '#ffffff'}
                      onChange={e => updateElement(selectedElement!.id, { fillColor: e.target.value } as any)}
                      className="w-full h-7 bg-studio-950 border border-studio-800 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-studio-500">Stroke Color</label>
                    <input
                      type="color"
                      value={(selectedElement as ShapeElement).strokeColor || '#000000'}
                      onChange={e => updateElement(selectedElement!.id, { strokeColor: e.target.value } as any)}
                      className="w-full h-7 bg-studio-950 border border-studio-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Table Properties */}
            {selectedElement.type === 'table' && (() => {
              const tableElem = selectedElement as TableElement;
              const currentCollection = schema.collections.find(c => c.path === tableElem.dataSource);

              const handleAutoGenerateColumns = () => {
                if (!currentCollection || currentCollection.itemFields.length === 0) return;
                const totalWidth = tableElem.width || 180;
                const colWidth = Math.max(20, Math.floor(totalWidth / currentCollection.itemFields.length));
                const columns = currentCollection.itemFields.map((itf, idx) => ({
                  id: `col-${idx + 1}`,
                  width: colWidth
                }));
                const headerCells = currentCollection.itemFields.map(itf => ({
                  id: `hc-${itf.key}`,
                  text: itf.key.charAt(0).toUpperCase() + itf.key.slice(1),
                  style: {
                    fontWeight: 'bold',
                    backgroundColor: '#1e3a8a',
                    color: '#ffffff',
                    textAlign: itf.type === 'number' ? 'right' : 'left',
                    padding: { top: 2, right: 4, bottom: 2, left: 4 }
                  }
                }));
                const bodyCells = currentCollection.itemFields.map(itf => ({
                  id: `bc-${itf.key}`,
                  text: itf.expression,
                  style: {
                    textAlign: itf.type === 'number' ? 'right' : 'left',
                    padding: { top: 1.5, right: 4, bottom: 1.5, left: 4 },
                    borders: { bottom: { style: 'solid', width: 0.2, color: '#e2e8f0' } }
                  }
                }));

                updateElement(tableElem.id, {
                  columns,
                  headerRows: [{ id: `hdr-${tableElem.id}`, height: 8, isHeader: true, cells: headerCells as any }],
                  bodyRows: [{ id: `body-${tableElem.id}`, height: 7.5, cells: bodyCells as any }]
                } as any);
              };

              const handleAddColumn = () => {
                const newColIdx = tableElem.columns.length + 1;
                const nextCols = [...tableElem.columns, { id: `col-${newColIdx}`, width: 30 }];
                const nextHeader = [...(tableElem.headerRows || [])];
                if (nextHeader[0]) {
                  nextHeader[0] = {
                    ...nextHeader[0],
                    cells: [
                      ...nextHeader[0].cells,
                      {
                        id: `hc-${newColIdx}`,
                        text: `Col ${newColIdx}`,
                        style: { fontWeight: 'bold', backgroundColor: '#1e3a8a', color: '#ffffff' }
                      } as any
                    ]
                  };
                }
                const nextBody = [...(tableElem.bodyRows || [])];
                if (nextBody[0]) {
                  nextBody[0] = {
                    ...nextBody[0],
                    cells: [
                      ...nextBody[0].cells,
                      {
                        id: `bc-${newColIdx}`,
                        text: '{{item.field}}',
                        style: {}
                      } as any
                    ]
                  };
                }
                updateElement(tableElem.id, { columns: nextCols, headerRows: nextHeader, bodyRows: nextBody } as any);
              };

              const handleDeleteColumn = (colIdx: number) => {
                if (tableElem.columns.length <= 1) return;
                const nextCols = tableElem.columns.filter((_, i) => i !== colIdx);
                const nextHeader = (tableElem.headerRows || []).map(r => ({
                  ...r,
                  cells: r.cells.filter((_, i) => i !== colIdx)
                }));
                const nextBody = (tableElem.bodyRows || []).map(r => ({
                  ...r,
                  cells: r.cells.filter((_, i) => i !== colIdx)
                }));
                updateElement(tableElem.id, { columns: nextCols, headerRows: nextHeader, bodyRows: nextBody } as any);
              };

              return (
                <div className="space-y-2.5 pt-2 border-t border-studio-800">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                      <TableIcon size={12} className="text-blue-400" />
                      Table Data & Columns
                    </div>
                    {tableElem.dataSource && (
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/80 px-1.5 py-0.5 rounded">
                        {currentCollection?.itemCount ? `${currentCollection.itemCount} rows` : 'connected'}
                      </span>
                    )}
                  </div>

                  {/* Collection Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-studio-500">Connected Collection (Array)</label>
                    {schema.collections.length > 0 ? (
                      <select
                        value={tableElem.dataSource || ''}
                        onChange={e => updateElement(tableElem.id, { dataSource: e.target.value } as any)}
                        className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1.5 text-studio-200 text-xs font-mono focus:border-blue-500"
                      >
                        <option value="">(Select array collection...)</option>
                        {schema.collections.map(c => (
                          <option key={c.path} value={c.path}>
                            {c.path} ({c.itemCount} items)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={tableElem.dataSource || ''}
                        onChange={e => updateElement(tableElem.id, { dataSource: e.target.value } as any)}
                        className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs font-mono"
                        placeholder="e.g. invoice.items"
                      />
                    )}
                  </div>

                  {/* Auto-Generate Columns Button */}
                  {tableElem.dataSource && currentCollection && (
                    <button
                      onClick={handleAutoGenerateColumns}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 rounded text-xs font-medium transition shadow-xs"
                      title="Automatically generates columns and bindings from collection fields"
                    >
                      <Sparkles size={12} />
                      <span>⚡ Auto-Generate Columns from Data</span>
                    </button>
                  )}

                  {/* Columns List & Binding Editor */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] text-studio-400 font-medium">
                      <span>Columns ({tableElem.columns.length})</span>
                      <button
                        onClick={handleAddColumn}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                      >
                        <Plus size={10} /> Add Col
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {tableElem.columns.map((col, cIdx) => {
                        const headerCell = tableElem.headerRows?.[0]?.cells?.[cIdx];
                        const bodyCell = tableElem.bodyRows?.[0]?.cells?.[cIdx];

                        return (
                          <div
                            key={col.id || cIdx}
                            className="p-1.5 bg-studio-950 border border-studio-800 rounded text-[11px] space-y-1"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-3 text-studio-500 font-mono text-[9px]">{cIdx + 1}</span>
                              <input
                                type="text"
                                value={headerCell?.text || `Col ${cIdx + 1}`}
                                onChange={e => {
                                  const nextHeader = [...(tableElem.headerRows || [])];
                                  if (nextHeader[0] && nextHeader[0].cells[cIdx]) {
                                    nextHeader[0].cells[cIdx] = { ...nextHeader[0].cells[cIdx]!, text: e.target.value };
                                    updateElement(tableElem.id, { headerRows: nextHeader } as any);
                                  }
                                }}
                                className="flex-1 bg-studio-900 border border-studio-800 rounded px-1.5 py-0.5 text-xs text-studio-100"
                                placeholder="Header title"
                              />
                              <input
                                type="number"
                                value={col.width}
                                onChange={e => {
                                  const nextCols = [...tableElem.columns];
                                  if (nextCols[cIdx]) {
                                    nextCols[cIdx] = { ...nextCols[cIdx]!, width: Number(e.target.value) };
                                    updateElement(tableElem.id, { columns: nextCols } as any);
                                  }
                                }}
                                className="w-12 bg-studio-900 border border-studio-800 rounded px-1 py-0.5 text-xs font-mono text-right"
                                title="Column width (mm)"
                              />
                              <span className="text-[9px] text-studio-500">mm</span>
                              <button
                                onClick={() => handleDeleteColumn(cIdx)}
                                className="text-studio-500 hover:text-red-400 p-0.5 rounded hover:bg-studio-850"
                                title="Delete Column"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>

                            {/* Cell Binding Row */}
                            <div className="flex items-center gap-1.5 pl-4">
                              <span className="text-[9px] text-studio-500 font-mono">Value:</span>
                              <input
                                type="text"
                                value={bodyCell?.text || ''}
                                onChange={e => {
                                  const nextBody = [...(tableElem.bodyRows || [])];
                                  if (nextBody[0] && nextBody[0].cells[cIdx]) {
                                    nextBody[0].cells[cIdx] = { ...nextBody[0].cells[cIdx]!, text: e.target.value };
                                    updateElement(tableElem.id, { bodyRows: nextBody } as any);
                                  }
                                }}
                                className="flex-1 bg-studio-900 border border-studio-800 rounded px-1.5 py-0.5 text-[11px] font-mono text-purple-300"
                                placeholder="{{item.field}}"
                              />
                              {currentCollection && currentCollection.itemFields.length > 0 && (
                                <select
                                  onChange={e => {
                                    if (!e.target.value) return;
                                    const nextBody = [...(tableElem.bodyRows || [])];
                                    if (nextBody[0] && nextBody[0].cells[cIdx]) {
                                      nextBody[0].cells[cIdx] = { ...nextBody[0].cells[cIdx]!, text: e.target.value };
                                      updateElement(tableElem.id, { bodyRows: nextBody } as any);
                                    }
                                  }}
                                  className="w-5 bg-studio-900 border border-studio-800 rounded text-[9px] text-studio-400 cursor-pointer"
                                  title="Pick field from collection"
                                  value=""
                                >
                                  <option value="">▾</option>
                                  {currentCollection.itemFields.map(itf => (
                                    <option key={itf.key} value={itf.expression}>
                                      {itf.key}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Barcode Properties */}
            {selectedElement.type === 'barcode' && (() => {
              const barcodeElem = selectedElement as BarcodeElement;
              const hasBinding = barcodeElem.value?.includes('{{');
              const previewVal = hasBinding ? previewExpressionTemplate(barcodeElem.value || '', report.dataSources) : barcodeElem.value;

              return (
                <div className="space-y-2.5 pt-2 border-t border-studio-800">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                      <Barcode size={12} className="text-blue-400" />
                      1D Barcode Settings
                    </div>
                    {hasBinding && (
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/80 px-1.5 py-0.5 rounded">
                        bound
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-studio-500">Barcode Format</label>
                    <select
                      value={barcodeElem.format || 'CODE128'}
                      onChange={e => updateElement(barcodeElem.id, { format: e.target.value as any })}
                      className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                    >
                      <option value="CODE128">Code 128 (Alphanumeric)</option>
                      <option value="EAN13">EAN-13 (Standard Retail)</option>
                      <option value="CODE39">Code 39</option>
                      <option value="UPCA">UPC-A</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-studio-500">Value / Expression</label>
                      <FieldPickerDropdown
                        onSelect={(expr) => updateElement(barcodeElem.id, { value: expr } as any)}
                        triggerLabel="⚡ Connect Field"
                        variant="compact"
                      />
                    </div>
                    <input
                      type="text"
                      value={barcodeElem.value || ''}
                      onChange={e => updateElement(barcodeElem.id, { value: e.target.value } as any)}
                      className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs font-mono"
                      placeholder="e.g. {{invoice.id}}"
                    />
                    {hasBinding && (
                      <div className="flex items-center gap-1 text-[10px] text-studio-400 bg-studio-950 px-2 py-1 rounded border border-studio-800 font-mono truncate">
                        <span className="text-studio-500 text-[9px]">Preview:</span>
                        <span className="text-purple-300 truncate">{previewVal || '(empty)'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="flex items-center gap-2 text-[11px] text-studio-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={barcodeElem.includeText ?? true}
                        onChange={e => updateElement(barcodeElem.id, { includeText: e.target.checked } as any)}
                        className="rounded bg-studio-950 border-studio-800 text-blue-600"
                      />
                      Include Human-Readable Text
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-studio-500">Bar Color</label>
                      <input
                        type="color"
                        value={barcodeElem.barColor || '#000000'}
                        onChange={e => updateElement(barcodeElem.id, { barColor: e.target.value } as any)}
                        className="w-full h-7 bg-studio-950 border border-studio-800 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-studio-500">Background</label>
                      <input
                        type="color"
                        value={barcodeElem.backgroundColor || '#ffffff'}
                        onChange={e => updateElement(barcodeElem.id, { backgroundColor: e.target.value } as any)}
                        className="w-full h-7 bg-studio-950 border border-studio-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* QR Code Properties */}
            {selectedElement.type === 'qrcode' && (() => {
              const qrElem = selectedElement as QRCodeElement;
              const hasBinding = qrElem.value?.includes('{{');
              const previewVal = hasBinding ? previewExpressionTemplate(qrElem.value || '', report.dataSources) : qrElem.value;

              return (
                <div className="space-y-2.5 pt-2 border-t border-studio-800">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                      <QrCode size={12} className="text-blue-400" />
                      2D QR Code Settings
                    </div>
                    {hasBinding && (
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/80 px-1.5 py-0.5 rounded">
                        bound
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-studio-500">Content / URL / Expression</label>
                      <FieldPickerDropdown
                        onSelect={(expr) => updateElement(qrElem.id, { value: expr } as any)}
                        triggerLabel="⚡ Connect Field"
                        variant="compact"
                      />
                    </div>
                    <input
                      type="text"
                      value={qrElem.value || ''}
                      onChange={e => updateElement(qrElem.id, { value: e.target.value } as any)}
                      className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs font-mono"
                      placeholder="https://example.com or {{invoice.qrUrl}}"
                    />
                    {hasBinding && (
                      <div className="flex items-center gap-1 text-[10px] text-studio-400 bg-studio-950 px-2 py-1 rounded border border-studio-800 font-mono truncate">
                        <span className="text-studio-500 text-[9px]">Preview:</span>
                        <span className="text-purple-300 truncate">{previewVal || '(empty)'}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-studio-500">Error Correction Level</label>
                    <select
                      value={qrElem.errorCorrectionLevel || 'M'}
                      onChange={e => updateElement(qrElem.id, { errorCorrectionLevel: e.target.value as any })}
                      className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                    >
                      <option value="L">Level L (Low - 7% recovery)</option>
                      <option value="M">Level M (Medium - 15% recovery)</option>
                      <option value="Q">Level Q (Quartile - 25% recovery)</option>
                      <option value="H">Level H (High - 30% recovery)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-studio-500">Dark Color</label>
                      <input
                        type="color"
                        value={qrElem.darkColor || '#000000'}
                        onChange={e => updateElement(qrElem.id, { darkColor: e.target.value } as any)}
                        className="w-full h-7 bg-studio-950 border border-studio-800 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-studio-500">Light Color</label>
                      <input
                        type="color"
                        value={qrElem.lightColor || '#ffffff'}
                        onChange={e => updateElement(qrElem.id, { lightColor: e.target.value } as any)}
                        className="w-full h-7 bg-studio-950 border border-studio-800 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Chart Properties */}
            {selectedElement.type === 'chart' && (() => {
              const chartElem = selectedElement as ChartElement;
              const currentChartCollection = schema.collections.find(c => c.path === chartElem.dataSource);

              return (
                <div className="space-y-2.5 pt-2 border-t border-studio-800">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                      <BarChart3 size={12} className="text-blue-400" />
                      Vector Chart Settings
                    </div>
                    {chartElem.dataSource && (
                      <span className="text-[9px] font-mono text-purple-400 bg-purple-950/60 border border-purple-800/80 px-1.5 py-0.5 rounded">
                        connected
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-studio-500">Chart Type</label>
                    <select
                      value={chartElem.chartType || 'bar'}
                      onChange={e => updateElement(chartElem.id, { chartType: e.target.value as any })}
                      className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                    >
                      <option value="bar">Bar Chart (Column)</option>
                      <option value="line">Line Chart (Trend)</option>
                      <option value="pie">Pie Chart</option>
                      <option value="donut">Donut Chart</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-studio-500">Chart Title</label>
                    <input
                      type="text"
                      value={chartElem.title || ''}
                      onChange={e => updateElement(chartElem.id, { title: e.target.value } as any)}
                      className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                      placeholder="e.g. Monthly Sales Revenue"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-studio-500">Data Source (Collection Array)</label>
                    {schema.collections.length > 0 ? (
                      <select
                        value={chartElem.dataSource || ''}
                        onChange={e => updateElement(chartElem.id, { dataSource: e.target.value } as any)}
                        className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1.5 text-studio-200 text-xs font-mono focus:border-blue-500"
                      >
                        <option value="">(Static / None)</option>
                        {schema.collections.map(c => (
                          <option key={c.path} value={c.path}>
                            {c.path} ({c.itemCount} items)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={chartElem.dataSource || ''}
                        onChange={e => updateElement(chartElem.id, { dataSource: e.target.value } as any)}
                        className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs font-mono"
                        placeholder="e.g. sales or leave blank for static"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-studio-500">Category Field (X)</label>
                      {currentChartCollection && currentChartCollection.itemFields.length > 0 ? (
                        <select
                          value={chartElem.categoryField || ''}
                          onChange={e => updateElement(chartElem.id, { categoryField: e.target.value } as any)}
                          className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs font-mono"
                        >
                          <option value="">(Select key...)</option>
                          {currentChartCollection.itemFields.map(itf => (
                            <option key={itf.key} value={itf.key}>
                              {itf.key}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={chartElem.categoryField || ''}
                          onChange={e => updateElement(chartElem.id, { categoryField: e.target.value } as any)}
                          className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs font-mono"
                          placeholder="e.g. month, name"
                        />
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-studio-500">Value Field (Y)</label>
                      {currentChartCollection && currentChartCollection.itemFields.length > 0 ? (
                        <select
                          value={chartElem.valueField || ''}
                          onChange={e => updateElement(chartElem.id, { valueField: e.target.value } as any)}
                          className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs font-mono"
                        >
                          <option value="">(Select key...)</option>
                          {currentChartCollection.itemFields.map(itf => (
                            <option key={itf.key} value={itf.key}>
                              {itf.key}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={chartElem.valueField || ''}
                          onChange={e => updateElement(chartElem.id, { valueField: e.target.value } as any)}
                          className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs font-mono"
                          placeholder="e.g. total, amount"
                        />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1 pt-1">
                    <label className="flex items-center gap-2 text-[11px] text-studio-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={chartElem.showLegend ?? true}
                        onChange={e => updateElement(chartElem.id, { showLegend: e.target.checked } as any)}
                        className="rounded bg-studio-950 border-studio-800 text-blue-600"
                      />
                      Display Legend at Bottom
                    </label>
                  </div>
                </div>
              );
            })()}

            {/* Independent 4-Sided Borders */}
            <div className="space-y-2 pt-2 border-t border-studio-800">
              <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                <Box size={12} />
                Independent Borders (4 Sides)
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                  <div key={side} className="bg-studio-950 p-1.5 rounded border border-studio-800 space-y-1">
                    <span className="font-semibold uppercase text-studio-400">{side}</span>
                    <select
                      value={selectedElement?.style?.borders?.[side]?.style || 'none'}
                      onChange={e => handleUpdateBorder(side, { style: e.target.value })}
                      className="w-full bg-studio-900 border border-studio-700 rounded px-1 py-0.5 text-studio-200"
                    >
                      <option value="none">None</option>
                      <option value="solid">Solid</option>
                      <option value="dashed">Dashed</option>
                      <option value="dotted">Dotted</option>
                      <option value="double">Double</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : currentSection ? (
          /* 2. Section Properties */
          <div className="space-y-3">
            <div className="bg-studio-950 p-2 rounded border border-studio-800">
              <div className="flex items-center justify-between font-medium text-white">
                <span className="text-blue-400">Section: {currentSection.name}</span>
                <span className="text-[10px] text-studio-500 font-mono">{currentSection.type}</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] text-studio-500">Section Height (mm)</label>
                {unallocatedBodyMm > 1 && (
                  <button
                    onClick={() => {
                      const newH = Math.round((currentSection!.height + unallocatedBodyMm) * 10) / 10;
                      const primaryTable = currentSection!.elements.find(el => el.type === 'table');
                      updateReport(prev => ({
                        ...prev,
                        sections: prev.sections.map(s => {
                          if (s.id !== currentSection!.id) return s;
                          return {
                            ...s,
                            height: newH,
                            elements: s.elements.map(el =>
                              primaryTable && el.id === primaryTable.id
                                ? { ...el, height: Math.round((el.height + unallocatedBodyMm) * 10) / 10 }
                                : el
                            )
                          };
                        })
                      }));
                    }}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer bg-blue-950/60 hover:bg-blue-900/60 px-1.5 py-0.5 rounded border border-blue-800/80 transition"
                    title={`Expand ${currentSection.name} to fill unallocated page space (+${unallocatedBodyMm.toFixed(0)}mm)`}
                  >
                    <Maximize2 size={10} />
                    <span>Fill Page (+{unallocatedBodyMm.toFixed(0)}mm)</span>
                  </button>
                )}
              </div>
              <input
                type="number"
                value={currentSection.height}
                onChange={e => {
                  const val = Number(e.target.value);
                  updateReport(prev => ({
                    ...prev,
                    sections: prev.sections.map(s => (s.id === currentSection!.id ? { ...s, height: val } : s))
                  }));
                }}
                className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-studio-800">
              <label className="flex items-center gap-2 text-studio-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentSection.repeatOnEveryPage ?? false}
                  onChange={e => {
                    const checked = e.target.checked;
                    updateReport(prev => ({
                      ...prev,
                      sections: prev.sections.map(s =>
                        s.id === currentSection!.id ? { ...s, repeatOnEveryPage: checked } : s
                      )
                    }));
                  }}
                  className="rounded bg-studio-950 border-studio-800 text-blue-600"
                />
                Repeat on Every Page
              </label>

              <label className="flex items-center gap-2 text-studio-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentSection.keepTogether ?? false}
                  onChange={e => {
                    const checked = e.target.checked;
                    updateReport(prev => ({
                      ...prev,
                      sections: prev.sections.map(s =>
                        s.id === currentSection!.id ? { ...s, keepTogether: checked } : s
                      )
                    }));
                  }}
                  className="rounded bg-studio-950 border-studio-800 text-blue-600"
                />
                Keep Together
              </label>
            </div>

            {currentSection.type === 'detail' && (
              <div className="space-y-2 pt-2 border-t border-studio-800">
                <div className="font-semibold text-studio-400 text-[10px] uppercase tracking-wider">
                  Detail Band Data Binding
                </div>

                <div>
                  <label className="text-[10px] text-studio-500">Array Data Source</label>
                  <select
                    value={currentSection.dataSource || ''}
                    onChange={e => {
                      const val = e.target.value;
                      updateReport(prev => ({
                        ...prev,
                        sections: prev.sections.map(s =>
                          s.id === currentSection!.id
                            ? { ...s, dataSource: val || undefined }
                            : s
                        )
                      }));
                    }}
                    className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                  >
                    <option value="">Default (Top-Level Data / First Array)</option>
                    {report.dataSources.map(ds => (
                      <option key={ds.name} value={ds.name}>
                        {ds.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-studio-300 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={currentSection.repeatForEachRecord ?? Boolean(currentSection.dataSource)}
                    onChange={e => {
                      const checked = e.target.checked;
                      updateReport(prev => ({
                        ...prev,
                        sections: prev.sections.map(s =>
                          s.id === currentSection!.id
                            ? { ...s, repeatForEachRecord: checked }
                            : s
                        )
                      }));
                    }}
                    className="rounded bg-studio-950 border-studio-800 text-blue-600"
                  />
                  Repeat Section for Each Record
                </label>
                <div className="text-[10px] text-studio-500">
                  Repeats this entire section and its elements for each item in the array, using item fields (e.g. {'{{name}}'} or {'{{item.name}}'}).
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 3. Global Page Settings */
          <div className="space-y-3">
            <div className="bg-studio-950 p-2 rounded border border-studio-800">
              <div className="font-medium text-white">Report Page Setup</div>
            </div>

            <div>
              <label className="text-[10px] text-studio-500">Report Name</label>
              <input
                type="text"
                value={report.name}
                onChange={e => updateReport(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] text-studio-500">Paper Size Preset</label>
              <select
                value={report.page.paperSize || detectPaperSize(report.page.width, report.page.height, report.page.unit)}
                onChange={e => {
                  const val = e.target.value as PaperSizeName;
                  if (val === 'Custom') {
                    updateReport(prev => ({ ...prev, page: { ...prev.page, paperSize: 'Custom' } }));
                  } else {
                    const dims = getPaperDimensions(val, report.page.orientation, report.page.unit);
                    updateReport(prev => ({
                      ...prev,
                      page: {
                        ...prev.page,
                        paperSize: val,
                        width: dims.width,
                        height: dims.height
                      }
                    }));
                  }
                }}
                className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="A3">A3 (297 × 420 mm)</option>
                <option value="A5">A5 (148 × 210 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in / 215.9 × 279.4 mm)</option>
                <option value="Legal">Legal (8.5 × 14 in / 215.9 × 355.6 mm)</option>
                <option value="Tabloid">Tabloid (11 × 17 in / 279.4 × 431.8 mm)</option>
                <option value="Custom">Custom Dimensions</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-studio-500">Page Width ({report.page.unit})</label>
                <input
                  type="number"
                  value={report.page.width}
                  onChange={e =>
                    updateReport(prev => ({
                      ...prev,
                      page: { ...prev.page, width: Number(e.target.value), paperSize: 'Custom' }
                    }))
                  }
                  className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-studio-500">Page Height ({report.page.unit})</label>
                <input
                  type="number"
                  value={report.page.height}
                  onChange={e =>
                    updateReport(prev => ({
                      ...prev,
                      page: { ...prev.page, height: Number(e.target.value), paperSize: 'Custom' }
                    }))
                  }
                  className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-studio-500">Orientation</label>
              <select
                value={report.page.orientation}
                onChange={e => {
                  const nextOrient = e.target.value as 'portrait' | 'landscape';
                  const currentSize = report.page.paperSize || detectPaperSize(report.page.width, report.page.height, report.page.unit);
                  const dims = getPaperDimensions(currentSize, nextOrient, report.page.unit);
                  updateReport(prev => ({
                    ...prev,
                    page: {
                      ...prev.page,
                      orientation: nextOrient,
                      width: dims.width,
                      height: dims.height
                    }
                  }));
                }}
                className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-studio-500">Report Flow Direction</label>
              <select
                value={report.page.direction || 'ltr'}
                onChange={e =>
                  updateReport(prev => ({
                    ...prev,
                    page: { ...prev.page, direction: e.target.value as any }
                  }))
                }
                className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
              >
                <option value="ltr">Left-to-Right (LTR)</option>
                <option value="rtl">Right-to-Left (RTL / Persian)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
