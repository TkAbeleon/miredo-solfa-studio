# Syntaxe .mrd de démonstration (provisoire)

> La conception MireDo n'a pas encore fixé la grammaire complète du format `.mrd`. Cette page
> décrit la **syntaxe de travail** utilisée par le Studio. Seuls les signes Sol-fa (degrés,
> voyelles, suffixes d'octave, `| ! : . , -`) viennent de la conception ; le reste peut changer.

## Structure d'un fichier

```text
% commentaire (ligne commençant par %)
clé: valeur          ← en-têtes, avant la première ligne [ … ]
[S] …notes…          ← ligne de voix (plusieurs lignes [S] s'enchaînent)
[paroles] …          ← paroles communes (couplet 1)
[paroles 2] …        ← couplet 2
[paroles:T] …        ← paroles propres à la voix T
```

## En-têtes

| Clé | Valeurs | Défaut |
|---|---|---|
| `titre`, `gauche`, `droite`, `info` | texte | — |
| `ton` | `A`–`G` + `b`/`#` | `C` |
| `libelle-ton` | texte (ex. `Do dia`) | `Do =` |
| `mesure` | `n/d` | `4/4` |
| `disposition` | `n/d` | celle de la signature |
| `tempo` | unités par minute | `80` |
| `expression` | texte | — |
| `voix` | `Nom=ref; …` | voix rencontrées, ref 0 |
| `paroles` | `dessous` \| `entre` | `dessous` |
| `groupes` | `S A / T B` | moitié / moitié |
| `paroles-voix` | nom de voix | première voix |
| `crochet` | `oui` \| `non` | `oui` |
| `octaves` | `chiffres` \| `traditionnel` | `chiffres` |
| `cles` | `solfa` \| `classique` | `solfa` |
| `triolets` | `courbe` \| `texte` | `courbe` |
| `ffpm` | `oui` \| `non` | `non` |
| `noms` | `premier` \| `tous` \| `aucun` | `premier` |
| `taille` | 11–22 | 15 |

Le Studio modifie ces lignes avec `setHeaderValue`, sans toucher au reste du texte :

```ts
export function setHeaderValue(text: string, key: string, value: string): string {
  const lines = text.split("\n");
  const idx = lines.findIndex((l) => new RegExp(`^\\s*${key}\\s*:`, "i").test(l));
  if (idx >= 0) lines[idx] = `${key}: ${value}`;
  else lines.splice(firstBodyLine, 0, `${key}: ${value}`);
  return lines.join("\n");
}
```

## Jetons d'une ligne de voix

| Jeton | Sens | Origine |
|---|---|---|
| `d r m f s l t` + `i`/`a`/`e`/`o` + `1`/`_1` | note | conception |
| `\|` `\|\|` `!` `:` | barres et séparateurs | conception |
| `.` `,` | subdivisions | conception |
| `-` (ou `–`) | prolongation | conception |
| `(l_1)` | indication de transition | conception (forme) |
| `{ton:D}` | changement de tonalité | provisoire |
| `{segno:1}` `{ds:1 al coda}` `{dc al fine}` `{fine}` `{coda}` `{tocoda}` | reprises | provisoire |
| `{p}` `{cresc}` `{rit.}` `{^}` `{stacc}` `{>}` `{texte}` | indications | provisoire |
| `<Gm7>` `<Dom7>` `<V>` | accords / degrés | provisoire |
| `[` … `]` | soulignement (même syllabe) | provisoire |
| `//` `///` | retour à la ligne / saut de page | provisoire |
| `%` | commentaire jusqu'à la fin de la ligne | provisoire |

## Jetons de paroles

| Jeton | Sens |
|---|---|
| `syl-` | syllabe (le trait d'union est affiché tel quel) |
| `_` | la note suivante ne reçoit pas de syllabe |
| `@N` | reprendre à la mesure N |
| `\|` | ignoré (aide visuelle) |
| `ka‿a` | élision écrite telle quelle |

## Diagnostics

`parseScore` ne lève jamais d'exception. Il renvoie `diagnostics: { level, line, message }[]` :

- `error` : invalide selon la conception (`-` sans note, caractère inconnu, tonalité invalide) ;
- `warning` : incohérence probable (mesure incomplète, voix de longueurs différentes, renvoi manquant) ;
- `info` : point non tranché par la conception, ou écart à la disposition habituelle.

Exemple complet :

```mrd
titre: Exemple
ton: F
mesure: 3/4
voix: S=0; B=-1
[S] {mf}:d |m:r.d:t_1 |{^}d:-:-||
[B] :d_1 |d_1:s_1:s_1 |d_1:-:-||
[paroles] Ho a- nao re- ny
```
