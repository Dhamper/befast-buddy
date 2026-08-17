import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GlassCard } from "@/components/ui-kit";
import { useSession, type Mode } from "@/lib/session";

export const Route = createFileRoute("/mode")({
  head: () => ({
    meta: [
      { title: "Who is being checked? — BEFAST AI" },
      {
        name: "description",
        content:
          "Choose self-check or caregiver mode. In caregiver mode every BE-FAST module adds plain-language observer questions.",
      },
      { property: "og:title", content: "Who is being checked? — BEFAST AI" },
      {
        property: "og:description",
        content: "Self-check or check someone else with observer questions.",
      },
    ],
  }),
  component: ModeSelect,
});

const CARDS: { mode: Mode; title: string; body: string }[] = [
  {
    mode: "self",
    title: "Check myself",
    body: "You hold the device and follow the prompts. Camera faces you.",
  },
  {
    mode: "other",
    title: "Check someone else",
    body: "For a person who cannot use a phone. Every module also asks you what you can see, and either camera can be used.",
  },
];

function ModeSelect() {
  const { setMode } = useSession();
  const navigate = useNavigate();

  return (
    <AppShell showSession={false}>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="title-light text-4xl sm:text-5xl">Who is being checked?</h1>
        <div className="grid gap-5 sm:grid-cols-2">
          {CARDS.map((c) => (
            <button
              key={c.mode}
              type="button"
              onClick={() => {
                setMode(c.mode);
                navigate({ to: "/onset" });
              }}
              className="text-left"
            >
              <GlassCard className="h-full transition-colors hover:bg-white/15">
                <h2 className="display-xl text-3xl">{c.title}</h2>
                <p className="mt-4 text-white/85">{c.body}</p>
                <p className="eyebrow mt-8 text-primary-foreground/90">Select →</p>
              </GlassCard>
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
