# Hauteur, altérations et octaves

Sources : *01 - Hauteur et degrés*, *02 - Altérations chromatiques*, *03 - Octaves et représentation*,
*04 - Référence tonale et mode*.

---

## 1. Les sept degrés `d r m f s l t`

**Statut : Validé.** Les symboles sont des degrés relatifs à la référence tonale, pas des notes absolues.

### Analyse — `pitch.ts`

```ts
export const DEGREES = ["d", "r", "m", "f", "s", "l", "t"] as const;
const SEMI: Record<Degree, number> = { d: 0, r: 2, m: 4, f: 5, s: 7, l: 9, t: 11 };

export const NOTE_RE = /^([drmfslt])([aeio]?)(_?\d)?/;
//                        degré    voyelle   octave

export function parsePitch(src: string): Pitch | null {
  const m = NOTE_RE.exec(src);
  if (!m || m[0].length !== src.length) return null;
  const base = m[1] as Degree;
  const vowel = m[2] ?? "";
  const alter = vowel === "i" ? 1 : vowel === "" ? 0 : -1;
  let octave = 0;
  if (m[3]) octave = m[3].startsWith("_") ? -Number(m[3].slice(1)) : Number(m[3]);
  return { written: src, base, vowel, alter, octave };
}
```

### Rendu

Une note sans altération ni octave s'affiche telle quelle (`PitchText`, voir § 4).

```mrd-pitch
noms: aucun
ton: C
mesure: 7/4
[V] |d:r:m:f:s:l:t|
```

---

## 2. Altération ascendante : voyelle `i`

**Statut : Validé.** `d → di`, `r → ri`, … `t → ti` élèvent d'un demi-ton.

Le parseur lit la voyelle `i` comme `alter = +1`. La graphie `di` est conservée telle quelle.

```mrd-pitch
noms: aucun
ton: C
mesure: 7/4
[V] |di:ri:mi:fi:si:li:ti|
```

---

## 3. Altération descendante : voyelles `a`, `e`, `o`

**Statut : principe validé, table complète non définie.** La conception demande d'accepter
**toutes** les formes valides, rares comprises, sans en créer de nouvelles. `te`, `ta`, `to` sont
citées pour `t` abaissé.

### Implémentation

Le parseur accepte `a`, `e`, `o` sur tous les degrés (`alter = -1`) et conserve la voyelle écrite.
Pour *proposer* des équivalences, une voyelle préférée est utilisée (formes citées par la
conception : `de`, `fa`, `te`) :

```ts
const PREFERRED_FLAT: Record<Degree, string> = { d: "e", r: "a", m: "a", f: "a", s: "e", l: "a", t: "e" };

/** Formes courantes privilégiées par l'interface. */
export const COMMON_FORMS = ["d", "di", "r", "ri", "m", "mi", "f", "fi", "s", "l", "te", "ti", "to"];
```

> Question ouverte de la conception : la table exacte des voyelles par degré. Le moteur ne
> refuse aucune des trois voyelles tant qu'elle n'est pas tranchée.

```mrd-pitch
noms: aucun
ton: C
mesure: 6/4
[V] |te:ta:to!ra:ma:la|de:fa:se!lo:ro:me|
```

---

## 4. Octaves numériques et rendu typographique

**Statut : Validé** pour la saisie numérique ; rendu à préciser.

| Saisie | Sens | Rendu « chiffres » | Rendu « traditionnel » |
|---|---|---|---|
| `d` | octave de référence | d | d |
| `d1` | +1 octave | d¹ | d' |
| `m2` | +2 octaves | m² | m'' |
| `d_1` | −1 octave | d₁ | d, |
| `di_1` | `di` −1 octave | di₁ | di, |

### Rendu — `ScoreView.tsx`

Le rendu ne change **jamais** la valeur stockée. L'option d'en-tête `octaves:` choisit le mode.

```tsx
export function PitchText({ p, mode }: { p: Pitch; mode: "chiffres" | "traditionnel" }) {
  const syl = p.base + p.vowel;
  if (p.octave === 0) return <>{syl}</>;
  const n = Math.abs(p.octave);
  if (mode === "traditionnel") return <>{syl + (p.octave > 0 ? "'" : ",").repeat(n)}</>;
  return (
    <>
      {syl}
      {p.octave > 0 ? <sup>{n}</sup> : <sub>{n}</sub>}
    </>
  );
}
```

```css
.mrd-note sup,
.mrd-note sub {
  font-size: 0.6em;
  line-height: 0; /* n'agrandit pas la hauteur de ligne */
}
```

```mrd-pitch
noms: aucun
ton: C
mesure: 7/4
[V] |d1:r1:m2:d_1:s_2:di_1:di1|
```

Même passage avec `octaves: traditionnel` :

```mrd
noms: aucun
ton: C
mesure: 7/4
octaves: traditionnel
[V] |d1:r1:m2:d_1:s_2:di_1:di1|
```

