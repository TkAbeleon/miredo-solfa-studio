// Analyseur de la syntaxe de démonstration MireDo (texte .mrd).
// Les conventions Sol-fa (| ! : . , - degrés, altérations, octaves) suivent la conception ;
// les en-têtes et directives {…} <…> [ ] // sont une syntaxe de travail PROVISOIRE.

import {
  type Chord,
  type KeyRef,
  type Pitch,
  NOTE_RE,
  equivalents,
  parseChord,
  parseKey,
  parsePitch,
  pitchMidi,
  spellPitch,
} from "./pitch";
import { type RhythmItem, type Slot, subdivide } from "./rhythm";

export type Sep = "start" | ":" | "!" | "||";

export type Directive =
  | { kind: "key"; key: string }
  | { kind: "segno"; id: string }
  | { kind: "ds"; id: string; al: "fine" | "coda" | null }
  | { kind: "dc"; al: "fine" | "coda" | null }
  | { kind: "fine" }
  | { kind: "coda" }
  | { kind: "tocoda" }
  | { kind: "dynamic"; text: string }
  | { kind: "tempo"; text: string }
  | { kind: "fermata" }
  | { kind: "artic"; type: "staccato" | "accent" | "tenuto" | "marcato" | "legato" }
  | { kind: "text"; text: string };

const STRUCTURAL = new Set(["key", "segno", "ds", "dc", "fine", "coda", "tocoda"]);

export interface NoteTok {
  t: "note";
  id: string;
  p: Pitch;
  trans?: Pitch;
  marks: Directive[];
  ul: boolean;
  slot?: number;
  error?: string;
}
export interface HoldTok {
  t: "hold";
  id: string;
  marks: Directive[];
  ul: boolean;
  slot?: number;
  error?: string;
}
export interface SubTok {
  t: "dot" | "comma";
  ul: boolean;
}
export type UnitTok = NoteTok | HoldTok | SubTok;

export interface Unit {
  toks: UnitTok[];
  slots: Slot[];
  tuplet: number | null;
  sepBefore: Sep;
  sepUl: boolean;
  ulFull: boolean;
  hasMarks: boolean;
  line: number;
}

export interface Measure {
  units: Unit[];
  endBar: "|" | "||" | null;
  leadingColon: boolean;
  line: number;
}

export interface Voice {
  name: string;
  ref: number;
  measures: Measure[];
}

export interface PosMark {
  m: number;
  u: number;
  frac: number;
  tokIndex: number;
  voice: number;
}
export interface StructMark extends PosMark {
  d: Directive;
}
export interface ChordMark extends PosMark {
  chord: Chord;
}
export interface Break {
  m: number;
  u: number;
  kind: "line" | "page";
}
export interface Lyric {
  start: number;
  text: string;
}
export type LyricLine = Map<string, Lyric[]>;

export interface NoteInfo {
  id: string;
  voice: number;
  voiceName: string;
  ref: number;
  m: number;
  u: number;
  displayMeasure: number;
  pitch: Pitch;
  key: KeyRef;
  midi: number;
  spelled: string;
  playedMidi: number;
  equivalents: string[];
  start: number;
  dur: number;
  transition?: { written: string; key: KeyRef; spelled: string; midi: number };
}

export interface Diagnostic {
  level: "error" | "warning" | "info";
  line: number;
  message: string;
}

export interface Header {
  title: string;
  left: string;
  right: string;
  info: string;
  key: KeyRef;
  keyLabel: string;
  time: { num: number; den: number; label: string };
  disposition: { label: string; units: number; groups: number[]; custom: boolean; provisional: boolean };
  tempo: number;
  expression: string;
  lyricsMode: "dessous" | "entre";
  groups: string[][];
  bracket: boolean;
  octaves: "chiffres" | "traditionnel";
  clefs: "solfa" | "classique";
  ffpm: boolean;
  tuplets: "courbe" | "texte";
  names: "premier" | "tous" | "aucun";
  lyricsVoice: string | null;
  raw: Record<string, { value: string; line: number }>;
}

