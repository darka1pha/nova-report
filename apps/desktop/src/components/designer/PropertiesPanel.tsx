'use client';

import React from 'react';
import { useDesigner } from './DesignerContext';
import type { ReportElement, SectionDefinition, TextElement, ShapeElement, TableElement } from '@report/schema';
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
  Underline
} from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
  const {
    report,
    selectedElementIds,
    selectedSectionId,
    systemFonts,
    updateElement,
    updateReport
  } = useDesigner();

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
            </div>

            {/* Text Element Properties */}
            {selectedElement.type === 'text' && (
              <div className="space-y-2 pt-2 border-t border-studio-800">
                <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                  <Type size={12} />
                  Text Content & Expression
                </div>
                <textarea
                  rows={3}
                  value={(selectedElement as TextElement).text}
                  onChange={e => updateElement(selectedElement!.id, { text: e.target.value } as any)}
                  className="w-full bg-studio-950 border border-studio-800 rounded p-2 text-studio-200 text-xs font-mono"
                  placeholder="e.g. Invoice #{{invoice.id}}"
                />

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
            )}

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
            {selectedElement.type === 'table' && (
              <div className="space-y-2 pt-2 border-t border-studio-800">
                <div className="text-[11px] font-semibold text-studio-400 flex items-center gap-1">
                  <Box size={12} />
                  Table Binding
                </div>
                <div>
                  <label className="text-[10px] text-studio-500">Data Source (Collection Path)</label>
                  <input
                    type="text"
                    value={(selectedElement as TableElement).dataSource || ''}
                    onChange={e => updateElement(selectedElement!.id, { dataSource: e.target.value } as any)}
                    className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs font-mono"
                    placeholder="e.g. invoice.items"
                  />
                </div>
              </div>
            )}

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
              <label className="text-[10px] text-studio-500">Section Height (mm)</label>
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-studio-500">Page Width ({report.page.unit})</label>
                <input
                  type="number"
                  value={report.page.width}
                  onChange={e =>
                    updateReport(prev => ({ ...prev, page: { ...prev.page, width: Number(e.target.value) } }))
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
                    updateReport(prev => ({ ...prev, page: { ...prev.page, height: Number(e.target.value) } }))
                  }
                  className="w-full bg-studio-950 border border-studio-800 rounded px-2 py-1 text-studio-200 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-studio-500">Orientation</label>
              <select
                value={report.page.orientation}
                onChange={e =>
                  updateReport(prev => ({
                    ...prev,
                    page: { ...prev.page, orientation: e.target.value as any }
                  }))
                }
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