> Le suffixe `0` n'est pas défini par la conception : il est accepté mais signalé par un
> diagnostic de niveau *info*.

---

## 5. Référence tonale

**Statut : Validé.** Chaque partition déclare une référence `A`–`G`, éventuellement suivie de `b`
ou `#`. Avec `Ab`, `d` vaut La bémol. Aucun mode majeur ou mineur n'est déduit.

```ts
export function parseKey(k: string): KeyRef | null {
  const m = /^([A-G])(b|#)?$/.exec(k.trim());
  if (!m) return null;
  const acc = m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0;
  return { label: m[0], letter: m[1]!, acc, pc: NAT[m[1]!]! + acc };
}

/** PROVISOIRE : la conception ne fixe pas l'octave absolue ; `d` est placé en octave 4. */
export function referenceMidi(key: KeyRef): number {
  return 60 + key.pc;
}

export function pitchMidi(p: Pitch, key: KeyRef): number {
  return referenceMidi(key) + SEMI[p.base] + p.alter + 12 * p.octave;
}
```

### Nom absolu orthographié selon le degré

`di` en C donne C♯ (et non D♭), `ra` en C donne D♭ : la lettre vient du degré, l'altération
compense.

```ts
export function spellPitch(p: Pitch, key: KeyRef) {
  const raw = LETTERS.indexOf(key.letter) + DEGREES.indexOf(p.base);
  const letter = LETTERS[raw % 7]!;
  const carry = Math.floor(raw / 7);
  const naturalMidi = 60 + NAT[letter]! + 12 * carry + 12 * p.octave;
  const acc = pitchMidi(p, key) - naturalMidi; // -2..+2 → 𝄫 ♭ ♮ ♯ 𝄪
  …
}
```

### Rendu de l'étiquette

```tsx
export function KeyName({ k }: { k: KeyRef | string }) {
  …
  return (
    <>
      {key.letter}
      {key.acc !== 0 && <span className="mrd-acc">{key.acc < 0 ? "b" : "#"}</span>}
    </>
  );
}
```

```css
.mrd-acc { font-style: italic; font-weight: 700; font-size: 0.8em; vertical-align: -0.12em; }
```

Le libellé (« Do = », « Do dia ») se règle avec `libelle-ton:`.

```mrd-pitch
noms: aucun
ton: Ab
libelle-ton: Do dia
mesure: 4/4
[V] |d:m!s:d1|
```

---

## 6. Équivalences de hauteur sans réécriture

**Statut : Validé.** `mi` et `f`, `de` et `t₁` peuvent sonner pareil. Le calcul les reconnaît
comme équivalents, mais l'éditeur, le parseur et la sérialisation gardent la graphie d'origine.

```ts
/** Autres graphies Sol-fa de même hauteur (équivalences, jamais substitutions). */
export function equivalents(p: Pitch, key: KeyRef): string[] {
  const target = pitchMidi(p, key);
  const out: string[] = [];
  for (const base of DEGREES)
    for (const vowel of ["", "i", PREFERRED_FLAT[base]])
      for (let o = -3; o <= 3; o++) {
        const cand = { written: "", base, vowel, alter: …, octave: o };
        if (pitchMidi(cand, key) === target) out.push(base + vowel + octaveSuffix(o));
      }
  return out.filter((w) => w !== p.written);
}
```

Dans le Studio, cliquer une note ouvre l'inspecteur (`Inspector.tsx`) qui liste ces équivalences
sans jamais les appliquer.

```mrd-pitch
noms: aucun
ton: C
mesure: 4/4
[V] |mi:f!de:t_1|
```

---

## 7. Liberté du compositeur

**Statut : Validé.** Un morceau en Ré bémol peut s'écrire `d d d m` avec la référence `Db`, ou
`di di di f` avec la référence `C`. MireDo accepte les deux sans rien corriger, et les hauteurs
calculées sont identiques.

```ts
// miredo.test.ts
it("Db écrit d d d m = C écrit di di di f", () => {
  const a = parseScore("ton: Db\nmesure: 4/4\n[V] |d:d!d:m|");
  const b = parseScore("ton: C\nmesure: 4/4\n[V] |di:di!di:f|");
  expect(midis(a)).toEqual(midis(b));
});
```

```mrd-pitch
noms: aucun
ton: C
mesure: 4/4
[V] |di:di!di:f|
```

---

## 8. Pas de signe accidentel autonome, pas de bécarre

**Statut : Validé.** Dans les notes Sol-fa, les altérations s'écrivent par la syllabe (`di`, `te`…).
Les symboles `♮`, `♯`, `♭` ne sont pas des signes de notes Sol-fa, et il n'existe **pas de bécarre**.
Les lettres `b` et `#` servent seulement aux étiquettes de tonalité (`ton: Ab`).

### Implémentation

