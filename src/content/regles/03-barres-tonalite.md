# Doubles barres et changements de tonalité

Source : *05 - Rythme et durée*, § 9.

---

## 1. Double barre `||` : fermante ou en milieu de mesure

**Statut : Validé.** La double barre garde son sens habituel (fin de phrase, changement de mesure
ou de ton). Elle est **facultative** et n'est jamais insérée automatiquement. Elle peut se placer au
milieu d'une mesure : `|:!||changement de tonalité|`.

### Décision dans le parseur

Quand le parseur rencontre `||`, il compte les unités déjà lues :

- s'il y en a au moins autant que la disposition en attend, la mesure se ferme (barre double) ;
- sinon, `||` sert de **séparateur d'unité** rendu en double barre, et la mesure continue.

```ts
if (text.startsWith("||", i)) {
  const count = st.cur.units.length + (pending() ? 1 : 0);
  const closes = !header.ffpm && count >= expected;
  if (closes || count === 0) bar("||");
  else {
    if (pending()) flushUnit();
    st.sepBefore = "||";            // séparateur double en milieu de mesure
    st.sepUl = st.ul;
  }
}
```

### Rendu

Une colonne séparatrice dont au moins une voix porte `||` devient une double barre qui couvre tout
le groupe. Si un retour à la ligne tombe juste après cette double barre, elle est dessinée en fin de
système et le système suivant commence par `:`, comme sur la partition 446 :

```tsx
} else if (score.voices.some((v) => v.measures[seg.m]?.units[seg.u1]?.sepBefore === "||")) {
  cols.push({ k: "bar", m: seg.m, bar: "||" });   // fin de système en milieu de mesure
}
// début du système suivant
if (first.u0 > 0 || …leadingColon) cols.push({ k: "lead", m: first.m, u: first.u0 }); // « : »
```

```mrd
noms: aucun
ton: C
mesure: 4/4
libelle-ton: Do =
[V] |d:d!d||{ton:D}(l_1)s_1|
```

---

## 2. Changement de tonalité

**Statut : principe validé ; syntaxe complète à préciser.**

La directive `{ton:X}` (syntaxe provisoire) s'applique **à toutes les voix** à partir de sa
position : mesure, unité et fraction d'unité.

```ts
const keyAt = (m: number, u: number, f: number, strict = false): KeyRef => {
  let k = header.key;
  for (const kc of keyChanges) {
    const c = cmp(kc, m, u, f);
    if (strict ? c < 0 : c <= 0) k = kc.key;
  }
  return k;
};
// chaque note : pitchMidi(tok.p, keyAt(m, u, slot.start))
```

Le libellé « Do dia E♭ » est dessiné dans la rangée de repères au-dessus de la colonne concernée :

```tsx
case "key":
  return <span className="mrd-keychange">{keyLabel} <KeyName k={d.key} /></span>;
```

---

## 3. Indication de transition `( … )`

**Statut : Validé.** Exemple de la conception, de C vers D : `|d:d!(l_1)s_1:s_1|`.

- `(l_1)` est l'équivalent de la note suivante **dans l'ancienne tonalité** ;
- c'est une aide à la lecture, pas une note jouée ni une note supplémentaire ;
- l'afficher ou non est le choix du compositeur.

### Modèle

La transition est rattachée à la note qui suit (`NoteTok.trans`). Elle n'a ni slot ni durée et
n'est pas jouée. Sa hauteur est calculée dans la tonalité **précédente** (`keyAt(…, strict = true)`) :

```ts
if (tok.trans) {
  const pk = keyAt(m, u, slot.start, true);
  info.transition = { written: tok.trans.written, key: pk, spelled: spellPitch(tok.trans, pk).text, … };
}
```

### Rendu

Elle s'affiche en petit exposant avant la note, comme sur les imprimés (`ᵐl`, `ˢ,d`) :

```tsx
{n.trans && (
  <span className="mrd-trans" title={`Indication de transition (${n.trans.written}) — non jouée`}>
    <PitchText p={n.trans} mode={oct} />
  </span>
)}
```

```css
.mrd-trans { font-size: 0.62em; vertical-align: 0.65em; margin-right: 1px; }
```

```mrd-pitch
noms: aucun
ton: C
mesure: 4/4
libelle-ton: Do =
[V] |d:d!{ton:D}(l_1)s_1:s_1|
```

---

## 4. Double barre de prolongation de mesure (FFPM)

**Statut : À clarifier.** Certaines partitions FFPM utilisent la double barre pour prolonger une
mesure. La conception demande une option **désactivée par défaut**.

Interprétation provisoire : avec `ffpm: oui`, `||` ne ferme jamais la mesure (sauf en fin de voix).
La validation remplace alors l'avertissement « mesure trop longue » par une information :

```ts
if (header.ffpm && n > expected && hasDbar)
  diagnostics.push({ level: "info", message: `Mesure ${num} : prolongée par double barre (usage FFPM)` });
```

```mrd
noms: aucun
mesure: 4/4
ffpm: oui
[V] |d:r!m:f||s:-|d:-!-:-|
```
