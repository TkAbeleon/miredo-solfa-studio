# Mise en page : systèmes et pages

Source : *06 - Voix et portées*, § 6.

**Statut : Validé** pour les comportements ; la syntaxe des commandes reste à préciser.

- Par défaut, une mesure entière qui ne tient pas dans la ligne passe au système suivant : on ne la
  coupe pas.
- Le compositeur peut imposer un retour à la ligne, **y compris au milieu d'une mesure** :
  `//` (syntaxe provisoire).
- Sauts de page automatiques, plus saut manuel `///`.
- Ces commandes ne changent ni la musique ni la durée des mesures.

---

## 1. Découpage en morceaux — `layout.ts`

Chaque mesure est coupée aux retours manuels internes, ce qui donne des morceaux
`{ m, u0, u1, breakAfter }`.

```ts
const cuts = breaks.filter((b) => b.m === m && b.u > 0 && b.u < n).map((b) => b.u);
const bounds = [0, ...cuts, n];
for (let i = 0; i < bounds.length - 1; i++) {
  const u0 = bounds[i]!, u1 = bounds[i + 1]!;
  const bk = u1 < n ? findBreak(m, u1) : findBreak(m + 1, 0);
  pieces.push({ m, u0, u1, breakAfter: bk ? bk.kind : null });
}
```

## 2. Remplissage des lignes

Les morceaux sont empilés tant que la largeur disponible le permet. Un morceau trop large passe en
entier sur la ligne suivante.

```ts
for (const p of pieces) {
  let pw = 0;
  for (let u = p.u0; u < p.u1; u++) pw += UW(p.m, u) + (u > p.u0 ? SEP : 0);
  if (p.u1 === unitsPerMeasure[p.m]) pw += BAR;
  if (cur.length && w + pw > avail) pushSys();     // la mesure part entière à la ligne
  cur.push(p); w += pw;
  if (p.breakAfter) pushSys(p.breakAfter === "page");
}
```

Un système est **justifié** (colonnes d'unités en `minmax(max-content, 1fr)`), sauf le dernier s'il
est rempli à moins de 70 %.

## 3. Largeurs réelles mesurées dans le navigateur

Une estimation par caractère se trompe avec une police proportionnelle. `ScoreView` rend donc un
composant `Measurer` invisible : chaque unité y est dessinée avec toutes ses voix et ses paroles,
avec les mêmes classes CSS que le vrai rendu, et sa largeur est mesurée.

```tsx
useLayoutEffect(() => {
  const el = measureRef.current;
  const scale = el.querySelector("[data-ref]").getBoundingClientRect().width / 100; // zoom CSS
  const map = new Map();
  el.querySelectorAll("[data-mu]").forEach((n) =>
    map.set(n.dataset["mu"], n.getBoundingClientRect().width / scale));
  setMeasured({ score, map });
}, [score]);

const pages = useMemo(() => layoutScore(score, { width: PAGE_INNER, pageHeight: PAGE_BODY, measured: map }), …);
```

Côté serveur (SSR), `layout.ts` utilise l'estimation `unitWidth()` ; la mise en page est ensuite
recalculée avec les vraies largeurs.

## 4. Pages A4

Une page fait 794 × 1123 px (A4 à 96 ppp). La hauteur des systèmes est estimée d'après leur nombre
de rangées. `@media print` retire les ombres et l'interface, et place un saut de page après chaque
feuille :

```css
@media print {
  @page { size: A4; margin: 0; }
  .no-print { display: none !important; }
  .mrd-page { box-shadow: none; margin: 0 !important; break-after: page; }
}
```

## 5. Taille de police

L'option provisoire `taille:` (11 à 22, 15 par défaut) règle la taille du texte de la partition. Le
`Measurer` utilise la même taille, ce qui garde les retours à la ligne justes.

```mrd
noms: aucun
mesure: 4/4
[V] |d:r!m:f|s:-!-:// m|r:d!-:-|
```
