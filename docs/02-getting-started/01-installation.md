---
title: Installation
order: 1
---

# Installation

## Prérequis

- [Bun](https://bun.sh/) v1.0 ou supérieur
- Un éditeur de texte (VS Code recommandé)

## Étapes d'installation

### 1. Cloner le projet

```bash
git clone <votre-repo> ma-documentation
cd ma-documentation
```

### 2. Installer les dépendances

```bash
bun install
```

### 3. Lancer le serveur de développement

```bash
bun run dev
```

Le site sera accessible sur `http://localhost:5173`.

## Structure du projet

| Dossier/Fichier | Description |
|---|---|
| `docs/` | Vos fichiers Markdown de documentation |
| `src/` | Code source de l'application React |
| `public/` | Fichiers statiques |
| `scripts/` | Scripts utilitaires (génération du manifest) |

## Commandes disponibles

```bash
# Développement
bun run dev

# Build de production
bun run build

# Prévisualiser le build
bun run preview

# Générer le manifest de docs manuellement
bun run docs:gen
```
