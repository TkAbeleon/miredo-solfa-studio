// Mise en page : systèmes (retours à la ligne) et pages.
// Par défaut une mesure entière qui ne tient pas est reportée au système suivant ;
// `//` impose un retour (même au milieu d'une mesure), `///` un saut de page.

import type { Score } from "./parser";

export interface Segment {
  m: number;
  u0: number;
  u1: number;
}

/**
 * True when a system resumes after the beginning of a measure or has no
 * sounding event on the first subdivision. With the brace hidden, do not
 * add an artificial initial bar in those cases.
 */
export function systemStartsOffbeat(score: Score, first: Segment): boolean {
  if (first.u0 > 0) return true;
  if (score.voices.some((v) => v.measures[first.m]?.leadingColon)) return true;

  const hasSoundAtStart = score.voices.some((v) =>
    v.measures[first.m]?.units[first.u0]?.slots.some((slot) => slot.start === 0 && slot.kind !== "rest"),
  );
  return !hasSoundAtStart;
}

/** Return the bar that closes a segment or the final system line. */
export function systemSegmentEndBar(
  score: Score,
  segment: Segment,
  isLastSegment: boolean,
): "|" | "||" | null {
  const measureUnits = score.unitsPerMeasure[segment.m] ?? 0;

  if (segment.u1 >= measureUnits) {
    return score.voices.some((v) => v.measures[segment.m]?.endBar === "||") ? "||" : "|";
  }

  // The bar closes the previous system line. The actual separator before
  // the resumed unit is rendered separately at the start of the next system.
  return isLastSegment ? "|" : null;
}

export interface SystemLayout {
  segments: Segment[];
  stretch: boolean;
  height: number;
}
export interface PageLayout {
  systems: SystemLayout[];
}

const EM = 16; // taille de police de la partition
const LYR_PX = 6.9;
const UNIT_PAD = 9;
const SEP_PX = 10;
const BAR_PX = 12;

