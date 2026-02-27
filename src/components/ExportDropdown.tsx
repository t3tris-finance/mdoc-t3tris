import { useState, useRef } from 'react';
import type { DocEntry } from '../utils/docs';
import {
  exportAsMarkdown,
  exportAsHTML,
  exportAsPDF,
  exportAsText,
  exportAllAsZip,
} from '../utils/export';

interface ExportDropdownProps {
  docPath: string;
  title: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  allEntries: DocEntry[];
}

export default function ExportDropdown({ docPath, title, contentRef, allEntries }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleExport = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="export-dropdown" ref={dropdownRef}>
      <button
        className="btn"
        onClick={() => setOpen(!open)}
        disabled={loading}
      >
        {loading ? '⏳' : '📥'} Exporter
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onClick={() => setOpen(false)}
          />
          <div className="export-menu">
            <div className="export-menu-title">Cette page</div>
            <button
              className="export-menu-item"
              onClick={() => handleExport(() => exportAsMarkdown(docPath, title))}
            >
              📝 Markdown (.md)
            </button>
            <button
              className="export-menu-item"
              onClick={() => handleExport(() => exportAsHTML(docPath, title))}
            >
              🌐 HTML (.html)
            </button>
            <button
              className="export-menu-item"
              onClick={() =>
                handleExport(async () => {
                  if (contentRef.current) {
                    await exportAsPDF(contentRef.current, title);
                  }
                })
              }
            >
              📄 PDF (.pdf)
            </button>
            <button
              className="export-menu-item"
              onClick={() => handleExport(() => exportAsText(docPath, title))}
            >
              📃 Texte brut (.txt)
            </button>
            <div className="export-menu-divider" />
            <div className="export-menu-title">Toute la documentation</div>
            <button
              className="export-menu-item"
              onClick={() => handleExport(() => exportAllAsZip(allEntries, 'md'))}
            >
              📦 Tout en Markdown (.zip)
            </button>
            <button
              className="export-menu-item"
              onClick={() => handleExport(() => exportAllAsZip(allEntries, 'html'))}
            >
              📦 Tout en HTML (.zip)
            </button>
            <button
              className="export-menu-item"
              onClick={() => handleExport(() => exportAllAsZip(allEntries, 'txt'))}
            >
              📦 Tout en Texte (.zip)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
