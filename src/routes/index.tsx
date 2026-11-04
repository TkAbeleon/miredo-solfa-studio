import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CircleX, Info, Play, Printer, Square, Download, Upload } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { ScoreView } from "@/components/score/ScoreView";
import { Inspector } from "@/components/score/Inspector";
import { Button } from "@/components/ui/button";
import { parseScore, setHeaderValue, type Diagnostic } from "@/lib/miredo/parser";
import { EXAMPLES } from "@/lib/miredo/examples";
import { Player, computePath } from "@/lib/miredo/playback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studio MireDo — Éditeur de partitions Tonic Sol-fa" },
      {
        name: "description",
        content: "Saisissez une partition Tonic Sol-fa et voyez-la rendue comme une partition imprimée : voix, paroles, reprises, accords.",
      },
      { property: "og:title", content: "Studio MireDo — Éditeur de partitions Tonic Sol-fa" },
      { property: "og:description", content: "Rendu fidèle des partitions Tonic Sol-fa selon la conception MireDo." },
    ],
  }),
  component: Studio,
});

const STORAGE = "miredo:text";

const OPTIONS: { key: string; label: string; values: [string, string][] }[] = [
  { key: "octaves", label: "Octaves", values: [["chiffres", "d¹ d₁"], ["traditionnel", "d' d,"]] },
  { key: "paroles", label: "Paroles", values: [["dessous", "Dessous"], ["entre", "Entre groupes"]] },
  { key: "crochet", label: "Crochet", values: [["oui", "Affiché"], ["non", "Masqué"]] },
  { key: "cles", label: "Clés", values: [["solfa", "Sol-fa (0, −1)"], ["classique", "Classiques"]] },
  { key: "triolets", label: "Triolets", values: [["courbe", "Courbe"], ["texte", "Séparateurs"]] },
  { key: "ffpm", label: "Double barre FFPM", values: [["non", "Non"], ["oui", "Oui"]] },
];

