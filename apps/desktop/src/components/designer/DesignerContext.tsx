'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  ReportDefinition,
  ReportElement,
  SectionDefinition,
  TextElement,
  ShapeElement,
  TableElement,
  ImageElement,
  BarcodeElement,
  QRCodeElement,
  ChartElement
} from '@report/schema';
import {
  createBlankReport,
  createDefaultTextElement,
  createDefaultShapeElement,
  createDefaultTableElement,
  createDefaultChartElement
} from '@report/schema';

interface DesignerState {
  report: ReportDefinition;
  selectedElementIds: string[];
  selectedSectionId: string | null;
  zoom: number;
  gridSizeMm: number;
  snapToGrid: boolean;
  showGuides: boolean;
  showRulers: boolean;
  cursorPos: { xMm: number; yMm: number };
  viewMode: 'design' | 'preview';
  systemFonts: string[];
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  activeTool: string | null;
}

interface DesignerContextType extends DesignerState {
  setReport: (report: ReportDefinition) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setSelectedSectionId: (id: string | null) => void;
  setZoom: (zoom: number | ((prev: number) => number)) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSizeMm: (size: number) => void;
  setShowGuides: (show: boolean) => void;
  setShowRulers: (show: boolean) => void;
  setCursorPos: (pos: { xMm: number; yMm: number }) => void;
  setViewMode: (mode: 'design' | 'preview') => void;
  setActiveTool: (tool: string | null) => void;
  updateReport: (updater: (prev: ReportDefinition) => ReportDefinition, description?: string) => void;
  addElement: (sectionId: string, element: ReportElement) => void;
  updateElement: (elementId: string, partial: Partial<ReportElement>) => void;
  updateSection: (sectionId: string, partial: Partial<SectionDefinition>) => void;
  deleteSelectedElements: () => void;
  duplicateSelectedElements: () => void;
  moveSelectedElements: (dxMm: number, dyMm: number) => void;
  rotateSelectedElements: (rotation: number) => void;
  reorderElement: (elementId: string, action: 'front' | 'back' | 'forward' | 'backward') => void;
  alignSelectedElements: (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeSelectedElements: (axis: 'horizontal' | 'vertical') => void;
  undo: () => void;
  redo: () => void;
  newReport: () => void;
  loadTemplate: (template: ReportDefinition) => void;
}

const DesignerContext = createContext<DesignerContextType | null>(null);

const FALLBACK_FONTS = [
  'Arial',
  'Arial Black',
  'Calibri',
  'Cambria',
  'Comic Sans MS',
  'Consolas',
  'Courier New',
  'Georgia',
  'Helvetica',
  'Impact',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'Vazirmatn',
  'B Nazanin',
  'B Yekan',
  'IRANSans'
];

export const DesignerProvider: React.FC<{
  initialReport?: ReportDefinition;
  children: React.ReactNode;
}> = ({ initialReport, children }) => {
  const [report, setReportState] = useState<ReportDefinition>(() => initialReport || createBlankReport());
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [gridSizeMm, setGridSizeMm] = useState<number>(5);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [showRulers, setShowRulers] = useState<boolean>(true);
  const [cursorPos, setCursorPos] = useState<{ xMm: number; yMm: number }>({ xMm: 0, yMm: 0 });
  const [viewMode, setViewMode] = useState<'design' | 'preview'>('design');
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [systemFonts, setSystemFonts] = useState<string[]>(FALLBACK_FONTS);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Command History (Undo / Redo)
  const [history, setHistory] = useState<ReportDefinition[]>([]);
  const [redoStack, setRedoStack] = useState<ReportDefinition[]>([]);

  // Load OS system fonts from Electron IPC if available
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.getSystemFonts) {
      (window as any).electronAPI.getSystemFonts().then((fonts: string[]) => {
        if (fonts && fonts.length > 0) {
          setSystemFonts(fonts);
        }
      });
    }
  }, []);

  const updateReport = useCallback(
    (updater: (prev: ReportDefinition) => ReportDefinition, _description = 'Edit') => {
      setReportState(prev => {
        const next = updater(prev);
        setHistory(h => [...h.slice(-30), prev]);
        setRedoStack([]);
        setIsDirty(true);
        return next;
      });
    },
    []
  );

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1]!;
    setHistory(h => h.slice(0, h.length - 1));
    setRedoStack(r => [...r, report]);
    setReportState(prev);
  }, [history, report]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1]!;
    setRedoStack(r => r.slice(0, r.length - 1));
    setHistory(h => [...h, report]);
    setReportState(next);
  }, [redoStack, report]);

  const addElement = useCallback(
    (sectionId: string, element: ReportElement) => {
      updateReport(prev => {
        const nextSections = prev.sections.map(sec => {
          if (sec.id === sectionId) {
            return {
              ...sec,
              elements: [...sec.elements, element]
            };
          }
          return sec;
        });

        return { ...prev, sections: nextSections };
      }, 'Add Element');
      setSelectedElementIds([element.id]);
    },
    [updateReport]
  );

  const updateElement = useCallback(
    (elementId: string, partial: Partial<ReportElement>) => {
      updateReport(prev => {
        const nextSections = prev.sections.map(sec => {
          const hasElem = sec.elements.some(e => e.id === elementId);
          if (!hasElem) return sec;

          const nextElements = sec.elements.map(e => {
            if (e.id === elementId) {
              return { ...e, ...partial } as ReportElement;
            }
            return e;
          });

          return { ...sec, elements: nextElements };
        });

        return { ...prev, sections: nextSections };
      }, 'Update Element');
    },
    [updateReport]
  );

  const updateSection = useCallback(
    (sectionId: string, partial: Partial<SectionDefinition>) => {
      updateReport(prev => {
        const nextSections = prev.sections.map(sec => {
          if (sec.id === sectionId) {
            return { ...sec, ...partial };
          }
          return sec;
        });

        return { ...prev, sections: nextSections };
      }, 'Update Section');
    },
    [updateReport]
  );

  const deleteSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    updateReport(prev => {
      const nextSections = prev.sections.map(sec => ({
        ...sec,
        elements: sec.elements.filter(e => !selectedElementIds.includes(e.id))
      }));
      return { ...prev, sections: nextSections };
    }, 'Delete Element');
    setSelectedElementIds([]);
  }, [selectedElementIds, updateReport]);

  const duplicateSelectedElements = useCallback(() => {
    if (selectedElementIds.length === 0) return;
    const newIds: string[] = [];
    updateReport(prev => {
      const nextSections = prev.sections.map(sec => {
        const duplicated: ReportElement[] = [];
        for (const e of sec.elements) {
          if (selectedElementIds.includes(e.id)) {
            const newId = `elem-${Math.random().toString(36).substring(2, 9)}`;
            newIds.push(newId);
            duplicated.push({
              ...e,
              id: newId,
              name: e.name ? `${e.name} (Copy)` : 'Copy',
              x: e.x + 5,
              y: e.y + 5
            } as ReportElement);
          }
        }
        return {
          ...sec,
          elements: [...sec.elements, ...duplicated]
        };
      });
      return { ...prev, sections: nextSections };
    }, 'Duplicate Element');
    setSelectedElementIds(newIds);
  }, [selectedElementIds, updateReport]);

  const moveSelectedElements = useCallback(
    (dxMm: number, dyMm: number) => {
      if (selectedElementIds.length === 0) return;
      updateReport(prev => {
        const nextSections = prev.sections.map(sec => ({
          ...sec,
          elements: sec.elements.map(e => {
            if (selectedElementIds.includes(e.id)) {
              return {
                ...e,
                x: Math.max(0, Math.round((e.x + dxMm) * 10) / 10),
                y: Math.max(0, Math.round((e.y + dyMm) * 10) / 10)
              } as ReportElement;
            }
            return e;
          })
        }));
        return { ...prev, sections: nextSections };
      }, 'Move Element');
    },
    [selectedElementIds, updateReport]
  );

  const rotateSelectedElements = useCallback(
    (rotation: number) => {
      if (selectedElementIds.length === 0) return;
      updateReport(prev => {
        const nextSections = prev.sections.map(sec => ({
          ...sec,
          elements: sec.elements.map(e => {
            if (selectedElementIds.includes(e.id)) {
              return { ...e, rotation: Math.round(rotation) } as ReportElement;
            }
            return e;
          })
        }));
        return { ...prev, sections: nextSections };
      }, 'Rotate Element');
    },
    [selectedElementIds, updateReport]
  );

  const reorderElement = useCallback(
    (elementId: string, action: 'front' | 'back' | 'forward' | 'backward') => {
      updateReport(prev => {
        const nextSections = prev.sections.map(sec => {
          const idx = sec.elements.findIndex(e => e.id === elementId);
          if (idx === -1) return sec;

          const elements = [...sec.elements];
          const elem = elements.splice(idx, 1)[0]!;

          if (action === 'front') {
            elements.push(elem);
          } else if (action === 'back') {
            elements.unshift(elem);
          } else if (action === 'forward') {
            const nextIdx = Math.min(elements.length, idx + 1);
            elements.splice(nextIdx, 0, elem);
          } else if (action === 'backward') {
            const nextIdx = Math.max(0, idx - 1);
            elements.splice(nextIdx, 0, elem);
          }

          return { ...sec, elements };
        });
        return { ...prev, sections: nextSections };
      }, 'Reorder Element');
    },
    [updateReport]
  );

  const alignSelectedElements = useCallback(
    (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
      if (selectedElementIds.length === 0) return;
      updateReport(prev => {
        const margins = prev.page.margins;
        const isLandscape = prev.page.orientation === 'landscape';
        const pageWidthMm = isLandscape ? Math.max(prev.page.width, prev.page.height) : prev.page.width;
        const printableLeft = margins.left;
        const printableRight = pageWidthMm - margins.right;
        const printableWidth = printableRight - printableLeft;

        // Single-element alignment: align relative to printable margins and section height
        if (selectedElementIds.length === 1) {
          const targetId = selectedElementIds[0];
          const nextSections = prev.sections.map(sec => ({
            ...sec,
            elements: sec.elements.map(e => {
              if (e.id !== targetId) return e;
              switch (type) {
                case 'left':
                  return { ...e, x: printableLeft };
                case 'right':
                  return { ...e, x: Math.max(printableLeft, printableRight - e.width) };
                case 'center':
                  return { ...e, x: Math.round((printableLeft + (printableWidth - e.width) / 2) * 10) / 10 };
                case 'top':
                  return { ...e, y: 0 };
                case 'bottom':
                  return { ...e, y: Math.max(0, sec.height - e.height) };
                case 'middle':
                  return { ...e, y: Math.round(Math.max(0, (sec.height - e.height) / 2) * 10) / 10 };
                default:
                  return e;
              }
            })
          }));
          return { ...prev, sections: nextSections };
        }

        // Multi-element alignment relative to selection bounding box
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        // Find bounding box
        for (const sec of prev.sections) {
          for (const e of sec.elements) {
            if (selectedElementIds.includes(e.id)) {
              if (e.x < minX) minX = e.x;
              if (e.x + e.width > maxX) maxX = e.x + e.width;
              if (e.y < minY) minY = e.y;
              if (e.y + e.height > maxY) maxY = e.y + e.height;
            }
          }
        }

        const nextSections = prev.sections.map(sec => ({
          ...sec,
          elements: sec.elements.map(e => {
            if (!selectedElementIds.includes(e.id)) return e;
            switch (type) {
              case 'left':
                return { ...e, x: minX };
              case 'right':
                return { ...e, x: maxX - e.width };
              case 'center':
                return { ...e, x: Math.round((minX + (maxX - minX - e.width) / 2) * 10) / 10 };
              case 'top':
                return { ...e, y: minY };
              case 'bottom':
                return { ...e, y: maxY - e.height };
              case 'middle':
                return { ...e, y: Math.round((minY + (maxY - minY - e.height) / 2) * 10) / 10 };
              default:
                return e;
            }
          })
        }));

        return { ...prev, sections: nextSections };
      }, 'Align Elements');
    },
    [selectedElementIds, updateReport]
  );

  const distributeSelectedElements = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      if (selectedElementIds.length < 3) return;
      updateReport(prev => {
        const elems: { element: ReportElement; secId: string }[] = [];
        for (const sec of prev.sections) {
          for (const e of sec.elements) {
            if (selectedElementIds.includes(e.id)) {
              elems.push({ element: e, secId: sec.id });
            }
          }
        }

        if (axis === 'horizontal') {
          elems.sort((a, b) => a.element.x - b.element.x);
          const first = elems[0]!.element;
          const last = elems[elems.length - 1]!.element;
          const totalDist = last.x - (first.x + first.width);
          const totalElemWidths = elems.slice(1, -1).reduce((acc, el) => acc + el.element.width, 0);
          const gap = (totalDist - totalElemWidths) / (elems.length - 1);

          let currentX = first.x + first.width + gap;
          for (let i = 1; i < elems.length - 1; i++) {
            elems[i]!.element.x = Math.round(currentX * 10) / 10;
            currentX += elems[i]!.element.width + gap;
          }
        }

        return { ...prev };
      }, 'Distribute Elements');
    },
    [selectedElementIds, updateReport]
  );

  const newReport = useCallback(() => {
    const blank = createBlankReport('New Report');
    setReportState(blank);
    setHistory([]);
    setRedoStack([]);
    setSelectedElementIds([]);
    setIsDirty(false);
  }, []);

  const loadTemplate = useCallback((template: ReportDefinition) => {
    setReportState(template);
    setHistory([]);
    setRedoStack([]);
    setSelectedElementIds([]);
    setIsDirty(false);
  }, []);

  // Keyboard shortcut listener (Ctrl/Cmd+Z, Ctrl/Cmd+Y, Delete, Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelectedElements();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelectedElements();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        switch (e.key) {
          case 'ArrowUp':
            moveSelectedElements(0, -step);
            break;
          case 'ArrowDown':
            moveSelectedElements(0, step);
            break;
          case 'ArrowLeft':
            moveSelectedElements(-step, 0);
            break;
          case 'ArrowRight':
            moveSelectedElements(step, 0);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, duplicateSelectedElements, deleteSelectedElements, moveSelectedElements]);

  return (
    <DesignerContext.Provider
      value={{
        report,
        selectedElementIds,
        selectedSectionId,
        zoom,
        gridSizeMm,
        snapToGrid,
        showGuides,
        showRulers,
        cursorPos,
        viewMode,
        systemFonts,
        canUndo: history.length > 0,
        canRedo: redoStack.length > 0,
        isDirty,
        activeTool,
        setReport: setReportState,
        setSelectedElementIds,
        setSelectedSectionId,
        setZoom,
        setSnapToGrid,
        setGridSizeMm,
        setShowGuides,
        setShowRulers,
        setCursorPos,
        setViewMode,
        setActiveTool,
        updateReport,
        addElement,
        updateElement,
        updateSection,
        deleteSelectedElements,
        duplicateSelectedElements,
        moveSelectedElements,
        rotateSelectedElements,
        reorderElement,
        alignSelectedElements,
        distributeSelectedElements,
        undo,
        redo,
        newReport,
        loadTemplate
      }}
    >
      {children}
    </DesignerContext.Provider>
  );
};

export function useDesigner() {
  const ctx = useContext(DesignerContext);
  if (!ctx) {
    throw new Error('useDesigner must be used within DesignerProvider');
  }
  return ctx;
}
