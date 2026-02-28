import jsPDF from "jspdf";
import { marked, type Token, type Tokens } from "marked";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { DocEntry } from "./docs";
import { flattenEntries, fetchMarkdown } from "./docs";

/**
 * Strip frontmatter from raw markdown
 */
function stripFrontmatter(md: string): string {
  if (md.startsWith("---")) {
    const end = md.indexOf("---", 3);
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

// ─── Unicode → ASCII fallback for PDF (jsPDF built-in fonts are WinAnsi only) ─
const UNICODE_TO_ASCII: [RegExp, string][] = [
  // Box-drawing corners & junctions
  [/[┌┐└┘]/g, "+"],
  [/[├┤┬┴┼]/g, "+"],
  // Box-drawing lines
  [/[─━]/g, "-"],
  [/[│┃]/g, "|"],
  // Double-line box-drawing
  [/[╔╗╚╝╠╣╦╩╬]/g, "+"],
  [/[═]/g, "="],
  [/[║]/g, "|"],
  // Arrows
  [/[▶►→➜➤]/g, ">"],
  [/[◀◄←]/g, "<"],
  [/[▼▾↓]/g, "v"],
  [/[▲▴↑]/g, "^"],
  // Bullets / markers
  [/[•●○◦◉◎]/g, "*"],
  [/[■□▪▫]/g, "#"],
  [/[✓✔☑]/g, "[x]"],
  [/[✗✘☐]/g, "[ ]"],
  // Misc
  [/[…]/g, "..."],
  [/[–]/g, "--"],
  [/[—]/g, "---"],
  [/[≥]/g, ">="],
  [/[≤]/g, "<="],
  [/[≠]/g, "!="],
];

/** Replace Unicode characters unsupported by jsPDF built-in fonts */
function sanitizeForPdf(text: string): string {
  let result = text;
  for (const [pattern, replacement] of UNICODE_TO_ASCII) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// ─── PDF rendering constants ────────────────────────────────────────────────
const MARGIN = 15; // mm
const LINE_HEIGHT = 1.5;
const COLORS = {
  text: [26, 26, 46] as const, // #1a1a2e
  secondary: [73, 80, 87] as const, // #495057
  accent: [66, 99, 235] as const, // #4263eb
  code: [232, 62, 140] as const, // #e83e8c
  codeBg: [244, 245, 247] as const, // #f4f5f7
  border: [222, 226, 230] as const, // #dee2e6
  blockquoteBg: [248, 249, 250] as const, // #f8f9fa
  tableBg: [248, 249, 250] as const, // #f8f9fa
};

const FONT_SIZES: Record<string, number> = {
  h1: 18,
  h2: 15,
  h3: 13,
  h4: 11,
  body: 10,
  code: 9,
  small: 8,
};

/**
 * Helper class that wraps jsPDF and adds markdown-aware rendering.
 * Operates entirely from parsed markdown tokens — zero DOM interaction.
 */
class PdfRenderer {
  private pdf: jsPDF;
  private y: number;
  private pageWidth: number;
  private pageHeight: number;
  private contentWidth: number;

  constructor() {
    this.pdf = new jsPDF("p", "mm", "a4");
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - MARGIN * 2;
    this.y = MARGIN;
  }

  /** Ensure there's enough room; add a new page if needed. */
  private ensureSpace(needed: number) {
    if (this.y + needed > this.pageHeight - MARGIN) {
      this.pdf.addPage();
      this.y = MARGIN;
    }
  }

  /** Strip HTML tags from inline tokens (bold, italic, code, links, etc.) */
  private stripInlineHtml(text: string): string {
    return text
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  /** Extract plain text from inline tokens recursively */
  private inlineTokensToText(tokens: Token[]): string {
    let result = "";
    for (const t of tokens) {
      if ("tokens" in t && t.tokens) {
        result += this.inlineTokensToText(t.tokens);
      } else if ("text" in t) {
        result += (t as Tokens.Text).text;
      }
    }
    return this.stripInlineHtml(result);
  }

  /** Wrap text to fit within content width and return lines */
  private wrapText(
    text: string,
    fontSize: number,
    fontStyle: string = "normal",
  ): string[] {
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont("helvetica", fontStyle);
    return this.pdf.splitTextToSize(text, this.contentWidth);
  }

  /** Write an array of wrapped lines, handling page breaks */
  private writeLines(
    lines: string[],
    fontSize: number,
    fontStyle: string = "normal",
    color: readonly [number, number, number] = COLORS.text,
  ) {
    this.pdf.setFontSize(fontSize);
    this.pdf.setFont("helvetica", fontStyle);
    this.pdf.setTextColor(color[0], color[1], color[2]);
    const lineH = (fontSize * LINE_HEIGHT * 25.4) / 72; // pt → mm

    for (const line of lines) {
      this.ensureSpace(lineH);
      this.pdf.text(line, MARGIN, this.y);
      this.y += lineH;
    }
  }

  /** Add vertical space */
  private addSpace(mm: number) {
    this.y += mm;
  }

  // ─── Token renderers ──────────────────────────────────────────────────

  private renderHeading(token: Tokens.Heading) {
    const text = sanitizeForPdf(this.inlineTokensToText(token.tokens));
    const key = `h${token.depth}` as keyof typeof FONT_SIZES;
    const fontSize = FONT_SIZES[key] ?? FONT_SIZES.body;
    const lines = this.wrapText(text, fontSize, "bold");

    this.addSpace(token.depth <= 2 ? 6 : 4);
    this.writeLines(lines, fontSize, "bold");

    // Underline for h1
    if (token.depth === 1) {
      this.pdf.setDrawColor(...COLORS.border);
      this.pdf.setLineWidth(0.3);
      this.pdf.line(MARGIN, this.y, MARGIN + this.contentWidth, this.y);
      this.y += 2;
    }
    this.addSpace(2);
  }

  private renderParagraph(token: Tokens.Paragraph) {
    const text = sanitizeForPdf(this.inlineTokensToText(token.tokens));
    const lines = this.wrapText(text, FONT_SIZES.body);
    this.writeLines(lines, FONT_SIZES.body);
    this.addSpace(3);
  }

  private renderCode(token: Tokens.Code) {
    const codeLines = sanitizeForPdf(token.text).split("\n");
    const lineH = (FONT_SIZES.code * LINE_HEIGHT * 25.4) / 72;
    const padding = 3;
    const blockHeight = codeLines.length * lineH + padding * 2;

    this.ensureSpace(Math.min(blockHeight, 60));

    // Draw background
    this.pdf.setFillColor(...COLORS.codeBg);
    this.pdf.setDrawColor(...COLORS.border);
    this.pdf.setLineWidth(0.2);
    const bgHeight = Math.min(blockHeight, this.pageHeight - MARGIN - this.y);
    this.pdf.roundedRect(
      MARGIN,
      this.y,
      this.contentWidth,
      bgHeight,
      2,
      2,
      "FD",
    );

    this.y += padding;
    this.pdf.setFont("courier", "normal");
    this.pdf.setFontSize(FONT_SIZES.code);
    this.pdf.setTextColor(...COLORS.text);

    for (const codeLine of codeLines) {
      this.ensureSpace(lineH);
      // Truncate long lines rather than wrap (code should stay readable)
      const truncated = this.pdf.splitTextToSize(
        codeLine || " ",
        this.contentWidth - padding * 2,
      );
      this.pdf.text(truncated[0], MARGIN + padding, this.y);
      this.y += lineH;
    }

    this.y += padding;
    this.addSpace(3);
  }

  private renderBlockquote(token: Tokens.Blockquote) {
    const text = sanitizeForPdf(
      token.tokens
        .map((t) =>
          "tokens" in t && t.tokens
            ? this.inlineTokensToText(t.tokens)
            : "text" in t
              ? (t as Tokens.Text).text
              : "",
        )
        .join(" "),
    );

    const lines = this.wrapText(text, FONT_SIZES.body, "italic");
    const lineH = (FONT_SIZES.body * LINE_HEIGHT * 25.4) / 72;
    const padding = 3;
    const blockHeight = lines.length * lineH + padding * 2;

    this.ensureSpace(Math.min(blockHeight, 40));

    // Background
    this.pdf.setFillColor(...COLORS.blockquoteBg);
    this.pdf.roundedRect(
      MARGIN,
      this.y,
      this.contentWidth,
      blockHeight,
      1,
      1,
      "F",
    );
    // Left accent bar
    this.pdf.setFillColor(...COLORS.accent);
    this.pdf.rect(MARGIN, this.y, 1, blockHeight, "F");

    this.y += padding;
    this.writeLines(lines, FONT_SIZES.body, "italic", COLORS.secondary);
    this.y += padding;
    this.addSpace(3);
  }

  private renderList(token: Tokens.List, indent: number = 0) {
    const lineH = (FONT_SIZES.body * LINE_HEIGHT * 25.4) / 72;
    const indentMm = indent * 5;

    token.items.forEach((item, idx) => {
      const bullet = token.ordered ? `${idx + 1}.` : "-";
      const text = sanitizeForPdf(
        item.tokens
          .filter(
            (t): t is Tokens.Paragraph | Tokens.Text =>
              t.type === "text" || t.type === "paragraph",
          )
          .map((t) =>
            "tokens" in t && t.tokens
              ? this.inlineTokensToText(t.tokens)
              : (t as Tokens.Text).text,
          )
          .join(" "),
      );

      const lines = this.pdf.splitTextToSize(
        text,
        this.contentWidth - indentMm - 8,
      );

      this.pdf.setFont("helvetica", "normal");
      this.pdf.setFontSize(FONT_SIZES.body);
      this.pdf.setTextColor(...COLORS.text);

      this.ensureSpace(lineH);
      this.pdf.text(bullet, MARGIN + indentMm, this.y);

      for (const line of lines) {
        this.ensureSpace(lineH);
        this.pdf.text(line, MARGIN + indentMm + 5, this.y);
        this.y += lineH;
      }

      // Render nested lists
      for (const sub of item.tokens) {
        if (sub.type === "list") {
          this.renderList(sub as Tokens.List, indent + 1);
        }
      }
    });

    this.addSpace(3);
  }

  private renderTable(token: Tokens.Table) {
    const cellPadding = 2;
    const fontSize = FONT_SIZES.small;
    const lineH = (fontSize * LINE_HEIGHT * 25.4) / 72;
    const colCount = token.header.length;
    const colWidth = this.contentWidth / colCount;

    this.addSpace(3);

    // Header
    this.ensureSpace(lineH + cellPadding * 2);
    this.pdf.setFillColor(...COLORS.tableBg);
    this.pdf.rect(
      MARGIN,
      this.y,
      this.contentWidth,
      lineH + cellPadding * 2,
      "F",
    );
    this.pdf.setDrawColor(...COLORS.border);
    this.pdf.setLineWidth(0.3);
    this.pdf.rect(
      MARGIN,
      this.y,
      this.contentWidth,
      lineH + cellPadding * 2,
      "S",
    );

    this.y += cellPadding;
    this.pdf.setFont("helvetica", "bold");
    this.pdf.setFontSize(fontSize);
    this.pdf.setTextColor(...COLORS.text);

    token.header.forEach((cell, i) => {
      const text = sanitizeForPdf(this.inlineTokensToText(cell.tokens));
      const truncated = this.pdf.splitTextToSize(
        text,
        colWidth - cellPadding * 2,
      );
      this.pdf.text(truncated[0], MARGIN + i * colWidth + cellPadding, this.y);
    });
    this.y += lineH + cellPadding;

    // Rows
    this.pdf.setFont("helvetica", "normal");
    for (const row of token.rows) {
      this.ensureSpace(lineH + cellPadding * 2);

      this.pdf.setDrawColor(...COLORS.border);
      this.pdf.setLineWidth(0.1);
      this.pdf.line(MARGIN, this.y, MARGIN + this.contentWidth, this.y);

      this.y += cellPadding;
      row.forEach((cell, i) => {
        const text = sanitizeForPdf(this.inlineTokensToText(cell.tokens));
        const truncated = this.pdf.splitTextToSize(
          text,
          colWidth - cellPadding * 2,
        );
        this.pdf.text(
          truncated[0],
          MARGIN + i * colWidth + cellPadding,
          this.y,
        );
      });
      this.y += lineH + cellPadding;
    }

    // Bottom border
    this.pdf.setDrawColor(...COLORS.border);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(MARGIN, this.y, MARGIN + this.contentWidth, this.y);

    this.addSpace(5);
  }

  private renderHr() {
    this.addSpace(4);
    this.pdf.setDrawColor(...COLORS.border);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(MARGIN, this.y, MARGIN + this.contentWidth, this.y);
    this.addSpace(4);
  }

  /** Process a single token */
  private renderToken(token: Token) {
    switch (token.type) {
      case "heading":
        this.renderHeading(token as Tokens.Heading);
        break;
      case "paragraph":
        this.renderParagraph(token as Tokens.Paragraph);
        break;
      case "code":
        this.renderCode(token as Tokens.Code);
        break;
      case "blockquote":
        this.renderBlockquote(token as Tokens.Blockquote);
        break;
      case "list":
        this.renderList(token as Tokens.List);
        break;
      case "table":
        this.renderTable(token as Tokens.Table);
        break;
      case "hr":
        this.renderHr();
        break;
      case "space":
        this.addSpace(2);
        break;
      case "html": {
        // Render raw HTML blocks as plain text (strip tags)
        const htmlText = sanitizeForPdf(
          this.stripInlineHtml((token as Tokens.HTML).text),
        );
        if (htmlText.trim()) {
          const lines = this.wrapText(htmlText, FONT_SIZES.body);
          this.writeLines(lines, FONT_SIZES.body);
          this.addSpace(3);
        }
        break;
      }
      default:
        break;
    }
  }

  /** Render all tokens from a parsed markdown document */
  render(tokens: Token[]) {
    for (const token of tokens) {
      this.renderToken(token);
    }
  }

  /** Save the PDF with the given filename */
  save(filename: string) {
    this.pdf.save(filename);
  }
}

/**
 * Export current page as raw Markdown
 */
export async function exportAsMarkdown(docPath: string, title: string) {
  const md = await fetchMarkdown(docPath);
  const clean = stripFrontmatter(md);
  downloadFile(
    clean,
    `${title.toLowerCase().replace(/\s+/g, "-")}.md`,
    "text/markdown",
  );
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
    <pre style="white-space: pre-wrap;">${clean.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  </article>
</body>
</html>`;
  downloadFile(
    html,
    `${title.toLowerCase().replace(/\s+/g, "-")}.html`,
    "text/html",
  );
}

/**
 * Export current page as PDF — directly from markdown, zero DOM interaction.
 * Parses markdown into tokens with `marked.lexer()`, then renders each token
 * (heading, paragraph, code, list, table, blockquote…) via jsPDF's text API.
 */
export async function exportAsPDF(docPath: string, title: string) {
  const md = await fetchMarkdown(docPath);
  const clean = stripFrontmatter(md);
  const tokens = marked.lexer(clean);

  const renderer = new PdfRenderer();
  renderer.render(tokens);
  renderer.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

/**
 * Export current page as plain text
 */
export async function exportAsText(docPath: string, title: string) {
  const md = await fetchMarkdown(docPath);
  const clean = stripFrontmatter(md);
  // Simple markdown-to-text stripping
  const text = clean
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ""))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
  downloadFile(
    text,
    `${title.toLowerCase().replace(/\s+/g, "-")}.txt`,
    "text/plain",
  );
}

/**
 * Export ALL doc pages as a ZIP of markdown files
 */
export async function exportAllAsZip(
  entries: DocEntry[],
  format: "md" | "html" | "txt" = "md",
) {
  const zip = new JSZip();
  const flat = flattenEntries(entries);

  for (const entry of flat) {
    const md = await fetchMarkdown(entry.path);
    const clean = stripFrontmatter(md);
    const filename = entry.title.toLowerCase().replace(/\s+/g, "-");

    const folderPath =
      entry.breadcrumb.length > 0
        ? entry.breadcrumb
            .map((b) => b.toLowerCase().replace(/\s+/g, "-"))
            .join("/") + "/"
        : "";

    if (format === "md") {
      zip.file(`${folderPath}${filename}.md`, clean);
    } else if (format === "html") {
      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${entry.title}</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;line-height:1.6;}</style>
</head><body><h1>${entry.title}</h1><pre style="white-space:pre-wrap;">${clean.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`;
      zip.file(`${folderPath}${filename}.html`, html);
    } else {
      const text = clean
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1");
      zip.file(`${folderPath}${filename}.txt`, text);
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `documentation-${format}.zip`);
}
