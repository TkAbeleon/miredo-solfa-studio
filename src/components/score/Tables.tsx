import { PitchText } from "@/components/score/ScoreView";
import type { NoteTok, Score } from "@/lib/miredo/parser";
import { formatFraction } from "@/lib/miredo/rhythm";
import { cn } from "@/lib/utils";

export function TimingTable({ score }: { score: Score }) {
  const v = score.voices[0];
  const rows: { m: number; u: number; what: React.ReactNode; start: number; dur: number; kind: string }[] = [];
  v?.measures.forEach((ms, m) =>
    ms.units.forEach((unit, u) =>
      unit.slots.forEach((s) => {
        const tok = s.tok != null ? unit.toks[s.tok] : null;
        const info = tok && tok.t === "note" ? score.notes.get((tok as NoteTok).id) : null;
        rows.push({
          m,
          u,
          kind: s.kind,
          what: tok?.t === "note" ? <PitchText p={(tok as NoteTok).p} mode="chiffres" /> : s.kind === "hold" ? "–" : "silence",
          start: u + s.start,
          dur: info ? info.dur : s.dur,
        });
      }),
    ),
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 font-medium">Mesure</th>
            <th className="font-medium">Événement</th>
            <th className="font-medium">Début (unités)</th>
            <th className="font-medium">Durée sonore</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {rows.map((r, i) => (
            <tr key={i} className={cn(r.kind === "rest" && "text-muted-foreground", r.kind === "hold" && "text-muted-foreground/70")}>
              <td className="py-0.5">{r.m + (score.hasPickup ? 0 : 1)}</td>
              <td className="font-score text-sm">{r.what}</td>
              <td>{formatFraction(r.start)}</td>
              <td>{r.kind === "hold" ? "(prolonge)" : formatFraction(r.dur)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PitchTable({ score }: { score: Score }) {
  const notes = [...score.notes.values()].filter((n) => n.voice === 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 font-medium">Graphie</th>
            <th className="font-medium">Degré</th>
            <th className="font-medium">Alt.</th>
            <th className="font-medium">Oct.</th>
            <th className="font-medium">Hauteur</th>
            <th className="font-medium">Équivalents</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {notes.map((n) => (
            <tr key={n.id}>
              <td className="py-0.5 text-primary">
                {n.transition && <span className="text-muted-foreground">({n.transition.written}) </span>}
                {n.pitch.written}
              </td>
              <td>{n.pitch.base}</td>
              <td>{n.pitch.alter > 0 ? "+1" : n.pitch.alter < 0 ? "−1" : "0"}</td>
              <td>{n.pitch.octave}</td>
              <td>
                {n.spelled} <span className="text-muted-foreground">({n.midi})</span>
              </td>
              <td className="text-muted-foreground">{n.equivalents.slice(0, 3).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
