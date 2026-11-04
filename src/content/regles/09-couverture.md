# Couverture de la conception

Tableau de contrôle : chaque règle ou décision de la conception MireDo, la page qui l'explique, et
son état dans le code.

**Légende**
- **Implémenté** : conforme à la conception, avec un test ou un exemple en direct.
- **Partiel** : une partie seulement est faite (détail dans la page).
- **Provisoire** : lecture de travail d'un point que la conception n'a pas encore tranché.
- **À concevoir** : rien n'est fait, la conception le renvoie à plus tard.

## Vision et principes (README, Vision, Journal)

| Règle | Page | État |
|---|---|---|
| Nom MireDo, extension `.mrd` | Architecture | Implémenté (import / téléchargement `.mrd`) |
| Ne pas inventer de conventions ; signaler les points non confirmés | toutes | Implémenté (badges et diagnostics *info*) |
| Séparer notation écrite et hauteur calculée | Architecture, Hauteur § 6 | Implémenté |
| Séparer sémantique, texte, rendu et conversion | Architecture | Implémenté (parser / layout / ScoreView / playback) |
| Système de notation par partition, Sol-fa par défaut | Architecture | Partiel (Sol-fa seul) |
| Conserver la graphie dans le modèle et à la sérialisation | Architecture | Implémenté (texte source conservé) |
| Archives = historique, pas une spécification | Architecture | Respecté |

## Hauteur (01–04)

| Règle | Page | État |
|---|---|---|
| Degrés `d r m f s l t` relatifs à la référence | Hauteur § 1 | Implémenté |
| Altération ascendante `i` | Hauteur § 2 | Implémenté |
| Altération descendante `a e o`, formes rares acceptées, `te ta to` | Hauteur § 3 | Implémenté (table exacte : provisoire) |
| Équivalences de hauteur sans réécriture | Hauteur § 6 | Implémenté |
| Formes courantes privilégiées dans l'interface | Hauteur § 10 | Partiel (pas de suggestions) |
| Pas de `♮ ♯ ♭`, pas de bécarre ; `b #` réservés à la tonalité | Hauteur § 8 | Implémenté |
| Octaves numériques `d1 d_1 di1 di_1` | Hauteur § 4 | Implémenté |
| Rendu exposant / indice ; thème apostrophe / virgule | Hauteur § 4 | Implémenté |
| Suffixe `0`, plage, espaces, casse, alias | Hauteur § 11 | Provisoire |
| Référence `A–G` + `b` / `#`, `d` = référence | Hauteur § 5 | Implémenté |
| Préférence bémol | Hauteur § 9 | Implémenté |
| Pas de mode majeur / mineur imposé ; liberté du compositeur | Hauteur § 5, § 7 | Implémenté |
| Octave de référence absolue | Hauteur § 5 | Provisoire (`d` en octave 4) |

## Rythme (05)

| Règle | Page | État |
|---|---|---|
| `\|` `:` `!` | Rythme § 1 | Implémenté |
| Dispositions 2, 3, 4, 5, 6, 7, 9 | Rythme § 2 | Implémenté |
| Valeur d'unité selon le dénominateur (3/4 ≡ 3/8 en écriture) | Rythme § 9 | Implémenté |
| Disposition alternative pour toute la partition | Rythme § 3 | Implémenté |
| `.` division binaire, parts vides = silence, mesure qui commence par un silence | Rythme § 4 | Implémenté |
| Durée selon la place dans la subdivision (`\|d.:::\|`) | Rythme § 4 | Implémenté |
| Notes collées réparties également | Rythme § 5 | Implémenté |
| Triolets, sextolets, rendu en courbe | Rythme § 6 | Implémenté (rendu : provisoire) |
| Prolongation `-` (traverse `!` et les barres ; sans note = invalide) | Rythme § 7 | Implémenté |
| Une nouvelle note termine la prolongation | Rythme § 10 | Implémenté |
| Silences implicites, contretemps | Rythme § 8 | Implémenté ; `\|d,.d:\|` provisoire |
| Limites : pas de règle générale pour toutes les divisions | Rythme § 11 | Provisoire |
| `\|d.-.d:\|`, `:d-d:`, `:d..d:` | Rythme § 12 | Provisoire |
| Autres signatures (8, 10, 12…) | Rythme § 2 | Provisoire (sans `!`) |

