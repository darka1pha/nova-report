'use client';

import React from 'react';
import { useDesigner } from './DesignerContext';
import { X, FileText, Globe, TrendingUp, ShoppingBag, Receipt, Sparkles } from 'lucide-react';
import type { ReportDefinition } from '@report/schema';
import { createBlankReport } from '@report/schema';

// Import template JSON files
import invoiceTemplate from '../../../../../templates/invoice.report.json';
import persianInvoiceTemplate from '../../../../../templates/invoice-rtl-persian.report.json';
import salesTemplate from '../../../../../templates/sales-summary.report.json';

export const TemplatesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const { loadTemplate } = useDesigner();

  if (!isOpen) return null;

  const templates: {
    id: string;
    title: string;
    description: string;
    icon: any;
    tag: string;
    data: ReportDefinition;
  }[] = [
    {
      id: 'invoice',
      title: 'Commercial Invoice',
      description: 'Professional enterprise invoice with billed-to parties, line items table, taxes, totals, and barcodes.',
      icon: FileText,
      tag: 'Bestseller',
      data: invoiceTemplate as any
    },
    {
      id: 'invoice-rtl',
      title: 'Persian RTL Official Invoice',
      description: 'صورتحساب رسمی فروش کالا و خدمات با جدول راست‌به‌چپ (RTL)، مبالغ ریالی و شناسه‌های ملی.',
      icon: Globe,
      tag: 'RTL Persian',
      data: persianInvoiceTemplate as any
    },
    {
      id: 'sales-summary',
      title: 'Executive Sales Summary',
      description: 'Multi-region quarterly sales report with targets, actuals, growth rates, and KPI summaries.',
      icon: TrendingUp,
      tag: 'Analytics',
      data: salesTemplate as any
    },
    {
      id: 'blank',
      title: 'Blank Report Canvas',
      description: 'Start with a clean A4 canvas with Page Header, Detail, and Page Footer sections.',
      icon: Sparkles,
      tag: 'Blank',
      data: createBlankReport('New Report')
    }
  ];

  const handleSelect = (tmpl: ReportDefinition) => {
    loadTemplate(tmpl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-studio-900 border border-studio-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-studio-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white text-base">Report Templates Library</h3>
            <p className="text-xs text-studio-400">Choose a professional starting template for your report.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-studio-400 hover:text-white hover:bg-studio-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto">
          {templates.map(t => (
            <div
              key={t.id}
              onClick={() => handleSelect(t.data)}
              className="p-3.5 bg-studio-950 border border-studio-800 rounded-lg hover:border-blue-500/70 hover:bg-studio-900 cursor-pointer transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-600/20 text-blue-400 rounded group-hover:bg-blue-600 group-hover:text-white transition">
                    <t.icon size={18} />
                  </div>
                  <span className="text-[10px] bg-studio-800 text-studio-300 px-2 py-0.5 rounded font-mono font-medium">
                    {t.tag}
                  </span>
                </div>
                <h4 className="font-semibold text-sm text-white mb-1 group-hover:text-blue-300 transition">
                  {t.title}
                </h4>
                <p className="text-xs text-studio-400 line-clamp-2 leading-relaxed">{t.description}</p>
              </div>

              <div className="mt-4 pt-2 border-t border-studio-800/60 flex items-center justify-between text-[11px] text-blue-400 font-medium">
                <span>Load Template →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
