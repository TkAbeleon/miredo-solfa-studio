// Subdivisions à l'intérieur d'une unité (entre `:` / `!` / `|`).
// `.` divise l'unité en parts égales ; `,` divise chaque part en parts égales ;
// plusieurs notes collées se partagent également leur part ; une part vide est un silence.

export type RhythmItem = { kind: "note" | "hold" | "dot" | "comma"; tok: number };

export interface Slot {
  /** index du jeton (note ou prolongation) ; null = silence */
  tok: number | null;
  kind: "note" | "hold" | "rest";
  start: number; // fraction d'unité [0,1)
  dur: number; // fraction d'unité
}

function splitBy(items: RhythmItem[], kind: "dot" | "comma"): RhythmItem[][] {
  const parts: RhythmItem[][] = [[]];
  for (const it of items) {
    if (it.kind === kind) parts.push([]);
    else parts[parts.length - 1]!.push(it);
  }
  return parts;
}

function compact(arr: RhythmItem[], start: number, dur: number, out: Slot[]) {
  const sounding = arr.filter((a) => a.kind === "note" || a.kind === "hold");
  if (sounding.length === 0) {
    out.push({ tok: null, kind: "rest", start, dur });
    return;
  }
  const d = dur / sounding.length;
  sounding.forEach((a, i) => {
    out.push({ tok: a.tok, kind: a.kind as "note" | "hold", start: start + i * d, dur: d });
  });
}

export function subdivide(items: RhythmItem[]): { slots: Slot[]; tuplet: number | null } {
  const out: Slot[] = [];
  const parts = splitBy(items, "dot");
  const n = parts.length;
  parts.forEach((part, i) => {
    const ps = i / n;
    const pd = 1 / n;
    const subs = splitBy(part, "comma");
    if (subs.length === 1) compact(part, ps, pd, out);
    else subs.forEach((sub, j) => compact(sub, ps + (j * pd) / subs.length, pd / subs.length, out));
  });

  // Groupes non binaires (triolet, sextolet) : rendu possible avec une courbe.
  let tuplet: number | null = null;
  const hasComma = items.some((i) => i.kind === "comma");
  if (!hasComma && (n === 3 || n === 6) && parts.every((p) => p.length === 1)) tuplet = n;
  if (!hasComma && n === 1 && (items.length === 3 || items.length === 6)) tuplet = items.length;
  if (n === 2 && parts.every((p) => splitBy(p, "comma").length === 3)) tuplet = 6;
  return { slots: out, tuplet };
}

export function formatFraction(x: number): string {
  // Affiche les fractions courantes de manière lisible (1/2, 1/3, 3/4…).
  for (const den of [1, 2, 3, 4, 6, 8, 12, 16]) {
    const num = Math.round(x * den);
    if (Math.abs(num / den - x) < 1e-6) {
      if (den === 1) return String(num);
      const whole = Math.floor(num / den);
      const rest = num % den;
      return whole > 0 ? `${whole} ${rest}/${den}` : `${num}/${den}`;
    }
  }
  return x.toFixed(3);
}
