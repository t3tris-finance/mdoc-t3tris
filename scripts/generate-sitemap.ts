/**
 * Generates sitemap.xml from the docs manifest.
 * Run with: bun scripts/generate-sitemap.ts
 * Called automatically during `bun run build`.
 */
import {
  readdirSync,
  statSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "fs";
import { join } from "path";

const SITE_URL = "https://docs.t3tris.xyz"; // Update with your actual domain

interface DocEntry {
  title: string;
  slug: string;
  path: string;
  order: number;
  children?: DocEntry[];
}

/**
 * Convert a doc file path to a URL route.
 * e.g., /docs/en/02-liquidity-providers/01-getting-started.md -> /liquidity-providers/getting-started
 */
function docPathToRoute(docPath: string): string {
  return docPath
    .replace(/^\/docs\/[a-z]{2}(-[a-z]{2})?/i, "")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "")
    .replace(/\/\d+-/g, "/")
    .replace(/^\/?/, "/");
}

/**
 * Flatten the manifest tree into a list of routes.
 */
function flattenRoutes(entries: DocEntry[]): string[] {
  const routes: string[] = [];
  for (const entry of entries) {
    if (entry.children && entry.children.length > 0) {
      routes.push(...flattenRoutes(entry.children));
    } else {
      routes.push(docPathToRoute(entry.path));
    }
  }
  return routes;
}

/**
 * Get the last modified date of a file in ISO format.
 */
function getLastMod(filePath: string): string {
  try {
    const docsRoot = join(
      process.cwd(),
      filePath.startsWith("/") ? filePath.slice(1) : filePath,
    );
    if (existsSync(docsRoot)) {
      const stat = statSync(docsRoot);
      return stat.mtime.toISOString().split("T")[0];
    }
  } catch {
    // fallback
  }
  return new Date().toISOString().split("T")[0];
}

// Read all locale manifests
const publicDir = join(process.cwd(), "public");
const manifestFiles = readdirSync(publicDir).filter((f) =>
  f.match(/^docs-manifest\.[a-z]{2}(-[a-z]{2})?\.json$/),
);

const allRoutes = new Set<string>();
const routeLastMods = new Map<string, string>();

// Always include the home page
allRoutes.add("/");
routeLastMods.set("/", new Date().toISOString().split("T")[0]);

for (const manifestFile of manifestFiles) {
  const manifest: DocEntry[] = JSON.parse(
    readFileSync(join(publicDir, manifestFile), "utf-8"),
  );
  const routes = flattenRoutes(manifest);

  for (const route of routes) {
    allRoutes.add(route);
  }

  // Get last modified dates from actual files
  for (const entry of flattenEntries(manifest)) {
    const route = docPathToRoute(entry.path);
    const lastMod = getLastMod(entry.path);
    routeLastMods.set(route, lastMod);
  }
}

function flattenEntries(entries: DocEntry[]): DocEntry[] {
  const result: DocEntry[] = [];
  for (const entry of entries) {
    if (entry.children && entry.children.length > 0) {
      result.push(...flattenEntries(entry.children));
    } else {
      result.push(entry);
    }
  }
  return result;
}

// Generate sitemap XML
const today = new Date().toISOString().split("T")[0];
const urls = Array.from(allRoutes)
  .sort()
  .map((route) => {
    const lastmod = routeLastMods.get(route) || today;
    const priority =
      route === "/" ? "1.0" : route.split("/").length <= 2 ? "0.8" : "0.6";
    const changefreq = route === "/" ? "weekly" : "monthly";

    return `  <url>
    <loc>${SITE_URL}${route}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const outputPath = join(publicDir, "sitemap.xml");
writeFileSync(outputPath, sitemap);
console.log(`✅ sitemap.xml generated (${allRoutes.size} URLs)`);
