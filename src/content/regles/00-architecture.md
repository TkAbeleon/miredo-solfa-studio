# Architecture du moteur

> Public : développeurs. Ce document décrit comment le rendu HTML/CSS/JS de MireDo est construit.
> Les règles musicales viennent de la conception [ConceptionMireDo](https://github.com/TkAbeleon/ConceptionMireDo) ;
> ce dépôt ne les modifie pas, il les implémente.

## Chaîne de traitement

```text
texte .mrd ──► parseScore()  ──► Score ──► layoutScore() ──► pages / systèmes ──► <ScoreView/>
                (parser.ts)                  (layout.ts)                            (ScoreView.tsx)
                     │                                                                    │
                     ├─► pitch.ts   (degrés, altérations, octaves, hauteur absolue)       │
                     ├─► rhythm.ts  (subdivisions d'une unité)                            │
                     └─► Diagnostic[]                                                     │
                                                    playback.ts ◄── Score (parcours + son)┘
```

| Fichier | Rôle | Dépend de React ? |
|---|---|---|
| `src/lib/miredo/pitch.ts` | Graphie Sol-fa → degré, altération, octave, MIDI, nom absolu, équivalences, accords | non |
| `src/lib/miredo/rhythm.ts` | Découpage d'une unité (`.` `,` notes collées) en *slots* avec début et durée | non |
| `src/lib/miredo/parser.ts` | Lecture du texte, mesures, voix, paroles, reprises, validations | non |
| `src/lib/miredo/layout.ts` | Retours à la ligne et sauts de page | non |
| `src/lib/miredo/playback.ts` | Ordre de lecture (D.C., D.S., Coda) et synthèse Web Audio | non |
| `src/components/score/ScoreView.tsx` | Rendu en grille CSS | oui |
| `src/styles.css` (`@layer components`, classes `mrd-*`) | Typographie de la partition | — |
| `src/lib/miredo/miredo.test.ts` | Un test par règle | non |

## Principe fondamental : graphie ≠ hauteur

La conception impose de **séparer la notation écrite de la hauteur calculée**. Le modèle garde donc
toujours la graphie saisie (`Pitch.written`) et calcule la hauteur à part (`NoteInfo.midi`).
Aucune fonction ne remplace une graphie par son équivalent.

```ts
// pitch.ts
export interface Pitch {
  written: string;   // graphie exacte saisie, ex. "di_1" — jamais réécrite
  base: Degree;      // d r m f s l t
  vowel: string;     // "" | "i" | "a" | "e" | "o"
  alter: -1 | 0 | 1;
  octave: number;    // 0 = octave de référence, 1 = d1, -1 = d_1
}
```

## Modèle de partition

```ts
// parser.ts (simplifié)
interface Score {
  header: Header;              // ton, mesure, disposition, options de rendu
  voices: Voice[];             // chaque voix → Measure[] → Unit[] → slots
  unitsPerMeasure: number[];   // nombre d'unités (max des voix) par mesure
  structure: StructMark[];     // ton, segno, D.S., D.C., Fine, Coda, To Coda
  chords: ChordMark[];
  breaks: Break[];             // retours à la ligne / sauts de page manuels
  lyrics: { common: LyricLine[]; perVoice: Map<number, LyricLine> };
  notes: Map<string, NoteInfo>; // hauteur calculée, durée, équivalences
  diagnostics: Diagnostic[];
}

interface Unit {               // ce qui se trouve entre deux « : », « ! » ou barres
  toks: UnitTok[];             // jetons écrits (note, -, ., ,) — servent au rendu fidèle
  slots: Slot[];               // lecture rythmique : { kind, start, dur } en fraction d'unité
  tuplet: number | null;       // 3 ou 6 si groupe non binaire
  sepBefore: ":" | "!" | "||" | "start";
}
```

Le rendu utilise `toks` (ce qui est écrit), la lecture sonore utilise `slots` (ce qui est entendu).

## Rendu : une grille CSS par système

Chaque système est un `display: grid`. Toutes les voix partagent **les mêmes colonnes**, ce qui
aligne automatiquement les barres et les unités, comme l'exige la conception (voix et portées § 4).

```text
colonnes : [nom][crochet][:][unité][sep][unité][sep]…[barre][unité]…
rangées  : [accords?][repères][S][A][paroles?][T][B][paroles]
```

Les barres de mesure et le crochet sont des éléments qui couvrent plusieurs rangées
(`grid-row: a / b`). Les séparateurs `:` et `!` sont rendus voix par voix.

## Syntaxe de démonstration

La conception ne fixe pas encore la grammaire complète du format `.mrd`. Les en-têtes, les
directives `{…}`, les accords `<…>`, le soulignement `[ ]` et les sauts `//` `///` sont une
**syntaxe de travail provisoire** (voir « Syntaxe .mrd »). Les signes Sol-fa eux-mêmes
(`| ! : . , -`, degrés, voyelles, suffixes d'octave) suivent la conception.

## Tests

```bash
bunx vitest run src/lib/miredo
```

Chaque règle documentée ici a au moins un test dans `miredo.test.ts`.

## Système de notation choisi par partition

**Statut : Validé** (journal des décisions, 2026-11-03).

- Chaque partition déclare son propre système de notation.
- **Sol-fa** est le système par défaut quand aucun autre n'est sélectionné.
- MireDo prend en charge des systèmes existants et leurs règles établies (le solfège, par exemple)
  sans inventer de règles.
- Les règles d'un système ne doivent pas être imposées à un autre.

**État de l'implémentation : partiel.** Le moteur ne gère que le système Sol-fa. Il n'existe pas encore
d'en-tête `systeme:` : toute partition est lue en Sol-fa. Pour ajouter un autre système, il faudra
écrire un analyseur distinct qui produit le même modèle `Score` sans réutiliser les règles Sol-fa
(`NOTE_RE`, voyelles d'altération, `! : . ,`).

## Conservation de la graphie et sérialisation

**Statut : Validé.** L'éditeur, le parseur et la sérialisation conservent la graphie d'origine.

- La **source de vérité est le texte `.mrd`** saisi. Le bouton « .mrd » du Studio télécharge ce texte
  tel quel ; aucune étape ne le régénère à partir du modèle.
- Les options du Studio (octaves, paroles, crochet…) modifient seulement leur ligne d'en-tête
  (`setHeaderValue`), jamais les notes.
- Chaque jeton garde sa graphie (`Pitch.written`, voyelle écrite, suffixe d'octave), ce qui permettra
  une future sérialisation exacte depuis le modèle.

> Questions ouvertes de la conception : la représentation interne complète (syllabe, degré,
> altération, octave, hauteur), la conservation de la variante saisie dans les **exports**, et la
> conservation de la graphie lors d'une **transposition**. La transposition n'est pas implémentée.

## Archives

Le cahier des charges « Solfa Engine » (`99 - Archives`) est une **base historique**, pas une
spécification. Aucune règle n'en est tirée ici.
