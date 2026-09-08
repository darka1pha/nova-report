'use client';

import React, { useState } from 'react';
import { useDesigner } from './DesignerContext';
import { Toolbar } from './Toolbar';
import { Toolbox } from './Toolbox';
import { Canvas } from './Canvas';
import { PropertiesPanel } from './PropertiesPanel';
import { LayersPanel } from './LayersPanel';
import { TemplatesModal } from './TemplatesModal';
import { DataSourcesModal } from './DataSourcesModal';
import { ReportViewer } from '@report/react';

export const ReportDesigner: React.FC = () => {
  const { report, viewMode } = useDesigner();
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isDataSourcesOpen, setIsDataSourcesOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-studio-950 font-sans text-studio-100">
      {/* Top Application Ribbon */}
      <Toolbar
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenDataSources={() => setIsDataSourcesOpen(true)}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {viewMode === 'design' ? (
          <>
            {/* Left Column: Toolbox and Layers Tree */}
            <div className="flex h-full border-r border-studio-800">
              <Toolbox />
              <LayersPanel />
            </div>

            {/* Middle: Canvas Coordinate Viewport */}
            <Canvas />

            {/* Right: Contextual Properties Inspector */}
            <PropertiesPanel />
          </>
        ) : (
          /* Live Report Preview (using @report/react) */
          <div className="flex-1 h-full w-full bg-studio-900">
            <ReportViewer report={report} toolbar={true} />
          </div>
        )}
      </div>

      {/* Footer Status Bar */}
      <footer className="h-6 bg-studio-900 border-t border-studio-800 px-3 flex items-center justify-between text-[10px] text-studio-400 select-none">
        <div className="flex items-center gap-3">
          <span>Status: Ready</span>
          <span>•</span>
          <span>
            Page: {report.page.width} × {report.page.height} {report.page.unit} ({report.page.orientation})
          </span>
          <span>•</span>
          <span>Sections: {report.sections.length}</span>
        </div>
        <div>
          <span>NextReport Engine v1.0.0</span>
        </div>
      </footer>

      {/* Modals */}
      <TemplatesModal isOpen={isTemplatesOpen} onClose={() => setIsTemplatesOpen(false)} />
      <DataSourcesModal isOpen={isDataSourcesOpen} onClose={() => setIsDataSourcesOpen(false)} />
    </div>
  );
};