`NOTE_RE` n'accepte ni `#`, ni `b` après une note, ni `♯ ♭ ♮`. Ces caractères donnent l'erreur
« Caractère inattendu ». `b` et `#` ne sont lus que par `parseKey` (en-tête `ton:` et directive
`{ton:…}`) et par les accords `<…>`.

```mrd
noms: aucun
mesure: 2/4
[V] |d#:r♭|
```

> Question ouverte : `b` et `#` pourront-ils un jour s'utiliser dans l'écriture des notes Sol-fa ?
> Tant que ce n'est pas tranché, le moteur les refuse.

---

## 9. Préférence pour le bémol

**Statut : Validé.** Quand un choix d'orthographe est nécessaire, MireDo privilégie le bémol (`b`).

Deux cas existent dans le code :

- `spellPitch` orthographie selon le **degré écrit** (`di` en C → C♯, `ra` en C → D♭). Il n'y a pas de
  choix à faire, donc la préférence ne s'applique pas.
- `midiName` (hauteur jouée sans degré, dans l'inspecteur) n'a pas de degré : il utilise **les
  bémols**.

```ts
export function midiName(midi: number): string {
  const names = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}
```

---

## 10. Formes courantes et formes rares

**Statut : Validé.** Toutes les formes valides sont acceptées. Les formes courantes
(`d di r ri m mi f fi s l te ti to`) sont privilégiées dans l'affichage pédagogique, l'aide à la
saisie et les suggestions. C'est une préférence d'interface, **pas** une restriction de grammaire.

**État : partiel.** `COMMON_FORMS` existe dans `pitch.ts`, mais l'éditeur n'a pas encore de
suggestions de saisie. La validation ne regarde jamais la fréquence d'une forme : une forme rare
(`ro`, `lo`, `me`) est analysée et conservée sans avertissement.

> Question ouverte : les suggestions doivent-elles proposer les formes rares à la demande, ou
> seulement les accepter quand elles sont saisies ?

---

## 11. Casse, alias et saisie traditionnelle des octaves

**Statut : À clarifier.** La conception se demande s'il faut accepter des alias ou des variantes de
casse.

**Lecture actuelle (provisoire) :**

| Saisie | Résultat |
|---|---|
| `D`, `Do`, `Sol` | refusé (« Caractère inattendu ») : seules les minuscules `d r m f s l t` sont des notes |
| `do` | `d` + voyelle `o` = **Do abaissé**, pas un alias de `d` |
| `d'` | refusé : l'apostrophe n'est pas une saisie d'octave |
| `d,` | `d` suivi d'une **subdivision** `,`, pas un `d` grave |

La saisie numérique (`d1`, `d_1`) est la seule acceptée, comme le veut la conception. La forme
apostrophe/virgule est uniquement un **rendu** (`octaves: traditionnel`).

```mrd-timing
noms: aucun
mesure: 2/4
[V] |do:d,|
```

> Autres questions ouvertes : la plage autorisée des déplacements d'octave (le moteur accepte un
> seul chiffre, 0 à 9), les espaces entre la note et son suffixe (refusés), et le lien entre
> l'octave de référence et une hauteur absolue (provisoirement : `d` en octave 4).


## Représentation numérique continue des hauteurs

**Statut : Validé dans ConceptionMireDo (2026-11-04).**

Les notes sont représentées sur un axe chromatique entier continu : **ℤ = {…, -2, -1, 0, 1, 2, …}**. La référence vaut `0`, chaque demi-ton vers l'aigu ajoute `1` et chaque demi-ton vers le grave soustrait `1`. Il n'existe pas de borne théorique à cet axe.

L'éditeur interprète les graphies Sol-fa saisies par le compositeur selon les règles de conception et calcule leur équivalent numérique. Les autres composants exploitent cette valeur calculée au lieu de réinterpréter indépendamment les graphies. La graphie écrite originale reste conservée : la coordonnée numérique ne remplace pas l'orthographe Sol-fa.

Le passage d'une octave à la suivante poursuit le même axe par pas de douze demi-tons ; les octaves ne forment donc pas des classes de valeurs cycliques dans cette représentation.

### Référence de portée par voix

Chaque voix possède une référence numérique de portée, distincte de son nom et de sa tessiture : `0` correspond à la clé de Sol, `-1` à la clé de Fa, et les autres entiers suivent la même logique de position. En SATB par défaut, S et A utilisent `0`, T et B utilisent `-1`. Cette référence détermine le placement de `0` sur la portée ; elle ne doit pas être confondue avec la coordonnée chromatique d'une note ni avec la référence tonale de la partition.

**Conséquence pour l'architecture :** le modèle d'exécution doit distinguer au minimum la graphie saisie, l'équivalent numérique calculé et les références contextuelles nécessaires. La grammaire `.mrd` et le schéma JSON natif restent des sujets distincts ; cette décision ne les fige pas.
