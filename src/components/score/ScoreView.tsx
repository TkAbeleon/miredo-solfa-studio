import { Fragment, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Directive, NoteTok, HoldTok, Score, Unit, UnitTok } from "@/lib/miredo/parser";
import { displayMeasureNumber } from "@/lib/miredo/parser";
import { layoutScore, systemSegmentEndBar, systemStartsOffbeat, type Measured, type SystemLayout } from "@/lib/miredo/layout";
import type { KeyRef, Pitch } from "@/lib/miredo/pitch";
import { parseKey } from "@/lib/miredo/pitch";

const PAGE_INNER = 794 - 104;
const PAGE_BODY = 1123 - 56 - 70;

interface Props {
  score: Score;
  variant?: "pages" | "inline";
  width?: number;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  playingMeasure?: number | null;
}

export function ScoreView({ score, variant = "pages", width = 640, selectedId, onSelect, playingMeasure }: Props) {
  const [measured, setMeasured] = useState<{ score: Score; map: Measured } | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ref = el.querySelector<HTMLElement>("[data-ref]");
    const scale = ref ? ref.getBoundingClientRect().width / 100 || 1 : 1;
    const map: Measured = new Map();
    el.querySelectorAll<HTMLElement>("[data-mu]").forEach((n) => map.set(n.dataset["mu"]!, n.getBoundingClientRect().width / scale));
    setMeasured({ score, map });
  }, [score]);
  const map = measured?.score === score ? measured.map : null;

  const pages = useMemo(
    () =>
      variant === "pages"
        ? layoutScore(score, { width: PAGE_INNER, pageHeight: PAGE_BODY, firstPageOffset: 120, measured: map })
        : layoutScore(score, { width, measured: map }),
    [score, variant, width, map],
  );
  const ctx: Ctx = { score, selectedId: selectedId ?? null, onSelect, playingMeasure: playingMeasure ?? null };
  let sysCounter = 0;
  const measurer = <Measurer score={score} innerRef={measureRef} />;

  if (variant === "inline") {
    return (
      <div className="mrd-inline relative">
        {measurer}
        {pages[0]?.systems.map((s, i) => (
          <SystemView key={i} sys={s} index={i} ctx={ctx} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-8">
      {measurer}
      {pages.map((page, pi) => (
        <div className="mrd-page" key={pi}>
          {pi === 0 && <TitleBlock score={score} />}
          {page.systems.map((s) => {
            const idx = sysCounter++;
            return <SystemView key={idx} sys={s} index={idx} ctx={ctx} />;
          })}
          <div className="mrd-pagenum">
            {pi + 1} / {pages.length}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Rendu invisible de chaque unité (toutes voix + paroles) pour mesurer sa largeur réelle. */
function Measurer({ score, innerRef }: { score: Score; innerRef: React.RefObject<HTMLDivElement | null> }) {
  const ctx: Ctx = { score, selectedId: null, playingMeasure: null };
  const lines = [...score.lyrics.common, ...score.lyrics.perVoice.values()];
  const cols: ReactNode[] = [];
  for (let m = 0; m < score.measureCount; m++) {
    for (let u = 0; u < (score.unitsPerMeasure[m] ?? 0); u++) {
      const key = `${m}:${u}`;
      const ch = score.chords.filter((c) => c.m === m && c.u === u);
      cols.push(
        <div key={key} data-mu={key} className="inline-grid align-top">
          {score.voices.map((v, vi) => (
            <UnitCell key={vi} unit={v.measures[m]?.units[u]} ctx={ctx} style={{}} marks={false} playing={false} nextSepUl={false} />
          ))}
          {lines.map((l, li) => (
            <LyricCell key={`l${li}`} arr={l.get(key) ?? []} style={{}} small={false} />
          ))}
          {ch.length > 0 && (
            <div className="mrd-cell mrd-chords mrd-unit">
              {ch.map((c, i) => (
                <span key={i}>{c.chord.written}</span>
              ))}
            </div>
          )}
        </div>,
      );
    }
  }
  const showNames = score.header.names !== "aucun";
  return (
    <div ref={innerRef} aria-hidden className="mrd-system pointer-events-none absolute left-0 top-0 block h-0 overflow-hidden" style={{ visibility: "hidden", fontSize: score.header.size }}>
      <div data-ref style={{ width: 100 }} />
      <div className="whitespace-nowrap">{cols}</div>
      <div data-mu="sep" className="mrd-cell mrd-sep inline-flex">:</div>
      <div data-mu="bar" className="mrd-bar inline-flex">
        <i />
      </div>
      <div data-mu="label" className="inline-flex">
        <div className="mrd-cell mrd-label">
          {showNames && <span>{score.voices.reduce((a, v) => (v.name.length > a.length ? v.name : a), "")}</span>}
          {showNames && <span className="mrd-ref">−1</span>}
          {showNames && score.header.clefs === "classique" && <span className="mrd-clef">𝄢</span>}
        </div>
        {score.voices.length > 1 && <div className="mrd-brace" />}
      </div>
    </div>
  );
}

export function KeyName({ k }: { k: KeyRef | string }) {
  const key = typeof k === "string" ? parseKey(k) : k;
  if (!key) return <>{String(k)}</>;
  return (
    <>
      {key.letter}
      {key.acc !== 0 && <span className="mrd-acc">{key.acc < 0 ? "b" : "#"}</span>}
    </>
  );
}

function TitleBlock({ score }: { score: Score }) {
  const h = score.header;
  return (
    <div className="mb-5">
      {h.title && <div className="mrd-title">{h.title}</div>}
      {(h.left || h.right || h.info) && (
        <div className="mrd-meta">
          <span>
            {h.left}
            {h.info && <span className="ml-6">{h.info}</span>}
          </span>
          <span>{h.right}</span>
        </div>
      )}
      <div className="mrd-keyline">
        <b>
          {h.keyLabel} <KeyName k={h.key} />
        </b>
        <span>
          {h.time.label}
          {h.disposition.custom && <span className="ml-1 text-[11px] italic">(disposition {h.disposition.label})</span>}
        </span>
        {h.expression && <i>{h.expression}</i>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface Ctx {
  score: Score;
  selectedId: string | null;
  onSelect?: ((id: string) => void) | undefined;
  playingMeasure: number | null;
}

type Col =
  | { k: "label" }
  | { k: "brace" }
  | { k: "lead"; m: number; u: number }
  | { k: "sep"; m: number; u: number }
  | { k: "unit"; m: number; u: number }
  | { k: "bar"; m: number; bar: "|" | "||" };

type Row =
  | { k: "top" }
  | { k: "chords" }
  | { k: "voice"; v: number; group: number }
  | { k: "vlyr"; v: number; group: number }
  | { k: "lyr"; line: number };

function SystemView({ sys, index, ctx }: { sys: SystemLayout; index: number; ctx: Ctx }) {
  const { score } = ctx;
  const h = score.header;
  const inSys = (m: number, u: number) => sys.segments.some((s) => s.m === m && u >= s.u0 && u < s.u1);

  // ---- colonnes
  const cols: Col[] = [{ k: "label" }, { k: "brace" }];
  const first = sys.segments[0]!;
  const startsOffbeat = systemStartsOffbeat(score, first);
  if (first.u0 > 0 || score.voices.some((v) => v.measures[first.m]?.leadingColon))
    cols.push({ k: "lead", m: first.m, u: first.u0 });
  const lastSegment = sys.segments[sys.segments.length - 1];
  for (const seg of sys.segments) {
    for (let u = seg.u0; u < seg.u1; u++) {
      if (u > seg.u0) cols.push({ k: "sep", m: seg.m, u });
      cols.push({ k: "unit", m: seg.m, u });
    }
    const endBar = systemSegmentEndBar(score, seg, seg === lastSegment);
    if (endBar) cols.push({ k: "bar", m: seg.m, bar: endBar });
  }

  // ---- rangées
  const rows: Row[] = [];
  const hasChords = score.chords.some((c) => inSys(c.m, c.u));
  if (hasChords) rows.push({ k: "chords" });
  rows.push({ k: "top" });
  const commonLines = score.lyrics.common
    .map((map, line) => ({ map, line }))
    .filter(({ map }) => [...map.keys()].some((k) => inSys(...mu(k))));
  const groups: number[][] =
    h.lyricsMode === "entre"
      ? (() => {
          const gs = h.groups.map((g) => g.map((n) => score.voices.findIndex((v) => v.name === n)).filter((i) => i >= 0));
          const all = new Set(gs.flat());
          score.voices.forEach((_, i) => !all.has(i) && gs[gs.length - 1]?.push(i));
          return gs.filter((g) => g.length);
        })()
      : [score.voices.map((_, i) => i)];
  groups.forEach((g, gi) => {
    for (const v of g) {
      rows.push({ k: "voice", v, group: gi });
      const pv = score.lyrics.perVoice.get(v);
      if (pv && [...pv.keys()].some((k) => inSys(...mu(k)))) rows.push({ k: "vlyr", v, group: gi });
    }
    if (h.lyricsMode === "entre" && gi === 0 && groups.length > 1) commonLines.forEach(({ line }) => rows.push({ k: "lyr", line }));
  });
  if (h.lyricsMode !== "entre" || groups.length < 2) commonLines.forEach(({ line }) => rows.push({ k: "lyr", line }));

  const groupSpan = (gi: number): [number, number] => {
    const idx = rows.map((r, i) => ((r.k === "voice" || r.k === "vlyr") && r.group === gi ? i : -1)).filter((i) => i >= 0);
    return [(idx[0] ?? 0) + 1, (idx[idx.length - 1] ?? 0) + 2];
  };
  const voiceRowIdx = rows.map((r, i) => (r.k === "voice" ? i : -1)).filter((i) => i >= 0);
  const braceSpan: [number, number] = [(voiceRowIdx[0] ?? 0) + 1, (voiceRowIdx[voiceRowIdx.length - 1] ?? 0) + 2];

  const template = cols
    .map((c) => (c.k === "unit" ? (sys.stretch ? "minmax(max-content, 1fr)" : "max-content") : "max-content"))
    .join(" ");

  const showNames = h.names === "tous" || (h.names === "premier" && index === 0);
  const multi = score.voices.length > 1;
  const cells: ReactNode[] = [];

  cols.forEach((col, ci) => {
    const gc = ci + 1;
    // éléments couvrant plusieurs rangées
    if (col.k === "brace") {
      if (multi && voiceRowIdx.length)
        cells.push(
          <div key={`b${ci}`} className="mrd-brace" style={{ gridColumn: gc, gridRow: `${braceSpan[0]} / ${braceSpan[1]}` }}>
            {h.bracket && (
              <svg viewBox="0 0 10 100" preserveAspectRatio="none" aria-hidden>
                <path vectorEffect="non-scaling-stroke" d="M9,1 C3,3 6,22 5,40 C5,46 3,49 1,50 C3,51 5,54 5,60 C6,78 3,97 9,99" />
              </svg>
            )}
            {(h.bracket ? groups.length > 1 : !startsOffbeat) && <span className="mrd-startbar" />}
          </div>,
        );
      return;
    }
    if (col.k === "bar" || ((col.k === "sep" || col.k === "lead") && isDoubleSep(score, col.m, col.u) && col.k === "sep")) {
      const dbl = col.k === "bar" ? col.bar === "||" : true;
      groups.forEach((_, gi) => {
        const [a, b] = groupSpan(gi);
        cells.push(
          <div key={`bar${ci}-${gi}`} className={cn("mrd-bar", dbl && "is-double")} style={{ gridColumn: gc, gridRow: `${a} / ${b}` }}>
            <i />
            {dbl && <i />}
          </div>,
        );
      });
      return;
    }

    rows.forEach((row, ri) => {
      const gr = ri + 1;
      const key = `${ci}-${ri}`;
      const style = { gridColumn: gc, gridRow: gr };
      if (col.k === "label") {
        if (row.k === "top" && index > 0 && first.u0 === 0)
          cells.push(
            <div key={key} className="mrd-cell mrd-top mrd-mnum" style={style}>
              {displayMeasureNumber(score, first.m)}
            </div>,
          );
        if (row.k === "voice") {
          const v = score.voices[row.v]!;
          cells.push(
            <div key={key} className="mrd-cell mrd-label" style={style} title={`Voix ${v.name} — référence de portée ${v.ref}`}>
              {showNames && <span>{v.name}</span>}
              {showNames && h.clefs === "classique" && <ClefGlyph refNum={v.ref} />}
              {showNames && h.clefs === "solfa" && index === 0 && <span className="mrd-ref">{fmtRef(v.ref)}</span>}
            </div>,
          );
        }
        return;
      }
      if (row.k === "top") {
        if (col.k === "unit") cells.push(<TopCell key={key} ctx={ctx} m={col.m} u={col.u} style={style} />);
        return;
      }
      if (row.k === "chords") {
        if (col.k === "unit") {
          const ch = score.chords.filter((c) => c.m === col.m && c.u === col.u).sort((a, b) => a.frac - b.frac);
          cells.push(
            <div key={key} className="mrd-cell mrd-chords mrd-unit" style={style}>
              {ch.map((c, i) => (
                <span
                  key={i}
                  className={cn(c.chord.kind === "roman" && "mrd-chord-roman", c.chord.kind === "solfa" && "mrd-chord-solfa")}
                  title={c.chord.kind === "solfa" ? `Accord Sol-fa relatif : ${c.chord.written} ≙ ${c.chord.absolute}` : c.chord.kind === "roman" ? "Degré harmonique" : "Accord (lettres latines)"}
                >
                  {c.chord.written}
                </span>
              ))}
            </div>,
          );
        }
        return;
      }
      if (row.k === "lyr" || row.k === "vlyr") {
        if (col.k === "unit") {
          const map = row.k === "lyr" ? score.lyrics.common[row.line] : score.lyrics.perVoice.get(row.v);
          const arr = map?.get(`${col.m}:${col.u}`) ?? [];
          cells.push(<LyricCell key={key} arr={arr} style={style} small={row.k === "vlyr"} />);
        }
        return;
      }
      // rangée de voix
      const voice = score.voices[row.v]!;
      const measure = voice.measures[col.m];
      if (!measure) return;
      const rowMarks = sysHasMarks(score, sys, row.v);
      if (col.k === "lead") {
        const leadUnit = measure.units[col.u];
        cells.push(
          <div key={key} className={cn("mrd-cell mrd-sep", rowMarks && "has-marks")} style={style}>
            {leadUnit?.sepBefore === "!" ? <span className="mrd-half" /> : ":"}
          </div>,
        );
        return;
      }
      const unit = measure.units[col.u];
      if (col.k === "sep") {
        if (!unit) return;
        cells.push(
          <div key={key} className={cn("mrd-cell mrd-sep", unit.sepUl && "ulb", rowMarks && "has-marks")} style={style}>
            {unit.sepBefore === "!" ? <span className="mrd-half" /> : ":"}
          </div>,
        );
        return;
      }
      if (col.k === "unit") {
        cells.push(
          <UnitCell
            key={key}
            unit={unit}
            ctx={ctx}
            style={style}
            marks={rowMarks}
            playing={ctx.playingMeasure === col.m}
            nextSepUl={!!measure.units[col.u + 1]?.sepUl}
          />,
        );
      }
    });
  });

  return (
    <div className="mrd-system" style={{ gridTemplateColumns: template, fontSize: h.size }}>
      {cells}
    </div>
  );
}

const mu = (k: string): [number, number] => {
  const [a, b] = k.split(":");
  return [Number(a), Number(b)];
};

function isDoubleSep(score: Score, m: number, u: number) {
  return score.voices.some((v) => v.measures[m]?.units[u]?.sepBefore === "||");
}

function sysHasMarks(score: Score, sys: SystemLayout, v: number) {
  return sys.segments.some((s) => score.voices[v]?.measures[s.m]?.units.slice(s.u0, s.u1).some((u) => u.hasMarks));
}

function fmtRef(r: number) {
  return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : "0";
}

function ClefGlyph({ refNum }: { refNum: number }) {
  if (refNum === 0) return <span className="mrd-clef" title="Clé de Sol">𝄞</span>;
  if (refNum === -1) return <span className="mrd-clef" title="Clé de Fa">𝄢</span>;
  return <span className="mrd-ref" title="Autre position de référence">réf {fmtRef(refNum)}</span>;
}

function TopCell({ ctx, m, u, style }: { ctx: Ctx; m: number; u: number; style: React.CSSProperties }) {
  const { score } = ctx;
  const marks = score.structure.filter((s) => s.m === m && s.u === u).sort((a, b) => a.frac - b.frac);
  const atEnd = marks.length > 0 && marks.every((x) => x.frac >= 1);
  return (
    <div className={cn("mrd-cell mrd-top mrd-unit", atEnd && "justify-end")} style={style}>
      <span className="flex gap-2">
        {marks.map((s, i) => (
          <StructLabel key={i} d={s.d} keyLabel={score.header.keyLabel} />
        ))}
      </span>
    </div>
  );
}

function StructLabel({ d, keyLabel }: { d: Directive; keyLabel: string }) {
  switch (d.kind) {
    case "key":
      return (
        <span className="mrd-keychange">
          {keyLabel} <KeyName k={d.key} />
        </span>
      );
    case "segno":
      return (
        <span className="mrd-struct" title={`Repère Segno S_${d.id}`}>
          <span className="mrd-glyph">𝄋</span>
          <sub>{d.id}</sub>
        </span>
      );
    case "ds":
      return (
        <span className="mrd-struct" title={`Dal Segno : retour au repère S_${d.id}`}>
          D.S.<sub>{d.id}</sub>
          {d.al && ` al ${d.al === "fine" ? "Fine" : "Coda"}`}
        </span>
      );
    case "dc":
      return <span className="mrd-struct">D.C.{d.al && ` al ${d.al === "fine" ? "Fine" : "Coda"}`}</span>;
    case "fine":
      return <span className="mrd-struct">Fine</span>;
    case "coda":
      return (
        <span className="mrd-struct">
          <span className="mrd-glyph">𝄌</span> Coda
        </span>
      );
    case "tocoda":
      return (
        <span className="mrd-struct">
          To Coda <span className="mrd-glyph">𝄌</span>
        </span>
      );
    default:
      return null;
  }
}

function LyricCell({ arr, style, small }: { arr: { start: number; text: string }[]; style: React.CSSProperties; small: boolean }) {
  const sorted = [...arr].sort((a, b) => a.start - b.start);
  return (
    <div className={cn("mrd-cell mrd-lyrics", small && "is-voice")} style={style}>
      {sorted[0] && sorted[0].start > 0 && <span style={{ flex: `${sorted[0].start} 1 0` }} />}
      {sorted.map((l, i) => (
        <span key={i} className="mrd-syl" style={{ flex: `${(sorted[i + 1]?.start ?? 1) - l.start} 1 auto` }}>
          {l.text}
        </span>
      ))}
    </div>
  );
}

function UnitCell({
  unit,
  ctx,
  style,
  marks,
  playing,
  nextSepUl,
}: {
  unit: Unit | undefined;
  ctx: Ctx;
  style: React.CSSProperties;
  marks: boolean;
  playing: boolean;
  nextSepUl: boolean;
}) {
  if (!unit) return <div className={cn("mrd-cell mrd-unit", marks && "has-marks")} style={style} />;
  const h = ctx.score.header;
  const tuplet = unit.tuplet && h.tuplets === "courbe";
  const toks = tuplet ? unit.toks.filter((t) => t.t === "note" || t.t === "hold") : unit.toks;

  // regrouper les jetons soulignés consécutifs (soulignement partiel)
  const groups: { ul: boolean; toks: UnitTok[] }[] = [];
  for (const t of toks) {
    const ul = t.ul;
    const last = groups[groups.length - 1];
    if (last && last.ul === ul) last.toks.push(t);
    else groups.push({ ul, toks: [t] });
  }
  const content = groups.map((g, gi) => (
    <span key={gi} className={cn("mrd-grp", g.ul && "ulb")}>
      {g.toks.map((t, i) => (
        <TokView key={i} t={t} ctx={ctx} />
      ))}
    </span>
  ));

  const firstUl = !!toks[0]?.ul;
  const lastUl = !!toks[toks.length - 1]?.ul;
  return (
    <div className={cn("mrd-cell mrd-unit", marks && "has-marks", playing && "is-playing")} style={style}>
      <span className={cn("mrd-pad", unit.sepUl && firstUl && "ulb")} />
      {tuplet ? (
        <span className="mrd-tuplet" title={unit.tuplet === 3 ? "Triolet" : "Sextolet"}>
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden>
            <path vectorEffect="non-scaling-stroke" d="M2,10 Q50,-4 98,10" />
          </svg>
          <span className="mrd-tnum">{unit.tuplet}</span>
          {content}
        </span>
      ) : (
        content
      )}
      <span className={cn("mrd-fill", nextSepUl && lastUl && "ulb")} />
    </div>
  );
}

function TokView({ t, ctx }: { t: UnitTok; ctx: Ctx }) {
  const oct = ctx.score.header.octaves;
  if (t.t === "dot") return <span className="mrd-sub">.</span>;
  if (t.t === "comma") return <span className="mrd-sub">,</span>;
  if (t.t === "hold")
    return (
      <span className={cn("mrd-hold", (t as HoldTok).error && "is-error")} title={(t as HoldTok).error ?? "Prolongation"}>
        –
        <Marks marks={t.marks} />
      </span>
    );
  const n = t as NoteTok;
  const selected = ctx.selectedId === n.id;
  return (
    <span
      className={cn("mrd-note", selected && "is-selected")}
      onClick={(e) => {
        e.stopPropagation();
        ctx.onSelect?.(n.id);
      }}
      title={n.p.written}
    >
      {n.trans && (
        <span className="mrd-trans" title={`Indication de transition (${n.trans.written}) — non jouée`}>
          <PitchText p={n.trans} mode={oct} />
        </span>
      )}
      <PitchText p={n.p} mode={oct} />
      <Marks marks={n.marks} />
    </span>
  );
}

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

function Marks({ marks }: { marks: Directive[] }) {
  if (!marks.length) return null;
  return (
    <span className="mrd-marks">
      {marks.map((d, i) => (
        <Fragment key={i}>{markView(d)}</Fragment>
      ))}
    </span>
  );
}

function markView(d: Directive): ReactNode {
  switch (d.kind) {
    case "fermata":
      return <span className="mrd-glyph" title="Point d'orgue">𝄐</span>;
    case "dynamic":
      return <span className="mrd-dyn">{d.text}</span>;
    case "tempo":
    case "text":
      return <span className="mrd-expr">{d.text}</span>;
    case "artic":
      return (
        <span className="mrd-glyph" title={d.type}>
          {d.type === "staccato" ? "·" : d.type === "accent" ? ">" : d.type === "tenuto" ? "–" : d.type === "marcato" ? "^" : "‿"}
        </span>
      );
    default:
      return null;
  }
}
