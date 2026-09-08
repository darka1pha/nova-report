'use client';

import React from 'react';
import { DesignerProvider } from '../components/designer/DesignerContext';
import { ReportDesigner } from '../components/designer/ReportDesigner';

// Pre-load initial default template
import defaultInvoice from '../../../../templates/invoice.report.json';

export default function DesignerPage() {
  return (
    <DesignerProvider initialReport={defaultInvoice as any}>
      <ReportDesigner />
    </DesignerProvider>
  );
}
