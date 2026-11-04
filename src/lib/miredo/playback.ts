// Parcours (D.C., D.S., Fine, Coda, To Coda) et lecture sonore simple (Web Audio).
// Le sens des indications suit le solfège habituel ; l'ordre de lecture n'est pas l'ordre linéaire.

import type { NoteTok, HoldTok, Score } from "./parser";

export function computePath(score: Score): number[] {
  const n = score.measureCount;
  const order: number[] = [];
  if (!n) return order;
  const at = (kind: string, m: number) => score.structure.some((s) => s.d.kind === kind && s.m === m);
  const jumps = score.structure.filter((s) => s.d.kind === "ds" || s.d.kind === "dc");
  const used = new Set<number>();
  let i = 0;
  let mode: "fine" | "coda" | null = null;
  let jumped = false;
  let guard = 0;
  while (i < n && guard++ < 10000) {
    order.push(i);
    if (jumped && mode === "fine" && at("fine", i)) break;
    if (jumped && mode === "coda" && at("tocoda", i)) {
      const coda = score.structure.find((s) => s.d.kind === "coda");
      if (coda) {
        i = coda.m;
        mode = null;
        continue;
      }
    }
    const k = jumps.findIndex((j, idx) => j.m === i && !used.has(idx));
    if (k >= 0) {
      const j = jumps[k];
      used.add(k);
      jumped = true;
      if (j.d.kind === "dc") {
        mode = j.d.al;
        i = 0;
      } else if (j.d.kind === "ds") {
        mode = j.d.al;
        const id = j.d.id;
        const seg = score.structure.find((s) => s.d.kind === "segno" && (s.d as { id: string }).id === id);
        i = seg ? seg.m : 0;
      }
      continue;
    }
    i++;
  }
  return order;
}

const DYN_GAIN: Record<string, number> = {
  ppp: 0.18,
  pp: 0.28,
  p: 0.4,
  mp: 0.55,
  mf: 0.7,
  f: 0.85,
  ff: 1,
  fff: 1,
  sf: 1,
  sfz: 1,
  fp: 0.4,
};

export interface ScheduledNote {
  voice: number;
  midi: number;
  t0: number;
  t1: number;
  gain: number;
}

export function buildSchedule(score: Score, path: number[]) {
  const base = 60 / Math.max(20, score.header.tempo);
  let tempo = 1;
  let tempoMode: "rit" | "accel" | null = null;
  let gain = 0.7;
  let ramp = 0;
  let rampLeft = 0;
  let t = 0;
  const notes: ScheduledNote[] = [];
  const measures: { m: number; t0: number; t1: number }[] = [];
  const open: ({ midi: number; t0: number; end: number; gain: number; stacc: boolean } | null)[] =
    score.voices.map(() => null);
  const close = (v: number) => {
    const o = open[v];
    if (!o) return;
    const t1 = o.stacc ? o.t0 + (o.end - o.t0) * 0.45 : o.end;
    notes.push({ voice: v, midi: o.midi, t0: o.t0, t1, gain: o.gain });
    open[v] = null;
  };

  for (const m of path) {
    const mt0 = t;
    const units = score.unitsPerMeasure[m];
    for (let u = 0; u < units; u++) {
      let fermata = false;
      for (const v of score.voices) {
        const unit = v.measures[m]?.units[u];
        if (!unit) continue;
        for (const tk of unit.toks) {
          if (tk.t !== "note" && tk.t !== "hold") continue;
          for (const d of tk.marks) {
            if (d.kind === "fermata") fermata = true;
            if (d.kind === "tempo") {
              const x = d.text.toLowerCase();
              if (/^(rit|rall|riten|allarg|morendo)/.test(x)) tempoMode = "rit";
              else if (x.startsWith("accel")) tempoMode = "accel";
              else if (x.startsWith("a tempo")) {
                tempoMode = null;
                tempo = 1;
              }
            }
            if (d.kind === "dynamic") {
              const x = d.text.toLowerCase().replace(".", "");
              if (DYN_GAIN[x] != null) gain = DYN_GAIN[x];
              if (x === "cresc" || x === "<") {
                ramp = 0.05;
                rampLeft = 6;
              }
              if (x === "dim" || x === "decresc" || x === ">>") {
                ramp = -0.05;
                rampLeft = 6;
              }
            }
          }
        }
      }
      if (tempoMode === "rit") tempo = Math.min(1.6, tempo * 1.07);
      if (tempoMode === "accel") tempo = Math.max(0.65, tempo * 0.95);
      if (rampLeft > 0) {
        gain = Math.min(1, Math.max(0.15, gain + ramp));
        rampLeft--;
      }
      const ud = base * tempo * (fermata ? 1.8 : 1);
      score.voices.forEach((v, vi) => {
        const unit = v.measures[m]?.units[u];
        if (!unit) {
          close(vi);
          return;
        }
        for (const slot of unit.slots) {
          const st = t + slot.start * ud;
          const en = st + slot.dur * ud;
          if (slot.kind === "rest") {
            close(vi);
            continue;
          }
          const tok = unit.toks[slot.tok!] as NoteTok | HoldTok;
          if (tok.t === "hold") {
            if (open[vi]) open[vi]!.end = en;
            continue;
          }
          close(vi);
          const info = score.notes.get(tok.id);
          if (!info) continue;
          const accent = tok.marks.some((d) => d.kind === "artic" && (d.type === "accent" || d.type === "marcato"));
          const stacc = tok.marks.some((d) => d.kind === "artic" && d.type === "staccato");
          open[vi] = { midi: info.playedMidi, t0: st, end: en, gain: gain * (accent ? 1.3 : 1), stacc };
        }
      });
      t += ud;
    }
    measures.push({ m, t0: mt0, t1: t });
  }
  score.voices.forEach((_, vi) => close(vi));
  return { notes, measures, total: t };
}

export class Player {
  private ctx: AudioContext | null = null;
  private raf = 0;
  onMeasure: (m: number | null) => void = () => {};

  get playing() {
    return !!this.ctx;
  }

  play(score: Score) {
    this.stop();
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctx = ctx;
    const path = computePath(score);
    const sch = buildSchedule(score, path);
    const master = ctx.createGain();
    master.gain.value = 0.22 / Math.sqrt(Math.max(1, score.voices.length));
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    master.connect(lp).connect(ctx.destination);
    const start = ctx.currentTime + 0.15;
    for (const n of sch.notes) {
      const s = start + n.t0;
      const e = start + Math.max(n.t1, n.t0 + 0.06);
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = 440 * 2 ** ((n.midi - 69) / 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(n.gain, s + 0.025);
      g.gain.linearRampToValueAtTime(n.gain * 0.7, s + 0.25);
      g.gain.setValueAtTime(n.gain * 0.7, Math.max(s + 0.25, e - 0.04));
      g.gain.linearRampToValueAtTime(0, e);
      osc.connect(g).connect(master);
      osc.start(s);
      osc.stop(e + 0.05);
    }
    let last: number | null = -1;
    const tick = () => {
      if (!this.ctx) return;
      const el = this.ctx.currentTime - start;
      if (el > sch.total + 0.3) {
        this.stop();
        return;
      }
      const cur = sch.measures.find((x) => el >= x.t0 && el < x.t1);
      const m = cur ? cur.m : null;
      if (m !== last) {
        last = m;
        this.onMeasure(m);
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.onMeasure(null);
  }
}
