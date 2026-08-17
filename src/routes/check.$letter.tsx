import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  GlassCard,
  PrimaryButton,
  SecondaryButton,
  StatusChip,
} from "@/components/ui-kit";
import { ObserverPanel } from "@/components/ObserverPanel";
import { FaceModule } from "@/components/modules/FaceModule";
import { PoseModule } from "@/components/modules/PoseModule";
import { EyesModule } from "@/components/modules/EyesModule";
import { SpeechModule } from "@/components/modules/SpeechModule";
import { LETTERS, byLetter } from "@/lib/content";
import {
  ONSET_OPTIONS,
  resolveSign,
  shouldOfferEmergency,
  type Letter,
  type Measurement,
  type SignStatus,
} from "@/lib/scoring";
import { useElapsed, useSession } from "@/lib/session";

const ORDER: Letter[] = ["B", "E", "F", "A", "S", "T"];

export const Route = createFileRoute("/check/$letter")({
  head: ({ params }) => {
    const letter = (params.letter?.toUpperCase() ?? "B") as Letter;
    const info = LETTERS.find((l) => l.letter === letter);
    const title = `${info ? info.label : "Check"} — BEFAST AI`;
    const description = info
      ? `${info.how} Part of the BE-FAST stroke warning-sign screening prototype.`
      : "A BE-FAST stroke warning-sign check.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: ModuleScreen,
});

function ModuleScreen() {
  const { letter: raw } = Route.useParams();
  const navigate = useNavigate();
  const { session, saveResult } = useSession();
  const letter = (raw.toUpperCase() as Letter) ?? "B";
  const info = byLetter(letter);
  const elapsed = useElapsed(session.onsetRecordedAt);

  const existing = session.results[letter];
  const [measured, setMeasured] = useState<SignStatus>(
    existing?.measured ?? "unchecked",
  );
  const [measurements, setMeasurements] = useState<Measurement[]>(
    existing?.measurements ?? [],
  );
  const [observer, setObserver] = useState<Record<string, boolean | null>>(
    existing?.observer ?? {},
  );

  if (!info) return null;

  const commit = (
    nextMeasured = measured,
    nextMeasurements = measurements,
    nextObserver = observer,
  ) => {
    saveResult(letter, {
      measured: nextMeasured,
      measurements: nextMeasurements,
      observer: nextObserver,
      skippedCamera: nextMeasured === "unchecked",
    });
  };

  const onMeasured = (status: SignStatus, m: Measurement[]) => {
    setMeasured(status);
    setMeasurements(m);
    commit(status, m, observer);
  };

  const onObserver = (id: string, value: boolean | null) => {
    const next = { ...observer, [id]: value };
    setObserver(next);
    commit(measured, measurements, next);
  };

  const idx = ORDER.indexOf(letter);
  const nextLetter = ORDER[idx + 1];
  const status = resolveSign({
    measured,
    measurements,
    observer,
  });
  const offer = shouldOfferEmergency({
    ...session.results,
    [letter]: { measured, measurements, observer },
  });

  const onsetLabel =
    ONSET_OPTIONS.find((o) => o.key === session.onset)?.label ?? "not recorded";

  const facing = session.mode === "other" ? "environment" : "user";

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="title-light text-5xl sm:text-6xl">
            {info.label.charAt(0) + info.label.slice(1).toLowerCase()}
          </h1>
          {status !== "unchecked" && <StatusChip status={status} />}
        </div>

        {offer && (
          <Link
            to="/emergency"
            className="block rounded-lg bg-alert-high px-6 py-4 text-base font-extrabold uppercase tracking-wide text-white"
          >
            Warning sign flagged — open emergency action
          </Link>
        )}

        <GlassCard className="space-y-5">
          {letter === "F" && <FaceModule onMeasured={onMeasured} facing={facing} />}
          {letter === "B" && (
            <PoseModule onMeasured={onMeasured} facing={facing} variant="balance" />
          )}
          {letter === "A" && (
            <PoseModule onMeasured={onMeasured} facing={facing} variant="arms" />
          )}
          {letter === "E" && <EyesModule onMeasured={onMeasured} facing={facing} />}
          {letter === "S" && <SpeechModule onMeasured={onMeasured} facing={facing} />}
          {letter === "T" && (
            <div className="space-y-4">
              <p className="eyebrow text-white/80">Time since onset</p>
              <p className="display-xl text-6xl">{elapsed}</p>
              <p className="text-white/90">
                Symptoms started: <strong>{onsetLabel}</strong>
              </p>
              <p className="text-white/90">
                Treatment options depend on how long ago symptoms began — this is
                why the clock matters more than any other number here.
              </p>
              <ul className="space-y-2 text-white/90">
                {(["B", "E", "F", "A", "S"] as Letter[]).map((l) => (
                  <li key={l} className="flex items-center justify-between gap-4">
                    <span>{byLetter(l).label}</span>
                    <StatusChip status={resolveSign(session.results[l])} />
                  </li>
                ))}
              </ul>
              <PrimaryButton
                onClick={() =>
                  onMeasured("negative", [
                    { label: "Time since onset", value: elapsed },
                    { label: "Reported onset", value: onsetLabel },
                  ])
                }
              >
                Record time summary
              </PrimaryButton>
            </div>
          )}

          {measurements.length > 0 && (
            <ul className="space-y-2 border-t border-white/20 pt-5">
              {measurements.map((m) => (
                <li key={m.label} className="flex flex-wrap justify-between gap-3">
                  <span className="text-white/80">{m.label}</span>
                  <span className="font-mono text-sm">{m.value}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        {info.observer.length > 0 && (
          <ObserverPanel
            info={info}
            answers={observer}
            onChange={onObserver}
            forceOpen={session.mode === "other" || !session.permissions?.camera}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <SecondaryButton onClick={() => navigate({ to: "/hub" })}>
            Back to all checks
          </SecondaryButton>
          <PrimaryButton
            onClick={() => {
              commit();
              if (nextLetter)
                navigate({ to: "/check/$letter", params: { letter: nextLetter } });
              else navigate({ to: "/results" });
            }}
          >
            {nextLetter ? `Next — ${nextLetter}` : "See results"}
          </PrimaryButton>
        </div>
      </div>
    </AppShell>
  );
}
