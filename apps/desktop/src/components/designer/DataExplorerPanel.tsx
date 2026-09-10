'use client';

import React, { useState, useMemo } from 'react';
import { useDesigner } from './DesignerContext';
import {
  discoverReportDataSchema,
  type DiscoveredField,
  type DiscoveredCollection,
  createDefaultTextElement,
  createDefaultTableElement,
  createDefaultChartElement,
  type TableElement
} from '@report/engine';
import {
  Database,
  Search,
  Plus,
  Table as TableIcon,
  BarChart3,
  Type,
  Hash,
  Calendar,
  Layers,
  ChevronDown,
  ChevronRight,
  Sparkles,
  GripVertical
} from 'lucide-react';

export const DataExplorerPanel: React.FC<{ onOpenDataSources: () => void }> = ({
  onOpenDataSources
}) => {
  const {
    report,
    selectedSectionId,
    selectedElementIds,
    updateElement,
    addElement
  } = useDesigner();

  const [search, setSearch] = useState('');
  const [collapsedSources, setCollapsedSources] = useState<Record<string, boolean>>({});

  const schema = useMemo(() => {
    return discoverReportDataSchema(report.dataSources, report.parameters, report.variables);
  }, [report.dataSources, report.parameters, report.variables]);

  const targetSectionId =
    selectedSectionId ||
    report.sections.find(s => s.type === 'detail')?.id ||
    report.sections[0]?.id ||
    'sec-detail';

  const toggleCollapse = (sourceName: string) => {
    setCollapsedSources(prev => ({ ...prev, [sourceName]: !prev[sourceName] }));
  };

  // Filtered fields
  const filteredFields = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return schema.fields;
    return schema.fields.filter(
      f =>
        f.path.toLowerCase().includes(q) ||
        f.name.toLowerCase().includes(q) ||
        f.source.toLowerCase().includes(q) ||
        f.formattedSample.toLowerCase().includes(q)
    );
  }, [schema.fields, search]);

  // Group fields by Data Source
  const fieldsBySource = useMemo(() => {
    const map = new Map<string, DiscoveredField[]>();
    for (const f of filteredFields) {
      const list = map.get(f.source) || [];
      list.push(f);
      map.set(f.source, list);
    }
    return map;
  }, [filteredFields]);

  // Handle clicking a field
  const handleFieldClick = (field: DiscoveredField) => {
    // Only bind into selected element if it is a placeholder or barcode/qr without value
    if (selectedElementIds.length === 1) {
      const targetId = selectedElementIds[0]!;
      for (const sec of report.sections) {
        const el = sec.elements.find(e => e.id === targetId);
        if (el) {
          if (el.type === 'text') {
            const currentText = (el as any).text || '';
            // Only overwrite if it is a default placeholder or empty
            if (!currentText || currentText === 'New Text') {
              updateElement(el.id, { text: field.expression } as any);
              return;
            }
          } else if (el.type === 'barcode' || el.type === 'qrcode') {
            updateElement(el.id, { value: field.expression } as any);
            return;
          }
        }
      }
    }

    // Otherwise add as new Text Element
    handleAddFieldAsText(field);
  };

  // Add field as text element on canvas
  const handleAddFieldAsText = (field: DiscoveredField) => {
    const sec = report.sections.find(s => s.id === targetSectionId);
    let startY = 5;
    if (sec && sec.elements.length > 0) {
      const maxBottom = Math.max(...sec.elements.map(e => e.y + e.height));
      if (maxBottom + 10 <= sec.height) {
        startY = Math.round((maxBottom + 2) * 10) / 10;
      }
    }

    const newElem = createDefaultTextElement({
      name: `${field.name} Label`,
      text: `${field.name}: ${field.expression}`,
      width: 70,
      height: 8,
      x: report.page.margins.left,
      y: startY
    });
    addElement(targetSectionId, newElem);
  };

  // Add collection as pre-populated Table
  const handleCreateCollectionTable = (col: DiscoveredCollection) => {
    const columns = col.itemFields.map((itf, idx) => ({
      id: `col-${idx + 1}`,
      width: Math.max(25, Math.floor(180 / Math.max(1, col.itemFields.length)))
    }));

    const headerCells = col.itemFields.map(itf => ({
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

    const bodyCells = col.itemFields.map(itf => ({
      id: `bc-${itf.key}`,
      text: itf.expression,
      style: {
        textAlign: itf.type === 'number' ? 'right' : 'left',
        padding: { top: 1.5, right: 4, bottom: 1.5, left: 4 },
        borders: { bottom: { style: 'solid', width: 0.2, color: '#e2e8f0' } }
      }
    }));

    const newTable: TableElement = {
      id: `elem-table-${Math.random().toString(36).substring(2, 9)}`,
      name: `${col.name} Table`,
      type: 'table',
      x: report.page.margins.left,
      y: 5,
      width: 180,
      height: 40,
      dataSource: col.path,
      repeatHeaderOnEveryPage: true,
      columns,
      headerRows: [
        {
          id: `hdr-${col.name}`,
          height: 8,
          isHeader: true,
          cells: headerCells as any
        }
      ],
      bodyRows: [
        {
          id: `body-${col.name}`,
          height: 7.5,
          cells: bodyCells as any
        }
      ]
    };

    addElement(targetSectionId, newTable);
  };

  // Add collection as pre-configured Chart
  const handleCreateCollectionChart = (col: DiscoveredCollection) => {
    const stringField = col.itemFields.find(f => f.type === 'string' || f.type === 'date')?.key || 'label';
    const numberField = col.itemFields.find(f => f.type === 'number')?.key || 'value';

    const newChart = createDefaultChartElement({
      name: `${col.name} Chart`,
      title: `${col.name.toUpperCase()} PERFORMANCE`,
      chartType: 'bar',
      dataSource: col.path,
      categoryField: stringField,
      valueField: numberField,
      x: report.page.margins.left,
      y: 5,
      width: 120,
      height: 60
    });

    addElement(targetSectionId, newChart);
  };

  const renderTypeIcon = (type: string) => {
    switch (type) {
      case 'number':
        return <Hash size={11} className="text-amber-400" />;
      case 'date':
        return <Calendar size={11} className="text-emerald-400" />;
      case 'array':
        return <Layers size={11} className="text-purple-400" />;
      default:
        return <Type size={11} className="text-blue-400" />;
    }
  };

  // HTML5 Drag Start Handler
  const handleDragStartField = (e: React.DragEvent, field: DiscoveredField) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'data-field',
        field
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartCollection = (e: React.DragEvent, col: DiscoveredCollection) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'data-collection',
        collection: col
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden text-studio-200 select-none">
      {/* Search and Manage Button */}
      <div className="p-2 border-b border-studio-800 space-y-2 bg-studio-950/40">
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-2 text-studio-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search data fields..."
            className="w-full bg-studio-950 border border-studio-800 rounded px-2 pl-7 py-1 text-xs text-studio-100 placeholder-studio-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>
        <button
          onClick={onOpenDataSources}
          className="w-full flex items-center justify-center gap-1.5 px-2 py-1 bg-studio-800 hover:bg-studio-700 text-studio-300 hover:text-white rounded text-[11px] font-medium transition"
        >
          <Database size={11} className="text-blue-400" />
          <span>Configure Data Sources</span>
        </button>
      </div>

      {/* Fields List View */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 text-xs">
        {schema.fields.length === 0 && schema.collections.length === 0 ? (
          <div className="py-8 text-center px-4 space-y-2">
            <div className="w-10 h-10 rounded-full bg-studio-950 flex items-center justify-center mx-auto text-studio-600 border border-studio-800">
              <Database size={18} />
            </div>
            <p className="text-xs text-studio-400 font-medium">No Data Sources Connected</p>
            <p className="text-[11px] text-studio-500">
              Connect JSON or mock data to enable one-click drag-and-drop report bindings.
            </p>
            <button
              onClick={onOpenDataSources}
              className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow transition"
            >
              Add Data Source
            </button>
          </div>
        ) : (
          <>
            {/* 1. Collections & Tables Section */}
            {schema.collections.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-studio-400 tracking-wider px-1">
                  <Layers size={11} className="text-purple-400" />
                  <span>Collections & Arrays</span>
                </div>
                {schema.collections.map(col => (
                  <div
                    key={col.path}
                    draggable
                    onDragStart={e => handleDragStartCollection(e, col)}
                    className="p-2 bg-studio-950/70 border border-studio-800 hover:border-purple-500/40 rounded-lg space-y-2 group transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <GripVertical size={11} className="text-studio-600 group-hover:text-studio-400 cursor-grab" />
                        <span className="font-mono text-xs text-purple-300 font-semibold truncate">
                          {col.path}
                        </span>
                      </div>
                      <span className="text-[9px] bg-studio-900 border border-studio-800 px-1 rounded text-studio-400 shrink-0">
                        {col.itemCount} items
                      </span>
                    </div>

                    {/* Quick creation buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCreateCollectionTable(col)}
                        className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-medium transition"
                        title="Auto-create a populated Table with all fields"
                      >
                        <TableIcon size={11} />
                        <span>+ Table</span>
                      </button>
                      <button
                        onClick={() => handleCreateCollectionChart(col)}
                        className="flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-[10px] font-medium transition"
                        title="Auto-create a Bar Chart from this collection"
                      >
                        <BarChart3 size={11} />
                        <span>+ Chart</span>
                      </button>
                    </div>

                    {/* Item Fields summary */}
                    <div className="text-[10px] text-studio-500 truncate">
                      Fields: {col.itemFields.map(f => f.key).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. Scalar Data Fields Section */}
            {Array.from(fieldsBySource.entries()).map(([source, fields]) => {
              const isCollapsed = collapsedSources[source] || false;

              return (
                <div key={source} className="space-y-1">
                  <div
                    onClick={() => toggleCollapse(source)}
                    className="flex items-center justify-between px-1 py-1 rounded hover:bg-studio-800/60 cursor-pointer text-[10px] font-semibold uppercase text-studio-400 tracking-wider"
                  >
                    <div className="flex items-center gap-1">
                      {isCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                      <Database size={11} className="text-blue-400" />
                      <span>{source}</span>
                    </div>
                    <span className="text-studio-500 font-normal">({fields.length})</span>
                  </div>

                  {!isCollapsed && (
                    <div className="pl-2 space-y-0.5 border-l border-studio-800/80">
                      {fields.map(field => (
                        <div
                          key={field.path}
                          draggable
                          onDragStart={e => handleDragStartField(e, field)}
                          onClick={() => handleFieldClick(field)}
                          className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-studio-800/80 border border-transparent hover:border-studio-700 cursor-pointer transition"
                          title={`Click to bind into selected element or insert on canvas (${field.expression})`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <GripVertical
                              size={11}
                              className="text-studio-600 group-hover:text-studio-400 cursor-grab shrink-0"
                            />
                            <span className="p-0.5 rounded bg-studio-950 border border-studio-800 shrink-0">
                              {renderTypeIcon(field.type)}
                            </span>
                            <div className="flex flex-col truncate">
                              <span className="font-mono text-xs text-studio-200 group-hover:text-blue-300 truncate">
                                {field.name}
                              </span>
                              <span className="text-[9px] text-studio-500 truncate">{field.path}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] text-studio-400 bg-studio-950 px-1 rounded border border-studio-800/80 max-w-[70px] truncate font-mono">
                              {field.formattedSample}
                            </span>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleAddFieldAsText(field);
                              }}
                              className="p-1 rounded text-studio-500 hover:text-white hover:bg-studio-700 opacity-0 group-hover:opacity-100 transition"
                              title="Add as Text Element on canvas"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-2 border-t border-studio-800 bg-studio-950/60 text-[10px] text-studio-500 flex items-center gap-1.5">
        <Sparkles size={11} className="text-blue-400 shrink-0" />
        <span>Drag fields or click to connect directly to canvas elements.</span>
      </div>
    </div>
  );
};
