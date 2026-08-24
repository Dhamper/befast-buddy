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
        <div className="flex flex-wrap items-end justify-between gap-3 sm:gap-4">
          <h1 className="title-light text-page">The six checks</h1>
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
            className="block rounded-[8px] bg-alert-high px-5 py-4 text-base font-extrabold uppercase tracking-wide text-white sm:px-6 sm:py-5 sm:text-lg"
          >
            A warning sign has been flagged — open emergency action now
          </Link>
        )}

        <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-4 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 md:grid-cols-3 xl:grid-cols-6">
          {LETTERS.map((l) => {
            const status = resolveSign(session.results[l.letter]);
            return (
              <div
                key={l.letter}
                className="flex min-w-[78%] snap-start flex-col justify-between rounded-[22px] border border-white/25 p-5 sm:min-w-0 sm:rounded-[28px] sm:p-6 xl:p-5"
                style={{ background: "var(--gradient-module)" }}
              >
                <div>
                  <span className="display-xl block text-glyph text-white">{l.letter}</span>
                  <p className="eyebrow mt-3 font-bold text-white">{l.label}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-4 text-[0.8rem] text-white/95 sm:mt-4 sm:pl-5 sm:text-sm">
                    {l.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 space-y-3 sm:mt-6">
                  {status !== "unchecked" && <StatusChip status={status} />}
                  <Link
                    to="/check/$letter"
                    params={{ letter: l.letter }}
                    className="flex min-h-16 items-center justify-center rounded-[8px] bg-primary px-4 text-sm font-extrabold uppercase tracking-wide text-primary-foreground hover:bg-primary/85 sm:px-6 sm:text-base"
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
            You never have to finish all six. As soon as one sign is flagged or uncertain, the
            emergency route opens here and on every module screen.
          </p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
