import type { LocaleConfig } from "./types";

const en: LocaleConfig = {
  code: "en",
  label: "English",
  flag: "🇬🇧",
  translations: {
    // General
    documentation: "Documentation",
    loadingDocumentation: "Loading documentation...",
    loading: "Loading...",
    toggleMenu: "Toggle menu",
    toggleTheme: "Toggle theme",
    darkMode: "Dark mode",
    lightMode: "Light mode",

    // Home page
    homeWelcome:
      "Welcome to the documentation. Use the sidebar to navigate between sections, or explore the pages below.",
    noDocsFound: "No documentation found.",
    noDocsHint: "Add .md files to the docs/ folder to get started.",

    // Navigation
    home: "Home",
    search: "Search...",
    backToHome: "← Back to home",

    // Doc Renderer
    pageNotFound: "Page not found",
    error: "Error",
    unableToLoad: "Unable to load this page",
    share: "Share",
    linkCopied: "Link copied to clipboard!",

    // Export
    export: "Export",
    thisPage: "This page",
    allDocumentation: "All documentation",
    plainText: "Plain text (.txt)",
    allAsMarkdown: "All as Markdown (.zip)",
    allAsHTML: "All as HTML (.zip)",
    allAsText: "All as Text (.zip)",

    // Heading anchors
    linkToSection: (section: string) => `Link to section "${section}"`,
    copyLinkToSection: "Copy link to this section",
    copied: "Copied!",
  },
};

export default en;
