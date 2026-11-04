import { describe, expect, it } from "vitest";
import { parseScore } from "./parser";
import { parseKey, parsePitch, pitchMidi, spellPitch, equivalents, parseChord } from "./pitch";
import { computePath } from "./playback";
import { layoutScore, systemSegmentEndBar, systemStartsOffbeat } from "./layout";
import { SCORE_446, SCORE_DEMO } from "./examples";

const one = (body: string, head = "mesure: 4/4") => parseScore(`${head}\n[V] ${body}`);
const slots = (body: string, head?: string) =>
  one(body, head).voices[0]!.measures.flatMap((m) => m.units.flatMap((u) => u.slots.map((s) => [s.kind, s.start, s.dur])));

describe("hauteur", () => {
  it("di_1 garde sa graphie et descend d'une octave", () => {
    const p = parsePitch("di_1")!;
    expect(p).toMatchObject({ written: "di_1", base: "d", alter: 1, octave: -1 });
  });
  it("référence Ab : d = La bémol", () => {
    expect(spellPitch(parsePitch("d")!, parseKey("Ab")!).name).toBe("A♭");
  });
  it("mi et f ont la même hauteur sans être réécrits", () => {
    const k = parseKey("C")!;
    expect(pitchMidi(parsePitch("mi")!, k)).toBe(pitchMidi(parsePitch("f")!, k));
    expect(equivalents(parsePitch("mi")!, k)).toContain("f");
  });
  it("de et t_1 sont équivalents (déplacement d'octave conservé)", () => {
    const k = parseKey("C")!;
    expect(pitchMidi(parsePitch("de")!, k)).toBe(pitchMidi(parsePitch("t_1")!, k));
  });
  it("Db écrit d d d m = C écrit di di di f", () => {
    const a = parseScore("ton: Db\nmesure: 4/4\n[V] |d:d!d:m|");
    const b = parseScore("ton: C\nmesure: 4/4\n[V] |di:di!di:f|");
    const midis = (s: typeof a) => [...s.notes.values()].map((n) => n.midi);
    expect(midis(a)).toEqual(midis(b));
  });
  it("accord Sol-fa Dom7 avec référence G = Gm7", () => {
    expect(parseChord("Dom7", parseKey("G")).absolute).toBe("Gm7");
  });
});

describe("rythme", () => {
  it("|d.:::| : d occupe une demi-unité", () => {
    expect(slots("|d.:::|")[0]).toEqual(["note", 0, 0.5]);
  });
  it(":s.-,f: : Sol 1/2, prolongation 1/4, Fa 1/4", () => {
    expect(slots("|s.-,f|", "mesure: 1/4")).toEqual([
      ["note", 0, 0.5],
      ["hold", 0.5, 0.25],
      ["note", 0.75, 0.25],
    ]);
  });
  it("|d:-!-.:| : Do dure deux unités et demie", () => {
    const s = one("|d:-!-.:|");
    expect([...s.notes.values()][0]!.dur).toBe(2.5);
  });
  it("trois notes collées se partagent l'unité en tiers", () => {
    expect(slots("|ddd|", "mesure: 1/4").map((x) => x[2])).toEqual([1 / 3, 1 / 3, 1 / 3]);
  });
  it("une prolongation sans note précédente est invalide", () => {
    expect(one("|-:d!d:d|").diagnostics.some((d) => d.level === "error")).toBe(true);
  });
  it("la prolongation traverse la barre de mesure", () => {
    const s = one("|d:d!d:d|-:-!d:d|");
    expect([...s.notes.values()][3]!.dur).toBe(3);
  });
  it("mesure 9/8 avec disposition 3/4 : 3 unités, signature conservée", () => {
    const s = parseScore("mesure: 9/8\ndisposition: 3/4\n[V] |d:d:d|d:d:d|");
    expect(s.header.time.label).toBe("9/8");
    expect(s.diagnostics.filter((d) => d.level !== "info")).toEqual([]);
  });
});

