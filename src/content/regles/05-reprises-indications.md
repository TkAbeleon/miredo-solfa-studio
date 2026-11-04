# Reprises et indications musicales

Source : *07 - Reprises et indications musicales*.

> Le sens musical de toutes ces indications est **celui du solfège habituel**. MireDo ne fait que
> les représenter, les afficher et les transmettre à la lecture. La graphie exacte de saisie reste à
> confirmer : les directives `{…}` ci-dessous sont provisoires.

---

## 1. Repères et instructions de reprise

| Saisie provisoire | Sens | Rendu |
|---|---|---|
| `{segno:1}` ou `{S_1}` | repère Segno S₁ | 𝄋₁ |
| `{ds:1}` `{ds:1 al fine}` `{ds:1 al coda}` | Dal Segno vers S₁ | D.S.₁ al … |
| `{dc}` `{dc al fine}` `{dc al coda}` | Da Capo | D.C. al … |
| `{fine}` | fin | Fine |
| `{coda}` | début de la Coda | 𝄌 Coda |
| `{tocoda}` | point de saut | To Coda 𝄌 |

Plusieurs Segno sont distingués par leur identifiant. Les barres de reprise classiques ne sont
**pas** ajoutées automatiquement.

### Analyse

```ts
export function parseDirective(raw: string): Directive {
  if ((m = /^ton\s*[:=]\s*(.+)$/i.exec(s))) return { kind: "key", key: m[1]!.trim() };
  if (/* segno */) return { kind: "segno", id: m[1] ?? "1" };
  if ((m = /^d\.?\s?s\.?(?:\s*[:_]?\s*(\d+))?(?:\s+al\s+(fine|coda))?$/i.exec(s)))
    return { kind: "ds", id: m[1] ?? "1", al: m[2] ?? null };
  if ((m = /^d\.?\s?c\.?(?:\s+al\s+(fine|coda))?$/i.exec(s))) return { kind: "dc", al: m[1] ?? null };
  …
}
```

Les directives structurelles sont rangées dans `score.structure` avec leur position (mesure,
unité, fraction). Le parseur vérifie les renvois : D.S. sans Segno, « al Coda » sans Coda ni To
Coda, « al Fine » sans Fine.

### Rendu

Elles sont dessinées dans la rangée de repères (`TopCell` → `StructLabel`). Une marque placée en fin
d'unité est alignée à droite.

```tsx
case "segno":
  return <span className="mrd-struct"><span className="mrd-glyph">𝄋</span><sub>{d.id}</sub></span>;
case "ds":
  return <span className="mrd-struct">D.S.<sub>{d.id}</sub>{d.al && ` al ${d.al === "fine" ? "Fine" : "Coda"}`}</span>;
```

```css
.mrd-glyph { font-family: "Noto Music", var(--font-score); }  /* 𝄋 𝄌 𝄐 */
```

---

## 2. Parcours de lecture

**Statut : Validé** pour le sens ; plusieurs retours ou plusieurs Coda restent à spécifier.

Le moteur de lecture ne suit pas l'ordre linéaire des mesures. `computePath` renvoie la suite des
mesures réellement jouées :

```ts
export function computePath(score: Score): number[] {
  …
  while (i < n) {
    order.push(i);
    if (jumped && mode === "fine" && at("fine", i)) break;            // arrêt à Fine
    if (jumped && mode === "coda" && at("tocoda", i)) { i = coda.m; mode = null; continue; }
    const k = jumps.findIndex((j, idx) => j.m === i && !used.has(idx)); // chaque saut une fois
    if (k >= 0) {
      used.add(k); jumped = true; mode = jumps[k].d.al;
      i = jumps[k].d.kind === "dc" ? 0 : segnoMeasure(jumps[k].d.id);
      continue;
    }
    i++;
  }
  return order;
}
```

D.C. al Fine :

```mrd-path
noms: aucun
mesure: 2/4
[V] |d:r|m:-{fine}||s:f|m:r{dc al fine}||
```

D.S.₁ al Coda avec To Coda :

