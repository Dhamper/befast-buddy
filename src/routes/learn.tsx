import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard, PrimaryLink, SegmentedTabs } from "@/components/ui-kit";
import { LETTERS } from "@/lib/content";
import type { Letter } from "@/lib/scoring";

type Tab = Letter | "why";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "What BE-FAST means — BEFAST AI" },
      {
        name: "description",
        content:
          "Plain-language explanation of each BE-FAST stroke warning sign — balance, eyes, face, arms, speech, time — and why every minute counts.",
      },
      { property: "og:title", content: "What BE-FAST means — BEFAST AI" },
      {
        property: "og:description",
        content:
          "Learn the six BE-FAST stroke warning signs and why acting in minutes protects the brain.",
      },
    ],
  }),
  component: Learn,
});

const TABS: { value: Tab; label: string }[] = [
  ...LETTERS.map((l) => ({ value: l.letter as Tab, label: l.letter })),
  { value: "why", label: "Why" },
];

function Learn() {
  const [tab, setTab] = useState<Tab>("B");
  const active = LETTERS.find((l) => l.letter === tab);

  return (
    <AppShell showSession={false} fitViewport>
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2 sm:gap-4">
        <h1 className="title-light shrink-0 text-2xl sm:text-page">Learn more</h1>
        <p className="shrink-0 text-sm text-white/90 sm:text-base">
          A stroke happens when blood flow to part of the brain is blocked or a vessel bursts.
          BE-FAST is the standard way to spot the warning signs quickly.
        </p>

        <SegmentedTabs options={TABS} value={tab} onChange={setTab} />

        <GlassCard className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
          {active ? (
            <div className="flex items-center gap-4 sm:gap-5">
              <span className="display-xl text-glyph shrink-0 text-white">{active.letter}</span>
              <div>
                <h2 className="eyebrow mb-2 text-white/85">{active.label}</h2>
                <ul className="list-disc space-y-1 pl-4 text-sm text-white/90 sm:pl-5 sm:text-base">
                  {active.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <>
              <p className="eyebrow mb-3 text-white/80">Why minutes matter</p>
              <p className="text-sm text-white/90 sm:text-base">
                Clot-dissolving treatment and clot removal are only possible inside a limited window
                from the moment symptoms started. That is why the very first thing this prototype
                asks is when the symptoms began — and why it never tells you to wait and see.
              </p>
            </>
          )}
        </GlassCard>

        <PrimaryLink to="/mode" className="shrink-0">
          Start a check
        </PrimaryLink>
      </div>
    </AppShell>
  );
}
