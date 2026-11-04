# Voix, portées et paroles

Source : *06 - Voix et portées*.

---

## 1. Structure des voix

**Statut : Validé.** SATB est proposé par défaut, mais le nombre et les noms des voix sont libres.
Chaque voix a sa **propre référence de portée** (`0` = clé de Sol, `-1` = clé de Fa, autres entiers
selon la même logique). Le nom, la référence et le registre ne doivent pas être confondus.

```text
voix: S=0; A=0; T=-1; B=-1
voix: Voix 1=0; Voix 2=+1; Basse=-1
```

```ts
interface Voice { name: string; ref: number; measures: Measure[] }
```

La référence ne modifie **pas** la hauteur écrite (`NoteInfo.midi`). Elle sert à la hauteur jouée,
de façon **provisoire** : `playedMidi = midi + 12 * ref`.

### Rendu des noms et des clés

- `noms: premier | tous | aucun` choisit où afficher les noms.
- `cles: solfa` affiche la référence numérique (mode par défaut pour les utilisateurs Sol-fa).
- `cles: classique` affiche les clés classiques (mode avancé).

```tsx
function ClefGlyph({ refNum }: { refNum: number }) {
  if (refNum === 0) return <span className="mrd-clef" title="Clé de Sol">𝄞</span>;
  if (refNum === -1) return <span className="mrd-clef" title="Clé de Fa">𝄢</span>;
  return <span className="mrd-ref">réf {fmtRef(refNum)}</span>; // autres positions : non nommées
}
```

```mrd
noms: tous
cles: classique
crochet: non
mesure: 2/4
voix: Voix 1=0; Voix 2=+1; Basse=-1
[Voix 1] |d:m|s:-|
[Voix 2] |m:s|d1:-|
[Basse] |d_1:d_1|m_1:-|
```

---

## 2. Barres alignées et crochet de système

**Statut : Validé.** Les barres traversent toutes les portées. Un crochet relie les portées au début
de chaque système ; il est affiché par défaut et peut être masqué (`crochet: non`).

Comme toutes les voix partagent les colonnes de la même grille, l'alignement est automatique. Le
crochet est un SVG étiré sur les rangées de voix :

```tsx
<div className="mrd-brace" style={{ gridColumn: gc, gridRow: `${braceSpan[0]} / ${braceSpan[1]}` }}>
  {h.bracket && (
    <svg viewBox="0 0 10 100" preserveAspectRatio="none">
      <path vectorEffect="non-scaling-stroke"
            d="M9,1 C3,3 6,22 5,40 C5,46 3,49 1,50 C3,51 5,54 5,60 C6,78 3,97 9,99" />
    </svg>
  )}
  {(!h.bracket || groups.length > 1) && <span className="mrd-startbar" />}
</div>
```

`vector-effect: non-scaling-stroke` garde un trait constant quelle que soit la hauteur du système.

```mrd
noms: tous
ton: F
mesure: 3/4
voix: S=0; A=0; T=-1; B=-1
[S] |m:r:d|r:-:-|
[A] |d:t_1:d|t_1:-:-|
[T] |s:s:m|s:-:-|
[B] |d_1:s_1:l_1|s_1:-:-|
[paroles] Ho a- nao re- ny
```

---

## 3. Paroles uniques, alignées sur les notes

**Statut : Validé.** Les paroles sont écrites **une seule fois** pour l'ensemble vocal.

### Alignement

Chaque syllabe est posée sur l'attaque suivante (slot `note`) de la voix de référence (la première
voix, ou `paroles-voix:`). Les prolongations ne reçoivent pas de syllabe.

```ts
const onsets = [];
voices[vi].measures.forEach((ms, m) =>
  ms.units.forEach((unit, u) =>
    unit.slots.forEach((s) => s.kind === "note" && onsets.push({ m, u, start: s.start }))));

for (const tk of body.split(/\s+/)) {
  if (tk === "|") continue;                 // aide visuelle ignorée
  if (/^@\d+$/.test(tk)) { /* sauter à la mesure N */ continue; }
  const o = onsets[ptr++]!;
  if (tk === "_") continue;                 // note sans nouvelle syllabe (mélisme)
  map.get(`${o.m}:${o.u}`).push({ start: o.start, text: tk });
}
```

