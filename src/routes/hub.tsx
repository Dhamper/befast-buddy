import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GlassCard, SecondaryLink, StatusChip } from "@/components/ui-kit";
import { LETTERS } from "@/lib/content";
import { resolveSign, shouldOfferEmergency } from "@/lib/scoring";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/hub")({
  head: () => ({
    meta: [
      { title: "The six checks — BEFAST AI" },
      {
        name: "description",
        content:
          "Run the six BE-FAST checks in any order: balance, eyes, face, arms and speech, then the time summary. Each card shows its status once completed.",
      },
      { property: "og:title", content: "The six checks — BEFAST AI" },
      {
        property: "og:description",
        content: "Balance, Eyes, Face, Arms, Speech, Time — run them in any order.",
      },
    ],
  }),
  component: Hub,
});

function Hub() {
  const { session } = useSession();
  const done = Object.keys(session.results).length;
  const offer = shouldOfferEmergency(session.results);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="title-light text-4xl sm:text-5xl">The six checks</h1>
          <SecondaryLink to="/results">See results</SecondaryLink>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(done / 6) * 100}%` }}
          />
        </div>

        {offer && (
          <Link
            to="/emergency"
            className="block rounded-[8px] bg-alert-high px-6 py-5 text-lg font-extrabold uppercase tracking-wide text-white"
          >
            A warning sign has been flagged — open emergency action now
          </Link>
        )}

        <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-4 lg:grid lg:grid-cols-6 lg:overflow-visible">
          {LETTERS.map((l) => {
            const status = resolveSign(session.results[l.letter]);
            return (
              <div
                key={l.letter}
                className="flex min-w-[74%] snap-start flex-col justify-between rounded-[28px] border border-white/25 p-6 sm:min-w-[46%] lg:min-w-0"
                style={{ background: "var(--gradient-module)" }}
              >
                <div>
                  <span className="display-xl block text-6xl text-white">
                    {l.letter}
                  </span>
                  <p className="eyebrow mt-3 font-bold text-white">{l.label}</p>
                  <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-white/95">
                    {l.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 space-y-3">
                  {status !== "unchecked" && <StatusChip status={status} />}
                  <Link
                    to="/check/$letter"
                    params={{ letter: l.letter }}
                    className="flex min-h-16 items-center justify-center rounded-[8px] bg-primary px-6 font-extrabold uppercase tracking-wide text-primary-foreground hover:bg-primary/85"
                  >
                    Check
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <GlassCard>
          <p className="eyebrow mb-2 text-white/80">Fail-safe</p>
          <p className="text-white/90">
            You never have to finish all six. As soon as one sign is flagged or
            uncertain, the emergency route opens here and on every module screen.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
