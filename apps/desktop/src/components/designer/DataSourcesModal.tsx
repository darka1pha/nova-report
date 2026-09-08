'use client';

import React, { useState } from 'react';
import { useDesigner } from './DesignerContext';
import { X, Database, Plus, Trash2, Check } from 'lucide-react';

export const DataSourcesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { report, updateReport } = useDesigner();
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!isOpen) return null;

  const dataSources = report.dataSources || [];
  const currentDs = dataSources[selectedIdx];

  const handleJsonChange = (jsonStr: string) => {
    try {
      const parsed = JSON.parse(jsonStr);
      updateReport(prev => {
        const nextDs = [...prev.dataSources];
        if (nextDs[selectedIdx]) {
          nextDs[selectedIdx] = { ...nextDs[selectedIdx], data: parsed };
        }
        return { ...prev, dataSources: nextDs };
      });
    } catch {
      // ignore parse errors while user is actively typing
    }
  };

  const handleAddDataSource = () => {
    const newDsName = `ds_${Math.random().toString(36).substring(2, 6)}`;
    updateReport(prev => ({
      ...prev,
      dataSources: [
        ...prev.dataSources,
        {
          name: newDsName,
          type: 'json',
          data: { title: 'Sample Data', items: [{ id: 1, name: 'Sample Item', price: 100 }] }
        }
      ]
    }));
    setSelectedIdx(dataSources.length);
  };

  const handleDeleteDataSource = (idx: number) => {
    updateReport(prev => ({
      ...prev,
      dataSources: prev.dataSources.filter((_, i) => i !== idx)
    }));
    setSelectedIdx(0);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col h-[75vh]">
        <div className="p-4 border-b border-studio-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-blue-400" />
            <h3 className="font-semibold text-white text-base">Data Sources & Mock Data</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-studio-400 hover:text-white hover:bg-studio-800">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Data Sources List */}
          <div className="w-56 bg-studio-950 border-r border-studio-800 p-2 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase text-studio-500 px-2">Data Sources</span>
              {dataSources.map((ds, idx) => (
                <div
                  key={ds.name}
                  onClick={() => setSelectedIdx(idx)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs ${
                    selectedIdx === idx
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-studio-300 hover:bg-studio-800'
                  }`}
                >
                  <span className="truncate">{ds.name}</span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteDataSource(idx);
                    }}
                    className="opacity-60 hover:opacity-100 hover:text-red-300"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddDataSource}
              className="w-full mt-2 py-1.5 bg-studio-800 hover:bg-studio-700 text-studio-200 text-xs rounded font-medium flex items-center justify-center gap-1 transition"
            >
              <Plus size={14} /> Add Source
            </button>
          </div>

          {/* Right Editor Area */}
          <div className="flex-1 flex flex-col p-4 bg-studio-900 overflow-hidden">
            {currentDs ? (
              <div className="flex-1 flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs text-studio-400">Data Source Name</label>
                    <input
                      type="text"
                      value={currentDs.name}
                      onChange={e => {
                        const val = e.target.value;
                        updateReport(prev => {
                          const next = [...prev.dataSources];
                          if (next[selectedIdx]) next[selectedIdx] = { ...next[selectedIdx], name: val };
                          return { ...prev, dataSources: next };
                        });
                      }}
                      className="bg-studio-950 border border-studio-800 rounded px-2 py-1 text-white text-xs font-mono w-48 block mt-1"
                    />
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <label className="text-xs text-studio-400 mb-1">JSON Data Payload</label>
                  <textarea
                    defaultValue={JSON.stringify(currentDs.data, null, 2)}
                    onChange={e => handleJsonChange(e.target.value)}
                    className="flex-1 w-full bg-studio-950 border border-studio-800 rounded p-3 text-xs font-mono text-studio-200 outline-none resize-none focus:border-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-studio-500 text-sm">
                No data source selected. Click &ldquo;Add Source&rdquo; to create one.
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-studio-800 flex justify-end bg-studio-950">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-4 py-1.5 rounded font-medium shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
