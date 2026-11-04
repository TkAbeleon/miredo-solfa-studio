# Mesure, unités et subdivisions

Source : *05 - Rythme et durée*.

---

## 1. Barres, unités et demi-mesure : `|` `:` `!`

**Statut : Validé.**

- `|` ouvre et ferme une mesure.
- `:` sépare les unités (les temps principaux, dont la valeur dépend du dénominateur).
- `!` sépare deux moitiés égales de mesure, quand la disposition le prévoit.

### Analyse — `parser.ts`

Le parseur lit le texte caractère par caractère. Chaque `:` ou `!` *ferme* l'unité en cours
(`flushUnit`) et mémorise le séparateur placé **avant** l'unité suivante. Un `:` ou `!` en tout
début de mesure est le signe d'anacrouse (`leadingColon`).

```ts
if (c === ":" || c === "!") {
  if (st.cur.units.length === 0 && st.toks.length === 0 && st.sepBefore === "start") {
    st.cur.leadingColon = true;          // ":s_1|" → anacrouse
  } else {
    flushUnit();
    st.sepBefore = c;                    // séparateur placé avant l'unité suivante
    st.sepUl = st.ul;                    // séparateur à l'intérieur d'un soulignement ?
  }
}
```

### Rendu — `ScoreView.tsx`

Les barres de mesure sont des éléments qui couvrent **toutes les rangées de voix** du groupe.
`:` et `!` sont rendus voix par voix ; `!` est une petite barre fine qui ne traverse pas les
portées, comme sur les imprimés.

```tsx
// colonne « sep » : glyphe propre à chaque voix
<div className={cn("mrd-cell mrd-sep", unit.sepUl && "ulb")}>
  {unit.sepBefore === "!" ? <span className="mrd-half" /> : ":"}
</div>

// colonne « bar » : un seul élément par groupe de portées
<div className={cn("mrd-bar", dbl && "is-double")} style={{ gridColumn: gc, gridRow: `${a} / ${b}` }}>
  <i />
  {dbl && <i />}
</div>
```

```css
.mrd-half { display: inline-block; width: 1px; height: 1em; background: var(--ink); }
.mrd-bar { align-self: stretch; display: flex; justify-content: center; gap: 2.5px; }
.mrd-bar i { display: block; width: 1.2px; background: var(--ink); }
.mrd-bar.is-double i:last-child { width: 2.4px; }
```

---

## 2. Dispositions habituelles par signature

**Statut : Validé** pour 2, 3, 4, 5, 6, 7 et 9 unités.

| Signature | Disposition | Exemple |
|---|---|---|
| 2/4 | sans `!` | `\|d:d\|` |
| 3/4, 3/8 | sans `!` | `\|d:d:d\|` |
| 4/4 | 2 + 2 | `\|d:d!d:d\|` |
| 5/4, 7/4 | sans `!` | `\|d:d:d:d:d\|` |
| 6/4, 6/8 | 3 + 3 | `\|d:d:d!d:d:d\|` |
| 9/8 | 3 + 3 + 3 | `\|d:d:d!d:d:d!d:d:d\|` |

```ts
const DEFAULT_GROUPS: Record<number, number[]> = {
  2: [2], 3: [3], 4: [2, 2], 5: [5], 6: [3, 3], 7: [7], 9: [3, 3, 3],
};
// Autres signatures : [num] sans « ! », et diagnostic « provisoire ».
```

La validation compare ensuite chaque séparateur écrit à la position attendue. Elle signale un
écart (niveau *info*) **sans rien corriger** :

```ts
const want = boundaries.has(u) ? "!" : ":";
const got = ms.units[u]!.sepBefore;
if (got !== "||" && got !== want) diagnostics.push({ level: "info", … });
```

```mrd
noms: aucun
mesure: 9/8
[V] |d:d:d!d:d:d!d:d:d|r:r:r!r:r:r!r:r:r|
```

---

## 3. Disposition alternative choisie par le compositeur

**Statut : Validé.** La signature (`mesure: 9/8`) et la disposition d'écriture
(`disposition: 3/4`) sont deux champs distincts. La disposition s'applique à toute la partition ;
la signature affichée reste 9/8.

```ts
const dm = /^(\d+)\s*\/\s*(\d+)$/.exec(hv("disposition"));
const dispNum = dm ? +dm[1]! : time.num;      // nombre d'unités attendues par mesure
const disposition = { label: …, units: dispNum, groups: groupsFor(dispNum).groups, custom: !!dm };
```