describe("structure", () => {
  it("D.S. al Coda : retour au segno puis saut vers la Coda", () => {
    const s = parseScore(
      "mesure: 2/4\n[V] {segno:1}|d:d|{tocoda}r:r|m:m{ds:1 al coda}|{coda}f:f|",
    );
    expect(computePath(s)).toEqual([0, 1, 2, 0, 1, 3]);
  });
  it("D.C. al Fine s'arrête à Fine", () => {
    const s = parseScore("mesure: 2/4\n[V] |d:d|r:r{fine}|m:m{dc al fine}|");
    expect(computePath(s)).toEqual([0, 1, 2, 0, 1]);
  });
  it("la double barre au milieu d'une mesure ne la ferme pas", () => {
    const s = one("|d:d!d||{ton:D}(l_1)s_1|");
    expect(s.measureCount).toBe(1);
    expect(s.unitsPerMeasure[0]).toBe(4);
  });
  it("l'indication de transition n'est pas une note jouée", () => {
    const s = one("|d:d!d||{ton:D}(l_1)s_1|");
    expect(s.notes.size).toBe(4);
    expect([...s.notes.values()][3]!.transition?.written).toBe("l_1");
  });
});

describe("début et fin des systèmes", () => {
  it("reconnaît une anacrouse qui commence par un silence", () => {
    const s = parseScore("mesure: 3/4\n[V] .r|d:d:d|");
    const first = { m: 0, u0: 0, u1: s.unitsPerMeasure[0]! };
    expect(systemStartsOffbeat(s, first)).toBe(true);
  });

  it("ne traite pas un début normal sur le premier temps comme une anacrouse", () => {
    const s = parseScore("mesure: 3/4\n[V] |d:d:d|");
    const first = { m: 0, u0: 0, u1: s.unitsPerMeasure[0]! };
    expect(systemStartsOffbeat(s, first)).toBe(false);
  });

  it("ferme un système coupé au milieu d'une mesure et conserve son séparateur", () => {
    const s = parseScore("mesure: 4/4\n[V] |d:d!m//:f|");
    const systems = layoutScore(s, { width: 1000 })[0]!.systems;

    expect(systems).toHaveLength(2);
    const firstSegment = systems[0]!.segments.at(-1)!;
    expect(systemSegmentEndBar(s, firstSegment, true)).toBe("|");

    const nextSegment = systems[1]!.segments[0]!;
    expect(systemStartsOffbeat(s, nextSegment)).toBe(true);
    expect(s.voices[0]!.measures[nextSegment.m]!.units[nextSegment.u0]!.sepBefore).toBe(":");
  });

  it("préserve un séparateur ! au début d'une reprise en milieu de mesure", () => {
    const s = parseScore("mesure: 4/4\n[V] |d:d:m//!f|");
    const systems = layoutScore(s, { width: 1000 })[0]!.systems;
    const nextSegment = systems[1]!.segments[0]!;
    expect(s.voices[0]!.measures[nextSegment.m]!.units[nextSegment.u0]!.sepBefore).toBe("!");
  });

  it("sépare la barre de fermeture de ligne d'une double barre au début de la ligne suivante", () => {
    const s = parseScore("mesure: 4/4\n[V] |d:d:m//||f|");
    const systems = layoutScore(s, { width: 1000 })[0]!.systems;
    const firstSegment = systems[0]!.segments.at(-1)!;
    const nextSegment = systems[1]!.segments[0]!;

    expect(systemSegmentEndBar(s, firstSegment, true)).toBe("|");
    expect(s.voices[0]!.measures[nextSegment.m]!.units[nextSegment.u0]!.sepBefore).toBe("||");
  });
});

describe("partitions d'exemple", () => {
  it("la 446 se lit sans erreur ni avertissement", () => {
    const s = parseScore(SCORE_446);
    expect(s.diagnostics.filter((d) => d.level !== "info")).toEqual([]);
  });
  it("la démonstration se lit sans erreur", () => {
    const s = parseScore(SCORE_DEMO);
    expect(s.diagnostics.filter((d) => d.level === "error")).toEqual([]);
  });
});
