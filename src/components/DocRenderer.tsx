import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeShikiFromHighlighter from "@shikijs/rehype/core";
import { createHighlighter, type HighlighterGeneric } from "shiki";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import type { DocEntry } from "../utils/docs";
import { fetchMarkdown, findEntryByRoute } from "../utils/docs";
import Breadcrumb from "./Breadcrumb";
import ExportDropdown from "./ExportDropdown";
import { useI18n } from "../i18n";

// Pre-create highlighter once (singleton promise)
const highlighterPromise = createHighlighter({
  themes: ["github-light", "github-dark"],
  langs: [
    "solidity",
    "typescript",
    "bash",
    "javascript",
    "json",
    "yaml",
    "markdown",
  ],
});

interface DocRendererProps {
  entries: DocEntry[];
}

async function renderMarkdown(
  md: string,
  highlighter: HighlighterGeneric<any, any>,
): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkFrontmatter)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(function () {
      return rehypeShikiFromHighlighter(highlighter, {
        themes: {
          light: "github-light",
          dark: "github-dark",
        },
        defaultColor: false,
      });
    })
    .use(rehypeSlug)
    .use(rehypeStringify, { allowDangerousHtml: true })
    .process(md);
  return String(result);
}

type DocState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; html: string };

export default function DocRenderer({ entries }: DocRendererProps) {
  const location = useLocation();
  const [state, setState] = useState<DocState>({ status: "loading" });
  const [highlighter, setHighlighter] = useState<HighlighterGeneric<
    any,
    any
  > | null>(null);
  const { t } = useI18n();

  const currentEntry = useMemo(
    () => findEntryByRoute(entries, location.pathname),
    [entries, location.pathname],
  );

  // Load highlighter once
  useEffect(() => {
    highlighterPromise.then(setHighlighter);
  }, []);

  useEffect(() => {
    if (!currentEntry || !highlighter) return;

    let cancelled = false;
    setState({ status: "loading" });

    fetchMarkdown(currentEntry.path)
      .then((md) => {
        if (cancelled) return;
        let clean = md;
        if (md.startsWith("---")) {
          const end = md.indexOf("---", 3);
          if (end !== -1) clean = md.slice(end + 3).trim();
        }
        return renderMarkdown(clean, highlighter);
      })
      .then((html) => {
        if (cancelled || !html) return;
        setState({ status: "ready", html });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [currentEntry, highlighter]);

  // Scroll to heading if hash
  useEffect(() => {
    if (state.status !== "ready") return;
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [state, location.hash]);

  if (!currentEntry) {
    return (
      <div className="not-found">
        <h1>404</h1>
        <p>{t.pageNotFound}</p>
        <a href="/">{t.backToHome}</a>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        {t.loading}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="not-found">
        <h1>{t.error}</h1>
        <p>{t.unableToLoad}</p>
        <a href="/">{t.backToHome}</a>
      </div>
    );
  }

  const shareUrl = window.location.href;

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: currentEntry.title,
        url: shareUrl,
      });
    } else {
      await navigator.clipboard.writeText(shareUrl);
      alert(t.linkCopied);
    }
  };

  return (
    <div>
      <Breadcrumb
        items={currentEntry.breadcrumb}
        current={currentEntry.title}
      />
      <div className="page-actions">
        <ExportDropdown
          docPath={currentEntry.path}
          title={currentEntry.title}
          allEntries={entries}
        />
        <button className="btn" onClick={handleShare}>
          🔗 {t.share}
        </button>
      </div>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: state.html }}
      />
    </div>
  );
}
