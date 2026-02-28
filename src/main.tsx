import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "highlight.js/styles/github.css";
import "./styles/highlight-dark.css";
import App from "./App.tsx";
import { I18nProvider } from "./i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
