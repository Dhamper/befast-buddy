import { createFileRoute } from "@tanstack/react-router";
import heroImage from "@/assets/befast-hero.jpg";
import { AppShell } from "@/components/AppShell";
import { GlassCard, PrimaryLink, SecondaryLink } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BEFAST AI — Fast and easy stroke detection tool" },
      {
        name: "description",
        content:
          "A guided BE-FAST stroke warning-sign screening prototype: balance, eyes, face, arms and speech checked on device, with onset time tracked from the first minute.",
      },
      { property: "og:title", content: "BEFAST AI — Fast and easy stroke detection tool" },
      {
        property: "og:description",
        content:
          "Guided BE-FAST screening prototype. On-device camera and voice checks, urgency tiers, and an emergency handoff summary.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <AppShell showSession={false}>
      <div className="mx-auto grid max-w-6xl gap-4 pt-2 sm:gap-6 sm:pt-4 lg:grid-cols-2 lg:items-stretch">
        <GlassCard
          notch="tr"
          className="flex flex-col justify-between gap-8 p-6 sm:p-8 lg:gap-10 lg:p-10"
        >
          <div>
            <h1 className="display-xl text-hero">
              BEFAST
              <br />
              AI
            </h1>
            <p className="eyebrow mt-5 max-w-xs text-white/85 sm:mt-6">
              Fast and easy stroke detection tool
            </p>
            <p className="mt-5 max-w-md text-white/85 sm:mt-6">
              Six guided checks — Balance, Eyes, Face, Arms, Speech and Time. Camera and voice are
              processed on your device; nothing is uploaded.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <PrimaryLink to="/mode">Begin</PrimaryLink>
            <SecondaryLink to="/learn">Learn more</SecondaryLink>
          </div>
        </GlassCard>

        {/*
          The artwork is a 4:5 portrait. Left unconstrained it filled a whole
          tablet screen before the "Begin" button, so its height is capped until
          the two-column layout kicks in at lg.
        */}
        <div className="max-h-[42dvh] overflow-hidden rounded-[22px] border border-white/25 sm:max-h-[52dvh] sm:rounded-[32px] lg:max-h-none">
          <img
            src={heroImage}
            alt="Illustration of a head in profile with a glowing neural network and a clock, representing time-critical stroke care"
            width={1024}
            height={1280}
            className="size-full object-cover"
          />
        </div>
      </div>
    </AppShell>
  );
}
