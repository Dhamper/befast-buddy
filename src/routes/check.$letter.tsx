import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlassCard, PrimaryButton, SegmentedTabs, StatusChip } from "@/components/ui-kit";
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

/** Pause after a check finishes so its result is readable before moving on. */
const ADVANCE_MS = 2500;

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
  // Without this the screen is reused across letters, so /check/B's result
  // state leaked into /check/E when advancing.
  remountDeps: ({ params }) => params,
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
  const [advancing, setAdvancing] = useState(false);

  const idx = ORDER.indexOf(letter);
  const nextLetter = ORDER[idx + 1];

  /* A finished station moves on by itself — there is no Next button. The
     result is already saved by the time this fires. */
  useEffect(() => {
    if (!advancing) return;
    const id = setTimeout(() => {
      if (nextLetter) navigate({ to: "/check/$letter", params: { letter: nextLetter } });
      else navigate({ to: "/results" });
    }, ADVANCE_MS);
    return () => clearTimeout(id);
  }, [advancing, nextLetter, navigate]);

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
    // "unchecked" means the camera never got a reading; stay so the user can
    // retry or switch to the questions.
    if (status !== "unchecked") setAdvancing(true);
  };

  const onObserver = (id: string, value: boolean | null) => {
    const next = { ...observer, [id]: value };
    setObserver(next);
    commit(measured, measurements, next);
    if (info.observer.every((q) => q.id in next)) setAdvancing(true);
  };
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
    <AppShell fitViewport backTo="/hub">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-2 sm:gap-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
            <h1 className="title-light text-2xl sm:text-page">
              {info.label.charAt(0) + info.label.slice(1).toLowerCase()}
            </h1>
            {status !== "unchecked" && <StatusChip status={status} />}
          </div>
          <Link
            to="/hub"
            className="glass inline-flex min-h-11 shrink-0 items-center rounded-full px-4 font-mono text-[0.65rem] uppercase tracking-[0.14em] hover:bg-white/20 sm:min-h-12 sm:text-xs sm:tracking-[0.16em]"
          >
            All checks
          </Link>
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
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto sm:gap-5">
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
                    className="shrink-0"
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

        {advancing && (
          <p
            role="status"
            className="shrink-0 text-center font-mono text-xs uppercase tracking-[0.14em] text-white/90 sm:text-sm"
          >
            Saved — {nextLetter ? `moving to ${byLetter(nextLetter).label}` : "opening results"}…
          </p>
        )}
      </div>
    </AppShell>
  );
}
