'use client';

import React, { useRef, useState } from 'react';
import { useDesigner } from './DesignerContext';
import type { ReportElement, SectionDefinition, TextElement, ShapeElement, TableElement } from '@report/schema';
import { unitToPt, ptToUnit } from '@report/schema';

// 1 mm = ~3.7795 px at 96 DPI (or ~2.8346 pt at 72 pt/in)
const MM_TO_PX = 3.7795;

export const Canvas: React.FC = () => {
  const {
    report,
    zoom,
    gridSizeMm,
    snapToGrid,
    selectedElementIds,
    setSelectedElementIds,
    selectedSectionId,
    setSelectedSectionId,
    updateElement,
    updateReport
  } = useDesigner();

  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging / Resizing State
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize';
    handle?: string;
    startX: number;
    startY: number;
    initialElements: { id: string; x: number; y: number; width: number; height: number }[];
    sectionId: string;
  } | null>(null);

  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const isLandscape = report.page.orientation === 'landscape';
  const pageWidthMm = isLandscape ? Math.max(report.page.width, report.page.height) : report.page.width;
  const pageHeightMm = isLandscape ? Math.min(report.page.width, report.page.height) : report.page.height;

  const scaledWidthPx = pageWidthMm * MM_TO_PX * zoom;
  const scaledHeightPx = pageHeightMm * MM_TO_PX * zoom;
  const margins = report.page.margins;

  // Snap calculation
  const snap = (val: number): number => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSizeMm) * gridSizeMm;
  };

  const handlePointerDownElement = (
    e: React.PointerEvent,
    elem: ReportElement,
    section: SectionDefinition
  ) => {
    e.stopPropagation();
    setSelectedSectionId(section.id);

    if (e.shiftKey) {
      if (selectedElementIds.includes(elem.id)) {
        setSelectedElementIds(selectedElementIds.filter(id => id !== elem.id));
      } else {
        setSelectedElementIds([...selectedElementIds, elem.id]);
      }
    } else {
      if (!selectedElementIds.includes(elem.id)) {
        setSelectedElementIds([elem.id]);
      }
    }

    const targetElems = selectedElementIds.includes(elem.id)
      ? section.elements.filter(el => selectedElementIds.includes(el.id))
      : [elem];

    setDragState({
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      initialElements: targetElems.map(el => ({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height
      })),
      sectionId: section.id
    });
  };

  const handlePointerDownResize = (
    e: React.PointerEvent,
    handle: string,
    elem: ReportElement,
    section: SectionDefinition
  ) => {
    e.stopPropagation();
    setDragState({
      type: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialElements: [{ id: elem.id, x: elem.x, y: elem.y, width: elem.width, height: elem.height }],
      sectionId: section.id
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;

    const dxMm = (e.clientX - dragState.startX) / (MM_TO_PX * zoom);
    const dyMm = (e.clientY - dragState.startY) / (MM_TO_PX * zoom);

    if (dragState.type === 'move') {
      dragState.initialElements.forEach(init => {
        const newX = snap(Math.max(0, init.x + dxMm));
        const newY = snap(Math.max(0, init.y + dyMm));
        updateElement(init.id, { x: newX, y: newY });
      });
    } else if (dragState.type === 'resize' && dragState.initialElements[0]) {
      const init = dragState.initialElements[0];
      let newX = init.x;
      let newY = init.y;
      let newW = init.width;
      let newH = init.height;

      const h = dragState.handle;
      if (h?.includes('e')) newW = Math.max(5, snap(init.width + dxMm));
      if (h?.includes('s')) newH = Math.max(5, snap(init.height + dyMm));
      if (h?.includes('w')) {
        const proposedW = Math.max(5, init.width - dxMm);
        newX = snap(init.x + (init.width - proposedW));
        newW = proposedW;
      }
      if (h?.includes('n')) {
        const proposedH = Math.max(5, init.height - dyMm);
        newY = snap(init.y + (init.height - proposedH));
        newH = proposedH;
      }

      updateElement(init.id, { x: newX, y: newY, width: newW, height: newH });
    }
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={() => {
        setSelectedElementIds([]);
        setEditingTextId(null);
      }}
      className="flex-1 bg-studio-950 overflow-auto relative flex justify-center p-12 select-none"
    >
      {/* Report Page Sheet */}
      <div
        className="bg-white relative shadow-2xl transition-all"
        style={{
          width: `${scaledWidthPx}px`,
          minHeight: `${scaledHeightPx}px`,
          transformOrigin: 'top center',
          direction: (report.page.direction === 'rtl' ? 'rtl' : 'ltr') as any
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Printable Margins Guide Box */}
        <div
          className="absolute border border-dashed border-blue-300 pointer-events-none z-10"
          style={{
            top: `${margins.top * MM_TO_PX * zoom}px`,
            left: `${margins.left * MM_TO_PX * zoom}px`,
            right: `${margins.right * MM_TO_PX * zoom}px`,
            bottom: `${margins.bottom * MM_TO_PX * zoom}px`
          }}
        />

        {/* Section Containers */}
        <div className="flex flex-col w-full h-full">
          {report.sections.map(section => {
            const isSecSelected = selectedSectionId === section.id;
            const secHeightPx = section.height * MM_TO_PX * zoom;

            return (
              <div
                key={section.id}
                onClick={e => {
                  e.stopPropagation();
                  setSelectedSectionId(section.id);
                }}
                className={`relative border-b ${
                  isSecSelected ? 'border-blue-500 bg-blue-50/10' : 'border-gray-200'
                } group`}
                style={{
                  height: `${secHeightPx}px`,
                  minHeight: '30px'
                }}
              >
                {/* Section Tag */}
                <div
                  className={`absolute left-1 top-1 text-[9px] font-mono px-1.5 py-0.5 rounded shadow z-20 pointer-events-none ${
                    isSecSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-gray-700 text-gray-200 opacity-60 group-hover:opacity-100'
                  }`}
                >
                  {section.name} ({section.height}mm)
                </div>

                {/* Section Elements */}
                {section.elements.map(elem => {
                  const isSelected = selectedElementIds.includes(elem.id);
                  const elemX = elem.x * MM_TO_PX * zoom;
                  const elemY = elem.y * MM_TO_PX * zoom;
                  const elemW = elem.width * MM_TO_PX * zoom;
                  const elemH = elem.height * MM_TO_PX * zoom;

                  return (
                    <div
                      key={elem.id}
                      onPointerDown={e => handlePointerDownElement(e, elem, section)}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        if (elem.type === 'text') setEditingTextId(elem.id);
                      }}
                      className={`absolute cursor-move ${
                        isSelected ? 'ring-2 ring-blue-500 z-30' : 'hover:ring-1 hover:ring-blue-300'
                      }`}
                      style={{
                        left: `${elemX}px`,
                        top: `${elemY}px`,
                        width: `${elemW}px`,
                        height: `${elemH}px`,
                        transform: elem.rotation ? `rotate(${elem.rotation}deg)` : undefined
                      }}
                    >
                      {/* Render Visual Representation of Element */}
                      <ElementVisual
                        elem={elem}
                        isEditing={editingTextId === elem.id}
                        onTextChange={val => updateElement(elem.id, { text: val } as any)}
                        onBlur={() => setEditingTextId(null)}
                      />

                      {/* 8-Point Interactive Transformer Handles when Selected */}
                      {isSelected && (
                        <>
                          <ResizeHandle pos="nw" onDown={e => handlePointerDownResize(e, 'nw', elem, section)} />
                          <ResizeHandle pos="n" onDown={e => handlePointerDownResize(e, 'n', elem, section)} />
                          <ResizeHandle pos="ne" onDown={e => handlePointerDownResize(e, 'ne', elem, section)} />
                          <ResizeHandle pos="e" onDown={e => handlePointerDownResize(e, 'e', elem, section)} />
                          <ResizeHandle pos="se" onDown={e => handlePointerDownResize(e, 'se', elem, section)} />
                          <ResizeHandle pos="s" onDown={e => handlePointerDownResize(e, 's', elem, section)} />
                          <ResizeHandle pos="sw" onDown={e => handlePointerDownResize(e, 'sw', elem, section)} />
                          <ResizeHandle pos="w" onDown={e => handlePointerDownResize(e, 'w', elem, section)} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ResizeHandle: React.FC<{ pos: string; onDown: (e: React.PointerEvent) => void }> = ({ pos, onDown }) => {
  const getPosStyle = (): React.CSSProperties => {
    switch (pos) {
      case 'nw': return { top: -4, left: -4, cursor: 'nwse-resize' };
      case 'n':  return { top: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
      case 'ne': return { top: -4, right: -4, cursor: 'nesw-resize' };
      case 'e':  return { top: '50%', right: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' };
      case 'se': return { bottom: -4, right: -4, cursor: 'nwse-resize' };
      case 's':  return { bottom: -4, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
      case 'sw': return { bottom: -4, left: -4, cursor: 'nesw-resize' };
      case 'w':  return { top: '50%', left: -4, transform: 'translateY(-50%)', cursor: 'ew-resize' };
      default: return {};
    }
  };

  return (
    <div
      onPointerDown={onDown}
      className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-xs shadow-sm z-40"
      style={getPosStyle()}
    />
  );
};

const ElementVisual: React.FC<{
  elem: ReportElement;
  isEditing: boolean;
  onTextChange: (text: string) => void;
  onBlur: () => void;
}> = ({ elem, isEditing, onTextChange, onBlur }) => {
  const style = elem.style || {};

  switch (elem.type) {
    case 'text': {
      const textElem = elem as TextElement;
      if (isEditing) {
        return (
          <textarea
            autoFocus
            defaultValue={textElem.text}
            onChange={e => onTextChange(e.target.value)}
            onBlur={onBlur}
            className="w-full h-full bg-yellow-50 border border-blue-500 p-1 text-xs resize-none outline-none z-50 font-inherit"
          />
        );
      }

      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            fontFamily: style.fontFamily || 'sans-serif',
            fontSize: `${style.fontSize || 11}pt`,
            fontWeight: style.fontWeight || 'normal',
            fontStyle: style.fontStyle || 'normal',
            color: style.color || '#000000',
            backgroundColor: style.backgroundColor || 'transparent',
            textAlign: (style.textAlign || 'left') as any,
            direction: (style.direction === 'rtl' ? 'rtl' : 'ltr') as any,
            padding: `${style.padding?.top || 1}px ${style.padding?.right || 2}px ${style.padding?.bottom || 1}px ${style.padding?.left || 2}px`,
            display: 'flex',
            alignItems: style.verticalAlign === 'middle' ? 'center' : style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
            justifyContent: style.textAlign === 'center' ? 'center' : style.textAlign === 'right' ? 'flex-end' : 'flex-start',
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {textElem.text}
        </div>
      );
    }

    case 'shape': {
      const shape = elem as ShapeElement;
      if (shape.shapeType === 'circle' || shape.shapeType === 'ellipse') {
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: shape.fillColor || 'transparent',
              border: `${shape.strokeWidth || 1}px solid ${shape.strokeColor || '#000000'}`
            }}
          />
        );
      }
      if (shape.shapeType === 'line') {
        return (
          <div
            className="w-full"
            style={{
              height: `${Math.max(1, (shape.strokeWidth || 1) * 1.5)}px`,
              backgroundColor: shape.strokeColor || '#000000'
            }}
          />
        );
      }
      return (
        <div
          className="w-full h-full"
          style={{
            backgroundColor: shape.fillColor || 'transparent',
            border: `${shape.strokeWidth || 1}px solid ${shape.strokeColor || '#000000'}`,
            borderRadius: `${shape.borderRadius || 0}px`
          }}
        />
      );
    }

    case 'image': {
      const img = elem as any;
      return (
        <div className="w-full h-full border border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden">
          {img.src ? (
            <img src={img.src} alt="" className="w-full h-full object-contain" />
          ) : (
            <span className="text-[10px] text-gray-400">🖼️ Image</span>
          )}
        </div>
      );
    }

    case 'barcode': {
      const bar = elem as any;
      return (
        <div className="w-full h-full bg-white border border-gray-300 flex flex-col items-center justify-center p-1 text-center font-mono">
          <div className="text-xs tracking-widest font-bold text-black">||| | |||| | | |||</div>
          {bar.includeText && <div className="text-[9px] text-gray-700">{bar.value}</div>}
        </div>
      );
    }

    case 'qrcode': {
      const qr = elem as any;
      return (
        <div className="w-full h-full bg-white border border-gray-300 flex items-center justify-center p-1">
          <svg className="w-4/5 h-4/5" viewBox="0 0 25 25">
            <path fill="#000" d="M0 0h7v7H0zm2 2h3v3H2zm7-2h2v2H9zm4 0h7v7h-7zm2 2h3v3h-3zM0 9h2v2H0zm4 0h3v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zm-16 4h7v7H0zm2 2h3v3H2zm7-2h4v2H9zm6 0h2v4h-2zm-6 3h2v3H9zm4 0h2v3h-2zm-4 3h7v2H9z"/>
          </svg>
        </div>
      );
    }

    case 'table': {
      const tbl = elem as TableElement;
      return (
        <div className="w-full h-full border border-blue-400 bg-blue-50/20 overflow-hidden text-[9px] flex flex-col">
          <div className="bg-blue-600 text-white font-bold px-1.5 py-0.5 flex justify-between">
            <span>Table: {tbl.name || tbl.id}</span>
            <span>DataSource: {tbl.dataSource || '(None)'}</span>
          </div>
          <div className="flex-1 flex flex-col divide-y divide-gray-300">
            {tbl.headerRows.map(h => (
              <div key={h.id} className="flex bg-gray-200 font-bold divide-x divide-gray-300 py-1 px-1">
                {h.cells.map(c => (
                  <div key={c.id} className="flex-1 px-1 truncate">{c.text}</div>
                ))}
              </div>
            ))}
            {tbl.bodyRows.map(b => (
              <div key={b.id} className="flex bg-white divide-x divide-gray-200 py-1 px-1">
                {b.cells.map(c => (
                  <div key={c.id} className="flex-1 px-1 truncate text-gray-600">{c.text}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  return null;
};