```mrd-timing
noms: aucun
mesure: 9/8
disposition: 3/4
[V] |d:r:m|f:m:r|d:-:-|
```

---

## 4. Subdivisions : `.` puis `,`

**Statut : Validé** pour `.` ; lecture hiérarchique de `,` **provisoire**.

À l'intérieur d'une unité :

1. `.` découpe l'unité en parts égales ;
2. `,` découpe chaque part en parts égales ;
3. une part vide est un **silence** ;
4. plusieurs notes collées se partagent leur part également.

### Algorithme — `rhythm.ts`

```ts
export function subdivide(items: RhythmItem[]): { slots: Slot[]; tuplet: number | null } {
  const out: Slot[] = [];
  const parts = splitBy(items, "dot");
  const n = parts.length;
  parts.forEach((part, i) => {
    const ps = i / n, pd = 1 / n;
    const subs = splitBy(part, "comma");
    if (subs.length === 1) compact(part, ps, pd, out);
    else subs.forEach((sub, j) => compact(sub, ps + (j * pd) / subs.length, pd / subs.length, out));
  });
  …
}

function compact(arr: RhythmItem[], start: number, dur: number, out: Slot[]) {
  const sounding = arr.filter((a) => a.kind === "note" || a.kind === "hold");
  if (sounding.length === 0) { out.push({ tok: null, kind: "rest", start, dur }); return; }
  const d = dur / sounding.length;
  sounding.forEach((a, i) => out.push({ tok: a.tok, kind: a.kind, start: start + i * d, dur: d }));
}
```

| Écriture | Slots (début / durée en unités) |
|---|---|
| `d.` | d 0 / ½ · silence ½ / ½ |
| `.d` | silence 0 / ½ · d ½ / ½ |
| `s.-,f` | s 0 / ½ · − ½ / ¼ · f ¾ / ¼ |
| `ddd` | d 0 / ⅓ · d ⅓ / ⅓ · d ⅔ / ⅓ |

### Rendu

Le rendu affiche les jetons **tels qu'écrits** (`.` et `,` compris), espacés finement :

```tsx
if (t.t === "dot") return <span className="mrd-sub">.</span>;
if (t.t === "comma") return <span className="mrd-sub">,</span>;
```

Exemple de la conception, `.d:d.d|d:d:d|` (le début est une demi-unité silencieuse) :

```mrd-timing
noms: aucun
mesure: 3/4
[V] .d:d.d|d:d:d|
```

`|d.:::|` : la note dure une demi-unité ; ce n'est pas le `:` qui fixe la durée.

```mrd-timing
noms: aucun
mesure: 4/4
[V] |d.:::|
```

---

## 5. Plusieurs notes collées dans une unité

**Statut : Validé** pour la saisie compacte décrite (`:dd:`, `:ddd:`, `:dddd:`, `:dddddd:`).

Le tokenizer reconnaît une syllabe complète (`[drmfslt][aeio]?(_?\d)?`), donc `dr` donne deux notes et
`di` une seule note altérée.

```mrd-timing
noms: aucun
mesure: 4/4
triolets: texte
[V] |dd:ddd!dddd:dddddd|
```

---

## 6. Triolets et sextolets

**Statut : Validé** pour les écritures ; le rendu en courbe est une option **provisoire**.

`subdivide` signale un groupe non binaire :

```ts
if (!hasComma && (n === 3 || n === 6) && parts.every((p) => p.length === 1)) tuplet = n;  // d.d.d
if (!hasComma && n === 1 && (items.length === 3 || items.length === 6)) tuplet = items.length; // ddd
if (n === 2 && parts.every((p) => splitBy(p, "comma").length === 3)) tuplet = 6;           // ,,.,,
```

Avec `triolets: courbe` (par défaut), les séparateurs sont masqués et une courbe numérotée est
dessinée au-dessus :

```tsx
<span className="mrd-tuplet">
  <svg viewBox="0 0 100 10" preserveAspectRatio="none">
    <path vectorEffect="non-scaling-stroke" d="M2,10 Q50,-4 98,10" />
  </svg>
  <span className="mrd-tnum">{unit.tuplet}</span>
  {content}
</span>
```

```mrd-timing
noms: aucun
mesure: 2/4
[V] |d.r.m:s,l,t.d1,r1,m1|
```

---

## 7. Prolongation `-`

**Statut : Validé.**

- elle prolonge la note précédente de la durée de sa subdivision ;
- elle peut traverser `!` et les barres de mesure ;
- un `-` sans note précédente est **invalide**.

### Calcul de la durée totale — `parser.ts`

