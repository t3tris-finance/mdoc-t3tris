import { useEffect, useState, useMemo } from "react";
import GithubSlugger from "github-slugger";
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
  /** Slug of the nearest heading above the match (for hash navigation) */
  headingSlug?: string;
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
 * Parses markdown into sections delimited by headings.
 * Each section records the heading slug (matching rehype-slug / github-slugger)
 * and the stripped plain text content beneath it.
 */
function parseSections(md: string): ContentSection[] {
  const slugger = new GithubSlugger();
  const clean = md.replace(/^---[\s\S]*?---\n?/, "");
  const lines = clean.split("\n");
  const sections: ContentSection[] = [{ slug: "", text: "" }];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const headingText = headingMatch[2]
        .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
        .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\(.*?\)/g, "$1")
        .trim();
      const slug = slugger.slug(headingText);
      sections.push({ slug, text: "" });
    } else {
      sections[sections.length - 1].text += line + "\n";
    }
  }

  // Strip markdown from each section's accumulated text
  for (const section of sections) {
    section.text = stripMarkdown(section.text);
  }

  return sections;
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

interface ContentSection {
  slug: string; // heading slug (empty string for content before first heading)
  text: string; // stripped plain text of this section
}

interface IndexEntry {
  title: string;
  path: string;
  route: string;
  breadcrumb: string[];
  content: string; // plain text content for searching
  sections: ContentSection[]; // content split by headings
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

          const sections = parseSections(
            result.status === "fulfilled" ? result.value : "",
          );

          results.push({
            title: entry.title,
            path: entry.path,
            route: docPathToRoute(entry.path),
            breadcrumb: entry.breadcrumb,
            content,
            sections,
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

        // Find the heading slug for the first section that matches
        let headingSlug: string | undefined;
        if (contentMatch) {
          for (const section of entry.sections) {
            if (words.every((w) => section.text.toLowerCase().includes(w))) {
              headingSlug = section.slug || undefined;
              break;
            }
          }
        }

        return {
          title: entry.title,
          path: entry.path,
          route: entry.route,
          breadcrumb: entry.breadcrumb,
          snippet,
          titleMatch,
          headingSlug,
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
