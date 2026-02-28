/**
 * Pre-renders static HTML pages from the SPA build output.
 * For each documentation route, creates an HTML file with:
 * - Proper <title> and meta tags
 * - Rendered markdown content in <noscript> for crawlers
 * - JSON-LD structured data
 *
 * This ensures search engines can index all content even without JS execution.
 * Run with: bun scripts/prerender.ts
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import matter from "gray-matter";

const SITE_URL = "https://docs.t3tris.xyz";
const SITE_NAME = "T3tris Protocol";
const DEFAULT_DESCRIPTION =
  "T3tris is a tokenized vault protocol built on the ERC-4626 standard, designed for professional asset management with institutional-grade features.";

interface DocEntry {
  title: string;
  slug: string;
  path: string;
  order: number;
  children?: DocEntry[];
}

function docPathToRoute(docPath: string): string {
  return docPath
    .replace(/^\/docs\/[a-z]{2}(-[a-z]{2})?/i, "")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "")
    .replace(/\/\d+-/g, "/")
    .replace(/^\/?/, "/");
}

function flattenEntries(
  entries: DocEntry[],
  breadcrumb: string[] = [],
): { title: string; path: string; route: string; breadcrumb: string[] }[] {
  const result: {
    title: string;
    path: string;
    route: string;
    breadcrumb: string[];
  }[] = [];
  for (const entry of entries) {
    if (entry.children && entry.children.length > 0) {
      result.push(
        ...flattenEntries(entry.children, [...breadcrumb, entry.title]),
      );
    } else {
      result.push({
        title: entry.title,
        path: entry.path,
        route: docPathToRoute(entry.path),
        breadcrumb,
      });
    }
  }
  return result;
}

/**
 * Extract the first paragraph from markdown content as a description.
 */
function extractDescription(mdContent: string): string {
  const { content } = matter(mdContent);
  const lines = content.split("\n");
  const paragraphs: string[] = [];

  let current = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (current) {
        paragraphs.push(current);
        current = "";
      }
    } else if (
      !trimmed.startsWith("#") &&
      !trimmed.startsWith("```") &&
      !trimmed.startsWith("|") &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith("*")
    ) {
      current += (current ? " " : "") + trimmed;
    }
  }
  if (current) paragraphs.push(current);

  const desc = paragraphs[0] || DEFAULT_DESCRIPTION;
  // Strip markdown formatting
  const clean = desc
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/[*_`]/g, "") // emphasis
    .replace(/\s+/g, " ")
    .trim();

  return clean.length > 160 ? clean.slice(0, 157) + "..." : clean;
}

// ──────────────────────────────────────────────────────────

const distDir = join(process.cwd(), "dist");
const publicDir = join(process.cwd(), "public");

if (!existsSync(distDir)) {
  console.error("❌ dist/ not found — run `vite build` first");
  process.exit(1);
}

// Read the base index.html from the build output
const baseHtml = readFileSync(join(distDir, "index.html"), "utf-8");

// Read manifests
const manifestFiles = readdirSync(publicDir).filter((f) =>
  f.match(/^docs-manifest\.[a-z]{2}(-[a-z]{2})?\.json$/),
);

let pagesGenerated = 0;

for (const manifestFile of manifestFiles) {
  const locale = manifestFile
    .replace("docs-manifest.", "")
    .replace(".json", "");
  const manifest: DocEntry[] = JSON.parse(
    readFileSync(join(publicDir, manifestFile), "utf-8"),
  );

  const pages = flattenEntries(manifest);

  for (const page of pages) {
    const mdFilePath = join(
      process.cwd(),
      page.path.startsWith("/") ? page.path.slice(1) : page.path,
    );

    let description = DEFAULT_DESCRIPTION;
    let mdContent = "";
    if (existsSync(mdFilePath)) {
      mdContent = readFileSync(mdFilePath, "utf-8");
      description = extractDescription(mdContent);
    }

    const fullTitle = `${page.title} | ${SITE_NAME} Docs`;
    const canonicalUrl = `${SITE_URL}${page.route}`;

    // Build JSON-LD
    const jsonLdArticle = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: page.title,
      description,
      url: canonicalUrl,
      inLanguage: locale,
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    });

    const breadcrumbItems = [
      { name: "Home", url: SITE_URL },
      ...page.breadcrumb.map((item, i) => ({
        name: item,
        url: `${SITE_URL}/${page.breadcrumb
          .slice(0, i + 1)
          .map((b) => b.toLowerCase().replace(/\s+/g, "-"))
          .join("/")}`,
      })),
      { name: page.title, url: canonicalUrl },
    ];

    const jsonLdBreadcrumb = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    });

    // Inject SEO tags into the HTML
    let html = baseHtml;

    // Replace title
    html = html.replace(
      /<title>[^<]*<\/title>/,
      `<title>${escapeHtml(fullTitle)}</title>`,
    );

    // Replace/add meta description
    html = html.replace(
      /<meta name="description" content="[^"]*"\s*\/?>/,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );

    // Replace canonical
    html = html.replace(
      /<link rel="canonical" href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${canonicalUrl}" />`,
    );

    // Replace OG tags
    html = html.replace(
      /<meta property="og:title" content="[^"]*"\s*\/?>/,
      `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
    );
    html = html.replace(
      /<meta property="og:description" content="[^"]*"\s*\/?>/,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
    );
    html = html.replace(
      /<meta property="og:url" content="[^"]*"\s*\/?>/,
      `<meta property="og:url" content="${canonicalUrl}" />`,
    );
    html = html.replace(
      /<meta property="og:type" content="[^"]*"\s*\/?>/,
      `<meta property="og:type" content="article" />`,
    );

    // Replace Twitter tags
    html = html.replace(
      /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
    );
    html = html.replace(
      /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    );
    html = html.replace(
      /<meta name="twitter:url" content="[^"]*"\s*\/?>/,
      `<meta name="twitter:url" content="${canonicalUrl}" />`,
    );

    // Add JSON-LD structured data before </head>
    html = html.replace(
      "</head>",
      `  <script type="application/ld+json">${jsonLdArticle}</script>\n  <script type="application/ld+json">${jsonLdBreadcrumb}</script>\n  </head>`,
    );

    // Add noscript fallback with plain text content for crawlers
    if (mdContent) {
      const { content: cleanMd } = matter(mdContent);
      const plainText = cleanMd
        .replace(/```[\s\S]*?```/g, "") // remove code blocks
        .replace(/^\s*#{1,6}\s+(.+)$/gm, "<h2>$1</h2>") // headings
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
        .replace(/[*_`]/g, "") // emphasis
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .split("\n\n")
        .map((p) => `<p>${p.trim()}</p>`)
        .join("\n");

      html = html.replace(
        '<div id="root"></div>',
        `<div id="root"></div>\n    <noscript>\n      <article>\n        <h1>${escapeHtml(page.title)}</h1>\n        ${plainText}\n      </article>\n    </noscript>`,
      );
    }

    // Write the HTML file
    // Route: /liquidity-providers/depositing -> dist/liquidity-providers/depositing/index.html
    const routePath = page.route === "/" ? "" : page.route;
    const outDir = join(distDir, routePath);
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const outFile = join(outDir, "index.html");
    writeFileSync(outFile, html);
    pagesGenerated++;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

console.log(`✅ Pre-rendered ${pagesGenerated} pages for SEO`);