Plusieurs lignes `[paroles]` se suivent dans le même couplet ; `[paroles 2]` ouvre un deuxième
couplet.

### Rendu

La cellule de paroles répartit les syllabes en proportion de leur position dans l'unité :

```tsx
function LyricCell({ arr, small }) {
  const sorted = [...arr].sort((a, b) => a.start - b.start);
  return (
    <div className={cn("mrd-cell mrd-lyrics", small && "is-voice")}>
      {sorted[0] && sorted[0].start > 0 && <span style={{ flex: `${sorted[0].start} 1 0` }} />}
      {sorted.map((l, i) => (
        <span key={i} className="mrd-syl"
              style={{ flex: `${(sorted[i + 1]?.start ?? 1) - l.start} 1 auto` }}>
          {l.text}
        </span>
      ))}
    </div>
  );
}
```

---

## 4. Paroles entre deux groupes de portées

**Statut : Validé.** Option `paroles: entre`. En SATB, S A forment le groupe du haut et T B celui du
bas ; `groupes:` permet d'autres regroupements. Les barres de mesure **ne traversent pas** la ligne
de paroles.

```ts
// une barre par groupe : elle s'arrête au-dessus de la ligne de paroles
groups.forEach((_, gi) => {
  const [a, b] = groupSpan(gi);
  cells.push(<div className="mrd-bar" style={{ gridColumn: gc, gridRow: `${a} / ${b}` }}>…</div>);
});
```

```mrd
noms: tous
paroles: entre
groupes: S A / T B
mesure: 4/4
voix: S=0; A=0; T=-1; B=-1
[S] |s:s!l:s|d1:-!-:-|
[A] |m:m!f:m|m:-!-:-|
[T] |d:d!d:d|s:-!-:-|
[B] |d_1:d_1!f_1:d_1|d_1:-!-:-|
[paroles] Ha- le- lu- ia, A- men
```

---

## 5. Paroles propres à une voix

**Statut : Validé.** Pour un passage où une voix a un texte différent, `[paroles:B]` place ses
paroles directement sous sa portée. Elles n'apparaissent que dans les systèmes où cette voix a des
syllabes, et `@N` permet de commencer à la mesure N.

---

## 6. Soulignement des notes portant une même syllabe

**Statut : Validé.** Le soulignement est une **indication explicite du compositeur** ; il n'est
jamais déduit des paroles. Il ne concerne que la voix où il est écrit et ne change ni la hauteur ni
la durée.

Syntaxe provisoire : `[` … `]`. Chaque jeton garde un drapeau `ul`, et le séparateur lu à
l'intérieur aussi (`sepUl`).

### Rendu continu

Pour que le trait soit continu à travers `:`, chaque cellule a un remplissage gauche (`mrd-pad`)
et droit (`mrd-fill`). Ils ne sont soulignés que si le soulignement continue de ce côté. Le trait
est un fond dessiné à une hauteur fixe, identique dans toutes les cellules de la rangée :

```tsx
<span className={cn("mrd-pad", unit.sepUl && firstUl && "ulb")} />
{content /* groupes .mrd-grp.ulb */}
<span className={cn("mrd-fill", nextSepUl && lastUl && "ulb")} />
```

```css
.ulb {
  background: linear-gradient(var(--ink), var(--ink)) left bottom 3px / 100% 1.2px no-repeat;
}
```

`d(a) r d t d(men)` : les quatre notes de « a » sont soulignées.

```mrd
noms: tous
mesure: 4/4
voix: S=0; B=-1
[S] |[d.r:d.t_1]!d:-|
[B] |d_1:s_1!d_1.s_1:d_1|
[paroles] A- _ _ _ men
[paroles:B] A- men, a- men!
```
