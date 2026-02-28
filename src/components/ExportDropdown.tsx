import { useState, useRef } from "react";
import type { DocEntry } from "../utils/docs";
import {
  exportAsMarkdown,
  exportAsHTML,
  exportAsPDF,
  exportAsText,
  exportAllAsZip,
} from "../utils/export";
import { useI18n } from "../i18n";

interface ExportDropdownProps {
  docPath: string;
  title: string;
  allEntries: DocEntry[];
}

export default function ExportDropdown({
  docPath,
  title,
  allEntries,
}: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const handleExport = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="export-dropdown" ref={dropdownRef}>
      <button className="btn" onClick={() => setOpen(!open)} disabled={loading}>
        {loading ? "⏳" : "📥"} {t.export}
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 199 }}
            onClick={() => setOpen(false)}
          />
          <div className="export-menu">
            <div className="export-menu-title">{t.thisPage}</div>
            <button
              className="export-menu-item"
              onClick={() =>
                handleExport(() => exportAsMarkdown(docPath, title))
              }
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
              onClick={() => handleExport(() => exportAsPDF(docPath, title))}
            >
              📄 PDF (.pdf)
            </button>
            <button
              className="export-menu-item"
              onClick={() => handleExport(() => exportAsText(docPath, title))}
            >
              📃 {t.plainText}
            </button>
            <div className="export-menu-divider" />
            <div className="export-menu-title">{t.allDocumentation}</div>
            <button
              className="export-menu-item"
              onClick={() =>
                handleExport(() => exportAllAsZip(allEntries, "md"))
              }
            >
              📦 {t.allAsMarkdown}
            </button>
            <button
              className="export-menu-item"
              onClick={() =>
                handleExport(() => exportAllAsZip(allEntries, "html"))
              }
            >
              📦 {t.allAsHTML}
            </button>
            <button
              className="export-menu-item"
              onClick={() =>
                handleExport(() => exportAllAsZip(allEntries, "txt"))
              }
            >
              📦 {t.allAsText}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