export interface Score {
  header: Header;
  voices: Voice[];
  measureCount: number;
  unitsPerMeasure: number[];
  hasPickup: boolean;
  structure: StructMark[];
  chords: ChordMark[];
  breaks: Break[];
  lyrics: { common: LyricLine[]; perVoice: Map<number, LyricLine> };
  notes: Map<string, NoteInfo>;
  diagnostics: Diagnostic[];
}

// Dispositions habituelles validées dans « Rythme et durée ».
const DEFAULT_GROUPS: Record<number, number[]> = {
  2: [2],
  3: [3],
  4: [2, 2],
  5: [5],
  6: [3, 3],
  7: [7],
  9: [3, 3, 3],
};

function groupsFor(num: number): { groups: number[]; provisional: boolean } {
  if (DEFAULT_GROUPS[num]) return { groups: DEFAULT_GROUPS[num], provisional: false };
  return { groups: [num], provisional: true };
}

export function displayMeasureNumber(score: Pick<Score, "hasPickup">, m: number): number {
  return m + (score.hasPickup ? 0 : 1);
}

const DYNAMICS = new Set(["ppp", "pp", "p", "mp", "mf", "f", "ff", "fff", "sf", "sfz", "fp", "cresc.", "cresc", "dim.", "dim", "decresc.", "decresc", "<", ">>"]);
const TEMPO_WORDS = /^(rit\.?|ritard\.?|rall\.?|rallentando|ritardando|ritenuto|riten\.?|accel\.?|accelerando|a tempo|rubato|allargando|morendo|tempo\s*[:=].*|♩\s*=\s*\d+)$/i;

export function parseDirective(raw: string): Directive {
  const s = raw.trim();
  const low = s.toLowerCase();
  let m: RegExpExecArray | null;
  if ((m = /^ton\s*[:=]\s*(.+)$/i.exec(s))) return { kind: "key", key: m[1]!.trim() };
  if ((m = /^(?:segno|s)(?:\s*[:_ ]\s*(\w+))?$/i.exec(s)) && (low.startsWith("segno") || /^s_\w+$/i.test(s)))
    return { kind: "segno", id: m[1] ?? "1" };
  if ((m = /^d\.?\s?s\.?(?:\s*[:_]?\s*(\d+))?(?:\s+al\s+(fine|coda))?$/i.exec(s)))
    return { kind: "ds", id: m[1] ?? "1", al: (m[2]?.toLowerCase() as "fine" | "coda") ?? null };
  if ((m = /^d\.?\s?c\.?(?:\s+al\s+(fine|coda))?$/i.exec(s)))
    return { kind: "dc", al: (m[1]?.toLowerCase() as "fine" | "coda") ?? null };
  if (low === "fine") return { kind: "fine" };
  if (low === "coda") return { kind: "coda" };
  if (low === "to coda" || low === "tocoda" || low === "vers coda") return { kind: "tocoda" };
  if (DYNAMICS.has(low)) return { kind: "dynamic", text: s };
  if (TEMPO_WORDS.test(s)) return { kind: "tempo", text: s };
  if (s === "^" || low === "fermata" || low === "point d'orgue") return { kind: "fermata" };
  if (low === "stacc" || low === "staccato" || s === "·") return { kind: "artic", type: "staccato" };
  if (s === ">" || low === "accent") return { kind: "artic", type: "accent" };
  if (low === "ten" || low === "tenuto") return { kind: "artic", type: "tenuto" };
  if (low === "marcato") return { kind: "artic", type: "marcato" };
  if (low === "legato") return { kind: "artic", type: "legato" };
  return { kind: "text", text: s };
}

// ---------------------------------------------------------------------------

interface VState {
  vi: number;
  measures: Measure[];
  cur: Measure;
  toks: UnitTok[];
  unitLine: number;
  sepBefore: Sep;
  sepUl: boolean;
  pendingMarks: Directive[];
  pendingTrans: Pitch | null;
  ul: boolean;
  struct: StructMark[];
  chords: ChordMark[];
  breaks: Break[];
}

function newMeasure(line: number): Measure {
  return { units: [], endBar: null, leadingColon: false, line };
}

