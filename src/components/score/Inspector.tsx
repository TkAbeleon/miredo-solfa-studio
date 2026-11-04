import { X } from "lucide-react";
import type { NoteInfo } from "@/lib/miredo/parser";
import { DEGREE_NAMES, DEGREES, describeAlter, midiName } from "@/lib/miredo/pitch";
import { KeyName } from "./ScoreView";
import { formatFraction } from "@/lib/miredo/rhythm";

export function Inspector({ info, onClose }: { info: NoteInfo; onClose: () => void }) {
  const p = info.pitch;
  const rows: [string, React.ReactNode][] = [
    ["Graphie conservée", <code className="font-mono text-primary">{p.written}</code>],
    ["Degré", `${p.base} — ${DEGREE_NAMES[p.base]} (${DEGREES.indexOf(p.base) + 1})`],
    ["Altération", describeAlter(p)],
    ["Octave", p.octave === 0 ? "octave de référence" : `${p.octave > 0 ? "+" : ""}${p.octave}`],
    [
      "Référence tonale",
      <>
        d = <KeyName k={info.key} />
      </>,
    ],
    ["Hauteur calculée", `${info.spelled} · MIDI ${info.midi}`],
    [
      "Hauteur jouée",
      info.ref === 0 ? "identique" : `${midiName(info.playedMidi)} (réf. de portée ${info.ref}, provisoire)`,
    ],
    ["Durée", `${formatFraction(info.dur)} unité(s)`],
    ["Voix · mesure", `${info.voiceName} · ${info.displayMeasure}`],
  ];
  return (
    <div className="w-80 rounded-xl border bg-popover p-4 text-sm shadow-xl">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Note sélectionnée</div>
          <div className="font-score text-3xl leading-tight">{p.written}</div>
        </div>
        <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Fermer">
          <X className="size-4" />
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {info.transition && (
        <div className="mt-3 rounded-md bg-muted p-2 text-xs">
          Indication de transition <code className="font-mono">({info.transition.written})</code> : dans l'ancienne
          référence <KeyName k={info.transition.key} />, elle vaut {info.transition.spelled}. Elle aide la lecture et
          n'est pas jouée.
        </div>
      )}
      <div className="mt-3 text-xs text-muted-foreground">
        <div className="mb-1">Équivalences de hauteur (jamais substituées automatiquement) :</div>
        <div className="flex flex-wrap gap-1">
          {info.equivalents.length ? (
            info.equivalents.map((e) => (
              <code key={e} className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                {e}
              </code>
            ))
          ) : (
            <span>aucune</span>
          )}
        </div>
      </div>
    </div>
  );
}