```mrd-path
noms: aucun
mesure: 2/4
[V] |d:d|{segno:1}r:m|{tocoda}f:s|l:t{ds:1 al coda}|| {coda}d1:-||
```

Deux Segno distincts :

```mrd-path
noms: aucun
mesure: 2/4
[V] {segno:1}|d:r|{segno:2}m:f{fine}|s:l{ds:2 al fine}||
```

---

## 3. Nuances, tempo, point d'orgue, articulations

**Statut : Validé** (sens classique ; représentation à détailler).

Ces directives s'attachent **à la note ou à la prolongation qui suit** (`NoteTok.marks`) :

| Famille | Exemples reconnus |
|---|---|
| Nuances | `pp p mp mf f ff fff sf sfz fp cresc dim decresc` |
| Tempo | `rit. rall. accel. a tempo ritenuto rubato allargando` |
| Point d'orgue | `{^}` `{fermata}` |
| Articulations | `{stacc}` `{>}` `{ten}` `{marcato}` `{legato}` |
| Texte libre | tout le reste, en italique |

### Rendu

```tsx
function markView(d: Directive): ReactNode {
  switch (d.kind) {
    case "fermata": return <span className="mrd-glyph" title="Point d'orgue">𝄐</span>;
    case "dynamic": return <span className="mrd-dyn">{d.text}</span>;
    case "tempo":
    case "text":    return <span className="mrd-expr">{d.text}</span>;
    case "artic":   return <span className="mrd-glyph">{ d.type === "staccato" ? "·" : d.type === "accent" ? ">" : … }</span>;
  }
}
```

Les marques sont placées en position absolue au-dessus de la note. Dans un système qui contient des
marques, la rangée de cette voix reçoit un espace supplémentaire (`has-marks`) sur **toutes** ses
cellules, pour garder les notes alignées.

```css
.mrd-marks { position: absolute; bottom: calc(100% - 1px); left: 0; display: flex; gap: 3px; }
.mrd-cell.has-marks { padding-top: 15px; }
```

### Effet sur la lecture sonore — `playback.ts`

| Indication | Effet appliqué (approximation) |
|---|---|
| nuance | gain de la voix (`pp` 0,28 … `ff` 1) |
| `cresc` / `dim` | ±0,05 de gain par unité pendant 6 unités |
| `rit.` / `accel.` | durée d'unité ×1,07 / ×0,95 par unité, jusqu'à `a tempo` |
| point d'orgue | unité allongée ×1,8 pour toutes les voix |
| staccato / accent | durée ×0,45 / gain ×1,3 |

```mrd
noms: aucun
mesure: 4/4
expression: Andante
[V] |{pp}d:{cresc}r!m:{f}f|{stacc}s:{stacc}s!{>}l:{ten}t|{rit.}d1:-!{^}d1:-|
```

---

## 4. Ornements, trémolos, répétitions rapides, notes de grâce

**Statut : À concevoir.** Appoggiatures, acciaccaturas, ornements et trémolos gardent leur sens
classique. La conception ne fixe pas de syntaxe Sol-fa, car leur usage est rare, et renvoie leur
traitement technique à plus tard.

**Comportement actuel :** aucune syntaxe dédiée. Une directive inconnue comme `{tr}` ou `{appog.}`
devient un **texte libre** (`kind: "text"`), affiché en italique au-dessus de la note, sans effet sur
la lecture sonore. Une note de grâce ne peut pas encore être saisie comme une note sans durée.

```mrd
noms: aucun
mesure: 2/4
[V] |{tr}s:{trem.}m|
```

---

## 5. Transmission aux exports

**Statut : Validé** (principe) : les indications doivent être conservées dans le modèle, affichées, et
transmises à la lecture **et aux exports**.

**État : partiel.** Elles sont conservées (`NoteTok.marks`, `score.structure`), affichées et
transmises à la lecture Web Audio. Il n'existe pas encore d'export (MIDI, MusicXML…) : seuls
l'impression (PDF via le navigateur) et le texte `.mrd` d'origine sont disponibles. Les paramètres
(une valeur de tempo, par exemple) restent à spécifier.
