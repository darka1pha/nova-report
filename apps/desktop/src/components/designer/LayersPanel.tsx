'use client';

import React from 'react';
import { useDesigner } from './DesignerContext';
import { Layers, Eye, EyeOff, Lock, Unlock, ChevronRight } from 'lucide-react';

export const LayersPanel: React.FC = () => {
  const {
    report,
    selectedElementIds,
    setSelectedElementIds,
    selectedSectionId,
    setSelectedSectionId,
    updateElement
  } = useDesigner();

  return (
    <div className="w-56 bg-studio-900 border-r border-studio-800 flex flex-col select-none text-studio-200">
      <div className="p-3 border-b border-studio-800 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-studio-400 flex items-center gap-1.5">
          <Layers size={13} />
          Report Tree
        </span>
      </div>

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
    </div>
  );
};
