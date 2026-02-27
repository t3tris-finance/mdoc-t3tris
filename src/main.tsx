import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "highlight.js/styles/github.css";
import "./styles/highlight-dark.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