## Doubles barres et tonalité (05 § 9)

| Règle | Page | État |
|---|---|---|
| Double barre au sens habituel, facultative, jamais automatique | Barres § 1 | Implémenté |
| Double barre en milieu de mesure | Barres § 1 | Implémenté |
| Changement de tonalité avec ou sans double barre | Barres § 2 | Implémenté (syntaxe provisoire) |
| Indication de transition `(…)` non jouée | Barres § 3 | Implémenté |
| Double barre de prolongation FFPM, désactivée par défaut | Barres § 4 | Provisoire |

## Voix, portées, paroles (06)

| Règle | Page | État |
|---|---|---|
| SATB par défaut, voix libres, nombre illimité | Voix § 1 | Implémenté |
| Référence de portée numérique par voix (0 Sol, −1 Fa) | Voix § 1 | Implémenté |
| Clés classiques en mode avancé (Sol, Fa, Ut) | Voix § 7 | Partiel (Ut non nommée) |
| Nom, référence et registre séparés | Voix § 8 | Implémenté |
| Barres alignées à travers les portées | Voix § 2 | Implémenté |
| Crochet par défaut, peut être masqué | Voix § 2 | Implémenté |
| Mesure entière reportée ; retour manuel même en milieu de mesure | Mise en page | Implémenté (syntaxe provisoire) |
| Sauts de page automatiques et manuels | Mise en page | Implémenté |
| Paroles uniques sous toutes les portées | Voix § 3 | Implémenté |
| Paroles entre deux groupes, barres interrompues | Voix § 4 | Implémenté |
| Paroles propres à une voix (passage) | Voix § 5 | Implémenté |
| Soulignement explicite, voix concernée seulement | Voix § 6 | Implémenté |

## Reprises et indications (07)

| Règle | Page | État |
|---|---|---|
| Reprises textuelles, pas de barres de reprise automatiques | Reprises § 1 | Implémenté |
| D.C., D.S. avec repères `S_1`, `S_2`… | Reprises § 1 | Implémenté (graphie provisoire) |
| Fine, Coda, To Coda ; D.C. / D.S. al Fine / al Coda | Reprises § 1–2 | Implémenté |
| Parcours distinct de l'ordre linéaire | Reprises § 2 | Implémenté |
| Plusieurs retours ou plusieurs Coda | Reprises § 2 | Provisoire (chaque saut joué une fois) |
| Nuances, tempo, point d'orgue, articulations | Reprises § 3 | Implémenté (rendu et lecture approchés) |
| Ornements, trémolos, notes de grâce | Reprises § 4 | À concevoir (texte libre) |
| Transmission aux exports | Reprises § 5 | Partiel (lecture seulement, pas d'export) |

## Accords (08)

| Règle | Page | État |
|---|---|---|
| Degrés romains facultatifs | Accords | Implémenté |
| Accords en lettres latines | Accords | Implémenté |
| Accords Sol-fa relatifs à Do (`Dom7` en G = Gm7) | Accords | Implémenté |
| Accord distinct des notes, présent ou absent | Accords | Implémenté |
| Édition comparable à MuseScore | Accords | À concevoir |

## Questions ouvertes de la conception

Elles sont reprises dans les pages concernées et **ne sont pas présentées comme des règles** :
table des voyelles descendantes, variantes `te` / `ta` / `to` dans les exports, plage et lexique des
octaves, rendus disponibles, octave de référence absolue, structure du centre tonal, changement de
référence en cours de partition, transposition, modèle interne complet.
