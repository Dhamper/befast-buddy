import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard, SecondaryButton, StatusChip } from "@/components/ui-kit";
import { byLetter } from "@/lib/content";
import { ONSET_OPTIONS, resolveSign, type Letter } from "@/lib/scoring";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Session history — BEFAST AI" },
      {
        name: "description",
        content:
          "Past BE-FAST screening sessions stored only on this device, with a one-tap option to clear all local data.",
      },
      { property: "og:title", content: "Session history — BEFAST AI" },
      {
        property: "og:description",
        content: "Locally stored past sessions, with clear-all-data.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: History,
});

function History() {
  const { history, clearHistory } = useSession();
  const [index, setIndex] = useState(0);
  const s = history[Math.min(index, history.length - 1)];

  return (
    <AppShell showSession={false} fitViewport>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-2 sm:gap-4">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <h1 className="title-light text-2xl sm:text-page">Session history</h1>
          {history.length > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Previous session"
                disabled={index <= 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="glass flex size-9 items-center justify-center rounded-[8px] disabled:opacity-30 sm:size-11"
              >
                <ChevronLeft aria-hidden className="size-4 sm:size-5" />
              </button>
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.1em] sm:text-xs">
                {index + 1} / {history.length}
              </span>
              <button
                type="button"
                aria-label="Next session"
                disabled={index >= history.length - 1}
                onClick={() => setIndex((i) => Math.min(history.length - 1, i + 1))}
                className="glass flex size-9 items-center justify-center rounded-[8px] disabled:opacity-30 sm:size-11"
              >
                <ChevronRight aria-hidden className="size-4 sm:size-5" />
              </button>
            </div>
          )}
        </div>

        {!s ? (
          <GlassCard className="shrink-0">
            <p className="text-white/85">No saved sessions yet. Stored on this device only.</p>
          </GlassCard>
        ) : (
          <GlassCard className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-4">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs sm:text-sm">
                {new Date(s.startedAt).toLocaleString()}
              </span>
              <span className="eyebrow text-white/80">
                {s.mode === "self" ? "Self-check" : "Observed"}
              </span>
            </div>
            <p className="shrink-0 text-sm text-white/85 sm:text-base">
              Onset: {ONSET_OPTIONS.find((o) => o.key === s.onset)?.label ?? "not recorded"}
            </p>
            <ul className="flex min-h-0 flex-1 flex-col justify-evenly">
              {(["B", "E", "F", "A", "S", "T"] as Letter[]).map((l) => (
                <li key={l} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="text-sm text-white/85 sm:text-base">{byLetter(l).label}</span>
                  <StatusChip status={resolveSign(s.results[l])} />
                </li>
              ))}
            </ul>
          </GlassCard>
        )}

        {history.length > 0 && (
          <SecondaryButton onClick={clearHistory} className="shrink-0 min-h-11 sm:min-h-16">
            Clear all data
          </SecondaryButton>
        )}
      </div>
    </AppShell>
  );
}
