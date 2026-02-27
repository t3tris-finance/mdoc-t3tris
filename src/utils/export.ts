import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { DocEntry } from './docs';
import { flattenEntries, fetchMarkdown } from './docs';

/**
 * Strip frontmatter from raw markdown
 */
function stripFrontmatter(md: string): string {
  if (md.startsWith('---')) {
    const end = md.indexOf('---', 3);
    if (end !== -1) {
      return md.slice(end + 3).trim();
    }
  }
  return md;
}

/**
 * Download content as a file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  saveAs(blob, filename);
}

/**
 * Export current page as raw Markdown
 */
export async function exportAsMarkdown(docPath: string, title: string) {
  const md = await fetchMarkdown(docPath);
  const clean = stripFrontmatter(md);
  downloadFile(clean, `${title.toLowerCase().replace(/\s+/g, '-')}.md`, 'text/markdown');
}

/**
 * Export current page as standalone HTML
 */
export async function exportAsHTML(docPath: string, title: string) {
  const md = await fetchMarkdown(docPath);
  const clean = stripFrontmatter(md);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #1a1a2e; }
    pre { background: #f4f5f7; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.875em; }
    blockquote { border-left: 3px solid #4263eb; padding-left: 1rem; color: #495057; margin: 1rem 0; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #dee2e6; padding: 0.5rem 0.75rem; text-align: left; }
    th { background: #f8f9fa; }
    img { max-width: 100%; }
    h1 { border-bottom: 1px solid #dee2e6; padding-bottom: 0.5rem; }
  </style>
</head>
<body>
  <article>
    <h1>${title}</h1>
    <pre style="white-space: pre-wrap;">${clean.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </article>
</body>
</html>`;
  downloadFile(html, `${title.toLowerCase().replace(/\s+/g, '-')}.html`, 'text/html');
}

/**
 * Export current viewed page as PDF using html2canvas + jsPDF
 */
export async function exportAsPDF(contentElement: HTMLElement, title: string) {
  const canvas = await html2canvas(contentElement, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10;

  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

/**
 * Export current page as plain text
 */
export async function exportAsText(docPath: string, title: string) {
  const md = await fetchMarkdown(docPath);
  const clean = stripFrontmatter(md);
  // Simple markdown-to-text stripping
  const text = clean
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ''))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
  downloadFile(text, `${title.toLowerCase().replace(/\s+/g, '-')}.txt`, 'text/plain');
}

/**
 * Export ALL doc pages as a ZIP of markdown files
 */
export async function exportAllAsZip(entries: DocEntry[], format: 'md' | 'html' | 'txt' = 'md') {
  const zip = new JSZip();
  const flat = flattenEntries(entries);

  for (const entry of flat) {
    const md = await fetchMarkdown(entry.path);
    const clean = stripFrontmatter(md);
    const filename = entry.title.toLowerCase().replace(/\s+/g, '-');

    const folderPath = entry.breadcrumb.length > 0
      ? entry.breadcrumb.map(b => b.toLowerCase().replace(/\s+/g, '-')).join('/') + '/'
      : '';

    if (format === 'md') {
      zip.file(`${folderPath}${filename}.md`, clean);
    } else if (format === 'html') {
      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${entry.title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;}</style>
</head><body><h1>${entry.title}</h1><pre style="white-space:pre-wrap;">${clean.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
      zip.file(`${folderPath}${filename}.html`, html);
    } else {
      const text = clean
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1');
      zip.file(`${folderPath}${filename}.txt`, text);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `documentation-${format}.zip`);
}
