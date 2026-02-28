import { useState } from "react";
import { useI18n } from "../i18n";

export default function LanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useI18n();
  const [open, setOpen] = useState(false);

  const current = availableLocales.find((l) => l.code === locale);

  return (
    <div className="language-switcher">
      <button
        className="language-switcher-btn"
        onClick={() => setOpen(!open)}
        aria-label="Change language"
        title="Change language"
      >
        <span className="language-flag">{current?.flag}</span>
        <span className="language-code">{locale.toUpperCase()}</span>
      </button>
      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 199 }}
            onClick={() => setOpen(false)}
          />
          <div className="language-menu">
            {availableLocales.map((loc) => (
              <button
                key={loc.code}
                className={`language-menu-item ${loc.code === locale ? "active" : ""}`}
                onClick={() => {
                  setLocale(loc.code);
                  setOpen(false);
                }}
              >
                <span className="language-flag">{loc.flag}</span>
                <span>{loc.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
