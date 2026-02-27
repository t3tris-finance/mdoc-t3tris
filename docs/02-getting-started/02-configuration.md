---
title: Configuration
order: 2
---

# Configuration

## Frontmatter

Chaque fichier Markdown peut contenir un bloc **frontmatter** en YAML pour personnaliser son affichage :

```yaml
---
title: Mon titre personnalisé
order: 1
---
```

### Propriétés disponibles

| Propriété | Type     | Description                                      |
| --------- | -------- | ------------------------------------------------ |
| `title`   | `string` | Titre affiché dans la sidebar et le fil d'Ariane |
| `order`   | `number` | Ordre d'affichage dans la navigation             |

## Nommage des fichiers

### Convention de nommage

Les fichiers et dossiers peuvent être préfixés avec des numéros pour contrôler l'ordre :

```
01-premier-fichier.md    → "Premier Fichier"
02-deuxieme-fichier.md   → "Deuxieme Fichier"
mon-fichier.md           → "Mon Fichier"
```

Le préfixe numérique est automatiquement retiré du titre affiché.

### Fichiers `index.md`

Un fichier `index.md` dans un dossier sera utilisé comme page d'accueil de cette section.

## Markdown supporté

mDoc supporte le **GitHub Flavored Markdown** (GFM) avec :

- Tableaux
- Listes de tâches
- Barré (~~texte~~)
- Blocs de code avec coloration syntaxique
- HTML brut embarqué
- Notes de bas de page
- Et plus encore !

### Exemple de syntaxe

```javascript
// Coloration syntaxique automatique
function hello(name) {
  console.log(`Bonjour, ${name} !`);
}
```

- [x] Tâche terminée
- [ ] Tâche en cours
- [ ] Tâche à faire

> **Note :** Les citations sont stylisées automatiquement.
