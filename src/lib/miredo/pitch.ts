// Hauteur Tonic Sol-fa selon la conception MireDo.
// Règle clé : la graphie écrite est conservée ; la hauteur absolue est un calcul séparé.

export const DEGREES = ["d", "r", "m", "f", "s", "l", "t"] as const;
export type Degree = (typeof DEGREES)[number];

export const DEGREE_NAMES: Record<Degree, string> = {
  d: "Do",
  r: "Re",
  m: "Mi",
  f: "Fa",
  s: "Sol",
  l: "La",
  t: "Ti",
};

const SEMI: Record<Degree, number> = { d: 0, r: 2, m: 4, f: 5, s: 7, l: 9, t: 11 };

/** Voyelle descendante présentée en priorité (formes citées par la conception : de, fa, te). */
const PREFERRED_FLAT: Record<Degree, string> = {
  d: "e",
  r: "a",
  m: "a",
  f: "a",
  s: "e",
  l: "a",
  t: "e",
};

/** Formes courantes privilégiées par l'interface (cf. « Altérations chromatiques »). */
export const COMMON_FORMS = ["d", "di", "r", "ri", "m", "mi", "f", "fi", "s", "l", "te", "ti", "to"];

export interface Pitch {
  /** Graphie exacte saisie, ex. "di_1". Jamais réécrite. */
  written: string;
  base: Degree;
  /** Voyelle d'altération écrite ("" | "i" | "a" | "e" | "o"). */
  vowel: string;
  alter: -1 | 0 | 1;
  /** Déplacement d'octave : 0 = octave de référence, 1 = d1, -1 = d_1. */
  octave: number;
}

export const NOTE_RE = /^([drmfslt])([aeio]?)(_?\d)?/;

export function parsePitch(src: string): Pitch | null {
  const m = NOTE_RE.exec(src);
  if (!m || m[0].length !== src.length) return null;
  const base = m[1] as Degree;
  const vowel = m[2] ?? "";
  const alter: -1 | 0 | 1 = vowel === "i" ? 1 : vowel === "" ? 0 : -1;
  let octave = 0;
  if (m[3]) octave = m[3].startsWith("_") ? -Number(m[3].slice(1)) : Number(m[3]);
  return { written: src, base, vowel, alter, octave };
}

export function octaveSuffix(n: number): string {
  if (n === 0) return "";
  return n > 0 ? String(n) : `_${-n}`;
}

// ---------- Référence tonale ----------

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
const NAT: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export interface KeyRef {
  label: string; // "Ab"
  letter: string;
  acc: -1 | 0 | 1;
  pc: number;
}

export function parseKey(k: string): KeyRef | null {
  const m = /^([A-G])(b|#)?$/.exec(k.trim());
  if (!m) return null;
  const acc: -1 | 0 | 1 = m[2] === "b" ? -1 : m[2] === "#" ? 1 : 0;
  return { label: m[0], letter: m[1], acc, pc: NAT[m[1]] + acc };
}

/**
 * Hauteur MIDI de `d` dans l'octave de référence.
 * PROVISOIRE : la conception ne fixe pas encore l'octave absolue ; MireDo-rendu place `d` en octave 4.
 */
export function referenceMidi(key: KeyRef): number {
  return 60 + key.pc;
}

export function pitchMidi(p: Pitch, key: KeyRef): number {
  return referenceMidi(key) + SEMI[p.base] + p.alter + 12 * p.octave;
}

const ACC_SIGNS: Record<number, string> = { [-2]: "𝄫", [-1]: "♭", 0: "", 1: "♯", 2: "𝄪" };

/** Nom absolu orthographié selon le degré écrit (di en C = C♯, re en C = D♭). */
export function spellPitch(p: Pitch, key: KeyRef): { name: string; octave: number; text: string } {
  const keyIdx = LETTERS.indexOf(key.letter as (typeof LETTERS)[number]);
  const degIdx = DEGREES.indexOf(p.base);
  const raw = keyIdx + degIdx;
  const letter = LETTERS[raw % 7];
  const carry = Math.floor(raw / 7);
  const naturalMidi = 60 + NAT[letter] + 12 * carry + 12 * p.octave;
  const midi = pitchMidi(p, key);
  const acc = midi - naturalMidi;
  const sign = ACC_SIGNS[acc] ?? (acc > 0 ? `+${acc}` : String(acc));
  const octave = 4 + carry + p.octave;
  return { name: letter + sign, octave, text: `${letter}${sign}${octave}` };
}

/** Autres graphies Sol-fa de même hauteur (équivalences, jamais substitutions). */
export function equivalents(p: Pitch, key: KeyRef): string[] {
  const target = pitchMidi(p, key);
  const out: string[] = [];
  for (const base of DEGREES) {
    for (const vowel of ["", "i", PREFERRED_FLAT[base]]) {
      for (let o = -3; o <= 3; o++) {
        const cand: Pitch = {
          written: "",
          base,
          vowel,
          alter: vowel === "i" ? 1 : vowel === "" ? 0 : -1,
          octave: o,
        };
        if (pitchMidi(cand, key) === target) {
          const w = base + vowel + octaveSuffix(o);
          if (w !== p.written && !out.includes(w)) out.push(w);
        }
      }
    }
  }
  return out;
}

export function describeAlter(p: Pitch): string {
  if (p.alter === 0) return "aucune";
  if (p.alter === 1) return "élévation d'un demi-ton (voyelle i)";
  return `abaissement d'un demi-ton (voyelle ${p.vowel})`;
}

export function midiName(midi: number): string {
  const names = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
  return `${names[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
}

// ---------- Accords ----------

export type ChordKind = "latin" | "solfa" | "roman";
export interface Chord {
  written: string;
  kind: ChordKind;
  /** Pour la notation Sol-fa relative : nom absolu calculé (ex. Dom7 en G = Gm7). */
  absolute?: string;
}

const SOLFA_CHORD_ROOTS: Record<string, Degree> = {
  Do: "d",
  Re: "r",
  Ré: "r",
  Mi: "m",
  Fa: "f",
  Sol: "s",
  So: "s",
  La: "l",
  Ti: "t",
};

export function parseChord(src: string, key: KeyRef | null): Chord {
  const s = src.trim();
  if (/^[b#]?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(?![a-z])/.test(s)) {
    return { written: s, kind: "roman" };
  }
  const sm = /^(Sol|So|Do|Re|Ré|Mi|Fa|La|Ti)([#b]?)(.*)$/.exec(s);
  if (sm) {
    let absolute: string | undefined;
    if (key) {
      const p: Pitch = {
        written: "",
        base: SOLFA_CHORD_ROOTS[sm[1]],
        vowel: "",
        alter: sm[2] === "#" ? 1 : sm[2] === "b" ? -1 : 0,
        octave: 0,
      };
      const sp = spellPitch(p, key);
      absolute = sp.name.replace("♭", "b").replace("♯", "#") + sm[3];
    }
    return { written: s, kind: "solfa", absolute };
  }
  return { written: s, kind: "latin" };
}
