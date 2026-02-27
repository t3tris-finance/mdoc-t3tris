---
title: Introduction
order: 1
---

# Bienvenue sur mDoc

mDoc est un générateur de documentation statique qui transforme vos fichiers Markdown en un site web élégant et navigable.

## Fonctionnalités

- 📁 **Organisation par dossiers** — Créez des dossiers et glissez vos `.md` pour structurer la doc
- 🌗 **Mode clair / sombre** — Basculez entre les thèmes selon vos préférences
- 📥 **Export multi-formats** — Téléchargez chaque page en Markdown, HTML, PDF ou texte brut
- 📦 **Export complet** — Téléchargez toute la documentation dans un ZIP
- 🔗 **Partage facile** — Partagez n'importe quelle page via un lien direct
- 🔍 **Recherche instantanée** — Trouvez rapidement la page que vous cherchez
- 📱 **Responsive** — Fonctionne parfaitement sur mobile et desktop

## Démarrage rapide

```bash
# Ajoutez vos fichiers .md dans le dossier docs/
# Puis lancez le serveur de développement
bun run dev
```

## Structure des fichiers

```
docs/
├── 01-introduction.md
├── 02-getting-started/
│   ├── 01-installation.md
│   └── 02-configuration.md
└── 03-guides/
    ├── 01-ecrire-de-la-doc.md
    └── 02-personnalisation.md
```

> **Astuce :** Préfixez vos fichiers et dossiers avec des numéros (ex: `01-`, `02-`) pour contrôler l'ordre d'affichage.
