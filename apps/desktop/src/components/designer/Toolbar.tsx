'use client';

import React, { useState } from 'react';
import { useDesigner } from './DesignerContext';
import {
  FileText,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Layers,
  ZoomIn,
  ZoomOut,
  Play,
  Edit3,
  Download,
  Grid,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  FileCode,
  Database,
  Printer,
  Ruler,
  HelpCircle,
  Keyboard
} from 'lucide-react';
import { exportReport } from '@report/engine';

export const Toolbar: React.FC<{
  onOpenTemplates: () => void;
  onOpenDataSources: () => void;
  onOpenShortcuts: () => void;
}> = ({ onOpenTemplates, onOpenDataSources, onOpenShortcuts }) => {
  const {
    report,
    canUndo,
    canRedo,
    undo,
    redo,
    zoom,
    setZoom,
    viewMode,
    setViewMode,
    snapToGrid,
    setSnapToGrid,
    gridSizeMm,
    setGridSizeMm,
    showRulers,
    setShowRulers,
    selectedElementIds,
    duplicateSelectedElements,
    deleteSelectedElements,
    alignSelectedElements,
    newReport,
    loadTemplate
  } = useDesigner();

  const [exporting, setExporting] = useState(false);

  const handleSave = async () => {
    const jsonStr = JSON.stringify(report, null, 2);
    if (typeof window !== 'undefined' && (window as any).electronAPI?.saveFileDialog) {
      await (window as any).electronAPI.saveFileDialog(`${report.name}.report.json`, jsonStr);
    } else {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name}.report.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleOpen = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.openFileDialog) {
      const res = await (window as any).electronAPI.openFileDialog();
      if (!res.canceled && res.content) {
        try {
          const parsed = JSON.parse(res.content);
          loadTemplate(parsed);
        } catch (e: any) {
          alert(`Failed to open report: ${e.message}`);
        }
      }
    } else {
      // Browser file input fallback
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.report.json';
      input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => {
            try {
              const parsed = JSON.parse(ev.target?.result as string);
              loadTemplate(parsed);
            } catch (err: any) {
              alert(`Invalid JSON report: ${err.message}`);
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    }
  };

  const handleExport = async (format: 'pdf' | 'docx' | 'xlsx' | 'html') => {
    try {
      setExporting(true);
      const bytes = await exportReport({
        report,
        format
      });

      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        html: 'text/html'
      };

      const blob = new Blob([bytes as any], { type: mimeTypes[format] || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.name || 'report'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className="h-12 bg-studio-900 border-b border-studio-800 flex items-center justify-between px-3 text-studio-200 select-none">
      {/* Left Section: App Logo, File Actions & Templates */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 pr-3 border-r border-studio-800">
          <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-sm shadow">
            NR
          </div>
          <span className="font-semibold text-sm tracking-tight text-white hidden sm:inline">NovaReport Studio</span>
        </div>

        <button
          onClick={newReport}
          className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition text-xs flex items-center gap-1"
          title="New Report"
        >
          <FileText size={15} />
          <span className="hidden md:inline">New</span>
        </button>

        <button
          onClick={handleOpen}
          className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition text-xs flex items-center gap-1"
          title="Open Report File"
        >
          <FolderOpen size={15} />
          <span className="hidden md:inline">Open</span>
        </button>

        <button
          onClick={handleSave}
          className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition text-xs flex items-center gap-1"
          title="Save Report JSON"
        >
          <Save size={15} />
          <span className="hidden md:inline">Save</span>
        </button>

        <button
          onClick={onOpenTemplates}
          className="p-1.5 hover:bg-studio-800 text-blue-400 hover:text-blue-300 rounded transition text-xs flex items-center gap-1"
          title="Built-in Report Templates"
        >
          <FileCode size={15} />
          <span className="hidden md:inline">Templates</span>
        </button>
      </div>

      {/* Middle Section: Undo/Redo, Alignments, Zoom */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 border-r border-studio-800">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition ${
              canUndo ? 'text-studio-200 hover:bg-studio-800' : 'text-studio-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition ${
              canRedo ? 'text-studio-200 hover:bg-studio-800' : 'text-studio-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={15} />
          </button>
        </div>

        {selectedElementIds.length > 0 && (
          <div className="flex items-center gap-1 px-2 border-r border-studio-800">
            <button
              onClick={duplicateSelectedElements}
              className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded"
              title="Duplicate (Ctrl+D)"
            >
              <Copy size={15} />
            </button>
            <button
              onClick={deleteSelectedElements}
              className="p-1.5 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded"
              title="Delete (Del)"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}

        {selectedElementIds.length >= 1 && (
          <div className="flex items-center gap-0.5 px-2 border-r border-studio-800">
            <button
              onClick={() => alignSelectedElements('left')}
              className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition"
              title={selectedElementIds.length === 1 ? 'Align to Left Margin' : 'Align Left'}
            >
              <AlignLeft size={13} />
            </button>
            <button
              onClick={() => alignSelectedElements('center')}
              className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition"
              title={selectedElementIds.length === 1 ? 'Center within Printable Margins' : 'Align Center (Horizontal)'}
            >
              <AlignCenter size={13} />
            </button>
            <button
              onClick={() => alignSelectedElements('right')}
              className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition"
              title={selectedElementIds.length === 1 ? 'Align to Right Margin' : 'Align Right'}
            >
              <AlignRight size={13} />
            </button>
            <span className="text-studio-700 mx-0.5">|</span>
            <button
              onClick={() => alignSelectedElements('top')}
              className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition text-[11px] font-mono font-bold"
              title={selectedElementIds.length === 1 ? 'Align to Section Top' : 'Align Top'}
            >
              ↑T
            </button>
            <button
              onClick={() => alignSelectedElements('middle')}
              className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition text-[11px] font-mono font-bold"
              title={selectedElementIds.length === 1 ? 'Center in Section Vertically' : 'Align Middle (Vertical)'}
            >
              ↕M
            </button>
            <button
              onClick={() => alignSelectedElements('bottom')}
              className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded transition text-[11px] font-mono font-bold"
              title={selectedElementIds.length === 1 ? 'Align to Section Bottom' : 'Align Bottom'}
            >
              ↓B
            </button>
          </div>
        )}

        {/* Rulers Toggle */}
        <button
          onClick={() => setShowRulers(!showRulers)}
          className={`p-1.5 rounded text-xs flex items-center gap-1 transition ${
            showRulers ? 'bg-studio-800 text-blue-400 font-medium' : 'text-studio-400 hover:bg-studio-800'
          }`}
          title="Toggle Canvas Rulers & Cursor Tracker"
        >
          <Ruler size={14} />
          <span className="hidden xl:inline">Rulers</span>
        </button>

        {/* Snap to Grid Toggle and Size */}
        <div className="flex items-center gap-1 bg-studio-950 px-1.5 py-0.5 rounded border border-studio-800">
          <button
            onClick={() => setSnapToGrid(!snapToGrid)}
            className={`p-1 rounded text-xs flex items-center gap-1 transition ${
              snapToGrid ? 'text-blue-400 font-medium' : 'text-studio-500 hover:text-white'
            }`}
            title="Toggle Grid Snapping"
          >
            <Grid size={13} />
            <span className="text-[11px]">Snap</span>
          </button>
          <select
            value={gridSizeMm}
            onChange={e => setGridSizeMm(Number(e.target.value))}
            className="bg-transparent text-[10px] text-studio-300 outline-none cursor-pointer"
            title="Grid increment size"
          >
            <option value={2} className="bg-studio-900">2mm</option>
            <option value={5} className="bg-studio-900">5mm</option>
            <option value={10} className="bg-studio-900">10mm</option>
          </select>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-studio-950 px-2 py-1 rounded border border-studio-800 text-xs">
          <button
            onClick={() => setZoom(z => Math.max(0.25, Math.round((z - 0.1) * 10) / 10))}
            className="text-studio-400 hover:text-white p-0.5 rounded"
            title="Zoom Out"
          >
            <ZoomOut size={13} />
          </button>
          <span
            onClick={() => setZoom(1)}
            className="w-10 text-center font-mono cursor-pointer hover:text-blue-400"
            title="Click to reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2.5, Math.round((z + 0.1) * 10) / 10))}
            className="text-studio-400 hover:text-white p-0.5 rounded"
            title="Zoom In"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {/* Right Section: Shortcuts Help, Data Binding, Design/Preview Toggle & Export */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 hover:bg-studio-800 text-studio-400 hover:text-white rounded text-xs flex items-center gap-1 transition"
          title="Keyboard Shortcuts & Gestures"
        >
          <Keyboard size={14} />
          <span className="hidden sm:inline text-[11px]">Shortcuts</span>
        </button>
        <button
          onClick={onOpenDataSources}
          className="p-1.5 hover:bg-studio-800 text-studio-300 hover:text-white rounded text-xs flex items-center gap-1"
          title="Data Sources & Parameters"
        >
          <Database size={15} />
          <span className="hidden sm:inline">Data</span>
        </button>

        {/* Design / Live Preview toggle */}
        <div className="bg-studio-950 p-0.5 rounded border border-studio-800 flex items-center">
          <button
            onClick={() => setViewMode('design')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
              viewMode === 'design'
                ? 'bg-blue-600 text-white shadow'
                : 'text-studio-400 hover:text-white'
            }`}
          >
            <Edit3 size={13} />
            Design
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 ${
              viewMode === 'preview'
                ? 'bg-green-600 text-white shadow'
                : 'text-studio-400 hover:text-white'
            }`}
          >
            <Play size={13} />
            Preview
          </button>
        </div>

        {/* Quick Export Dropdown */}
        <div className="relative group">
          <button
            disabled={exporting}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 shadow transition"
          >
            <Download size={14} />
            <span>{exporting ? 'Exporting...' : 'Export'}</span>
          </button>
          <div className="absolute right-0 top-full mt-1 w-36 bg-studio-800 border border-studio-700 rounded shadow-xl py-1 z-50 hidden group-hover:block">
            <button
              onClick={() => handleExport('pdf')}
              className="w-full text-left px-3 py-1.5 text-xs text-studio-200 hover:bg-studio-700 hover:text-white flex items-center gap-2"
            >
              📄 PDF Document
            </button>
            <button
              onClick={() => handleExport('docx')}
              className="w-full text-left px-3 py-1.5 text-xs text-studio-200 hover:bg-studio-700 hover:text-white flex items-center gap-2"
            >
              📝 Word (.docx)
            </button>
            <button
              onClick={() => handleExport('xlsx')}
              className="w-full text-left px-3 py-1.5 text-xs text-studio-200 hover:bg-studio-700 hover:text-white flex items-center gap-2"
            >
              📊 Excel (.xlsx)
            </button>
            <button
              onClick={() => handleExport('html')}
              className="w-full text-left px-3 py-1.5 text-xs text-studio-200 hover:bg-studio-700 hover:text-white flex items-center gap-2"
            >
              🌐 HTML Web Page
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
