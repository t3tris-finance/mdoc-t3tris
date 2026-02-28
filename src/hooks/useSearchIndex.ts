import { useEffect, useState, useMemo } from "react";
import type { DocEntry } from "../utils/docs";
import { flattenEntries, fetchMarkdown, docPathToRoute } from "../utils/docs";

export interface SearchResult {
  title: string;
  path: string;
  route: string;
  breadcrumb: string[];
  /** Snippet of matching content around the query */
  snippet?: string;
  /** Whether the match is in the title (higher priority) */
  titleMatch: boolean;
}

/**
 * Strips markdown syntax to produce plain text for search indexing.
 */
function stripMarkdown(md: string): string {
  return (
    md
      // Remove frontmatter
      .replace(/^---[\s\S]*?---\n?/, "")
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Remove inline code
      .replace(/`[^`]+`/g, "")
      // Remove images
      .replace(/!\[.*?\]\(.*?\)/g, "")
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
      // Remove HTML tags
      .replace(/<[^>]+>/g, "")
      // Remove headings markers
      .replace(/^#{1,6}\s+/gm, "")
      // Remove bold/italic markers
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
      // Remove blockquote markers
      .replace(/^>\s+/gm, "")
      // Remove horizontal rules
      .replace(/^[-*_]{3,}\s*$/gm, "")
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, "")
      .replace(/^[\s]*\d+\.\s+/gm, "")
      // Collapse whitespace
      .replace(/\n{2,}/g, "\n")
      .trim()
  );
}

/**
 * Extracts a snippet around the first occurrence of the query in text.
 */
function extractSnippet(
  text: string,
  query: string,
  contextChars = 60,
): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return "";

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + query.length + contextChars);

  let snippet = text.slice(start, end).replace(/\n/g, " ");
  if (start > 0) snippet = "…" + snippet;
  if (end < text.length) snippet = snippet + "…";

  return snippet;
}

interface IndexEntry {
  title: string;
  path: string;
  route: string;
  breadcrumb: string[];
  content: string; // plain text content for searching
}

/**
 * Hook that builds a full-text search index from doc entries.
 * Fetches and indexes all markdown content on mount.
 */
export function useSearchIndex(entries: DocEntry[]) {
  const [index, setIndex] = useState<IndexEntry[]>([]);
  const [indexReady, setIndexReady] = useState(false);

  const flat = useMemo(() => flattenEntries(entries), [entries]);

  useEffect(() => {
    if (flat.length === 0) return;

    let cancelled = false;

    async function buildIndex() {
      const results: IndexEntry[] = [];

      // Fetch all docs in parallel (with concurrency limit)
      const batchSize = 10;
      for (let i = 0; i < flat.length; i += batchSize) {
        const batch = flat.slice(i, i + batchSize);
        const contents = await Promise.allSettled(
          batch.map((entry) => fetchMarkdown(entry.path)),
        );

        for (let j = 0; j < batch.length; j++) {
          const entry = batch[j];
          const result = contents[j];
          const content =
            result.status === "fulfilled" ? stripMarkdown(result.value) : "";

          results.push({
            title: entry.title,
            path: entry.path,
            route: docPathToRoute(entry.path),
            breadcrumb: entry.breadcrumb,
            content,
          });
        }
      }

      if (!cancelled) {
        setIndex(results);
        setIndexReady(true);
      }
    }

    setIndexReady(false);
    buildIndex();

    return () => {
      cancelled = true;
    };
  }, [flat]);

  function search(query: string): SearchResult[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    // Split query into words for multi-word matching
    const words = q.split(/\s+/).filter(Boolean);

    return index
      .map((entry) => {
        const titleLower = entry.title.toLowerCase();
        const contentLower = entry.content.toLowerCase();

        const titleMatch = words.every((w) => titleLower.includes(w));
        const contentMatch = words.every((w) => contentLower.includes(w));

        if (!titleMatch && !contentMatch) return null;

        const snippet = contentMatch
          ? extractSnippet(entry.content, words[0])
          : undefined;

        return {
          title: entry.title,
          path: entry.path,
          route: entry.route,
          breadcrumb: entry.breadcrumb,
          snippet,
          titleMatch,
        } satisfies SearchResult;
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Title matches first
        if (a!.titleMatch && !b!.titleMatch) return -1;
        if (!a!.titleMatch && b!.titleMatch) return 1;
        return 0;
      }) as SearchResult[];
  }

  return { search, indexReady };
}
