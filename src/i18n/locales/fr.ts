import type { LocaleConfig } from "./types";

const fr: LocaleConfig = {
  code: "fr",
  label: "Français",
  flag: "🇫🇷",
  translations: {
    // General
    documentation: "Documentation",
    loadingDocumentation: "Chargement de la documentation...",
    loading: "Chargement...",
    toggleMenu: "Ouvrir/fermer le menu",
    toggleTheme: "Changer le thème",
    darkMode: "Mode sombre",
    lightMode: "Mode clair",

    // Home page
    homeWelcome:
      "Bienvenue dans la documentation. Utilisez la barre latérale pour naviguer entre les différentes sections, ou explorez les pages ci-dessous.",
    noDocsFound: "Aucune documentation trouvée.",
    noDocsHint:
      "Ajoutez des fichiers .md dans le dossier docs/ pour commencer.",

    // Navigation
    home: "Accueil",
    search: "Rechercher...",
    backToHome: "← Retour à l'accueil",

    // Doc Renderer
    pageNotFound: "Page non trouvée",
    error: "Erreur",
    unableToLoad: "Impossible de charger cette page",
    share: "Partager",
    linkCopied: "Lien copié dans le presse-papiers !",

    // Export
    export: "Exporter",
    thisPage: "Cette page",
    allDocumentation: "Toute la documentation",
    plainText: "Texte brut (.txt)",
    allAsMarkdown: "Tout en Markdown (.zip)",
    allAsHTML: "Tout en HTML (.zip)",
    allAsText: "Tout en Texte (.zip)",

    // Heading anchors
    linkToSection: (section: string) => `Lien vers la section « ${section} »`,
    copyLinkToSection: "Copier le lien vers cette section",
    copied: "Copié !",
  },
};

export default fr;