const charW = (s: string) =>
  [...s].reduce((a, c) => a + (/[.,'’:;!|]/.test(c) ? 0.28 : c === "–" || c === "-" ? 0.5 : /[mw]/.test(c) ? 0.78 : 0.48), 0) * EM;

export function labelWidth(score: Score): number {
  if (score.voices.length < 2) return 4;
  return score.header.names === "aucun" ? 18 : 18 + Math.max(...score.voices.map((v) => v.name.length)) * 7 + 16;
}

export function unitWidth(score: Score, m: number, u: number): number {
  let max = 0;
  for (const v of score.voices) {
    const unit = v.measures[m]?.units[u];
    if (!unit) continue;
    let px = 0;
    for (const t of unit.toks) {
      if (t.t === "note") px += charW(t.p.base + t.p.vowel) + (t.p.octave ? 0.35 * EM : 0) + (t.trans ? 0.45 * EM : 0) + 2;
      else if (t.t === "hold") px += 0.6 * EM;
      else if (!(unit.tuplet && score.header.tuplets === "courbe")) px += 0.3 * EM;
    }
    max = Math.max(max, px);
  }
  const key = `${m}:${u}`;
  const lines = [...score.lyrics.common, ...score.lyrics.perVoice.values()];
  for (const l of lines) {
    const arr = l.get(key);
    if (arr) max = Math.max(max, arr.reduce((a, x) => a + x.text.length * LYR_PX + 7, 0));
  }
  const ch = score.chords.filter((c) => c.m === m && c.u === u);
  if (ch.length) max = Math.max(max, ch.reduce((a, c) => a + c.chord.written.length * 8 + 8, 0));
  return max + UNIT_PAD;
}

interface Piece extends Segment {
  breakAfter: "line" | "page" | null;
}

const mu = (k: string): [number, number] => {
  const [a, b] = k.split(":");
  return [Number(a), Number(b)];
};

function systemHeight(score: Score, segs: Segment[]): number {
  const inSys = (m: number, u: number) => segs.some((s) => s.m === m && u >= s.u0 && u < s.u1);
  let h = 20; // rangée supérieure
  if (score.chords.some((c) => inSys(c.m, c.u))) h += 20;
  for (const v of score.voices) {
    h += 26;
    const marks = segs.some((s) => v.measures[s.m]?.units.slice(s.u0, s.u1).some((u) => u.hasMarks));
    if (marks) h += 15;
  }
  for (const [, map] of score.lyrics.perVoice) {
    if ([...map.keys()].some((k) => inSys(...mu(k)))) h += 21;
  }
  for (const map of score.lyrics.common) {
    if ([...map.keys()].some((k) => inSys(...mu(k)))) h += 23;
  }
  return h + 20;
}

/** Largeurs mesurées dans le navigateur ("m:u", "sep", "bar", "label") ; à défaut, estimation. */
export type Measured = Map<string, number>;

export function layoutScore(
  score: Score,
  opts: { width: number; pageHeight?: number; firstPageOffset?: number; measured?: Measured | null },
): PageLayout[] {
  const ms = opts.measured;
  const UW = (m: number, u: number) => ms?.get(`${m}:${u}`) ?? unitWidth(score, m, u);
  const SEP = ms?.get("sep") ?? SEP_PX;
  const BAR = ms?.get("bar") ?? BAR_PX;
  const pieces: Piece[] = [];
  for (let m = 0; m < score.measureCount; m++) {
    const n = score.unitsPerMeasure[m] ?? 0;
    const cuts = [
      ...new Set(score.breaks.filter((b) => b.m === m && b.u > 0 && b.u < n).map((b) => b.u)),
    ].sort((a, b) => a - b);
    const bounds = [0, ...cuts, n];
    for (let i = 0; i < bounds.length - 1; i++) {
      const u0 = bounds[i]!;
      const u1 = bounds[i + 1]!;
      const bk =
        u1 < n
          ? score.breaks.find((b) => b.m === m && b.u === u1)
          : score.breaks.find((b) => b.m === m + 1 && b.u === 0);
      pieces.push({ m, u0, u1, breakAfter: bk ? bk.kind : null });
    }
  }

  const avail = opts.width - (ms?.get("label") ?? labelWidth(score)) - 2;
  const systems: { segs: Segment[]; fill: number; pageAfter: boolean }[] = [];
  let cur: Segment[] = [];
  let w = 0;
  const pushSys = (pageAfter = false) => {
    if (cur.length) systems.push({ segs: cur, fill: w / avail, pageAfter });
    cur = [];
    w = 0;
  };
  for (const p of pieces) {
    let pw = 0;
    for (let u = p.u0; u < p.u1; u++) pw += UW(p.m, u) + (u > p.u0 ? SEP : 0);
    if (p.u1 === score.unitsPerMeasure[p.m] || p.breakAfter) pw += BAR;
    if (cur.length && w + pw > avail) pushSys();
    if (!cur.length && (p.u0 > 0 || score.voices.some((v) => v.measures[p.m]?.leadingColon))) pw += SEP;
    cur.push({ m: p.m, u0: p.u0, u1: p.u1 });
    w += pw;
    if (p.breakAfter) pushSys(p.breakAfter === "page");
  }
  pushSys();

  const out: SystemLayout[] = systems.map((s, i) => ({
    segments: s.segs,
    stretch: !(i === systems.length - 1 && s.fill < 0.7) && s.fill > 0.45,
    height: systemHeight(score, s.segs),
  }));

  if (!opts.pageHeight) return [{ systems: out }];

  const pages: PageLayout[] = [{ systems: [] }];
  let used = opts.firstPageOffset ?? 0;
  out.forEach((sys, i) => {
    if (used + sys.height > opts.pageHeight! && pages[pages.length - 1]!.systems.length) {
      pages.push({ systems: [] });
      used = 0;
    }
    pages[pages.length - 1]!.systems.push(sys);
    used += sys.height;
    if (systems[i]!.pageAfter && i < out.length - 1) {
      pages.push({ systems: [] });
      used = 0;
    }
  });
  return pages;
}
