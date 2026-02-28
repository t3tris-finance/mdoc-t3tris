import { useState, useEffect, useMemo } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ThemeToggle from "./components/ThemeToggle";
import DocRenderer from "./components/DocRenderer";
import LanguageSwitcher from "./components/LanguageSwitcher";
import HomePage from "./pages/HomePage";
import { useTheme } from "./hooks/useTheme";
import { useI18n, isValidLocale } from "./i18n";
import {
  fetchManifest,
  flattenEntries,
  docPathToRoute,
  getLocaleFromPath,
} from "./utils/docs";
import type { DocEntry } from "./utils/docs";

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale } = useI18n();
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Sync locale from URL
  useEffect(() => {
    const urlLocale = getLocaleFromPath(location.pathname);
    if (urlLocale && isValidLocale(urlLocale) && urlLocale !== locale) {
      setLocale(urlLocale);
    }
    // Redirect paths without a valid locale prefix (except root) to locale-prefixed version
    if (
      !urlLocale &&
      location.pathname !== "/" &&
      !location.pathname.match(/^\/[a-z]{2}(\/|$)/)
    ) {
      navigate(`/${locale}${location.pathname}`, { replace: true });
    }
  }, [location.pathname]);

  useEffect(() => {
    setLoading(true);
    fetchManifest(locale)
      .then(setEntries)
      .catch((err) => console.error("Failed to load manifest:", err))
      .finally(() => setLoading(false));
  }, [locale]);

  const routes = useMemo(() => {
    const flat = flattenEntries(entries);
    return flat.map((entry) => ({
      path: docPathToRoute(entry.path),
      entry,
    }));
  }, [entries]);

  if (loading) {
    return (
      <div className="loading" style={{ height: "100vh" }}>
        <div className="loading-spinner" />
        Loading documentation...
      </div>
    );
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            {sidebarOpen ? "✕" : "☰"}
          </button>
          <a
            href={`/${locale}/`}
            className="header-logo"
            style={{ textDecoration: "none" }}
          >
            T3<span>tris</span>
          </a>
        </div>
        <div className="header-right">
          <LanguageSwitcher />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <Sidebar
        entries={entries}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to={`/${locale}/`} replace />} />
          <Route path={`/${locale}`} element={<HomePage entries={entries} />} />
          {routes.map(({ path }) => (
            <Route
              key={path}
              path={path}
              element={<DocRenderer entries={entries} />}
            />
          ))}
          <Route path="*" element={<DocRenderer entries={entries} />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
