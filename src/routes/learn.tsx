import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GlassCard, PrimaryLink } from "@/components/ui-kit";
import { LETTERS } from "@/lib/content";

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

function Learn() {
  return (
    <AppShell showSession={false}>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="title-light text-page">Learn more</h1>
        <GlassCard>
          <p className="eyebrow mb-3 text-white/80">What a stroke is</p>
          <p className="text-white/90">
            A stroke happens when blood flow to part of the brain is blocked or a vessel bursts.
            Brain cells in the affected area start dying within minutes, so the sooner treatment
            starts, the more brain is saved. BE-FAST is the standard way to spot the warning signs
            quickly.
          </p>
        </GlassCard>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {LETTERS.map((l) => (
            <GlassCard key={l.letter} className="flex gap-4 sm:gap-5">
              <span className="display-xl text-glyph shrink-0 text-white">{l.letter}</span>
              <div>
                <h2 className="eyebrow mb-2 text-white/85">{l.label}</h2>
                <ul className="list-disc space-y-1 pl-4 text-sm text-white/90 sm:pl-5 sm:text-base">
                  {l.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </GlassCard>
          ))}
        </div>

        <GlassCard>
          <p className="eyebrow mb-3 text-white/80">Why minutes matter</p>
          <p className="text-white/90">
            Clot-dissolving treatment and clot removal are only possible inside a limited window
            from the moment symptoms started. That is why the very first thing this prototype asks
            is when the symptoms began — and why it never tells you to wait and see.
          </p>
        </GlassCard>

        <PrimaryLink to="/mode">Start a check</PrimaryLink>
      </div>
    </AppShell>
  );
}
