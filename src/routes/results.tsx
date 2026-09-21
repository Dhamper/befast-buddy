import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard, SecondaryLink, SegmentedTabs, StatusChip } from "@/components/ui-kit";
import { EmergencyCallButton } from "@/components/AppShell";
import { LETTERS, byLetter } from "@/lib/content";
import { assess, ONSET_OPTIONS, resolveSign, type Letter } from "@/lib/scoring";
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
  const onsetLabel = ONSET_OPTIONS.find((o) => o.key === session.onset)?.label ?? "not recorded";

  const tint =
    result.tier === "positive"
      ? "bg-alert-high/25 border-alert-high"
      : result.tier === "uncertain"
        ? "bg-alert-mid/20 border-alert-mid"
        : "bg-white/10 border-white/30";

  const tabs = LETTERS.map((l) => ({
    value: l.letter,
    label: l.letter,
    dot: resolveSign(session.results[l.letter]),
  }));
  const flagged = LETTERS.find((l) => {
    const s = resolveSign(session.results[l.letter]);
    return s === "positive" || s === "uncertain";
  });
  const [letter, setLetter] = useState<Letter>((flagged?.letter as Letter) ?? "B");
  const r = session.results[letter];
  const status = resolveSign(r);
  const info = byLetter(letter);

  return (
    <AppShell fitViewport>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-2 sm:gap-4">
        <h1 className="title-light shrink-0 text-2xl sm:text-page">Result</h1>

        <div className={`shrink-0 rounded-[16px] border p-3 sm:rounded-[28px] sm:p-7 ${tint}`}>
          <p className="eyebrow mb-2 text-white/85 sm:mb-3">Urgency tier</p>
          <h2 className="display-xl text-2xl sm:text-display">{result.headline}</h2>
          <p className="mt-2 text-sm text-white/90 sm:mt-4 sm:text-lg">{result.action}</p>
          <p className="mt-1 text-xs text-white/80 sm:mt-2 sm:text-base">
            Time since onset {elapsed} · reported as “{onsetLabel}”
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:mt-6 sm:flex-row sm:flex-wrap sm:gap-4">
            <EmergencyCallButton className="min-h-11 justify-center py-2 sm:min-h-16 sm:py-0" />
            <SecondaryLink to="/emergency" className="min-h-11 sm:min-h-16">
              Emergency action steps
            </SecondaryLink>
          </div>
        </div>

        <SegmentedTabs options={tabs} value={letter} onChange={setLetter} />

        <GlassCard className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex shrink-0 items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="display-xl text-[2rem] sm:text-4xl">{info.letter}</span>
              <span className="eyebrow text-white/85">{info.label}</span>
            </div>
            <StatusChip status={status} />
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {r?.measurements?.length ? (
              <ul className="space-y-2 sm:space-y-3">
                {r.measurements.map((m) => (
                  <li
                    key={m.label}
                    className="grid gap-0.5 sm:flex sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-3"
                  >
                    <span className="text-sm text-white/80 sm:text-base">{m.label}</span>
                    <span className="font-mono text-xs sm:text-sm">{m.value}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-white/70 sm:text-base">
                No automated measurement recorded.
              </p>
            )}
            {info.observer.length > 0 && r && (
              <ul className="mt-3 space-y-1 border-t border-white/20 pt-3 text-sm sm:mt-4 sm:pt-4 sm:text-base">
                {info.observer.map((q) => (
                  <li
                    key={q.id}
                    className="grid gap-0.5 sm:flex sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-3"
                  >
                    <span className="text-sm text-white/80 sm:text-base">{q.question}</span>
                    <span className="font-mono text-xs uppercase sm:text-sm">
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
          </div>
        </GlassCard>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
          <SecondaryLink to="/hub" className="min-h-11 sm:min-h-16">
            Back to checks
          </SecondaryLink>
          <Link
            to="/history"
            onClick={archive}
            className="glass inline-flex min-h-11 items-center justify-center rounded-[8px] px-5 font-mono text-xs uppercase tracking-[0.14em] hover:bg-white/20 sm:min-h-16 sm:px-6 sm:text-sm sm:tracking-[0.18em]"
          >
            Save to history
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