```ts
let current: NoteInfo | null = null;
unit.slots.forEach((slot) => {
  if (slot.kind === "rest") { current = null; return; }
  const tok = unit.toks[slot.tok!];
  if (tok.t === "hold") {
    if (!current) {
      tok.error = "Prolongation sans note précédente";
      diagnostics.push({ level: "error", … });
    } else current.dur += slot.dur;          // traverse unités et mesures
    return;
  }
  current = /* nouvelle NoteInfo */;
});
```

### Rendu

Le `-` s'affiche en tiret demi-cadratin `–`. En cas d'erreur, il est souligné en rouge :

```tsx
<span className={cn("mrd-hold", t.error && "is-error")} title={t.error ?? "Prolongation"}>–</span>
```

```css
.mrd-hold.is-error { color: var(--destructive); text-decoration: wavy underline var(--destructive); }
```

`|s.-,f:d!-:-|-.:!:|` : Sol ½, prolongation ¼, Fa ¼, puis Do prolongé à travers la barre.

```mrd-timing
noms: aucun
mesure: 4/4
[V] |s.-,f:d!-:-|-.:!:|
```

Cas invalide :

```mrd
noms: aucun
mesure: 4/4
[V] |-:d!:-|
```

---

## 8. Silences implicites

**Statut : À clarifier.** Aucun symbole de silence n'existe : une part vide est silencieuse.
`|.d::|` est un contretemps.

> Lecture **provisoire** de `|d,.d:|` : `.` divise d'abord, `,` ensuite → d ¼, silence ¼, d ½.
> La conception décrit ce cas autrement (quatre parts égales) et le laisse ouvert. Il ne faut pas
> en déduire une règle générale.

```mrd-timing
noms: aucun
mesure: 3/4
[V] |.d::|d,.d::|
```

---

## 9. Valeur de l'unité selon le dénominateur

**Statut : Validé.** `|d:d:d|` s'écrit pareil en 3/4 et en 3/8 : seule la valeur de l'unité change
(une noire ou une croche). De même pour 6/4 et 6/8.

**Implémentation.** Le modèle compte le temps **en unités**. Le dénominateur est conservé
(`header.time.den`) et affiché, mais la lecture sonore utilise `tempo:` en **unités par minute**.
Écrire `tempo: 120` en 6/8 donne donc 120 croches par minute.

---

## 10. Une nouvelle note termine la prolongation

**Statut : Validé.** Une nouvelle note met fin à la prolongation précédente et commence sa propre
durée. Une part vide (silence) met fin au son aussi.

```ts
if (slot.kind === "rest") { current = null; return; }   // silence : fin du son
…
current = info;                                           // nouvelle note : nouvelle durée
```

---

## 11. Limites de la notation Sol-fa

**Statut : Validé.** La notation définit les unités, les divisions en deux et en quatre, et certains
groupes usuels (triolets, sextolets). Elle **ne définit pas** de règle générale pour toutes les
divisions. MireDo ne doit pas présenter une extension comme une règle Sol-fa.

**Comportement actuel :** une division non prévue (5 notes collées, ou `d.d.d.d.d`) est découpée en
parts égales par la règle de lecture compacte, **sans courbe de groupe** (`tuplet` reste `null`).
C'est une lecture de saisie propre à MireDo, pas une convention Sol-fa. Sa syntaxe et son rendu
restent à décider.

```mrd-timing
noms: aucun
mesure: 2/4
triolets: courbe
[V] |ddddd:d.d.d.d.d|
```

---

## 12. Exemples encore ouverts dans la conception

**Statut : À clarifier.** La conception cite des écritures dont la lecture n'est **pas** validée. Elles
ne doivent pas servir à déduire une règle générale. Voici ce que donne le moteur aujourd'hui :

| Écriture | Lecture actuelle (provisoire) |
|---|---|
| `\|d.-.d:\|` | trois tiers : d ⅓, prolongation ⅓, d ⅓ (lu comme un triolet) |
| `:d-d:` | trois tiers : d ⅓, prolongation ⅓, d ⅓ (notes collées) |
| `:d..d:` | trois tiers : d ⅓, **silence** ⅓, d ⅓ — alors que la conception parle de `..` comme d'une division en quatre |
| `:,,.,,:` | sextolet de six parts vides |

```mrd-timing
noms: aucun
mesure: 3/4
triolets: texte
[V] |d.-.d:d-d:d..d|
```

> À trancher avec la conception : la lecture de `..`, les silences et prolongations à l'intérieur
> d'un triolet, et la syntaxe des silences dans toutes les subdivisions.
