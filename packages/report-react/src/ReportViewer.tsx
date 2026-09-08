import React, { useState, useEffect, useRef } from 'react';
import {
  renderReport,
  exportReport,
  type ReportDefinition,
  type RenderedDocument
} from '@report/engine';
import { PageRenderer } from './PageRenderer.js';

export interface ReportViewerProps {
  report: ReportDefinition | string;
  data?: Record<string, any>;
  parameters?: Record<string, any>;
  toolbar?: boolean;
  initialZoom?: number;
  className?: string;
  onExport?: (format: string, bytes: Uint8Array) => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  data,
  parameters,
  toolbar = true,
  initialZoom = 1,
  className = '',
  onExport
}) => {
  const [doc, setDoc] = useState<RenderedDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoom, setZoom] = useState(initialZoom);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    renderReport({ report, data, parameters })
      .then(rendered => {
        if (!isCancelled) {
          setDoc(rendered);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!isCancelled) {
          setError(err.message || 'Failed to render report');
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [report, data, parameters]);

  const handleExport = async (format: 'pdf' | 'docx' | 'xlsx' | 'html') => {
    if (!doc) return;
    try {
      setExporting(true);
      const bytes = await exportReport({
        report,
        data,
        parameters,
        format
      });

      if (onExport) {
        onExport(format, bytes);
      } else {
        // Download directly in browser
        const mimeTypes: Record<string, string> = {
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          html: 'text/html'
        };
        const blob = new Blob([bytes as any], { type: mimeTypes[format] || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.reportName || 'report'}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '300px',
          color: '#6b7280',
          fontFamily: 'sans-serif'
        }}
      >
        <span>Loading report preview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: '#fef2f2',
          border: '1px solid #f87171',
          borderRadius: '8px',
          color: '#991b1b',
          margin: '16px',
          fontFamily: 'sans-serif'
        }}
      >
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 'bold' }}>Rendering Error</h4>
        <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
      </div>
    );
  }

  if (!doc || doc.pages.length === 0) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>No content generated.</div>;
  }

  const activePage = doc.pages[currentPageIndex] || doc.pages[0]!;

  return (
    <div
      className={`report-viewer-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#374151',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {toolbar && (
        <div
          className="report-viewer-toolbar"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            backgroundColor: '#1f2937',
            color: '#f9fafb',
            borderBottom: '1px solid #111827',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          {/* Page Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setCurrentPageIndex(0)}
              disabled={currentPageIndex === 0}
              style={btnStyle(currentPageIndex === 0)}
              title="First Page"
            >
              ⇤
            </button>
            <button
              onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
              disabled={currentPageIndex === 0}
              style={btnStyle(currentPageIndex === 0)}
              title="Previous Page"
            >
              ←
            </button>
            <span style={{ fontSize: '13px', margin: '0 6px' }}>
              Page {currentPageIndex + 1} of {doc.totalPages}
            </span>
            <button
              onClick={() => setCurrentPageIndex(p => Math.min(doc.totalPages - 1, p + 1))}
              disabled={currentPageIndex >= doc.totalPages - 1}
              style={btnStyle(currentPageIndex >= doc.totalPages - 1)}
              title="Next Page"
            >
              →
            </button>
            <button
              onClick={() => setCurrentPageIndex(doc.totalPages - 1)}
              disabled={currentPageIndex >= doc.totalPages - 1}
              style={btnStyle(currentPageIndex >= doc.totalPages - 1)}
              title="Last Page"
            >
              ⇥
            </button>
          </div>

          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setZoom(z => Math.max(0.25, Math.round((z - 0.1) * 10) / 10))}
              style={btnStyle()}
              title="Zoom Out"
            >
              −
            </button>
            <select
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              style={{
                backgroundColor: '#374151',
                color: '#f9fafb',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '13px'
              }}
            >
              <option value="0.5">50%</option>
              <option value="0.75">75%</option>
              <option value="1">100%</option>
              <option value="1.25">125%</option>
              <option value="1.5">150%</option>
              <option value="2">200%</option>
            </select>
            <button
              onClick={() => setZoom(z => Math.min(3, Math.round((z + 0.1) * 10) / 10))}
              style={btnStyle()}
              title="Zoom In"
            >
              +
            </button>
          </div>

          {/* Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: '#374151',
                color: '#f9fafb',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '13px',
                width: '120px'
              }}
            />
          </div>

          {/* Print & Export Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={handlePrint} style={btnStyle()} title="Print Report">
              🖨️ Print
            </button>
            <select
              disabled={exporting}
              onChange={e => {
                if (e.target.value) {
                  handleExport(e.target.value as any);
                  e.target.value = '';
                }
              }}
              defaultValue=""
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <option value="" disabled>
                {exporting ? 'Exporting...' : 'Export As...'}
              </option>
              <option value="pdf">PDF (.pdf)</option>
              <option value="docx">Word (.docx)</option>
              <option value="xlsx">Excel (.xlsx)</option>
              <option value="html">HTML (.html)</option>
            </select>
          </div>
        </div>
      )}

      {/* Pages View Area */}
      <div
        ref={containerRef}
        className="report-viewer-content"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <PageRenderer page={activePage} scale={zoom} searchQuery={searchQuery} />
      </div>
    </div>
  );
};

const btnStyle = (disabled = false): React.CSSProperties => ({
  backgroundColor: disabled ? '#1f2937' : '#374151',
  color: disabled ? '#6b7280' : '#f9fafb',
  border: '1px solid #4b5563',
  borderRadius: '4px',
  padding: '4px 8px',
  fontSize: '13px',
  cursor: disabled ? 'not-allowed' : 'pointer'
});
