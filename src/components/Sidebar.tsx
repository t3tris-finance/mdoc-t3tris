import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import type { DocEntry } from "../utils/docs";
import { docPathToRoute } from "../utils/docs";
import { useI18n } from "../i18n";
import { useSearchIndex } from "../hooks/useSearchIndex";

interface SidebarProps {
  entries: DocEntry[];
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ entries, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { t } = useI18n();
  const { search: searchDocs, indexReady } = useSearchIndex(entries);

  // Full-text search results
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return searchDocs(search);
  }, [search, searchDocs]);

  // Fallback: title-only filter for tree view when index not ready
  const filteredEntries = useMemo(() => {
    function filterEntries(items: DocEntry[], query: string): DocEntry[] {
      return items
        .map((item) => {
          if (item.children) {
            const filtered = filterEntries(item.children, query);
            if (
              filtered.length > 0 ||
              item.title.toLowerCase().includes(query)
            ) {
              return { ...item, children: filtered };
            }
            return null;
          }
          if (item.title.toLowerCase().includes(query)) return item;
          return null;
        })
        .filter(Boolean) as DocEntry[];
    }
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return filterEntries(entries, q);
  }, [entries, search]);

  const toggleSection = (slug: string) => {
    setCollapsed((prev) => ({ ...prev, [slug]: !prev[slug] }));
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={t.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <nav>
          {search.trim() && indexReady && searchResults ? (
            searchResults.length > 0 ? (
              <div className="search-results">
                {searchResults.map((result) => (
                  <Link
                    key={result.path}
                    to={result.route}
                    className={`sidebar-link search-result-item ${
                      location.pathname === result.route ? "active" : ""
                    }`}
                    onClick={onClose}
                  >
                    <span className="search-result-title">{result.title}</span>
                    {result.breadcrumb.length > 0 && (
                      <span className="search-result-breadcrumb">
                        {result.breadcrumb.join(" › ")}
                      </span>
                    )}
                    {result.snippet && (
                      <span className="search-result-snippet">
                        {result.snippet}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="search-no-results">{t.noDocsFound}</div>
            )
          ) : (
            filteredEntries.map((entry) => (
              <SidebarItem
                key={entry.slug}
                entry={entry}
                currentPath={location.pathname}
                collapsed={collapsed}
                onToggle={toggleSection}
                onNavigate={onClose}
                depth={0}
              />
            ))
          )}
        </nav>
      </aside>
    </>
  );
}

interface SidebarItemProps {
  entry: DocEntry;
  currentPath: string;
  collapsed: Record<string, boolean>;
  onToggle: (slug: string) => void;
  onNavigate: () => void;
  depth: number;
}

function SidebarItem({
  entry,
  currentPath,
  collapsed,
  onToggle,
  onNavigate,
  depth,
}: SidebarItemProps) {
  if (entry.children && entry.children.length > 0) {
    const isCollapsed = collapsed[entry.slug] ?? false;

    return (
      <div className="sidebar-section">
        <div
          className="sidebar-section-title"
          onClick={() => onToggle(entry.slug)}
        >
          <span>{entry.title}</span>
          <span className={`chevron ${!isCollapsed ? "open" : ""}`}>▶</span>
        </div>
        {!isCollapsed &&
          entry.children.map((child) => (
            <SidebarItem
              key={child.slug}
              entry={child}
              currentPath={currentPath}
              collapsed={collapsed}
              onToggle={onToggle}
              onNavigate={onNavigate}
              depth={depth + 1}
            />
          ))}
      </div>
    );
  }

  const route = docPathToRoute(entry.path);
  const isActive = currentPath === route || currentPath === route + "/";
  const nestClass = depth > 0 ? (depth > 1 ? "nested-2" : "nested") : "";

  return (
    <Link
      to={route}
      className={`sidebar-link ${nestClass} ${isActive ? "active" : ""}`}
      onClick={onNavigate}
    >
      {entry.title}
    </Link>
  );
}
