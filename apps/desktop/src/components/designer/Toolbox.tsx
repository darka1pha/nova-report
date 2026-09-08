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
  Layers
} from 'lucide-react';
import {
  createDefaultTextElement,
  createDefaultShapeElement,
  createDefaultTableElement
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
      height: 15,
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

  const tools = [
    { name: 'Text Field', icon: Type, onClick: handleAddText, desc: 'Labels and dynamic expressions' },
    { name: 'Data Table', icon: Table, onClick: handleAddTable, desc: 'Repeating rows & headers' },
    { name: 'Rectangle', icon: Square, onClick: handleAddRectangle, desc: 'Boxes and panels' },
    { name: 'Circle', icon: Circle, onClick: handleAddCircle, desc: 'Ellipses and circles' },
    { name: 'Line', icon: Minus, onClick: handleAddLine, desc: 'Dividers and rules' },
    { name: 'Image', icon: ImageIcon, onClick: handleAddImage, desc: 'Logos and graphics' },
    { name: 'Barcode', icon: Barcode, onClick: handleAddBarcode, desc: 'Code128, EAN13' },
    { name: 'QR Code', icon: QrCode, onClick: handleAddQRCode, desc: '2D matrix codes' }
  ];

  return (
    <aside className="w-48 bg-studio-900 border-r border-studio-800 flex flex-col select-none text-studio-200">
      <div className="p-3 border-b border-studio-800 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-studio-400 flex items-center gap-1.5">
          <Layers size={13} />
          Toolbox
        </span>
      </div>

      <div className="p-2 flex-1 overflow-y-auto space-y-1">
        {tools.map(tool => (
          <button
            key={tool.name}
            onClick={tool.onClick}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs text-studio-300 hover:text-white hover:bg-studio-800 border border-transparent hover:border-studio-700 transition text-left group"
          >
            <tool.icon size={16} className="text-blue-400 group-hover:text-blue-300 shrink-0" />
            <div>
              <div className="font-medium">{tool.name}</div>
              <div className="text-[10px] text-studio-500 line-clamp-1">{tool.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
};