function Studio() {
  const [text, setText] = useState<string>(EXAMPLES[0].text);
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const deskRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const player = useRef<Player | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE);
    if (saved) setText(saved);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => localStorage.setItem(STORAGE, text), 300);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => e && setZoom(Math.min(1, (e.contentRect.width - 32) / 794)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const p = new Player();
    p.onMeasure = (m) => {
      setPlaying(m);
      setIsPlaying(p.playing);
    };
    player.current = p;
    return () => p.stop();
  }, []);

  const score = useMemo(() => parseScore(text), [text]);
  const path = useMemo(() => computePath(score), [score]);
  const info = selected ? score.notes.get(selected) : undefined;
  const counts = {
    error: score.diagnostics.filter((d) => d.level === "error").length,
    warning: score.diagnostics.filter((d) => d.level === "warning").length,
    info: score.diagnostics.filter((d) => d.level === "info").length,
  };

  const headerVal = (k: string) => score.header.raw[k]?.value;
  const currentOpt = (k: string, def: string) => headerVal(k) ?? def;

  const jumpToLine = (line: number) => {
    const ta = taRef.current;
    if (!ta) return;
    const lines = text.split("\n");
    const start = lines.slice(0, line - 1).reduce((a, l) => a + l.length + 1, 0);
    ta.focus();
    ta.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
    ta.scrollTop = Math.max(0, (line - 4) * 20);
  };

  const togglePlay = () => {
    const p = player.current;
    if (!p) return;
    if (p.playing) p.stop();
    else {
      p.play(score);
      setIsPlaying(true);
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(score.header.title || "partition").replace(/[^\p{L}\d]+/gu, "-")}.mrd`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader>
        <select
          className="h-9 w-28 rounded-md border bg-card px-2 text-sm sm:w-auto sm:max-w-[220px]"
          defaultValue=""
          onChange={(e) => {
            const ex = EXAMPLES.find((x) => x.id === e.target.value);
            if (ex) {
              setText(ex.text);
              setSelected(null);
            }
            e.target.value = "";
          }}
          aria-label="Ouvrir un exemple"
        >
          <option value="" disabled>
            Ouvrir un exemple…
          </option>
          {EXAMPLES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.label}
            </option>
          ))}
        </select>
        <Button variant="play" size="sm" onClick={togglePlay}>
          {isPlaying ? <Square /> : <Play />}
          <span className="hidden sm:inline">{isPlaying ? "Arrêter" : "Écouter"}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:inline-flex">
          <Printer /> Imprimer
        </Button>
      </AppHeader>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[minmax(360px,440px)_1fr]">
        {/* Éditeur */}
        <aside className="no-print flex flex-col bg-editor text-editor-foreground lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)]">
          <div className="flex items-center justify-between border-b border-editor-foreground/10 px-4 py-2 text-xs">
            <span className="font-mono text-editor-muted">source .mrd</span>
            <div className="flex gap-1.5">
              <Button variant="editor" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload /> Importer
              </Button>
              <Button variant="editor" size="sm" onClick={download}>
                <Download /> .mrd
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".mrd,.txt"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setText(await f.text());
                }}
              />
            </div>
          </div>
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="h-[42vh] flex-none resize-none lg:h-auto lg:flex-1 lg:min-h-[340px] bg-transparent p-4 font-mono text-[12.5px] leading-5 text-editor-foreground outline-none selection:bg-primary/40"
            aria-label="Source de la partition"
          />
          <Diagnostics list={score.diagnostics} counts={counts} onJump={jumpToLine} />
        </aside>

        {/* Bureau */}
        <main className="min-w-0">
          <div className="no-print flex flex-wrap items-center gap-x-5 gap-y-2 border-b bg-card/60 px-4 py-2.5 text-xs">
            {OPTIONS.map((o) => (
              <div key={o.key} className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{o.label}</span>
                <div className="flex rounded-md border bg-card p-0.5">
                  {o.values.map(([v, l]) => {
                    const active = currentOpt(o.key, o.values[0]![0]) === v;
                    return (
                      <button
                        key={v}
                        onClick={() => setText((t) => setHeaderValue(t, o.key, v))}
                        className={cn(
                          "rounded px-2 py-0.5 transition-colors",
                          active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="no-print flex flex-wrap gap-x-6 gap-y-1 px-5 pt-4 text-xs text-muted-foreground">
            <span>
              {score.voices.length} voix · {score.measureCount} mesures · {score.notes.size} notes
            </span>
            <span>
              Parcours de lecture :{" "}
              <span className="font-mono text-foreground">
                {path.map((m) => m + (score.hasPickup ? 0 : 1)).join(" → ") || "—"}
              </span>
            </span>
            <span>Cliquez une note pour voir sa graphie, son degré et sa hauteur.</span>
          </div>

          <div ref={deskRef} className="print-area overflow-x-auto p-4 pb-24 md:p-8" onClick={() => setSelected(null)}>
            <div style={{ zoom }}>
              <ScoreView score={score} selectedId={selected} onSelect={setSelected} playingMeasure={playing} />
            </div>
          </div>
        </main>
      </div>

      {info && (
        <div className="no-print fixed bottom-4 right-4 z-40">
          <Inspector info={info} onClose={() => setSelected(null)} />
        </div>
      )}
    </div>
  );
}

function Diagnostics({
  list,
  counts,
  onJump,
}: {
  list: Diagnostic[];
  counts: Record<Diagnostic["level"], number>;
  onJump: (line: number) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="max-h-[38%] overflow-auto border-t border-editor-foreground/10 text-xs">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-2 text-left">
        <span className="font-semibold">Vérifications</span>
        <span className="flex items-center gap-1 text-destructive">
          <CircleX className="size-3.5" /> {counts.error}
        </span>
        <span className="flex items-center gap-1 text-warn">
          <AlertTriangle className="size-3.5" /> {counts.warning}
        </span>
        <span className="flex items-center gap-1 text-editor-muted">
          <Info className="size-3.5" /> {counts.info}
        </span>
        {list.length === 0 && <span className="text-ok">Partition conforme</span>}
      </button>
      {open && (
        <ul className="pb-2">
          {list.map((d, i) => (
            <li key={i}>
              <button
                onClick={() => onJump(d.line)}
                className="flex w-full gap-2 px-4 py-1 text-left hover:bg-editor-foreground/5"
              >
                <span
                  className={cn(
                    "w-9 shrink-0 font-mono",
                    d.level === "error" ? "text-destructive" : d.level === "warning" ? "text-warn" : "text-editor-muted",
                  )}
                >
                  L{d.line}
                </span>
                <span className="text-editor-foreground/85">{d.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
