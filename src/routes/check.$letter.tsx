import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type CSSProperties } from "react";
import { AppShell } from "@/components/AppShell";
import {
  GlassCard,
  PrimaryButton,
  SecondaryButton,
  SegmentedTabs,
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
  const [measured, setMeasured] = useState<SignStatus>(existing?.measured ?? "unchecked");
  const [measurements, setMeasurements] = useState<Measurement[]>(existing?.measurements ?? []);
  const [observer, setObserver] = useState<Record<string, boolean | null>>(
    existing?.observer ?? {},
  );
  const forceQuestions = session.mode === "other" || !session.permissions?.camera;
  const [panel, setPanel] = useState<"check" | "questions">(forceQuestions ? "questions" : "check");

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

  const onsetLabel = ONSET_OPTIONS.find((o) => o.key === session.onset)?.label ?? "not recorded";

  const facing = session.mode === "other" ? "environment" : "user";

  const hasObserver = info.observer.length > 0;
  const isCamera = letter !== "T";

  return (
    <AppShell fitViewport>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-2 sm:gap-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 sm:gap-4">
          <h1 className="title-light text-2xl sm:text-page">
            {info.label.charAt(0) + info.label.slice(1).toLowerCase()}
          </h1>
          {status !== "unchecked" && <StatusChip status={status} />}
        </div>

        {offer && (
          <Link
            to="/emergency"
            className="block shrink-0 rounded-[8px] bg-alert-high px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white sm:px-6 sm:py-4 sm:text-base"
          >
            Warning sign flagged — open emergency action
          </Link>
        )}

        {hasObserver && (
          <SegmentedTabs
            options={[
              { value: "check", label: isCamera ? "Check" : "Time" },
              { value: "questions", label: "Questions" },
            ]}
            value={panel}
            onChange={setPanel}
          />
        )}

        <GlassCard className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 sm:gap-5 sm:p-7">
          {(!hasObserver || panel === "check") && (
            <div
              className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto sm:gap-5"
              style={isCamera ? ({ "--frame-h": "min(36dvh, 18rem)" } as CSSProperties) : undefined}
            >
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
                <div className="flex min-h-0 flex-1 flex-col justify-evenly gap-2 overflow-hidden">
                  <div className="shrink-0">
                    <p className="eyebrow text-white/80">Time since onset</p>
                    <p className="display-xl text-metric">{elapsed}</p>
                  </div>
                  <p className="shrink-0 text-sm text-white/90 sm:text-base">
                    Symptoms started: <strong>{onsetLabel}</strong>
                  </p>
                  <ul className="min-h-0 flex-1 space-y-1 overflow-hidden text-sm text-white/90 sm:space-y-2 sm:text-base">
                    {(["B", "E", "F", "A", "S"] as Letter[]).map((l) => (
                      <li
                        key={l}
                        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1"
                      >
                        <span>{byLetter(l).label}</span>
                        <StatusChip status={resolveSign(session.results[l])} />
                      </li>
                    ))}
                  </ul>
                  <PrimaryButton
                    className="shrink-0 min-h-11 sm:min-h-16"
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

              {isCamera && measurements.length > 0 && (
                <ul className="shrink-0 space-y-1 border-t border-white/20 pt-3 text-sm sm:space-y-2 sm:pt-5 sm:text-base">
                  {measurements.map((m) => (
                    <li
                      key={m.label}
                      className="grid gap-0.5 sm:flex sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-3"
                    >
                      <span className="text-white/80">{m.label}</span>
                      <span className="font-mono text-xs sm:text-sm">{m.value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {hasObserver && panel === "questions" && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ObserverPanel info={info} answers={observer} onChange={onObserver} forceOpen />
            </div>
          )}
        </GlassCard>

        <div className="flex shrink-0 flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <SecondaryButton
            className="min-h-11 sm:min-h-16"
            onClick={() => navigate({ to: "/hub" })}
          >
            Back to all checks
          </SecondaryButton>
          <PrimaryButton
            className="min-h-11 sm:min-h-16"
            onClick={() => {
              commit();
              if (nextLetter) navigate({ to: "/check/$letter", params: { letter: nextLetter } });
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
