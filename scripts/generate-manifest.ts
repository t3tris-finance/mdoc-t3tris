/**
 * Scans the docs/ folder and generates a JSON manifest of all .md files.
 * Run with: bun scripts/generate-manifest.ts
 */
import { readdirSync, statSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, basename, extname } from "path";
import matter from "gray-matter";
import { readFileSync } from "fs";

interface DocEntry {
  title: string;
  slug: string;
  path: string;
  order: number;
  children?: DocEntry[];
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function titleFromFilename(filename: string): string {
  const name = basename(filename, extname(filename));
  if (name === "index") return "";
  return name
    .replace(/^\d+-/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getOrder(name: string): number {
  const match = name.match(/^(\d+)-/);
  if (match) return parseInt(match[1], 10);
  if (name === "index.md") return -1;
  return 999;
}

function scanDir(dir: string, basePath: string): DocEntry[] {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir).sort((a, b) => {
    const orderA = getOrder(a);
    const orderB = getOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return a.localeCompare(b);
  });

  const result: DocEntry[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const children = scanDir(fullPath, `${basePath}/${entry}`);
      const dirTitle = titleFromFilename(entry) || entry;

      result.push({
        title: dirTitle,
        slug: slugify(entry),
        path: `${basePath}/${entry}`,
        order: getOrder(entry),
        children: children.filter((c) => !c.path.endsWith("/index.md")),
      });
    } else if (entry.endsWith(".md")) {
      const content = readFileSync(fullPath, "utf-8");
      const { data } = matter(content);
      const title = data.title || titleFromFilename(entry);
      const relPath = `${basePath}/${entry}`;

      result.push({
        title,
        slug: slugify(basename(entry, ".md")),
        path: relPath,
        order: data.order ?? getOrder(entry),
      });
    }
  }

  return result;
}

const docsDir = join(process.cwd(), "docs");
const manifest = scanDir(docsDir, "/docs");

const outDir = join(process.cwd(), "public");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

writeFileSync(join(outDir, "docs-manifest.json"), JSON.stringify(manifest, null, 2));
console.log("✅ docs-manifest.json generated successfully!");
console.log(`   Found ${JSON.stringify(manifest, null, 2).split('"path"').length - 1} document(s)`);
