import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { DocEntry } from "../utils/docs";
import { docPathToRoute, flattenEntries } from "../utils/docs";
import { useI18n } from "../i18n";
import SEO from "../components/SEO";

interface HomePageProps {
  entries: DocEntry[];
}

export default function HomePage({ entries }: HomePageProps) {
  const allPages = useMemo(() => flattenEntries(entries), [entries]);
  const { t, locale } = useI18n();

  return (
    <div>
      <SEO
        title="Documentation"
        description="T3tris Protocol documentation — a tokenized vault protocol built on ERC-4626 for professional asset management. Guides for liquidity providers, asset managers, and developers."
        path="/"
        type="website"
        locale={locale}
      />
      <div className="markdown-body">
        <h1>📚 {t.documentation}</h1>
        <p>{t.homeWelcome}</p>

        {entries.map((section) => (
          <div key={section.slug} style={{ marginBottom: "2rem" }}>
            <h2>{section.title}</h2>
            {section.children && section.children.length > 0 ? (
              <ul>
                {section.children.map((child) => (
                  <li key={child.slug}>
                    <Link to={docPathToRoute(child.path)}>{child.title}</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                <Link to={docPathToRoute(section.path)}>{section.title}</Link>
              </p>
            )}
          </div>
        ))}

        {allPages.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--text-tertiary)",
            }}
          >
            <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>📂</p>
            <p>{t.noDocsFound}</p>
            <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
              {t.noDocsHint}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
