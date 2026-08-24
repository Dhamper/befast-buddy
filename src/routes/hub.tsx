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
    // Most use is on a phone, and this is the screen someone lands on while
    // deciding whether to act. All six checks have to be reachable without a
    // scroll, so the page is locked to one viewport and the grid absorbs
    // whatever height the header, progress bar and alert banner leave behind.
    <AppShell fitViewport>
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-2 sm:gap-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="title-light text-2xl sm:text-page">The six checks</h1>
          <SecondaryLink to="/results" className="min-h-11 shrink-0 px-4 sm:min-h-16 sm:px-8">
            Results
          </SecondaryLink>
        </div>

        <div className="h-1 w-full shrink-0 overflow-hidden rounded-full bg-white/15 sm:h-1.5">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(done / 6) * 100}%` }}
          />
        </div>

        {offer && (
          <Link
            to="/emergency"
            className="shrink-0 rounded-[8px] bg-alert-high px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wide text-white sm:px-6 sm:py-5 sm:text-lg"
          >
            <span className="sm:hidden">Sign flagged — act now</span>
            <span className="hidden sm:inline">
              A warning sign has been flagged — open emergency action now
            </span>
          </Link>
        )}

        {/*
          2x3 on phones, 3x2 on tablets, 6x1 on desktop. Explicit row counts so
          the rows share the available height instead of sizing to content.
        */}
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-2 sm:grid-cols-3 sm:grid-rows-2 sm:gap-4 xl:grid-cols-6 xl:grid-rows-1">
          {LETTERS.map((l) => {
            const status = resolveSign(session.results[l.letter]);
            return (
              // The whole card is the target. A separate CHECK button cost
              // ~64px per card, which is what made six cards need a scroll.
              <Link
                key={l.letter}
                to="/check/$letter"
                params={{ letter: l.letter }}
                className="flex min-h-0 flex-col gap-1.5 overflow-hidden rounded-[16px] border border-white/25 p-2.5 text-white transition-[filter] hover:brightness-110 sm:rounded-[24px] sm:p-5"
                style={{ background: "var(--gradient-module)" }}
              >
                {/*
                  The letter is drawn as a vector rather than sized in px or
                  vh. It fills whatever height is left after the label and
                  status line, so it is exactly as large as the card allows on
                  any device — no clamp to tune, and nothing to overflow.
                  Only the decorative glyph is scaled this way; everything the
                  user has to read stays real text that respects their font
                  size settings.
                */}
                <div className="min-h-0 flex-1">
                  <svg
                    viewBox="0 0 72 100"
                    preserveAspectRatio="xMinYMid meet"
                    className="size-full"
                    role="img"
                    aria-label={l.label}
                  >
                    <text x="0" y="79" className="display-xl" fontSize="100" fill="currentColor">
                      {l.letter}
                    </text>
                  </svg>
                </div>
                <div className="shrink-0">
                  <p className="eyebrow font-bold text-white">{l.label}</p>
                  {/* Bullets are the first thing cut; they only appear where
                      the row is tall enough to hold them. */}
                  <ul className="mt-3 hidden list-disc space-y-1 pl-4 text-sm text-white/95 lg:block">
                    {l.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <div className="mt-1.5 sm:mt-2">
                    {status === "unchecked" ? (
                      <span className="eyebrow text-white/90">Check →</span>
                    ) : (
                      <StatusChip status={status} />
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <GlassCard className="hidden shrink-0 lg:block">
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