export function parseScore(text: string): Score {
  const diagnostics: Diagnostic[] = [];
  const lines = text.split(/\r?\n/);
  const raw: Header["raw"] = {};
  const voiceLines: { label: string; body: string; line: number }[] = [];
  let inBody = false;

  lines.forEach((l, idx) => {
    const line = idx + 1;
    const t = l.trim();
    if (!t || t.startsWith("%")) return;
    const vm = /^\[([^\]]+)\]\s?(.*)$/.exec(t);
    if (vm) {
      inBody = true;
      voiceLines.push({ label: vm[1]!.trim(), body: vm[2] ?? "", line });
      return;
    }
    const hm = /^([\p{L}-]+)\s*:\s*(.*)$/u.exec(t);
    if (hm && !inBody) {
      raw[hm[1]!.toLowerCase()] = { value: hm[2]!.trim(), line };
      return;
    }
    diagnostics.push({ level: "warning", line, message: `Ligne ignorée : « ${t.slice(0, 40)} » (attendu « [Voix] … » ou « clé: valeur »).` });
  });

  const hv = (k: string, d = "") => raw[k]?.value ?? d;

  // ---- En-tête
  let key = parseKey(hv("ton", "C"));
  if (!key) {
    diagnostics.push({ level: "error", line: raw["ton"]?.line ?? 1, message: `Tonalité de référence invalide « ${hv("ton")} » (attendu A–G suivi éventuellement de b ou #).` });
    key = parseKey("C")!;
  }
  const tm = /^(\d+)\s*\/\s*(\d+)$/.exec(hv("mesure", "4/4"));
  const time = tm ? { num: +tm[1]!, den: +tm[2]!, label: `${tm[1]}/${tm[2]}` } : { num: 4, den: 4, label: "4/4" };
  if (!tm) diagnostics.push({ level: "error", line: raw["mesure"]?.line ?? 1, message: "Signature invalide (attendu par ex. 4/4, 6/8)." });

  const dm = /^(\d+)\s*\/\s*(\d+)$/.exec(hv("disposition"));
  const dispNum = dm ? +dm[1]! : time.num;
  const g = groupsFor(dispNum);
  const disposition = {
    label: dm ? `${dm[1]}/${dm[2]}` : time.label,
    units: dispNum,
    groups: g.groups,
    custom: !!dm,
    provisional: g.provisional,
  };
  if (g.provisional)
    diagnostics.push({ level: "info", line: raw["mesure"]?.line ?? 1, message: `Disposition de ${dispNum} unités non validée par la conception : MireDo utilise des « : » sans « ! » (provisoire).` });

  const voicesDecl: { name: string; ref: number }[] = [];
  if (raw["voix"]) {
    for (const part of raw["voix"].value.split(/[;,]/)) {
      const p = part.trim();
      if (!p) continue;
      const [n, r] = p.split("=").map((x) => x.trim());
      const ref = r === undefined ? 0 : Number(r.replace("+", ""));
      voicesDecl.push({ name: n ?? "", ref: Number.isFinite(ref) ? ref : 0 });
    }
  }

  const header: Header = {
    title: hv("titre"),
    left: hv("gauche"),
    right: hv("droite"),
    info: hv("info"),
    key,
    keyLabel: hv("libelle-ton", "Do ="),
    time,
    disposition,
    tempo: Number(hv("tempo", "80")) || 80,
    expression: hv("expression"),
    lyricsMode: hv("paroles") === "entre" ? "entre" : "dessous",
    groups: [],
    bracket: hv("crochet", "oui") !== "non",
    octaves: hv("octaves") === "traditionnel" ? "traditionnel" : "chiffres",
    clefs: hv("cles") === "classique" || hv("clés") === "classique" ? "classique" : "solfa",
    ffpm: hv("ffpm") === "oui",
    tuplets: hv("triolets") === "texte" ? "texte" : "courbe",
    names: (["premier", "tous", "aucun"].includes(hv("noms")) ? hv("noms") : "premier") as Header["names"],
    lyricsVoice: raw["paroles-voix"]?.value || null,
    raw,
  };

  // ---- Voix
  const voices: Voice[] = voicesDecl.map((v) => ({ ...v, measures: [] }));
  const lyricLines: { label: string; body: string; line: number }[] = [];
  const bodies = new Map<number, { body: string; line: number }[]>();
  for (const vl of voiceLines) {
    if (/^paroles\b/i.test(vl.label)) {
      lyricLines.push(vl);
      continue;
    }
    let vi = voices.findIndex((v) => v.name === vl.label);
    if (vi < 0) {
      voices.push({ name: vl.label, ref: 0, measures: [] });
      vi = voices.length - 1;
      if (raw["voix"])
        diagnostics.push({ level: "info", line: vl.line, message: `Voix « ${vl.label} » non déclarée dans « voix: » — ajoutée avec la référence de portée 0.` });
    }
    if (!bodies.has(vi)) bodies.set(vi, []);
    bodies.get(vi)!.push({ body: vl.body, line: vl.line });
  }

  const structure: StructMark[] = [];
  const chordsMarks: ChordMark[] = [];
  const breaks: Break[] = [];
  const expected = disposition.units;

  voices.forEach((voice, vi) => {
    const chunks = bodies.get(vi) ?? [];
    const st: VState = {
      vi,
      measures: [],
      cur: newMeasure(chunks[0]?.line ?? 1),
      toks: [],
      unitLine: chunks[0]?.line ?? 1,
      sepBefore: "start",
      sepUl: false,
      pendingMarks: [],
      pendingTrans: null,
      ul: false,
      struct: [],
      chords: [],
      breaks: [],
    };

    const flushUnit = () => {
      const items: RhythmItem[] = st.toks.map((t, k) => ({ kind: t.t, tok: k }));
      const { slots, tuplet } = subdivide(items);
      slots.forEach((s, si) => {
        if (s.tok != null) (st.toks[s.tok] as NoteTok | HoldTok).slot = si;
      });
      const sounding = st.toks.filter((t) => t.t !== "dot" && t.t !== "comma") as (NoteTok | HoldTok)[];
      const unit: Unit = {
        toks: st.toks,
        slots,
        tuplet,
        sepBefore: st.sepBefore,
        sepUl: st.sepUl,
        ulFull: st.toks.length > 0 && st.toks.every((t) => t.ul),
        hasMarks: sounding.some((t) => t.marks.length > 0) || (tuplet != null && header.tuplets === "courbe"),
        line: st.unitLine,
      };
      const u = st.cur.units.length;
      const m = st.measures.length;
      const resolve = (pm: PosMark) => {
        if (pm.m !== m || pm.u !== u || pm.frac >= 0) return;
        const s = slots.find((sl) => sl.tok != null && sl.tok >= pm.tokIndex);
        pm.frac = s ? s.start : pm.tokIndex === 0 ? 0 : 1;
      };
      st.struct.forEach(resolve);
      st.chords.forEach(resolve);
      st.cur.units.push(unit);
      st.toks = [];
    };

    const pushMeasure = (bar: "|" | "||") => {
      if (st.cur.units.length) {
        st.cur.endBar = bar;
        st.measures.push(st.cur);
      } else if (bar === "||" && st.measures.length) {
        st.measures[st.measures.length - 1]!.endBar = "||";
      }
      st.cur = newMeasure(st.unitLine);
      st.sepBefore = "start";
      st.sepUl = false;
    };

    const pending = () => st.toks.length > 0 || st.sepBefore !== "start";

    const bar = (kind: "|" | "||") => {
      if (pending()) flushUnit();
      pushMeasure(kind);
    };

    const pos = (): PosMark => ({ m: st.measures.length, u: st.cur.units.length, frac: -1, tokIndex: st.toks.length, voice: vi });

    for (const { body, line } of chunks) {
      let i = 0;
      const text = body;
      const err = (message: string, level: Diagnostic["level"] = "error") =>
        diagnostics.push({ level, line, message: `${voice.name} : ${message}` });
      while (i < text.length) {
        const c = text[i]!;
        if (/\s/.test(c)) {
          i++;
          continue;
        }
        if (c === "%") break;
        if (st.toks.length === 0) st.unitLine = line;
        if (text.startsWith("///", i) || text.startsWith("//", i)) {
          const kind = text.startsWith("///", i) ? "page" : "line";
          st.breaks.push({ m: st.measures.length, u: st.cur.units.length + (st.toks.length ? 1 : 0), kind });
          i += kind === "page" ? 3 : 2;
          continue;
        }
        if (text.startsWith("||", i)) {
          const count = st.cur.units.length + (pending() ? 1 : 0);
          const closes = !header.ffpm && count >= expected;
          if (closes || count === 0) bar("||");
          else {
            if (pending()) flushUnit();
            st.sepBefore = "||";
            st.sepUl = st.ul;
          }
          i += 2;
          continue;
        }
        if (c === "|") {
          bar("|");
          i++;
          continue;
        }
        if (c === ":" || c === "!") {
          if (st.cur.units.length === 0 && st.toks.length === 0 && st.sepBefore === "start") {
            st.cur.leadingColon = true;
            st.cur.line = line;
          } else {
            flushUnit();
            st.sepBefore = c;
            st.sepUl = st.ul;
          }
          i++;
          continue;
        }
        if (c === "{" || c === "<" || c === "(") {
          const close = c === "{" ? "}" : c === "<" ? ">" : ")";
          const j = text.indexOf(close, i);
          if (j < 0) {
            err(`« ${c} » sans « ${close} » correspondant.`);
            break;
          }
          const inner = text.slice(i + 1, j);
          if (c === "{") {
            const d = parseDirective(inner);
            if (STRUCTURAL.has(d.kind)) st.struct.push({ ...pos(), d });
            else st.pendingMarks.push(d);
          } else if (c === "<") {
            st.chords.push({ ...pos(), chord: { written: inner.trim(), kind: "latin" } });
          } else {
            const p = parsePitch(inner.trim());
            if (!p) err(`Indication de transition « (${inner}) » : note Sol-fa invalide.`);
            else st.pendingTrans = p;
          }
          i = j + 1;
          continue;
        }
        if (c === "[") {
          if (st.ul) err("Soulignement déjà ouvert.", "warning");
          st.ul = true;
          i++;
          continue;
        }
        if (c === "]") {
          if (!st.ul) err("« ] » sans « [ » correspondant.", "warning");
          st.ul = false;
          i++;
          continue;
        }
        if (c === "." || c === ",") {
          st.toks.push({ t: c === "." ? "dot" : "comma", ul: st.ul });
          i++;
          continue;
        }
        if (c === "-" || c === "–") {
          st.toks.push({ t: "hold", id: `${vi}:${st.measures.length}:${st.cur.units.length}:${st.toks.length}`, marks: st.pendingMarks, ul: st.ul });
          st.pendingMarks = [];
          i++;
          continue;
        }
        const nm = NOTE_RE.exec(text.slice(i));
        if (nm) {
          const p = parsePitch(nm[0])!;
          if (p.octave === 0 && /0$/.test(nm[0]))
            err(`Suffixe d'octave « 0 » dans « ${nm[0]} » : non défini par la conception (question ouverte).`, "info");
          st.toks.push({
            t: "note",
            id: `${vi}:${st.measures.length}:${st.cur.units.length}:${st.toks.length}`,
            p,
            ...(st.pendingTrans ? { trans: st.pendingTrans } : {}),
            marks: st.pendingMarks,
            ul: st.ul,
          });
          st.pendingMarks = [];
          st.pendingTrans = null;
          i += nm[0].length;
          continue;
        }
        err(`Caractère inattendu « ${c} ».`);
        i++;
      }
    }
    // fin de voix
    if (st.toks.length || st.sepBefore === ":" || st.sepBefore === "!") flushUnit();
    if (st.cur.units.length) {
      st.cur.endBar = st.sepBefore === "||" ? "||" : st.cur.endBar;
      st.measures.push(st.cur);
    } else if (st.sepBefore === "||" && st.measures.length) {
      st.measures[st.measures.length - 1]!.endBar = "||";
    }
    if (st.ul) diagnostics.push({ level: "warning", line: chunks.at(-1)?.line ?? 1, message: `${voice.name} : soulignement « [ » non refermé.` });

    const last = st.measures.length - 1;
    for (const pm of [...st.struct, ...st.chords]) {
      if (pm.m > last) {
        pm.m = Math.max(0, last);
        pm.u = Math.max(0, (st.measures[pm.m]?.units.length ?? 1) - 1);
        pm.frac = 1;
      }
      if (pm.frac < 0) pm.frac = 0;
    }
    voice.measures = st.measures;
    structure.push(...st.struct);
    chordsMarks.push(...st.chords);
    breaks.push(...st.breaks);
  });

  // ---- Alignement des voix
  const measureCount = Math.max(0, ...voices.map((v) => v.measures.length));
  const unitsPerMeasure = Array.from({ length: measureCount }, (_, m) =>
    Math.max(0, ...voices.map((v) => v.measures[m]?.units.length ?? 0)),
  );
  voices.forEach((v) => {
    if (v.measures.length && v.measures.length !== measureCount)
      diagnostics.push({ level: "warning", line: v.measures.at(-1)?.line ?? 1, message: `${v.name} : ${v.measures.length} mesures au lieu de ${measureCount}.` });
  });

  const first = voices.find((v) => v.measures.length)?.measures[0];
  const hasPickup = !!first && (first.leadingColon || unitsPerMeasure[0]! < expected) && measureCount > 1;

  // ---- Validation des mesures
  const boundaries = new Set<number>();
  disposition.groups.reduce((acc, gsz, gi) => {
    const nx = acc + gsz;
    if (gi < disposition.groups.length - 1) boundaries.add(nx);
    return nx;
  }, 0);

  for (let m = 0; m < measureCount; m++) {
    const n = unitsPerMeasure[m]!;
    const line = voices.find((v) => v.measures[m])?.measures[m]?.line ?? 1;
    const num = m + (hasPickup ? 0 : 1);
    const isPickup = m === 0 && hasPickup;
    const isLast = m === measureCount - 1;
    if (!isPickup && !(isLast && n < expected) && n !== expected) {
      const hasDbar = voices.some((v) => v.measures[m]?.units.some((u) => u.sepBefore === "||"));
      if (header.ffpm && n > expected && hasDbar)
        diagnostics.push({ level: "info", line, message: `Mesure ${num} : prolongée par double barre (usage FFPM) — ${n} unités.` });
      else
        diagnostics.push({ level: "warning", line, message: `Mesure ${num} : ${n} unité(s), la disposition ${disposition.label} en attend ${expected}.` });
    }
    voices.forEach((v) => {
      const ms = v.measures[m];
      if (!ms || ms.units.length !== expected) return;
      for (let u = 1; u < ms.units.length; u++) {
        const want = boundaries.has(u) ? "!" : ":";
        const got = ms.units[u]!.sepBefore;
        if (got !== "||" && got !== want) {
          diagnostics.push({ level: "info", line: ms.line, message: `${v.name}, mesure ${num} : « ${got} » écrit avant l'unité ${u + 1}, la disposition habituelle place « ${want} ».` });
          break;
        }
      }
    });
    voices.forEach((v) => {
      const ms = v.measures[m];
      if (ms && ms.units.length && ms.units.length !== n)
        diagnostics.push({ level: "warning", line: ms.line, message: `${v.name}, mesure ${num} : ${ms.units.length} unité(s) alors que d'autres voix en ont ${n}.` });
    });
  }

  // ---- Tonalités (changements au cours de la partition)
  const keyChanges = structure
    .filter((s) => s.d.kind === "key")
    .map((s) => {
      const k = parseKey((s.d as { key: string }).key);
      if (!k) diagnostics.push({ level: "error", line: 1, message: `Changement de tonalité invalide « ${(s.d as { key: string }).key} ».` });
      return { m: s.m, u: s.u, frac: s.frac, key: k };
    })
    .filter((k): k is { m: number; u: number; frac: number; key: KeyRef } => !!k.key)
    .sort((a, b) => a.m - b.m || a.u - b.u || a.frac - b.frac);
  const cmp = (a: { m: number; u: number; frac: number }, m: number, u: number, f: number) =>
    a.m !== m ? a.m - m : a.u !== u ? a.u - u : a.frac - f;
  const keyAt = (m: number, u: number, f: number, strict = false): KeyRef => {
    let k = header.key;
    for (const kc of keyChanges) {
      const c = cmp(kc, m, u, f);
      if (strict ? c < 0 : c <= 0) k = kc.key;
    }
    return k;
  };

  // ---- Notes, prolongations, durées
  const notes = new Map<string, NoteInfo>();
  voices.forEach((v, vi) => {
    let current: NoteInfo | null = null;
    v.measures.forEach((ms, m) => {
      ms.units.forEach((unit, u) => {
        unit.slots.forEach((slot) => {
          if (slot.kind === "rest") {
            current = null;
            return;
          }
          const tok = unit.toks[slot.tok!] as NoteTok | HoldTok;
          if (tok.t === "hold") {
            if (!current) {
              tok.error = "Prolongation sans note précédente";
              diagnostics.push({ level: "error", line: unit.line, message: `${v.name}, mesure ${m + (hasPickup ? 0 : 1)} : « - » sans note précédente à prolonger (invalide).` });
            } else current.dur += slot.dur;
            return;
          }
          const k = keyAt(m, u, slot.start);
          const midi = pitchMidi(tok.p, k);
          const info: NoteInfo = {
            id: tok.id,
            voice: vi,
            voiceName: v.name,
            ref: v.ref,
            m,
            u,
            displayMeasure: m + (hasPickup ? 0 : 1),
            pitch: tok.p,
            key: k,
            midi,
            spelled: spellPitch(tok.p, k).text,
            playedMidi: midi + 12 * v.ref,
            equivalents: equivalents(tok.p, k),
            start: slot.start,
            dur: slot.dur,
          };
          if (tok.trans) {
            const pk = keyAt(m, u, slot.start, true);
            info.transition = { written: tok.trans.written, key: pk, spelled: spellPitch(tok.trans, pk).text, midi: pitchMidi(tok.trans, pk) };
          }
          notes.set(tok.id, info);
          current = info;
        });
      });
    });
  });

  // ---- Accords
  for (const c of chordsMarks) c.chord = parseChord(c.chord.written, keyAt(c.m, c.u, c.frac));

  // ---- Paroles
  const leadIdx = Math.max(0, header.lyricsVoice ? voices.findIndex((v) => v.name === header.lyricsVoice) : 0);
  const common: LyricLine[] = [];
  const perVoice = new Map<number, LyricLine>();
  for (const ll of lyricLines) {
    const lm = /^paroles(?:\s+\d+)?(?:\s*:\s*(.+))?$/i.exec(ll.label);
    const target = lm?.[1]?.trim();
    const vi = target ? voices.findIndex((v) => v.name === target) : leadIdx;
    if (vi < 0 || !voices[vi]) {
      diagnostics.push({ level: "error", line: ll.line, message: `Paroles : voix « ${target} » inconnue.` });
      continue;
    }
    let map: LyricLine;
    if (target) {
      if (!perVoice.has(vi)) perVoice.set(vi, new Map());
      map = perVoice.get(vi)!;
    } else {
      // plusieurs lignes [paroles] consécutives sans numéro = suite du même couplet
      const num = /^paroles\s+(\d+)/i.exec(ll.label)?.[1];
      const idx = num ? Number(num) - 1 : 0;
      while (common.length <= idx) common.push(new Map());
      map = common[idx]!;
    }
    const onsets: { m: number; u: number; start: number }[] = [];
    voices[vi].measures.forEach((ms, m) =>
      ms.units.forEach((unit, u) => unit.slots.forEach((s) => s.kind === "note" && onsets.push({ m, u, start: s.start }))),
    );
    // reprendre après les syllabes déjà posées sur cette ligne
    const used = new Set<string>();
    map.forEach((arr, k) => arr.forEach((l) => used.add(`${k}:${l.start}`)));
    let ptr = 0;
    while (ptr < onsets.length && used.has(`${onsets[ptr]!.m}:${onsets[ptr]!.u}:${onsets[ptr]!.start}`)) ptr++;
    const placedMeta = (map as LyricLine & { _ptr?: number })._ptr;
    if (placedMeta != null) ptr = Math.max(ptr, placedMeta);
    for (const tokRaw of ll.body.split(/\s+/)) {
      const tk = tokRaw.trim();
      if (!tk || tk === "|") continue;
      const jump = /^@(\d+)$/.exec(tk);
      if (jump) {
        const target = Number(jump[1]) - (hasPickup ? 0 : 1);
        ptr = onsets.findIndex((o) => o.m >= target);
        if (ptr < 0) ptr = onsets.length;
        continue;
      }
      if (ptr >= onsets.length) {
        diagnostics.push({ level: "warning", line: ll.line, message: `Paroles : plus de syllabes que de notes dans la voix ${voices[vi].name} (« ${tk} » et suivantes ignorées).` });
        break;
      }
      const o = onsets[ptr++]!;
      if (tk === "_") continue;
      const k = `${o.m}:${o.u}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push({ start: o.start, text: tk });
    }
    (map as LyricLine & { _ptr?: number })._ptr = ptr;
  }

  // ---- Groupes (paroles entre deux groupes de portées)
  if (raw["groupes"]) {
    header.groups = raw["groupes"].value.split("/").map((gp) =>
      (gp.includes(",") ? gp.split(",") : gp.trim().split(/\s+/)).map((x) => x.trim()).filter(Boolean),
    );
  } else {
    const names = voices.map((v) => v.name);
    const h = Math.ceil(names.length / 2);
    header.groups = [names.slice(0, h), names.slice(h)].filter((x) => x.length);
  }

  // ---- Reprises : vérifier les renvois
  for (const s of structure) {
    if (s.d.kind === "ds" && !structure.some((x) => x.d.kind === "segno" && x.d.id === (s.d as { id: string }).id))
      diagnostics.push({ level: "warning", line: 1, message: `D.S._${s.d.id} : aucun repère Segno S_${s.d.id} dans la partition.` });
    if ((s.d.kind === "ds" || s.d.kind === "dc") && s.d.al === "coda") {
      if (!structure.some((x) => x.d.kind === "coda")) diagnostics.push({ level: "warning", line: 1, message: "« al Coda » sans repère Coda." });
      if (!structure.some((x) => x.d.kind === "tocoda")) diagnostics.push({ level: "warning", line: 1, message: "« al Coda » sans indication To Coda." });
    }
    if ((s.d.kind === "ds" || s.d.kind === "dc") && s.d.al === "fine" && !structure.some((x) => x.d.kind === "fine"))
      diagnostics.push({ level: "warning", line: 1, message: "« al Fine » sans indication Fine." });
  }

  // dédoublonner les marques structurelles écrites dans plusieurs voix
  const seen = new Set<string>();
  const uniqStruct = structure.filter((s) => {
    const k = `${s.m}:${s.u}:${JSON.stringify(s.d)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const seenB = new Set<string>();
  const uniqBreaks = breaks.filter((b) => {
    const k = `${b.m}:${b.u}`;
    if (seenB.has(k)) return false;
    seenB.add(k);
    return true;
  });

  diagnostics.sort((a, b) => a.line - b.line);

  return {
    header,
    voices,
    measureCount,
    unitsPerMeasure,
    hasPickup,
    structure: uniqStruct,
    chords: chordsMarks,
    breaks: uniqBreaks,
    lyrics: { common, perVoice },
    notes,
    diagnostics,
  };
}

/** Remplace (ou ajoute) une ligne d'en-tête sans toucher au reste du texte. */
export function setHeaderValue(text: string, key: string, value: string): string {
  const lines = text.split("\n");
  const re = new RegExp(`^\\s*${key}\\s*:`, "i");
  const idx = lines.findIndex((l) => re.test(l));
  if (idx >= 0) {
    lines[idx] = `${key}: ${value}`;
    return lines.join("\n");
  }
  const firstBody = lines.findIndex((l) => /^\s*\[/.test(l));
  const at = firstBody < 0 ? lines.length : firstBody;
  lines.splice(at, 0, `${key}: ${value}`);
  return lines.join("\n");
}
