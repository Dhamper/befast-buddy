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
    <AppShell showSession={false}>
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="title-light text-page">When did the symptoms start?</h1>
        <p className="text-white/85">
          Or when was the person last known to be completely normal? This is the one fact the
          hospital needs most — answer it before anything else.
        </p>
        <GlassCard className="space-y-3">
          {ONSET_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => {
                setOnset(o.key);
                navigate({ to: "/consent" });
              }}
              className="min-h-16 w-full rounded-[8px] border border-white/30 bg-white/10 px-4 py-3 text-left text-base hover:bg-white/20 sm:px-6 sm:text-lg"
            >
              {o.label}
            </button>
          ))}
        </GlassCard>
      </div>
    </AppShell>
  );
}
