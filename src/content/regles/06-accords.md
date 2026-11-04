# Degrés et symboles d'accords

Source : *08 - Degrés et symboles d'accords*.

**Statut : Validé.** Trois écritures facultatives, indépendantes des notes de la partition :

1. degrés en chiffres romains `I`–`VII` ;
2. accords en lettres latines (`Gm7`, `Cmaj7`, `F#m`) ;
3. accords Sol-fa **relatifs à Do**, interprétés selon la référence tonale. Avec `ton: G`, `Dom7`
   désigne `Gm7`.

Un symbole d'accord ne remplace jamais les notes écrites.

---

## Analyse — `pitch.ts`

L'ordre des tests évite les confusions : chiffres romains d'abord, puis racines Sol-fa (`Do`, `Re`,
`Mi`, `Fa`, `Sol`, `La`, `Ti`), et enfin lettres latines.

```ts
export function parseChord(src: string, key: KeyRef | null): Chord {
  if (/^[b#]?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?![a-z])/.test(s))
    return { written: s, kind: "roman" };
  const sm = /^(Sol|So|Do|Re|Ré|Mi|Fa|La|Ti)([#b]?)(.*)$/.exec(s);
  if (sm) {
    const p = { base: SOLFA_CHORD_ROOTS[sm[1]], alter: …, octave: 0, … };
    const absolute = spellPitch(p, key).name + sm[3];   // Do + m7, en G → "Gm7"
    return { written: s, kind: "solfa", absolute };
  }
  return { written: s, kind: "latin" };
}
```

Le symbole est analysé avec la tonalité active **à sa position** (`keyAt`) : un accord Sol-fa reste
juste après un changement de ton.

## Rendu

Les accords occupent une rangée dédiée au-dessus du système, seulement si le système en contient.
Le symbole Sol-fa est affiché **tel qu'écrit** ; sa traduction absolue apparaît au survol.

```tsx
<span
  className={cn(c.chord.kind === "roman" && "mrd-chord-roman", c.chord.kind === "solfa" && "mrd-chord-solfa")}
  title={c.chord.kind === "solfa" ? `Accord Sol-fa relatif : ${c.chord.written} ≙ ${c.chord.absolute}` : …}
>
  {c.chord.written}
</span>
```

```css
.mrd-chords { font-family: var(--font-sans); color: var(--ink-soft); }
.mrd-chord-roman { font-family: var(--font-score); font-weight: 600; color: var(--ink); }
.mrd-chord-solfa { color: var(--primary); }
```

```mrd
noms: aucun
ton: G
mesure: 4/4
[V] |<I>d:<Gm7>m!<Dom7>s:<V>s_1|<Fa>f:l!<Re7>r:<IV>f|
```
