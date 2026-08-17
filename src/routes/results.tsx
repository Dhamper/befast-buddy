import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GlassCard, SecondaryLink, StatusChip } from "@/components/ui-kit";
import { EmergencyCallButton } from "@/components/AppShell";
import { LETTERS, byLetter } from "@/lib/content";
import {
  assess,
  ONSET_OPTIONS,
  resolveSign,
  type Letter,
} from "@/lib/scoring";
import { DISCLAIMER } from "@/theme";
import { useElapsed, useSession } from "@/lib/session";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Screening result — BEFAST AI" },
      {
        name: "description",
        content:
          "Categorical urgency tier plus a per-sign breakdown of every BE-FAST check, with each automated number tagged as a prototype estimate.",
      },
      { property: "og:title", content: "Screening result — BEFAST AI" },
      {
        property: "og:description",
        content: "Urgency tier and per-sign breakdown from your BE-FAST session.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Results,
});

function Results() {
  const { session, archive } = useSession();
  const elapsed = useElapsed(session.onsetRecordedAt);
  const result = assess(session.results, session.onset);
  const onsetLabel =
    ONSET_OPTIONS.find((o) => o.key === session.onset)?.label ?? "not recorded";

  const tint =
    result.tier === "positive"
      ? "bg-alert-high/25 border-alert-high"
      : result.tier === "uncertain"
        ? "bg-alert-mid/20 border-alert-mid"
        : "bg-white/10 border-white/30";

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="title-light text-4xl sm:text-5xl">Result</h1>

        <div className={`rounded-[28px] border p-7 ${tint}`}>
          <p className="eyebrow mb-3 text-white/85">Urgency tier</p>
          <h2 className="display-xl text-3xl sm:text-4xl">{result.headline}</h2>
          <p className="mt-4 text-lg text-white/90">{result.action}</p>
          <p className="mt-2 text-white/80">
            Time since onset {elapsed} · reported as “{onsetLabel}”
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <EmergencyCallButton />
            <SecondaryLink to="/emergency">Emergency action steps</SecondaryLink>
          </div>
        </div>

        <div className="space-y-4">
          {LETTERS.map((l) => {
            const r = session.results[l.letter];
            const status = resolveSign(r);
            const info = byLetter(l.letter as Letter);
            return (
              <GlassCard key={l.letter} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="display-xl text-4xl">{l.letter}</span>
                    <span className="eyebrow text-white/85">{l.label}</span>
                  </div>
                  <StatusChip status={status} />
                </div>
                {r?.measurements?.length ? (
                  <ul className="space-y-2">
                    {r.measurements.map((m) => (
                      <li key={m.label} className="flex flex-wrap justify-between gap-3">
                        <span className="text-white/80">{m.label}</span>
                        <span className="font-mono text-sm">{m.value}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/70">No automated measurement recorded.</p>
                )}
                {info.observer.length > 0 && r && (
                  <ul className="space-y-1 border-t border-white/20 pt-4 text-base">
                    {info.observer.map((q) => (
                      <li key={q.id} className="flex flex-wrap justify-between gap-3">
                        <span className="text-white/80">{q.question}</span>
                        <span className="font-mono text-sm uppercase">
                          {q.id in r.observer
                            ? r.observer[q.id] === true
                              ? "Yes"
                              : r.observer[q.id] === false
                                ? "No"
                                : "Not sure"
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </GlassCard>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4">
          <SecondaryLink to="/hub">Back to checks</SecondaryLink>
          <Link
            to="/history"
            onClick={archive}
            className="glass inline-flex min-h-16 items-center rounded-lg px-6 font-mono text-sm uppercase tracking-[0.18em] hover:bg-white/20"
          >
            Save to history
          </Link>
        </div>

        <p className="text-base text-white/80">{DISCLAIMER}</p>
      </div>
    </AppShell>
  );
}
