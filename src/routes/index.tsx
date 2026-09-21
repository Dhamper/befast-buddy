import { createFileRoute } from "@tanstack/react-router";
import heroImage from "@/assets/befast-hero.jpg";
import { AppShell } from "@/components/AppShell";
import { PrimaryLink, SecondaryLink } from "@/components/ui-kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BEFAST AI — Fast and easy stroke detection tool" },
      {
        name: "description",
        content:
          "A guided BE-FAST stroke warning-sign screening prototype: balance, eyes, face, arms and speech checked on device, with onset time tracked from the first minute.",
      },
      {
        property: "og:title",
        content: "BEFAST AI — Fast and easy stroke detection tool",
      },
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
      <div className="mx-auto max-w-6xl pt-2 sm:pt-4">
        {/*
          One card, with the artwork as its own background rather than a second
          card beside it. @container makes the card the sizing reference for
          --text-hero, so the wordmark always fits the space it actually has.

          Rounded rather than notched: the deck's stepped corner cut a bite out
          of the top-right of the photograph, which reads as a damaged image
          rather than a deliberate silhouette now that the card carries
          artwork. The motif still appears on the background Decor shapes.
        */}
        <section className="@container relative isolate overflow-hidden rounded-[22px] sm:rounded-[32px]">
          <img
            src={heroImage}
            alt="Illustration of a head in profile with a glowing neural network and a clock, representing time-critical stroke care"
            width={1024}
            height={1280}
            className="absolute inset-0 size-full object-cover object-center lg:object-[62%_center]"
          />

          {/*
            Scrim. Vertical on phones, where the copy has to sit over the
            artwork; horizontal from lg, where there is room to keep the text
            on a dark left field and leave the head and clock visible.
          */}
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-black/80 via-navy/70 to-black/85 lg:bg-gradient-to-r lg:from-black/90 lg:via-navy/60 lg:to-transparent"
          />

          <div className="relative flex min-h-[min(78dvh,42rem)] flex-col justify-between gap-8 p-6 sm:p-8 lg:gap-10 lg:p-12">
            <div className="max-w-2xl">
              <h1 className="display-xl text-hero text-white">
                BEFAST <span className="text-sky">AI</span>
              </h1>
              <p className="eyebrow mt-5 text-white/85 sm:mt-6">
                Fast and easy stroke detection tool
              </p>
              <p className="mt-5 max-w-md text-white/90 sm:mt-6">
                Six guided checks — Balance, Eyes, Face, Arms, Speech and Time. Camera and voice are
                processed on your device; nothing is uploaded.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
              <PrimaryLink to="/mode">Begin</PrimaryLink>
              <SecondaryLink to="/learn">Learn more</SecondaryLink>
            </div>
          </div>

          {/* Drawn last so the image cannot paint over the card edge. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[22px] border border-white/25 sm:rounded-[32px]"
          />
        </section>
      </div>
    </AppShell>
  );
}
