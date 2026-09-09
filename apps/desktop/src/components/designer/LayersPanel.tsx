'use client';

import React, { useState, useMemo } from 'react';
import { useDesigner } from './DesignerContext';
import { Layers, Database, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { DataExplorerPanel } from './DataExplorerPanel';
import { discoverReportDataSchema } from '@report/engine';

export const LayersPanel: React.FC<{ onOpenDataSources?: () => void }> = ({
  onOpenDataSources = () => {}
}) => {
  const {
    report,
    selectedElementIds,
    setSelectedElementIds,
    selectedSectionId,
    setSelectedSectionId,
    updateElement
  } = useDesigner();

  const [activeTab, setActiveTab] = useState<'layers' | 'data'>('data');

  const schema = useMemo(() => {
    return discoverReportDataSchema(report.dataSources, report.parameters, report.variables);
  }, [report.dataSources, report.parameters, report.variables]);

  const totalFields = schema.fields.length + schema.collections.length;

  return (
    <div className="w-64 bg-studio-900 border-r border-studio-800 flex flex-col select-none text-studio-200">
      {/* Top Sidebar Tab Switcher */}
      <div className="flex border-b border-studio-800 bg-studio-950/80 p-1 gap-1">
        <button
          onClick={() => setActiveTab('data')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition ${
            activeTab === 'data'
              ? 'bg-studio-800 text-blue-400 font-semibold shadow-xs border border-studio-700/60'
              : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
          }`}
          title="Browse and bind data source fields"
        >
          <Database size={12} className={activeTab === 'data' ? 'text-blue-400' : 'text-studio-500'} />
          <span>Data Fields</span>
          {totalFields > 0 && (
            <span
              className={`text-[9px] px-1 py-0.2 rounded-full font-mono font-bold ${
                activeTab === 'data' ? 'bg-blue-600 text-white' : 'bg-studio-800 text-studio-400'
              }`}
            >
              {totalFields}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition ${
            activeTab === 'layers'
              ? 'bg-studio-800 text-white font-semibold shadow-xs border border-studio-700/60'
              : 'text-studio-400 hover:text-studio-200 hover:bg-studio-900'
          }`}
          title="Report section and element hierarchy"
        >
          <Layers size={12} className={activeTab === 'layers' ? 'text-blue-400' : 'text-studio-500'} />
          <span>Report Tree</span>
        </button>
      </div>

      {activeTab === 'data' ? (
        <DataExplorerPanel onOpenDataSources={onOpenDataSources} />
      ) : (
      <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
        {report.sections.map(section => {
          const isSecSelected = selectedSectionId === section.id;

          return (
            <div key={section.id} className="space-y-1">
              <div
                onClick={() => {
                  setSelectedSectionId(section.id);
                  setSelectedElementIds([]);
                }}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition font-medium ${
                  isSecSelected
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-studio-300 hover:bg-studio-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 truncate">
                  <ChevronRight size={12} />
                  <span>{section.name}</span>
                </div>
                <span className="text-[10px] opacity-70">({section.elements.length})</span>
              </div>

              {/* Elements in this section */}
              <div className="pl-4 space-y-0.5">
                {section.elements.map(elem => {
                  const isElemSelected = selectedElementIds.includes(elem.id);

                  return (
                    <div
                      key={elem.id}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedSectionId(section.id);
                        if (e.shiftKey) {
                          setSelectedElementIds(
                            isElemSelected
                              ? selectedElementIds.filter(id => id !== elem.id)
                              : [...selectedElementIds, elem.id]
                          );
                        } else {
                          setSelectedElementIds([elem.id]);
                        }
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer text-[11px] transition ${
                        isElemSelected
                          ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/40'
                          : 'text-studio-400 hover:bg-studio-800/60 hover:text-studio-200'
                      }`}
                    >
                      <span className="truncate">{elem.name || elem.type}</span>
                      <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            updateElement(elem.id, { hidden: !elem.hidden });
                          }}
                          className="hover:text-white"
                        >
                          {elem.hidden ? <EyeOff size={11} /> : <Eye size={11} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
