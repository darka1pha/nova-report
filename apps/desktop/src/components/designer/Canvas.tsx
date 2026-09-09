'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
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
  encodeBarcode,
  barcodeToSvg,
  generateQRCodeMatrix,
  qrcodeToSvg,
  layoutChart,
  chartToSvg
} from '@report/engine';
import {
  RotateCw,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Database
} from 'lucide-react';
import { FieldPickerDropdown } from './FieldPickerDropdown';
import { discoverReportDataSchema } from '@report/engine';

// 1 mm = ~3.7795 px at 96 DPI
const MM_TO_PX = 3.7795;

interface GuideLine {
  type: 'vertical' | 'horizontal';
  posPx: number;
  label?: string;
}

export const Canvas: React.FC = () => {
  const {
    report,
    zoom,
    gridSizeMm,
    snapToGrid,
    showGuides,
    showRulers,
    cursorPos,
    setCursorPos,
    selectedElementIds,
    setSelectedElementIds,
    selectedSectionId,
    setSelectedSectionId,
    addElement,
    updateElement,
    updateSection,
    duplicateSelectedElements,
    deleteSelectedElements,
    reorderElement
  } = useDesigner();

  const viewportRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Dragging / Resizing / Rotating / Marquee Selection State
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize';
    handle?: string;
    startX: number;
    startY: number;
    initialElements: { id: string; x: number; y: number; width: number; height: number }[];
    sectionId: string;
  } | null>(null);

  const [sectionResizingState, setSectionResizingState] = useState<{
    sectionId: string;
    startY: number;
    initialHeight: number;
  } | null>(null);

  const [rotatingState, setRotatingState] = useState<{
    elemId: string;
    centerX: number;
    centerY: number;
    initialRotation: number;
  } | null>(null);

  const [marqueeState, setMarqueeState] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    sectionId: string;
  } | null>(null);

  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const isLandscape = report.page.orientation === 'landscape';
  const pageWidthMm = isLandscape ? Math.max(report.page.width, report.page.height) : report.page.width;
  const pageHeightMm = isLandscape ? Math.min(report.page.width, report.page.height) : report.page.height;

  const scaledWidthPx = pageWidthMm * MM_TO_PX * zoom;
  const scaledHeightPx = pageHeightMm * MM_TO_PX * zoom;
  const margins = report.page.margins;

  // Categorize sections by print roles
  const pageHeaderSections = report.sections.filter(s => s.type === 'pageHeader');
  const pageFooterSections = report.sections.filter(s => s.type === 'pageFooter');
  const bodySections = report.sections.filter(s => s.type !== 'pageHeader' && s.type !== 'pageFooter');

  const totalHeaderHeightMm = pageHeaderSections.reduce((sum, s) => sum + s.height, 0);
  const totalBodyHeightMm = bodySections.reduce((sum, s) => sum + s.height, 0);
  const totalFooterHeightMm = pageFooterSections.reduce((sum, s) => sum + s.height, 0);
  const printableHeightMm = Math.max(0, pageHeightMm - margins.top - margins.bottom);
  const unallocatedBodyMm = Math.max(0, printableHeightMm - totalHeaderHeightMm - totalBodyHeightMm - totalFooterHeightMm);

  const getSectionTopMm = useCallback(
    (sectionId: string): number => {
      const sec = report.sections.find(s => s.id === sectionId);
      if (!sec) return 0;

      if (sec.type === 'pageHeader') {
        let top = margins.top;
        for (const s of pageHeaderSections) {
          if (s.id === sectionId) break;
          top += s.height;
        }
        return top;
      }

      if (sec.type === 'pageFooter') {
        const baseFooterTop = Math.max(
          margins.top + totalHeaderHeightMm + totalBodyHeightMm,
          pageHeightMm - margins.bottom - totalFooterHeightMm
        );
        let top = baseFooterTop;
        for (const s of pageFooterSections) {
          if (s.id === sectionId) break;
          top += s.height;
        }
        return top;
      }

      // Body section
      let top = margins.top + totalHeaderHeightMm;
      for (const s of bodySections) {
        if (s.id === sectionId) break;
        top += s.height;
      }
      return top;
    },
    [report.sections, pageHeaderSections, pageFooterSections, bodySections, margins, totalHeaderHeightMm, totalBodyHeightMm, totalFooterHeightMm, pageHeightMm]
  );

  // Grid Snapping
  const snap = useCallback(
    (val: number): number => {
      if (!snapToGrid) return val;
      return Math.round(val / gridSizeMm) * gridSizeMm;
    },
    [snapToGrid, gridSizeMm]
  );

  // Mouse Move on Viewport (tracks cursor mm for rulers & status bar)
  const handleViewportPointerMove = (e: React.PointerEvent) => {
    if (pageRef.current) {
      const pageRect = pageRef.current.getBoundingClientRect();
      const relXPx = e.clientX - pageRect.left;
      const relYPx = e.clientY - pageRect.top;
      const xMm = Math.max(0, Math.round((relXPx / (MM_TO_PX * zoom)) * 10) / 10);
      const yMm = Math.max(0, Math.round((relYPx / (MM_TO_PX * zoom)) * 10) / 10);
      setCursorPos({ xMm, yMm });
    }

    // 0. Section Height Resizing
    if (sectionResizingState) {
      const dyMm = (e.clientY - sectionResizingState.startY) / (MM_TO_PX * zoom);
      const newHeight = Math.max(10, snap(Math.round((sectionResizingState.initialHeight + dyMm) * 10) / 10));
      updateSection(sectionResizingState.sectionId, { height: newHeight });
      return;
    }

    // 1. Rotation Dragging
    if (rotatingState) {
      const dx = e.clientX - rotatingState.centerX;
      const dy = e.clientY - rotatingState.centerY;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      if (angle >= 360) angle -= 360;

      // Holding Shift snaps to 15-degree steps
      if (e.shiftKey) {
        angle = Math.round(angle / 15) * 15;
      } else {
        angle = Math.round(angle);
      }

      updateElement(rotatingState.elemId, { rotation: angle });
      return;
    }

    // 2. Marquee Dragging
    if (marqueeState) {
      setMarqueeState(prev => (prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null));
      return;
    }

    // 3. Element Move / Resize Dragging
    if (!dragState) return;

    const dxMm = (e.clientX - dragState.startX) / (MM_TO_PX * zoom);
    const dyMm = (e.clientY - dragState.startY) / (MM_TO_PX * zoom);

    const guides: GuideLine[] = [];

    if (dragState.type === 'move') {
      const currentSec = report.sections.find(s => s.id === dragState.sectionId);
      const otherElements = currentSec?.elements.filter(el => !selectedElementIds.includes(el.id)) || [];

      const secTopMm = getSectionTopMm(dragState.sectionId);

      dragState.initialElements.forEach(init => {
        let newX = Math.max(0, init.x + dxMm);
        let newY = Math.max(0, init.y + dyMm);

        // Smart Magnetic Snapping (Margins, Page/Printable Center, Other Elements)
        if (showGuides) {
          const snapThresholdMm = 2;
          const targetRight = newX + init.width;
          const targetCenter = newX + init.width / 2;
          const targetBottom = newY + init.height;
          const targetMiddle = newY + init.height / 2;

          // 1. Margin & Center Snap Targets
          const printableLeft = margins.left;
          const printableRight = pageWidthMm - margins.right;
          const printableCenter = printableLeft + (printableRight - printableLeft) / 2;
          const pageCenter = pageWidthMm / 2;

          const marginVerticalTargets = [
            { x: printableLeft, label: 'Margin Left' },
            { x: printableRight, label: 'Margin Right' },
            { x: printableCenter, label: 'Center (Margins)' },
            { x: pageCenter, label: 'Center (Page)' }
          ];

          for (const mt of marginVerticalTargets) {
            // Align Left to margin/center
            if (Math.abs(newX - mt.x) < snapThresholdMm) {
              newX = mt.x;
              guides.push({ type: 'vertical', posPx: mt.x * MM_TO_PX * zoom, label: mt.label });
            }
            // Align Right to margin/center
            else if (Math.abs(targetRight - mt.x) < snapThresholdMm) {
              newX = mt.x - init.width;
              guides.push({ type: 'vertical', posPx: mt.x * MM_TO_PX * zoom, label: mt.label });
            }
            // Align Center to margin/center
            else if (Math.abs(targetCenter - mt.x) < snapThresholdMm) {
              newX = mt.x - init.width / 2;
              guides.push({ type: 'vertical', posPx: mt.x * MM_TO_PX * zoom, label: mt.label });
            }
          }

          // Section Top / Middle / Bottom snap
          const secHeight = currentSec?.height || 0;
          if (Math.abs(newY) < snapThresholdMm) {
            newY = 0;
            guides.push({ type: 'horizontal', posPx: secTopMm * MM_TO_PX * zoom });
          } else if (Math.abs(targetMiddle - secHeight / 2) < snapThresholdMm) {
            newY = secHeight / 2 - init.height / 2;
            guides.push({ type: 'horizontal', posPx: (secTopMm + secHeight / 2) * MM_TO_PX * zoom });
          }

          // 2. Snap to Other Elements
          for (const other of otherElements) {
            const oRight = other.x + other.width;
            const oCenter = other.x + other.width / 2;
            const oBottom = other.y + other.height;
            const oMiddle = other.y + other.height / 2;

            // Align Left to other Left
            if (Math.abs(newX - other.x) < snapThresholdMm) {
              newX = other.x;
              guides.push({ type: 'vertical', posPx: other.x * MM_TO_PX * zoom });
            }
            // Align Left to other Right
            else if (Math.abs(newX - oRight) < snapThresholdMm) {
              newX = oRight;
              guides.push({ type: 'vertical', posPx: oRight * MM_TO_PX * zoom });
            }
            // Align Right to other Right
            else if (Math.abs(targetRight - oRight) < snapThresholdMm) {
              newX = oRight - init.width;
              guides.push({ type: 'vertical', posPx: oRight * MM_TO_PX * zoom });
            }
            // Align Center
            else if (Math.abs(targetCenter - oCenter) < snapThresholdMm) {
              newX = oCenter - init.width / 2;
              guides.push({ type: 'vertical', posPx: oCenter * MM_TO_PX * zoom });
            }

            // Align Top to other Top
            if (Math.abs(newY - other.y) < snapThresholdMm) {
              newY = other.y;
              guides.push({ type: 'horizontal', posPx: (secTopMm + other.y) * MM_TO_PX * zoom });
            }
            // Align Middle
            else if (Math.abs(targetMiddle - oMiddle) < snapThresholdMm) {
              newY = oMiddle - init.height / 2;
              guides.push({ type: 'horizontal', posPx: (secTopMm + oMiddle) * MM_TO_PX * zoom });
            }
            // Align Bottom
            else if (Math.abs(targetBottom - oBottom) < snapThresholdMm) {
              newY = oBottom - init.height;
              guides.push({ type: 'horizontal', posPx: (secTopMm + oBottom) * MM_TO_PX * zoom });
            }
          }
        }

        // Apply grid snap if no magnetic guide matched
        if (guides.length === 0) {
          newX = snap(newX);
          newY = snap(newY);
        }

        updateElement(init.id, {
          x: Math.round(newX * 10) / 10,
          y: Math.round(newY * 10) / 10
        });

        // Auto-expand section if element is dragged near/past section bottom
        const elemBottom = Math.round((newY + init.height) * 10) / 10;
        if (currentSec && elemBottom > currentSec.height) {
          const neededHeight = snap(Math.ceil(elemBottom + 5));
          updateSection(currentSec.id, { height: neededHeight });
        }
      });

      setActiveGuides(guides);
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

      updateElement(init.id, {
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
        width: Math.round(newW * 10) / 10,
        height: Math.round(newH * 10) / 10
      });

      const currentSec = report.sections.find(s => s.id === dragState.sectionId);
      const elemBottom = Math.round((newY + newH) * 10) / 10;
      if (currentSec && elemBottom > currentSec.height) {
        const neededHeight = snap(Math.ceil(elemBottom + 5));
        updateSection(currentSec.id, { height: neededHeight });
      }
    }
  };

  const handlePointerUp = () => {
    // Finish Marquee Selection
    if (marqueeState && pageRef.current) {
      const minX = Math.min(marqueeState.startX, marqueeState.currentX);
      const maxX = Math.max(marqueeState.startX, marqueeState.currentX);
      const minY = Math.min(marqueeState.startY, marqueeState.currentY);
      const maxY = Math.max(marqueeState.startY, marqueeState.currentY);

      // Check if marquee box has meaningful size (> 5px)
      if (maxX - minX > 5 || maxY - minY > 5) {
        const currentSec = report.sections.find(s => s.id === marqueeState.sectionId);
        if (currentSec) {
          const selected: string[] = [];
          for (const el of currentSec.elements) {
            const elDom = document.getElementById(`canvas-elem-${el.id}`);
            if (elDom) {
              const r = elDom.getBoundingClientRect();
              // Intersection check
              const overlaps = !(r.right < minX || r.left > maxX || r.bottom < minY || r.top > maxY);
              if (overlaps) {
                selected.push(el.id);
              }
            }
          }
          if (selected.length > 0) {
            setSelectedElementIds(selected);
            setSelectedSectionId(marqueeState.sectionId);
          }
        }
      }
      setMarqueeState(null);
    }

    setDragState(null);
    setRotatingState(null);
    setSectionResizingState(null);
    setActiveGuides([]);
  };

  // Pointer Down on Section Resize Handle Bar
  const handlePointerDownSectionResize = (e: React.PointerEvent, section: SectionDefinition) => {
    e.stopPropagation();
    setSelectedSectionId(section.id);
    setSectionResizingState({
      sectionId: section.id,
      startY: e.clientY,
      initialHeight: section.height
    });
  };

  // Pointer Down on Element
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

  // Pointer Down on Resize Handle
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

  // Pointer Down on Rotation Knob
  const handlePointerDownRotate = (e: React.PointerEvent, elem: ReportElement) => {
    e.stopPropagation();
    const dom = document.getElementById(`canvas-elem-${elem.id}`);
    if (dom) {
      const rect = dom.getBoundingClientRect();
      setRotatingState({
        elemId: elem.id,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        initialRotation: elem.rotation || 0
      });
    }
  };

  // Pointer Down on Section background (starts marquee selection or clears)
  const handlePointerDownSection = (e: React.PointerEvent, sectionId: string) => {
    setSelectedSectionId(sectionId);
    if (!e.shiftKey) {
      setSelectedElementIds([]);
    }
    setEditingTextId(null);

    setMarqueeState({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      sectionId
    });
  };

  // Discovered report data schema for field picker and drag-drop
  const schema = useMemo(() => {
    return discoverReportDataSchema(report.dataSources, report.parameters, report.variables);
  }, [report.dataSources, report.parameters, report.variables]);

  // Handle Drag Over Canvas Section
  const handleSectionDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/json')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  // Handle Drop Field or Collection from Data Explorer onto Section
  const handleSectionDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const raw = e.dataTransfer.getData('application/json');
      if (!raw) return;
      const data = JSON.parse(raw);

      // Compute drop position in section mm coordinates
      const targetSec = report.sections.find(s => s.id === sectionId);
      if (!targetSec) return;

      const secDom = e.currentTarget as HTMLElement;
      const rect = secDom.getBoundingClientRect();
      const dropXPx = e.clientX - rect.left;
      const dropYPx = e.clientY - rect.top;

      const rawDropXMm = Math.max(0, dropXPx / (MM_TO_PX * zoom));
      const rawDropYMm = Math.max(0, dropYPx / (MM_TO_PX * zoom));
      const dropXMm = snap(Math.round(rawDropXMm * 10) / 10);
      const dropYMm = snap(Math.round(rawDropYMm * 10) / 10);

      if (data.type === 'data-field') {
        const field = data.field;
        const widthMm = 50;
        const heightMm = 10;
        const newElem: TextElement = {
          id: `elem_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'text',
          name: field.name || field.key,
          x: dropXMm,
          y: dropYMm,
          width: widthMm,
          height: heightMm,
          text: field.expression,
          style: {
            fontSize: 10,
            fontFamily: 'Inter',
            color: '#1e293b',
            textAlign: 'left'
          }
        };

        if (dropYMm + heightMm > targetSec.height) {
          updateSection(targetSec.id, { height: snap(Math.ceil(dropYMm + heightMm + 5)) });
        }

        addElement(sectionId, newElem);
        setSelectedSectionId(sectionId);
        setSelectedElementIds([newElem.id]);
      } else if (data.type === 'data-collection') {
        const coll = data.collection;
        const colWidth = 40;
        const cols: Array<{ key: string; expression: string }> = (coll.itemFields && coll.itemFields.length > 0
          ? coll.itemFields
          : [{ key: 'col1', expression: '{{item.col1}}' }, { key: 'col2', expression: '{{item.col2}}' }]
        ).slice(0, 6);

        const totalWidth = cols.length * colWidth;
        const newTable: TableElement = {
          id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          type: 'table',
          name: `${coll.name} Table`,
          x: dropXMm,
          y: dropYMm,
          width: totalWidth,
          height: 25,
          dataSource: coll.path,
          columns: cols.map((col, i) => ({ id: `col_${i}`, width: colWidth })),
          headerRows: [
            {
              id: `hrow_${Date.now()}`,
              height: 10,
              cells: cols.map((c, i) => ({
                id: `hcell_${i}`,
                text: c.key,
                style: {
                  fontFamily: 'Inter',
                  fontSize: 10,
                  fontWeight: 'bold',
                  backgroundColor: '#f1f5f9',
                  color: '#1e293b',
                  textAlign: 'left'
                }
              }))
            }
          ],
          bodyRows: [
            {
              id: `brow_${Date.now()}`,
              height: 8,
              cells: cols.map((c, i) => ({
                id: `bcell_${i}`,
                text: c.expression,
                style: {
                  fontFamily: 'Inter',
                  fontSize: 10,
                  color: '#334155',
                  textAlign: 'left'
                }
              }))
            }
          ]
        };

        if (dropYMm + 25 > targetSec.height) {
          updateSection(targetSec.id, { height: snap(Math.ceil(dropYMm + 25 + 5)) });
        }

        addElement(sectionId, newTable);
        setSelectedSectionId(sectionId);
        setSelectedElementIds([newTable.id]);
      }
    } catch (err) {
      console.error('Failed to parse dropped field payload', err);
    }
  };

  // Find currently selected single element for HUD
  const singleSelectedElement = useMemo(() => {
    if (selectedElementIds.length !== 1) return null;
    for (const sec of report.sections) {
      const el = sec.elements.find(e => e.id === selectedElementIds[0]);
      if (el) return { element: el, sectionId: sec.id };
    }
    return null;
  }, [selectedElementIds, report.sections]);

  // Render an individual section band with elements and interactive bottom resize handle
  const renderSection = (section: SectionDefinition) => {
    const isSecSelected = selectedSectionId === section.id;
    const secHeightPx = section.height * MM_TO_PX * zoom;

    return (
      <div
        key={section.id}
        onPointerDown={e => handlePointerDownSection(e, section.id)}
        onDragOver={handleSectionDragOver}
        onDrop={e => handleSectionDrop(e, section.id)}
        className={`relative border-b ${
          isSecSelected ? 'border-blue-500 bg-blue-50/10' : 'border-gray-200'
        } group`}
        style={{
          height: `${secHeightPx}px`,
          minHeight: '24px'
        }}
      >
        {/* Section Tag */}
        <div
          className={`absolute left-1 top-1 text-[9px] font-mono px-1.5 py-0.5 rounded shadow z-20 pointer-events-none flex items-center gap-1 ${
            isSecSelected
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-gray-800 text-gray-200 opacity-60 group-hover:opacity-100'
          }`}
        >
          <span>{section.name}</span>
          <span className="opacity-75 font-normal">({section.height}mm)</span>
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
              id={`canvas-elem-${elem.id}`}
              onPointerDown={e => handlePointerDownElement(e, elem, section)}
              onDoubleClick={e => {
                e.stopPropagation();
                if (elem.type === 'text') setEditingTextId(elem.id);
              }}
              className={`absolute cursor-move ${
                isSelected ? 'ring-2 ring-blue-500 shadow-md z-30' : 'hover:ring-1 hover:ring-blue-300'
              }`}
              style={{
                left: `${elemX}px`,
                top: `${elemY}px`,
                width: `${elemW}px`,
                height: `${elemH}px`,
                transform: elem.rotation ? `rotate(${elem.rotation}deg)` : undefined
              }}
            >
              {/* Element Visual Render */}
              <ElementVisual
                elem={elem}
                isEditing={editingTextId === elem.id}
                onTextChange={val => updateElement(elem.id, { text: val } as any)}
                onBlur={() => setEditingTextId(null)}
              />

              {/* 8-Point Transformer Handles when Selected */}
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

                  {/* Rotation Handle Knob (Positioned above top-center) */}
                  <div
                    onPointerDown={e => handlePointerDownRotate(e, elem)}
                    className="absolute left-1/2 -top-6 -translate-x-1/2 flex flex-col items-center cursor-grab active:cursor-grabbing z-40 group/rot"
                    title="Drag to rotate (Hold Shift for 15° snap)"
                  >
                    <div className="w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow flex items-center justify-center text-white hover:scale-125 transition">
                      <RotateCw size={9} />
                    </div>
                    <div className="w-0.5 h-2.5 bg-blue-500" />
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Interactive Section Bottom Resize Bar */}
        <div
          onPointerDown={e => handlePointerDownSectionResize(e, section)}
          className="absolute bottom-0 left-0 right-0 h-3 -mb-1.5 cursor-ns-resize z-30 group/sec-resize flex items-center justify-center hover:bg-blue-500/20 transition select-none"
          title={`Drag to resize ${section.name} (Current: ${section.height}mm)`}
        >
          <div className="w-20 h-1 bg-gray-300 group-hover/sec-resize:bg-blue-600 rounded-full transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover/sec-resize:opacity-100 bg-blue-600 text-white text-[8px] font-mono px-1.5 py-0.5 rounded shadow-xs pointer-events-none -mt-6 transition-opacity whitespace-nowrap">
              ↕ {section.height} mm
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={viewportRef}
      onPointerMove={handleViewportPointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="flex-1 bg-studio-950 overflow-auto relative flex flex-col select-none"
    >
      {/* Top Millimeter Ruler */}
      {showRulers && (
        <div className="sticky top-0 z-40 flex bg-studio-900/95 backdrop-blur-xs border-b border-studio-800 shadow-sm text-[9px] text-studio-400 select-none">
          {/* Top-Left Corner Box */}
          <div className="w-8 h-6 bg-studio-950 border-r border-studio-800 flex items-center justify-center font-mono text-[9px] text-studio-500 font-bold shrink-0">
            mm
          </div>
          {/* Horizontal Ticks Bar */}
          <div className="flex-1 h-6 relative overflow-hidden">
            <svg className="w-full h-full" style={{ minWidth: `${scaledWidthPx}px` }}>
              {Array.from({ length: Math.ceil(pageWidthMm / 5) + 1 }).map((_, i) => {
                const mm = i * 5;
                const xPx = mm * MM_TO_PX * zoom + 32; // 32px offset for center/padding
                const isMajor = mm % 10 === 0;
                return (
                  <g key={mm}>
                    <line
                      x1={xPx}
                      y1={isMajor ? 10 : 16}
                      x2={xPx}
                      y2={24}
                      stroke={isMajor ? '#94a3b8' : '#475569'}
                      strokeWidth="1"
                    />
                    {isMajor && (
                      <text x={xPx + 2} y={9} fill="#cbd5e1" fontSize="8" fontFamily="monospace">
                        {mm}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Cursor Tracker Tick on Top Ruler */}
              {cursorPos.xMm > 0 && (
                <line
                  x1={cursorPos.xMm * MM_TO_PX * zoom + 32}
                  y1={0}
                  x2={cursorPos.xMm * MM_TO_PX * zoom + 32}
                  y2={24}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>
        </div>
      )}

      <div className="flex flex-1 relative">
        {/* Left Millimeter Ruler */}
        {showRulers && (
          <div className="sticky left-0 z-30 w-8 bg-studio-900/95 backdrop-blur-xs border-r border-studio-800 shadow-sm shrink-0">
            <svg className="w-full h-full" style={{ minHeight: `${scaledHeightPx}px` }}>
              {Array.from({ length: Math.ceil(pageHeightMm / 5) + 1 }).map((_, i) => {
                const mm = i * 5;
                const yPx = mm * MM_TO_PX * zoom + 24;
                const isMajor = mm % 10 === 0;
                return (
                  <g key={mm}>
                    <line
                      x1={isMajor ? 18 : 24}
                      y1={yPx}
                      x2={32}
                      y2={yPx}
                      stroke={isMajor ? '#94a3b8' : '#475569'}
                      strokeWidth="1"
                    />
                    {isMajor && (
                      <text
                        x={2}
                        y={yPx + 3}
                        fill="#cbd5e1"
                        fontSize="8"
                        fontFamily="monospace"
                        transform={`rotate(-90, 8, ${yPx})`}
                      >
                        {mm}
                      </text>
                    )}
                  </g>
                );
              })}
              {/* Cursor Tracker Tick on Left Ruler */}
              {cursorPos.yMm > 0 && (
                <line
                  x1={0}
                  y1={cursorPos.yMm * MM_TO_PX * zoom + 24}
                  x2={32}
                  y2={cursorPos.yMm * MM_TO_PX * zoom + 24}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                />
              )}
            </svg>
          </div>
        )}

        {/* Main Canvas Page Surface */}
        <div className="flex-1 flex justify-center p-8 overflow-auto">
          <div
            ref={pageRef}
            className="bg-white relative shadow-2xl transition-all select-none ring-1 ring-black/5"
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
              className="absolute border border-dashed border-blue-400 pointer-events-none z-10"
              style={{
                top: `${margins.top * MM_TO_PX * zoom}px`,
                left: `${margins.left * MM_TO_PX * zoom}px`,
                right: `${margins.right * MM_TO_PX * zoom}px`,
                bottom: `${margins.bottom * MM_TO_PX * zoom}px`
              }}
            />

            {/* Dynamic Alignment Guides (Magenta Magnetic Guidelines) */}
            {activeGuides.map((guide, idx) => (
              <div
                key={idx}
                className="absolute pointer-events-none z-40"
                style={
                  guide.type === 'vertical'
                    ? {
                        left: `${guide.posPx}px`,
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        borderLeft: '1px dashed #ec4899',
                        backgroundColor: '#ec4899'
                      }
                    : {
                        top: `${guide.posPx}px`,
                        left: 0,
                        right: 0,
                        height: '1px',
                        borderTop: '1px dashed #ec4899',
                        backgroundColor: '#ec4899'
                      }
                }
              />
            ))}

            {/* Section Containers */}
            <div className="flex flex-col w-full h-full">
              {/* Top Margin Area (Visual Boundary matching Preview top margin) */}
              {margins.top > 0 && (
                <div
                  className="w-full bg-blue-50/20 border-b border-dashed border-blue-400 relative select-none flex items-center px-3"
                  style={{ height: `${margins.top * MM_TO_PX * zoom}px` }}
                >
                  <span className="text-[9px] font-mono text-blue-400 select-none">
                    Top Margin ({margins.top}mm)
                  </span>
                </div>
              )}

              {/* Page Header Section(s) */}
              {pageHeaderSections.map(section => renderSection(section))}

              {/* Body Sections (Detail, Report Header, Report Footer, etc.) */}
              {bodySections.map(section => renderSection(section))}

              {/* Unallocated Page Body Guide (when detail/body does not fill down to footer) */}
              {unallocatedBodyMm > 2 && (
                <div
                  className="w-full border-b border-dashed border-studio-200 bg-studio-50/40 relative flex items-center justify-center group/unalloc transition-colors hover:bg-blue-50/30 select-none"
                  style={{ height: `${unallocatedBodyMm * MM_TO_PX * zoom}px`, minHeight: '24px' }}
                >
                  <div className="flex items-center gap-2 text-[10px] text-studio-400 group-hover/unalloc:text-blue-600">
                    <span className="font-mono">Unallocated body space ({unallocatedBodyMm.toFixed(0)}mm)</span>
                    {bodySections.length > 0 && (
                      <button
                        onClick={() => {
                          const targetSec = bodySections.find(s => s.type === 'detail') || bodySections[bodySections.length - 1];
                          if (targetSec) {
                            updateSection(targetSec.id, { height: targetSec.height + unallocatedBodyMm });
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-white hover:bg-blue-600 hover:text-white border border-studio-300 hover:border-blue-600 text-[10px] font-medium transition shadow-xs cursor-pointer"
                        title="Expand Detail section height to fill the printable page"
                      >
                        + Expand Detail to Fill Page
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Page Footer Section(s) (Anchored above bottom margin) */}
              {pageFooterSections.map(section => renderSection(section))}

              {/* Bottom Margin Area (Visual Boundary matching Preview bottom margin) */}
              {margins.bottom > 0 && (
                <div
                  className="w-full bg-blue-50/20 border-t border-dashed border-blue-400 relative select-none flex items-center px-3"
                  style={{ height: `${margins.bottom * MM_TO_PX * zoom}px` }}
                >
                  <span className="text-[9px] font-mono text-blue-400 select-none">
                    Bottom Margin ({margins.bottom}mm)
                  </span>
                </div>
              )}
            </div>

            {/* Rubber-band Marquee Selection Box */}
            {marqueeState && (
              <div
                className="fixed pointer-events-none border border-blue-500 bg-blue-500/15 z-50 rounded-xs"
                style={{
                  left: `${Math.min(marqueeState.startX, marqueeState.currentX)}px`,
                  top: `${Math.min(marqueeState.startY, marqueeState.currentY)}px`,
                  width: `${Math.abs(marqueeState.currentX - marqueeState.startX)}px`,
                  height: `${Math.abs(marqueeState.currentY - marqueeState.startY)}px`
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Floating Mini-Inspector HUD when single element is selected */}
      {singleSelectedElement && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-studio-900/90 backdrop-blur-md border border-studio-700/80 px-3 py-1.5 rounded-full shadow-2xl flex items-center gap-3 text-xs text-studio-200 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-1.5 pr-3 border-r border-studio-800">
            <span className="font-semibold text-blue-400 capitalize">{singleSelectedElement.element.type}</span>
            <span className="font-mono text-[11px] text-studio-400">
              {singleSelectedElement.element.width} × {singleSelectedElement.element.height} mm
            </span>
            {singleSelectedElement.element.rotation ? (
              <span className="bg-studio-800 px-1.5 py-0.5 rounded text-[10px] text-blue-300 font-mono">
                {singleSelectedElement.element.rotation}°
              </span>
            ) : null}
          </div>

          {/* Quick Data Connect in HUD for bindable elements */}
          {['text', 'barcode', 'qrcode'].includes(singleSelectedElement.element.type) && (
            <div className="pl-1 pr-2 border-r border-studio-800">
              <FieldPickerDropdown
                onSelect={(expr) => {
                  if (singleSelectedElement.element.type === 'text') {
                    updateElement(singleSelectedElement.element.id, { text: expr } as any);
                  } else if (['barcode', 'qrcode'].includes(singleSelectedElement.element.type)) {
                    updateElement(singleSelectedElement.element.id, { value: expr } as any);
                  }
                }}
                triggerLabel="⚡ Data"
                variant="hud"
              />
            </div>
          )}

          <div className="flex items-center gap-1">
            <button
              onClick={duplicateSelectedElements}
              className="p-1 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition"
              title="Duplicate (Ctrl+D)"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={() => reorderElement(singleSelectedElement.element.id, 'forward')}
              className="p-1 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition"
              title="Bring Forward"
            >
              <ArrowUp size={13} />
            </button>
            <button
              onClick={() => reorderElement(singleSelectedElement.element.id, 'backward')}
              className="p-1 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition"
              title="Send Backward"
            >
              <ArrowDown size={13} />
            </button>
            <button
              onClick={deleteSelectedElements}
              className="p-1 hover:bg-red-900/60 text-red-400 hover:text-red-300 rounded transition"
              title="Delete (Del)"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      )}
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
      className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-600 rounded-xs shadow-xs z-40"
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
      const bar = elem as BarcodeElement;
      const barcodeResult = encodeBarcode(bar.format || 'CODE128', bar.value || '123456');
      const svg = barcodeToSvg(barcodeResult, bar.width * MM_TO_PX, bar.height * MM_TO_PX, {
        barColor: bar.barColor,
        backgroundColor: bar.backgroundColor,
        includeText: bar.includeText
      });

      return (
        <div
          className="w-full h-full overflow-hidden"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      );
    }

    case 'qrcode': {
      const qr = elem as QRCodeElement;
      const matrix = generateQRCodeMatrix(qr.value || 'NovaReport', (qr.errorCorrectionLevel || 'M') as any);
      const svg = qrcodeToSvg(matrix, qr.width * MM_TO_PX, qr.height * MM_TO_PX, {
        darkColor: qr.darkColor,
        lightColor: qr.lightColor
      });

      return (
        <div
          className="w-full h-full overflow-hidden"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      );
    }

    case 'chart': {
      const chartElem = elem as ChartElement;
      const chartLayout = layoutChart(
        chartElem,
        chartElem.width * MM_TO_PX,
        chartElem.height * MM_TO_PX,
        { data: {}, parameters: {}, variables: {} }
      );
      const svg = chartToSvg(chartLayout, chartElem.width * MM_TO_PX, chartElem.height * MM_TO_PX);

      return (
        <div
          className="w-full h-full overflow-hidden"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
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
