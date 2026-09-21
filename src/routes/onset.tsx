import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui-kit";
import { ONSET_OPTIONS } from "@/lib/scoring";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/onset")({
  head: () => ({
    meta: [
      { title: "When did symptoms start? — BEFAST AI" },
      {
        name: "description",
        content:
          "Record stroke symptom onset time before any check. The running counter travels with the session and goes into the hospital handoff summary.",
      },
      { property: "og:title", content: "When did symptoms start? — BEFAST AI" },
      {
        property: "og:description",
        content: "Onset time is the single fact hospitals need most.",
      },
    ],
  }),
  component: Onset,
});

function Onset() {
  const { setOnset } = useSession();
  const navigate = useNavigate();

  return (
    <AppShell showSession={false} fitViewport>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-2 sm:gap-6">
        <h1 className="title-light shrink-0 text-2xl sm:text-page">When did the symptoms start?</h1>
        <p className="shrink-0 text-sm text-white/85 sm:text-base">
          Or when was the person last known to be completely normal? This is the one fact the
          hospital needs most.
        </p>
        <GlassCard className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
          {ONSET_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                setOnset(o.key);
                navigate({ to: "/consent" });
              }}
              className="min-h-0 w-full flex-1 rounded-[8px] border border-white/30 bg-white/10 px-4 text-left text-sm hover:bg-white/20 sm:px-6 sm:text-lg"
            >
              {o.label}
            </button>
          ))}
        </GlassCard>
      </div>
    </AppShell>
  );
}
