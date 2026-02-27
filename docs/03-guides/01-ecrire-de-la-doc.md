---
title: Écrire de la documentation
order: 1
---

# Écrire de la documentation

## Créer une page

Pour ajouter une nouvelle page, il suffit de créer un fichier `.md` dans le dossier `docs/` :

```bash
# Fichier simple
touch docs/ma-nouvelle-page.md

# Dans un sous-dossier
mkdir -p docs/mon-guide
touch docs/mon-guide/01-etape-un.md
```

Puis relancez `bun run dev` ou exécutez `bun run docs:gen` pour mettre à jour la navigation.

## Bonnes pratiques

### 1. Structurez avec des dossiers

Organisez vos documents par thème ou section :

```
docs/
├── 01-introduction.md
├── 02-installation/
│   ├── 01-prerequis.md
│   └── 02-demarrage.md
├── 03-utilisation/
│   ├── 01-bases.md
│   └── 02-avance.md
└── 04-api/
    └── 01-reference.md
```

### 2. Utilisez le frontmatter

Ajoutez un titre clair et un ordre explicite :

```yaml
---
title: Guide de démarrage rapide
order: 1
---
```

### 3. Ajoutez des exemples de code

Les blocs de code avec le langage spécifié bénéficient de la coloration syntaxique :

~~~markdown
```python
def hello():
    print("Bonjour le monde !")
```
~~~

### 4. Utilisez les liens internes

Référencez d'autres pages de la documentation :

```markdown
Voir la [page d'installation](/getting-started/installation).
```

## Formats d'export

Chaque page peut être téléchargée dans les formats suivants :

| Format | Extension | Description |
|---|---|---|
| Markdown | `.md` | Fichier source brut |
| HTML | `.html` | Page web autonome |
| PDF | `.pdf` | Document imprimable |
| Texte | `.txt` | Texte brut sans formatage |

Vous pouvez également télécharger **toute la documentation** dans un fichier ZIP.
