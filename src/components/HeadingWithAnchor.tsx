import type { JSX, ReactNode } from "react";
import { useI18n } from "../i18n";

function getTextContent(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(getTextContent).join("");
  if (children && typeof children === "object" && "props" in children) {
    return getTextContent((children as JSX.Element).props.children);
  }
  return "";
}

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  id?: string;
}

export default function HeadingWithAnchor({
  level,
  children,
  id,
}: HeadingProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const slug = id || "";
  const { t } = useI18n();

  const handleCopyLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      const el = e.currentTarget as HTMLElement;
      el.classList.add("copied");
      setTimeout(() => el.classList.remove("copied"), 2000);
    });
  };

  return (
    <Tag id={slug} className="heading-anchor-group">
      {children}
      {slug && (
        <a
          href={`#${slug}`}
          className="heading-anchor"
          onClick={handleCopyLink}
          aria-label={t.linkToSection(getTextContent(children))}
          title={t.copyLinkToSection}
        >
          <span className="anchor-icon">#</span>
          <span className="anchor-copied-label">{t.copied}</span>
        </a>
      )}
    </Tag>
  );
}
