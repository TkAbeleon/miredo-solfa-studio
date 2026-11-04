# MireDo — Studio Tonic Sol-fa

Rendu HTML / CSS / JS de partitions Tonic Sol-fa, fidèle à la conception
[ConceptionMireDo](https://github.com/TkAbeleon/ConceptionMireDo).

Références visuelles :
- les partitions réelles du dossier [`01 - Vision`](https://github.com/TkAbeleon/ConceptionMireDo/tree/main/01%20-%20Vision) ;
- les sites https://www.tonicsolfa.net et https://tonic-solfa.maxacrea.pro/.

## Pages de l'application

| Adresse | Contenu |
|---|---|
| `/` | Studio : éditeur `.mrd`, partition A4 en direct, écoute, impression |
| `/cas` | Catalogue des cas de la conception, rendus en direct |
| `/regles` | Documentation développeur : chaque règle, son code et un aperçu |

---

## Instructions pour les développeurs

### 1. Lire la conception avant de coder

Les règles musicales **ne viennent pas de ce dépôt**. Elles viennent de ConceptionMireDo :

```sh
git clone https://github.com/TkAbeleon/ConceptionMireDo.git
```

Lire dans cet ordre : `README.md`, `01 - Vision/`, `02 - Notation Tonic Sol-fa/` (00 à 08),
`03 - Suivi de conception/` (journal des décisions et questions ouvertes).
`99 - Archives/` est un historique : on n'en tire **aucune** règle.

### 2. Règles strictes à respecter

1. **Ne jamais inventer de convention Sol-fa.** Une règle absente de la conception se marque
   « Provisoire » ou « À clarifier », dans le code (diagnostic `info`) et dans la documentation.
2. **Une proposition n'est pas une règle.** Seuls les points marqués *Validé* dans la conception ou
   dans son journal des décisions sont des règles.
3. **La graphie écrite n'est jamais réécrite.** `mi` reste `mi` même s'il sonne comme `f` ; `ti_1`
   n'est jamais remplacé par `d`. La hauteur absolue se calcule à part (`NoteInfo.midi`).
4. **Aucune correction musicale automatique.** On n'impose ni mode majeur/mineur, ni double barre,
   ni barre de reprise, ni soulignement. Le compositeur décide ; MireDo signale, sans corriger.
5. **Les indications musicales gardent leur sens classique** (nuances, tempo, point d'orgue,
   articulations, D.C., D.S., Coda). MireDo les représente ; il ne leur donne pas de nouveau sens.
6. **Les règles d'un système de notation ne s'appliquent pas à un autre.** Le Sol-fa est le système
   par défaut.
7. **Séparer les rôles :** nom de voix ≠ référence de portée ≠ hauteur ; signature ≠ disposition ;
   symbole d'accord ≠ notes écrites ; indication de transition `( )` ≠ note jouée.
8. **La syntaxe `.mrd` actuelle est provisoire** : en-têtes, `{…}`, `<…>`, `[ ]`, `//`, `///`.
   Seuls les signes Sol-fa (`d r m f s l t`, voyelles, `1` / `_1`, `| ! : . , -`) viennent de la
   conception.

### 3. Où se trouve chaque chose

| Fichier | Rôle |
|---|---|
| `src/lib/miredo/pitch.ts` | degrés, altérations, octaves, référence tonale, équivalences, accords |
| `src/lib/miredo/rhythm.ts` | subdivisions d'une unité (`.`, `,`, notes collées, triolets) |
| `src/lib/miredo/parser.ts` | lecture du texte `.mrd`, voix, paroles, reprises, diagnostics |
| `src/lib/miredo/layout.ts` | retours à la ligne et pages |
| `src/lib/miredo/playback.ts` | ordre de lecture et son |
| `src/components/score/ScoreView.tsx` | rendu en grille CSS |
| `src/styles.css` (classes `mrd-*`) | typographie de la partition |
| `src/content/regles/*.md` | documentation technique de chaque règle |
| `src/lib/miredo/miredo.test.ts` | un test par règle |

Le moteur (`src/lib/miredo/`) est en TypeScript pur, sans React, pour rester testable.

### 4. Ajouter ou modifier une règle

1. Vérifier dans la conception que la règle est **Validée**. Sinon, la traiter comme provisoire.
2. Modifier le moteur dans `src/lib/miredo/`, puis le rendu dans `ScoreView.tsx` si nécessaire.
3. Ajouter un test dans `miredo.test.ts`, avec les valeurs exactes de la conception.
4. Documenter la règle dans le bon fichier `src/content/regles/NN-*.md` : statut, règle, code
   d'analyse, code de rendu, CSS, et un exemple en direct :

   ````md
   ```mrd-timing
   noms: aucun
   mesure: 4/4
   [V] |d.:::|
   ```
   ````

   Blocs disponibles : `mrd` (aperçu), `mrd-timing` (tableau des durées), `mrd-pitch` (tableau des
   hauteurs), `mrd-path` (ordre de lecture).
5. Mettre à jour la ligne correspondante de `src/content/regles/09-couverture.md`.
6. Si un extrait de code cité dans la documentation change, mettre la documentation à jour.

### 5. Lancer le projet

```sh
npm i
npm run dev
npx vitest run          # tests des règles
```

---

Ce projet a été construit avec [Lovable](https://lovable.dev/projects/8dab59c0-754d-4ad4-a4dc-08e11ffc0232).
