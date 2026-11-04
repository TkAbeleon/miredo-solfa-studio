import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ScoreView } from "@/components/score/ScoreView";
import { PitchTable, TimingTable } from "@/components/score/Tables";
import { CASE_SECTIONS, type Case, type CaseStatus } from "@/lib/miredo/cases";
import { parseScore } from "@/lib/miredo/parser";
import { computePath } from "@/lib/miredo/playback";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cas")({
  head: () => ({
    meta: [
      { title: "Cas couverts — Règles Tonic Sol-fa de MireDo" },
      {
        name: "description",
        content: "Chaque règle de la conception MireDo rendue en direct : degrés, altérations, octaves, subdivisions, reprises, voix et accords.",
      },
      { property: "og:title", content: "Cas couverts — Règles Tonic Sol-fa de MireDo" },
      { property: "og:description", content: "Toutes les règles de la conception MireDo, rendues par le même moteur que le Studio." },
    ],
  }),
  component: CasesPage,
});

function CasesPage() {
  return (
    <div className="min-h-screen">
      <AppHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:grid-cols-[200px_1fr] md:px-6">
        <nav className="hidden md:block">
          <div className="sticky top-24 space-y-1 text-sm">
            {CASE_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block rounded px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                {s.title}
              </a>
            ))}
          </div>
        </nav>
        <div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">Cas couverts</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Chaque règle lue dans la conception MireDo, rendue par le même moteur que le Studio. Le badge indique son
            statut dans la conception ; les points ouverts ne sont pas présentés comme des règles Sol-fa.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <StatusBadge s="Validé" /> <StatusBadge s="Provisoire" /> <StatusBadge s="À clarifier" />
          </div>
          {CASE_SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="mt-14 scroll-mt-20">
              <h2 className="border-b pb-2 text-2xl font-semibold">{s.title}</h2>
              <div className="mt-6 space-y-6">
                {s.cases.map((c) => (
                  <CaseCard key={c.id} c={c} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ s }: { s: CaseStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 font-medium",
        s === "Validé" && "border-ok/40 bg-ok/10 text-ok",
        s === "Provisoire" && "border-warn/40 bg-warn/10 text-warn",
        s === "À clarifier" && "border-open/40 bg-open/10 text-open",
      )}
    >
      {s}
    </span>
  );
}

function CaseCard({ c }: { c: Case }) {
  const score = useMemo(() => parseScore(c.mrd), [c.mrd]);
  const body = c.mrd
    .split("\n")
    .filter((l) => l.startsWith("["))
    .join("\n");
  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <h3 className="font-sans text-base font-semibold">{c.title}</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{c.explain}</p>
        </div>
        <div className="flex flex-col items-end gap-1 text-xs">
          <StatusBadge s={c.status} />
          <span className="text-muted-foreground">{c.doc}</span>
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="overflow-x-auto px-5 py-5">
          <div className="rounded-lg bg-paper px-4 pb-1 pt-4 shadow-sm">
            <ScoreView score={score} variant="inline" width={600} />
          </div>
        </div>
        <pre className="m-5 mt-0 whitespace-pre-wrap break-all rounded-lg bg-editor p-3 font-mono text-xs leading-5 text-editor-foreground md:mt-5 md:max-w-[300px]">
          {body}
        </pre>
      </div>
      {score.diagnostics.length > 0 && (
        <ul className="border-t px-5 py-2 text-xs">
          {score.diagnostics.map((d, i) => (
            <li key={i} className={cn(d.level === "error" ? "text-destructive" : d.level === "warning" ? "text-warn" : "text-muted-foreground")}>
              {d.level === "error" ? "Erreur" : d.level === "warning" ? "Attention" : "Info"} — {d.message}
            </li>
          ))}
        </ul>
      )}
      {c.show && (
        <div className="border-t bg-muted/40 px-5 py-3 text-xs">
          {c.show === "timing" && <TimingTable score={score} />}
          {c.show === "pitch" && <PitchTable score={score} />}
          {c.show === "path" && (
            <div>
              <span className="text-muted-foreground">Parcours de lecture (mesures) : </span>
              <span className="font-mono">{computePath(score).map((m) => m + 1).join(" → ")}</span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

