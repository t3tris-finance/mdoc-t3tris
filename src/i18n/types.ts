export interface Translations {
  // General
  documentation: string;
  loadingDocumentation: string;
  loading: string;
  toggleMenu: string;
  toggleTheme: string;
  darkMode: string;
  lightMode: string;

  // Home page
  homeWelcome: string;
  noDocsFound: string;
  noDocsHint: string;

  // Navigation
  home: string;
  search: string;
  backToHome: string;

  // Doc Renderer
  pageNotFound: string;
  error: string;
  unableToLoad: string;
  share: string;
  linkCopied: string;

  // Export
  export: string;
  thisPage: string;
  allDocumentation: string;
  plainText: string;
  allAsMarkdown: string;
  allAsHTML: string;
  allAsText: string;

  // Heading anchors
  linkToSection: (section: string) => string;
  copyLinkToSection: string;
  copied: string;
}

export type Locale = string;

export interface LocaleConfig {
  code: Locale;
  label: string;
  flag: string;
  translations: Translations;
}
