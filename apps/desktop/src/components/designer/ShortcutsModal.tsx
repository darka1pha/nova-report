'use client';

import React from 'react';
import { X, Command, Keyboard, Sparkles, MousePointer, Move, RotateCw, ZoomIn, Grid } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcutSections = [
    {
      category: 'Selection & History',
      icon: MousePointer,
      items: [
        { keys: ['Click'], desc: 'Select single element' },
        { keys: ['Shift', 'Click'], desc: 'Add / remove from selection' },
        { keys: ['Drag Canvas'], desc: 'Marquee rubber-band box select' },
        { keys: ['Ctrl / ⌘', 'Z'], desc: 'Undo last action' },
        { keys: ['Ctrl / ⌘', 'Y'], desc: 'Redo previously undone action' },
        { keys: ['Ctrl / ⌘', 'D'], desc: 'Duplicate selected elements' },
        { keys: ['Delete'], desc: 'Delete selected elements' }
      ]
    },
    {
      category: 'Transform & Nudge',
      icon: Move,
      items: [
        { keys: ['Arrow Keys'], desc: 'Nudge position by 1mm' },
        { keys: ['Shift', 'Arrows'], desc: 'Nudge position by 5mm' },
        { keys: ['8 Handles'], desc: 'Resize from corners or edges' },
        { keys: ['Top Handle'], desc: 'Rotate freely 0° to 360°' },
        { keys: ['Shift', 'Rotate'], desc: 'Snap rotation to 15° increments' },
        { keys: ['Double Click'], desc: 'Inline direct text editing' }
      ]
    },
    {
      category: 'Canvas & Navigation',
      icon: Grid,
      items: [
        { keys: ['Rulers'], desc: 'Toggle millimeter rulers & cursor tracker' },
        { keys: ['Snap to Grid'], desc: 'Toggle magnetic snapping (5mm)' },
        { keys: ['Smart Guides'], desc: 'Auto-align to nearby elements' },
        { keys: ['Zoom +/-'], desc: 'Zoom canvas from 25% to 250%' },
        { keys: ['Ctrl / ⌘', 'S'], desc: 'Export & save report definition JSON' }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 select-none">
      <div className="bg-studio-900 border border-studio-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col text-studio-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-studio-800 flex items-center justify-between bg-studio-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
              <Keyboard size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Keyboard Shortcuts & Gestures
              </h2>
              <p className="text-[11px] text-studio-400">Master rapid visual report designing with hotkeys</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-studio-400 hover:text-white hover:bg-studio-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="p-5 space-y-6 overflow-y-auto max-h-[70vh]">
          {shortcutSections.map(sec => (
            <div key={sec.category} className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                <sec.icon size={13} />
                <span>{sec.category}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sec.items.map(item => (
                  <div
                    key={item.desc}
                    className="flex items-center justify-between p-2 rounded-lg bg-studio-950/60 border border-studio-800/80 hover:border-studio-700 transition"
                  >
                    <span className="text-xs text-studio-300">{item.desc}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map(k => (
                        <kbd
                          key={k}
                          className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-studio-800 text-studio-200 rounded border border-studio-700 shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-studio-800 bg-studio-950/80 flex items-center justify-between text-xs text-studio-400">
          <span>Tip: Hold Shift when dragging for precision movement</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition shadow"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
