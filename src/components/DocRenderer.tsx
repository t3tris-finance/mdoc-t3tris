import { useEffect, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkFrontmatter from "remark-frontmatter";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { all } from "lowlight";
// @ts-expect-error – highlightjs-solidity has no types
import { solidity, yul } from "highlightjs-solidity";
import type { DocEntry } from "../utils/docs";
import { fetchMarkdown, findEntryByRoute } from "../utils/docs";
import Breadcrumb from "./Breadcrumb";
import ExportDropdown from "./ExportDropdown";
import HeadingWithAnchor from "./HeadingWithAnchor";
import { useI18n } from "../i18n";
import type { Components } from "react-markdown";

interface DocRendererProps {
  entries: DocEntry[];
}

const markdownComponents: Partial<Components> = {
  h1: ({ children, id }) => (
    <HeadingWithAnchor level={1} id={id}>
      {children}
    </HeadingWithAnchor>
  ),
  h2: ({ children, id }) => (
    <HeadingWithAnchor level={2} id={id}>
      {children}
    </HeadingWithAnchor>
  ),
  h3: ({ children, id }) => (
    <HeadingWithAnchor level={3} id={id}>
      {children}
    </HeadingWithAnchor>
  ),
  h4: ({ children, id }) => (
    <HeadingWithAnchor level={4} id={id}>
      {children}
    </HeadingWithAnchor>
  ),
  h5: ({ children, id }) => (
    <HeadingWithAnchor level={5} id={id}>
      {children}
    </HeadingWithAnchor>
  ),
  h6: ({ children, id }) => (
    <HeadingWithAnchor level={6} id={id}>
      {children}
    </HeadingWithAnchor>
  ),
};

type DocState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; content: string };

export default function DocRenderer({ entries }: DocRendererProps) {
  const location = useLocation();
  const [state, setState] = useState<DocState>({ status: "loading" });
  const { t } = useI18n();

  const currentEntry = useMemo(
    () => findEntryByRoute(entries, location.pathname),
    [entries, location.pathname],
  );

  useEffect(() => {
    if (!currentEntry) return;

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
        setState({ status: "ready", content: clean });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [currentEntry]);

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

  const content = state.content;
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
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkFrontmatter]}
          rehypePlugins={[
            [rehypeHighlight, { languages: { ...all, solidity, yul } }],
            rehypeSlug,
            rehypeRaw,
          ]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
