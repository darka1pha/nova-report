'use client';

import React from 'react';
import { useDesigner } from './DesignerContext';
import {
  Type,
  Table,
  Square,
  Circle,
  Minus,
  Image as ImageIcon,
  Barcode,
  QrCode,
  BarChart3,
  PieChart,
  TrendingUp,
  Layers
} from 'lucide-react';
import {
  createDefaultTextElement,
  createDefaultShapeElement,
  createDefaultTableElement,
  createDefaultChartElement
} from '@report/schema';

export const Toolbox: React.FC = () => {
  const { report, addElement, selectedSectionId } = useDesigner();

  const targetSectionId = selectedSectionId || report.sections[1]?.id || report.sections[0]?.id || 'sec-detail';

  const handleAddText = () => {
    addElement(targetSectionId, createDefaultTextElement());
  };

  const handleAddRectangle = () => {
    addElement(targetSectionId, createDefaultShapeElement({ shapeType: 'rectangle' }));
  };

  const handleAddCircle = () => {
    addElement(
      targetSectionId,
      createDefaultShapeElement({
        name: 'Circle',
        shapeType: 'circle',
        width: 30,
        height: 30
      })
    );
  };

  const handleAddLine = () => {
    addElement(
      targetSectionId,
      createDefaultShapeElement({
        name: 'Line',
        shapeType: 'line',
        width: 60,
        height: 1,
        strokeWidth: 0.5
      })
    );
  };

  const handleAddTable = () => {
    addElement(targetSectionId, createDefaultTableElement());
  };

  const handleAddImage = () => {
    addElement(targetSectionId, {
      id: `elem-img-${Math.random().toString(36).substring(2, 9)}`,
      name: 'Logo Image',
      type: 'image',
      x: 10,
      y: 10,
      width: 40,
      height: 25,
      src: 'https://via.placeholder.com/150x80.png?text=Company+Logo',
      fit: 'contain'
    });
  };

  const handleAddBarcode = () => {
    addElement(targetSectionId, {
      id: `elem-bar-${Math.random().toString(36).substring(2, 9)}`,
      name: 'Barcode',
      type: 'barcode',
      x: 10,
      y: 10,
      width: 50,
      height: 18,
      value: 'INV-100293',
      format: 'CODE128',
      includeText: true,
      barColor: '#000000',
      backgroundColor: '#ffffff'
    });
  };

  const handleAddQRCode = () => {
    addElement(targetSectionId, {
      id: `elem-qr-${Math.random().toString(36).substring(2, 9)}`,
      name: 'QR Code',
      type: 'qrcode',
      x: 10,
      y: 10,
      width: 25,
      height: 25,
      value: 'https://example.com/verify',
      errorCorrectionLevel: 'M',
      darkColor: '#000000',
      lightColor: '#ffffff'
    });
  };

  const handleAddBarChart = () => {
    addElement(
      targetSectionId,
      createDefaultChartElement({
        name: 'Bar Chart',
        chartType: 'bar',
        title: 'Sales Overview'
      })
    );
  };

  const handleAddPieChart = () => {
    addElement(
      targetSectionId,
      createDefaultChartElement({
        name: 'Pie Chart',
        chartType: 'pie',
        title: 'Market Share',
        width: 65,
        height: 65,
        data: [
          { label: 'Enterprise', value: 45 },
          { label: 'Consumer', value: 30 },
          { label: 'SMB', value: 25 }
        ]
      })
    );
  };

  const handleAddLineChart = () => {
    addElement(
      targetSectionId,
      createDefaultChartElement({
        name: 'Trend Line',
        chartType: 'line',
        title: 'Growth Metric'
      })
    );
  };

  const toolCategories = [
    {
      category: 'Text & Content',
      items: [
        { name: 'Text Field', icon: Type, onClick: handleAddText, desc: 'Labels & expressions' },
        { name: 'Data Table', icon: Table, onClick: handleAddTable, desc: 'Repeating rows & headers' },
        { name: 'Image', icon: ImageIcon, onClick: handleAddImage, desc: 'Logos & photos' }
      ]
    },
    {
      category: 'Visual Shapes',
      items: [
        { name: 'Rectangle', icon: Square, onClick: handleAddRectangle, desc: 'Cards & borders' },
        { name: 'Circle', icon: Circle, onClick: handleAddCircle, desc: 'Badges & discs' },
        { name: 'Divider Line', icon: Minus, onClick: handleAddLine, desc: 'Horizontal rules' }
      ]
    },
    {
      category: 'Data Visualizations',
      items: [
        { name: 'Bar Chart', icon: BarChart3, onClick: handleAddBarChart, desc: 'Category comparison' },
        { name: 'Pie Chart', icon: PieChart, onClick: handleAddPieChart, desc: 'Portion breakdown' },
        { name: 'Line Chart', icon: TrendingUp, onClick: handleAddLineChart, desc: 'Trends over time' }
      ]
    },
    {
      category: 'Codes & Verification',
      items: [
        { name: '1D Barcode', icon: Barcode, onClick: handleAddBarcode, desc: 'Code128, EAN13' },
        { name: '2D QR Code', icon: QrCode, onClick: handleAddQRCode, desc: 'Scan & verify URL' }
      ]
    }
  ];

  return (
    <aside className="w-52 bg-studio-900 border-r border-studio-800 flex flex-col select-none text-studio-200">
      <div className="p-3 border-b border-studio-800 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-studio-400 flex items-center gap-1.5">
          <Layers size={13} className="text-blue-400" />
          Toolbox
        </span>
      </div>

      <div className="p-2 flex-1 overflow-y-auto space-y-4">
        {toolCategories.map(cat => (
          <div key={cat.category} className="space-y-1">
            <div className="text-[10px] font-semibold text-studio-500 uppercase px-2 tracking-wider">
              {cat.category}
            </div>
            {cat.items.map(tool => (
              <button
                key={tool.name}
                onClick={tool.onClick}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-studio-300 hover:text-white hover:bg-studio-800/80 border border-transparent hover:border-studio-700/60 transition text-left group"
              >
                <div className="p-1 rounded bg-studio-950 border border-studio-800 group-hover:border-blue-500/40 text-blue-400 group-hover:text-blue-300 shrink-0">
                  <tool.icon size={13} />
                </div>
                <div className="truncate">
                  <div className="font-medium leading-tight">{tool.name}</div>
                  <div className="text-[9px] text-studio-500 truncate">{tool.desc}</div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
};
