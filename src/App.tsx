import { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import ThemeToggle from './components/ThemeToggle';
import DocRenderer from './components/DocRenderer';
import HomePage from './pages/HomePage';
import { useTheme } from './hooks/useTheme';
import { fetchManifest, flattenEntries, docPathToRoute } from './utils/docs';
import type { DocEntry } from './utils/docs';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const [entries, setEntries] = useState<DocEntry[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchManifest()
      .then(setEntries)
      .catch((err) => console.error('Failed to load manifest:', err))
      .finally(() => setLoading(false));
  }, []);

  const routes = useMemo(() => {
    const flat = flattenEntries(entries);
    return flat.map((entry) => ({
      path: docPathToRoute(entry.path),
      entry,
    }));
  }, [entries]);

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="loading-spinner" />
        Chargement de la documentation...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <header className="app-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
            <a href="/" className="header-logo" style={{ textDecoration: 'none' }}>
              m<span>Doc</span>
            </a>
          </div>
          <div className="header-right">
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
            <Route path="/" element={<HomePage entries={entries} />} />
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
    </BrowserRouter>
  );
}
