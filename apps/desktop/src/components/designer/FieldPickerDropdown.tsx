'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDesigner } from './DesignerContext';
import {
  discoverReportDataSchema,
  type DiscoveredField,
  type DiscoveredItemField,
  type DiscoveredCollection
} from '@report/engine';
import {
  Sparkles,
  Database,
  Search,
  Check,
  ChevronRight,
  Hash,
  Type,
  Calendar,
  Layers,
  FunctionSquare,
  HelpCircle,
  X
} from 'lucide-react';

export interface FieldPickerDropdownProps {
  onSelect: (expression: string, fieldMetadata?: DiscoveredField | DiscoveredItemField) => void;
  /** Optional placeholder or custom trigger label */
  triggerLabel?: string;
  /** Custom trigger styling variant */
  variant?: 'button' | 'compact' | 'hud';
  /** If provided, also includes `item.*` fields for the active table context */
  activeCollectionPath?: string;
}

export const FieldPickerDropdown: React.FC<FieldPickerDropdownProps> = ({
  onSelect,
  triggerLabel = 'Connect Data Field',
  variant = 'button',
  activeCollectionPath
}) => {
  const { report } = useDesigner();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'fields' | 'collections' | 'functions' | 'system'>('fields');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Discover schema from current report definition
  const schema = useMemo(() => {
    return discoverReportDataSchema(report.dataSources, report.parameters, report.variables);
  }, [report.dataSources, report.parameters, report.variables]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filtered fields based on search
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

  // Filtered collections
  const filteredCollections = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return schema.collections;
    return schema.collections.filter(
      c =>
        c.path.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q) ||
        c.itemFields.some(f => f.key.toLowerCase().includes(q))
    );
  }, [schema.collections, search]);

  // Filtered functions
  const filteredFunctions = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return schema.functions;
    return schema.functions.filter(
      fn =>
        fn.name.toLowerCase().includes(q) ||
        fn.description.toLowerCase().includes(q) ||
        fn.example.toLowerCase().includes(q)
    );
  }, [schema.functions, search]);

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

  const handleSelectField = (expr: string, meta?: any) => {
    onSelect(expr, meta);
    setIsOpen(false);
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

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button Variants */}
      {variant === 'hud' ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition shadow-sm ${
            isOpen
              ? 'bg-blue-600 text-white ring-1 ring-blue-400'
              : 'bg-studio-800 hover:bg-studio-700 text-blue-300 hover:text-white border border-studio-700'
          }`}
          title="Connect element to data source field"
        >
          <Sparkles size={11} className="text-blue-400 animate-pulse" />
          <span>Data</span>
        </button>
      ) : variant === 'compact' ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1 rounded text-studio-400 hover:text-white hover:bg-studio-800 transition ${
            isOpen ? 'bg-studio-800 text-blue-400' : ''
          }`}
          title="Pick data field"
        >
          <Sparkles size={13} className="text-blue-400" />
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition border ${
            isOpen
              ? 'bg-blue-950/70 border-blue-500 text-blue-200 ring-1 ring-blue-500/50 shadow-md'
              : 'bg-studio-950 hover:bg-studio-900 border-studio-800 text-studio-300 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Sparkles size={12} className="text-blue-400 shrink-0" />
            <span className="truncate">{triggerLabel}</span>
          </div>
          <span className="text-[10px] text-studio-500 font-mono">▾</span>
        </button>
      )}

      {/* Floating Dropdown Dialog */}
      {isOpen && (
        <div className="absolute left-0 mt-1 w-80 max-h-[420px] bg-studio-900/98 backdrop-blur-md border border-studio-700 rounded-xl shadow-2xl z-50 flex flex-col text-studio-200 select-none overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/40">
          {/* Header & Search */}
          <div className="p-2.5 border-b border-studio-800 space-y-2 bg-studio-950/60">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-studio-300 flex items-center gap-1.5">
                <Database size={12} className="text-blue-400" />
                Select Data Field
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-studio-500 hover:text-white rounded hover:bg-studio-800"
              >
                <X size={12} />
              </button>
            </div>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-2 text-studio-500" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search fields, sample values..."
                className="w-full bg-studio-900 border border-studio-800 rounded-md pl-7 pr-2 py-1 text-xs text-studio-100 placeholder-studio-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1 text-[10px] font-medium pt-0.5">
              <button
                onClick={() => setActiveTab('fields')}
                className={`px-2 py-0.5 rounded transition ${
                  activeTab === 'fields'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-studio-400 hover:bg-studio-800'
                }`}
              >
                Fields ({schema.fields.length})
              </button>
              <button
                onClick={() => setActiveTab('collections')}
                className={`px-2 py-0.5 rounded transition ${
                  activeTab === 'collections'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-studio-400 hover:bg-studio-800'
                }`}
              >
                Arrays ({schema.collections.length})
              </button>
              <button
                onClick={() => setActiveTab('functions')}
                className={`px-2 py-0.5 rounded transition ${
                  activeTab === 'functions'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-studio-400 hover:bg-studio-800'
                }`}
              >
                Helpers
              </button>
              <button
                onClick={() => setActiveTab('system')}
                className={`px-2 py-0.5 rounded transition ${
                  activeTab === 'system'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-studio-400 hover:bg-studio-800'
                }`}
              >
                System
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-2 space-y-3 text-xs max-h-[290px]">
            {/* 1. Fields Tab */}
            {activeTab === 'fields' && (
              <>
                {filteredFields.length === 0 ? (
                  <div className="py-6 text-center text-studio-500 text-xs">
                    No matching fields found. Add data in Data Sources.
                  </div>
                ) : (
                  Array.from(fieldsBySource.entries()).map(([source, fields]) => (
                    <div key={source} className="space-y-1">
                      <div className="flex items-center gap-1 px-1 text-[10px] font-semibold text-studio-400 uppercase tracking-wider">
                        <Database size={10} className="text-blue-400" />
                        <span>{source}</span>
                      </div>
                      <div className="space-y-0.5">
                        {fields.map(f => (
                          <div
                            key={f.path}
                            onClick={() => handleSelectField(f.expression, f)}
                            className="group flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-blue-600/20 hover:border-blue-500/40 border border-transparent cursor-pointer transition"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="p-0.5 rounded bg-studio-950/80 border border-studio-800 shrink-0">
                                {renderTypeIcon(f.type)}
                              </span>
                              <div className="flex flex-col truncate">
                                <span className="font-mono text-xs text-studio-200 group-hover:text-blue-200 truncate">
                                  {f.name}
                                </span>
                                <span className="text-[10px] text-studio-500 truncate">{f.path}</span>
                              </div>
                            </div>
                            <span className="text-[10px] text-studio-400 bg-studio-950 px-1.5 py-0.5 rounded border border-studio-800/80 truncate max-w-[100px] shrink-0 font-mono">
                              {f.formattedSample}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* 2. Collections / Array Tab */}
            {activeTab === 'collections' && (
              <div className="space-y-2">
                {filteredCollections.length === 0 ? (
                  <div className="py-6 text-center text-studio-500 text-xs">No array collections found.</div>
                ) : (
                  filteredCollections.map(col => (
                    <div
                      key={col.path}
                      className="bg-studio-950/60 border border-studio-800 rounded-lg p-2 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => handleSelectField(col.path)}
                          className="flex items-center gap-1.5 font-semibold text-xs text-blue-300 hover:text-white cursor-pointer"
                        >
                          <Layers size={13} className="text-purple-400" />
                          <span>{col.path}</span>
                          <span className="text-[10px] font-normal text-studio-500">
                            ({col.itemCount} items)
                          </span>
                        </div>
                      </div>

                      {/* Item properties in this collection */}
                      <div className="pl-2 border-l border-studio-800 space-y-1 pt-1">
                        <div className="text-[10px] text-studio-500 font-medium">Item Fields:</div>
                        <div className="grid grid-cols-2 gap-1">
                          {col.itemFields.map(itf => (
                            <button
                              key={itf.key}
                              onClick={() => handleSelectField(itf.expression, itf)}
                              className="flex items-center justify-between px-1.5 py-1 rounded bg-studio-900 hover:bg-studio-800 border border-studio-800 text-[11px] text-left group transition"
                              title={`Insert ${itf.expression} (e.g. ${itf.formattedSample})`}
                            >
                              <span className="font-mono text-studio-300 group-hover:text-white truncate">
                                {itf.key}
                              </span>
                              {renderTypeIcon(itf.type)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. Functions Tab */}
            {activeTab === 'functions' && (
              <div className="space-y-1">
                {filteredFunctions.map(fn => (
                  <div
                    key={fn.name}
                    onClick={() => handleSelectField(fn.example)}
                    className="p-2 rounded-md hover:bg-studio-800/80 border border-transparent hover:border-studio-700 cursor-pointer transition space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-amber-300 font-semibold">{fn.name}</span>
                      <span className="text-[10px] text-studio-500 font-mono">{fn.signature}</span>
                    </div>
                    <div className="text-[11px] text-studio-400">{fn.description}</div>
                    <div className="text-[10px] font-mono text-blue-400 bg-studio-950 px-1.5 py-0.5 rounded inline-block">
                      {fn.example}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 4. System Tab */}
            {activeTab === 'system' && (
              <div className="space-y-1">
                {schema.systemFields.map(sys => (
                  <div
                    key={sys.path}
                    onClick={() => handleSelectField(sys.expression, sys)}
                    className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-studio-800 border border-transparent hover:border-studio-700 cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2">
                      <Hash size={12} className="text-emerald-400" />
                      <div>
                        <div className="text-xs text-studio-200 font-medium">{sys.name}</div>
                        <div className="text-[10px] text-studio-500 font-mono">{sys.expression}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-studio-400 bg-studio-950 px-1.5 py-0.5 rounded border border-studio-800">
                      Sample: {sys.sample}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer with Hint */}
          <div className="p-2 border-t border-studio-800 bg-studio-950/80 flex items-center justify-between text-[10px] text-studio-400">
            <span className="flex items-center gap-1">
              <Sparkles size={10} className="text-blue-400" />
              Click any field to insert into element
            </span>
            <span className="font-mono text-studio-500">NovaReport Data</span>
          </div>
        </div>
      )}
    </div>
  );
};
