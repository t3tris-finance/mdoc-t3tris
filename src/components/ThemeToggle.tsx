import { useI18n } from "../i18n";

interface ThemeToggleProps {
  theme: string;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const { t } = useI18n();

  return (
    <button
      className="theme-toggle"
      onClick={onToggle}
      title={theme === "light" ? t.darkMode : t.lightMode}
      aria-label={t.toggleTheme}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
