import { useEffect, useRef, useState } from "react";
import { Reticle, PrimaryButton, SecondaryButton } from "@/components/ui-kit";
import { useCamera } from "@/lib/useCamera";
import { loadFaceLandmarker } from "@/lib/vision";
import {
  EYE_FIELD_MISSES_POSITIVE,
  EYE_FIELD_MISSES_UNCERTAIN,
  LID_ASYM_POSITIVE,
  LID_ASYM_UNCERTAIN,
  statusFromThresholds,
  type SignStatus,
} from "@/lib/scoring";
import { speak, stopSpeaking } from "@/lib/speak";
import { est, type ModuleProps } from "./types";

/** 8 peripheral positions: 4 per side. */
const POSITIONS = [
  { x: 6, y: 20, side: "left" },
  { x: 6, y: 50, side: "left" },
  { x: 6, y: 80, side: "left" },
  { x: 20, y: 8, side: "left" },
  { x: 94, y: 20, side: "right" },
  { x: 94, y: 50, side: "right" },
  { x: 94, y: 80, side: "right" },
  { x: 80, y: 8, side: "right" },
] as const;

export function EyesModule({ onMeasured, facing }: ModuleProps) {
  const { videoRef, ready, error, start, stop } = useCamera(facing);
  const [stage, setStage] = useState<"idle" | "field" | "lid" | "done">("idle");
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [misses, setMisses] = useState({ left: 0, right: 0 });
  const [lidAsym, setLidAsym] = useState<number | null>(null);
  const answered = useRef(false);
  const doneRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lmRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      doneRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
      stopSpeaking();
    },
    [],
  );

  const showTarget = (i: number) => {
    if (i >= POSITIONS.length) {
      setVisible(false);
      startLid();
      return;
    }
    setIndex(i);
    answered.current = false;
    setVisible(true);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      if (!answered.current) {
        const side = POSITIONS[i]!.side;
        setMisses((m) => ({ ...m, [side]: m[side] + 1 }));
      }
      timerRef.current = window.setTimeout(() => showTarget(i + 1), 700);
    }, 2200);
  };

  const seen = () => {
    answered.current = true;
    setVisible(false);
  };

  const beginField = () => {
    doneRef.current = false;
    setStage("field");
    setMisses({ left: 0, right: 0 });
    speak(
      "Look at the centre dot. Tap I SEE IT whenever a square flashes near an edge. Do not move your eyes.",
    );
    showTarget(0);
  };

  const lidLoop = () => {
    const video = videoRef.current;
    const lm = lmRef.current;
    if (video && lm && video.readyState >= 2) {
      const res = lm.detectForVideo(video, performance.now());
      const bs = res.faceBlendshapes?.[0]?.categories as
        { categoryName: string; score: number }[] | undefined;
      if (bs) {
        const get = (n: string) => bs.find((c) => c.categoryName === n)?.score ?? 0;
        const lid = Math.abs(get("eyeBlinkLeft") - get("eyeBlinkRight"));
        const gaze = Math.abs(get("eyeLookOutLeft") - get("eyeLookOutRight"));
        setLidAsym(Math.min(1, lid + gaze * 0.5));
      }
    }
    rafRef.current = requestAnimationFrame(lidLoop);
  };

  const startLid = async () => {
    setStage("lid");
    await start();
    try {
      lmRef.current = await loadFaceLandmarker();
      rafRef.current = requestAnimationFrame(lidLoop);
      speak("Now look straight at the camera with your eyes open for a moment.");
    } catch {
      /* observer questions remain available */
    }
  };

  const finish = () => {
    if (doneRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearTimeout(timerRef.current);
    stop();
    const worstSide = Math.max(misses.left, misses.right);
    const fieldStatus: SignStatus =
      worstSide >= EYE_FIELD_MISSES_POSITIVE
        ? "positive"
        : worstSide >= EYE_FIELD_MISSES_UNCERTAIN
          ? "uncertain"
          : "negative";
    const lidStatus: SignStatus =
      lidAsym === null
        ? "unchecked"
        : statusFromThresholds(lidAsym, LID_ASYM_POSITIVE, LID_ASYM_UNCERTAIN);
    const rank = { positive: 3, uncertain: 2, negative: 1, unchecked: 0 };
    const status = rank[fieldStatus] >= rank[lidStatus] ? fieldStatus : lidStatus;
    onMeasured(status, [
      est("Missed targets — left field", `${misses.left} of 4`),
      est("Missed targets — right field", `${misses.right} of 4`),
      est("Eyelid / gaze asymmetry", lidAsym === null ? "not measured" : lidAsym.toFixed(2)),
    ]);
    setStage("done");
  };

  return (
    <div className="space-y-5">
      <Reticle>
        {stage === "field" ? (
          <div className="absolute inset-0">
            <div className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
            {visible && (
              <div
                className="absolute size-6 rounded-md bg-primary sm:size-8"
                style={{
                  left: `${POSITIONS[index]!.x}%`,
                  top: `${POSITIONS[index]!.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
            <p className="absolute bottom-4 left-0 right-0 px-4 text-center font-mono text-[0.65rem] uppercase tracking-[0.12em] text-white/80 sm:bottom-6 sm:px-6 sm:text-xs sm:tracking-[0.16em]">
              Target {Math.min(index + 1, POSITIONS.length)} of {POSITIONS.length}
            </p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              className="size-full scale-x-[-1] object-cover"
            />
            {!ready && (
              <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-base text-white/80">
                {error ?? "Two parts: a peripheral field test, then an eyelid and gaze check."}
              </div>
            )}
          </>
        )}
      </Reticle>

      {stage === "lid" && lidAsym !== null && (
        <div>
          <p className="eyebrow mb-2 text-white/80">Eyelid / gaze asymmetry</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, lidAsym * 240)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        {stage === "idle" && <PrimaryButton onClick={beginField}>Check</PrimaryButton>}
        {stage === "field" && (
          <PrimaryButton onClick={seen} className="flex-1">
            I see it
          </PrimaryButton>
        )}
        {stage === "lid" && <PrimaryButton onClick={finish}>Finish eye check</PrimaryButton>}
        <SecondaryButton
          onClick={() =>
            speak(
              stage === "field"
                ? "Look at the centre dot and tap I SEE IT when a square flashes."
                : "Look straight at the camera with your eyes open.",
            )
          }
        >
          Replay instruction
        </SecondaryButton>
      </div>
    </div>
  );
}
