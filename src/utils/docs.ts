export interface DocEntry {
  title: string;
  slug: string;
  path: string;
  order: number;
  children?: DocEntry[];
}

export async function fetchManifest(): Promise<DocEntry[]> {
  const res = await fetch("/docs-manifest.json");
  if (!res.ok) throw new Error("Failed to load docs manifest");
  return res.json();
}

export async function fetchMarkdown(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.text();
}

/**
 * Build a flat list of all pages from the manifest tree
 */
export function flattenEntries(
  entries: DocEntry[],
): { title: string; path: string; breadcrumb: string[] }[] {
  const result: { title: string; path: string; breadcrumb: string[] }[] = [];

  for (const entry of entries) {
    if (entry.children && entry.children.length > 0) {
      // It's a folder — add children recursively
      const childEntries = flattenEntries(entry.children);
      for (const child of childEntries) {
        result.push({
          ...child,
          breadcrumb: [entry.title, ...child.breadcrumb],
        });
      }
    } else {
      result.push({
        title: entry.title,
        path: entry.path,
        breadcrumb: [],
      });
    }
  }

  return result;
}

/**
 * Calculate the route path from a doc file path.
 * e.g., /docs/01-getting-started/02-installation.md -> /getting-started/installation
 */
export function docPathToRoute(docPath: string): string {
  return docPath
    .replace(/^\/docs/, "")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "")
    .replace(/\/\d+-/g, "/")
    .replace(/^\/?/, "/");
}

/**
 * Find a doc entry by route path
 */
export function findEntryByRoute(
  entries: DocEntry[],
  route: string,
): { title: string; path: string; breadcrumb: string[] } | undefined {
  const flat = flattenEntries(entries);
  return flat.find((entry) => docPathToRoute(entry.path) === route);
}
