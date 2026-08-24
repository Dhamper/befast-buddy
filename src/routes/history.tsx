import { createFileRoute } from "@tanstack/react-router";
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

  return (
    <AppShell showSession={false}>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="title-light text-page">Session history</h1>
        <p className="text-white/85">Stored on this device only. Nothing is uploaded.</p>

        {history.length === 0 ? (
          <GlassCard>
            <p className="text-white/85">No saved sessions yet.</p>
          </GlassCard>
        ) : (
          history.map((s) => (
            <GlassCard key={s.startedAt} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-sm">{new Date(s.startedAt).toLocaleString()}</span>
                <span className="eyebrow text-white/80">
                  {s.mode === "self" ? "Self-check" : "Observed"}
                </span>
              </div>
              <p className="text-white/85">
                Onset: {ONSET_OPTIONS.find((o) => o.key === s.onset)?.label ?? "not recorded"}
              </p>
              <ul className="space-y-2">
                {(["B", "E", "F", "A", "S", "T"] as Letter[]).map((l) => (
                  <li
                    key={l}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2"
                  >
                    <span className="text-white/85">{byLetter(l).label}</span>
                    <StatusChip status={resolveSign(s.results[l])} />
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))
        )}

        {history.length > 0 && (
          <SecondaryButton onClick={clearHistory}>Clear all data</SecondaryButton>
        )}
      </div>
    </AppShell>
  );
}
