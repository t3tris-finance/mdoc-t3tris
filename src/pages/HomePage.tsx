import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { DocEntry } from "../utils/docs";
import { docPathToRoute, flattenEntries } from "../utils/docs";
import { useI18n } from "../i18n";

interface HomePageProps {
  entries: DocEntry[];
}

export default function HomePage({ entries }: HomePageProps) {
  const allPages = useMemo(() => flattenEntries(entries), [entries]);
  const { t } = useI18n();

  return (
    <div>
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
