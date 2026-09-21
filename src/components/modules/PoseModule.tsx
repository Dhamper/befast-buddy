import { useEffect, useRef, useState } from "react";
import { Reticle, PrimaryButton, SecondaryButton } from "@/components/ui-kit";
import { useCamera } from "@/lib/useCamera";
import { loadPoseLandmarker } from "@/lib/vision";
import {
  ARM_ASYM_POSITIVE,
  ARM_DRIFT_POSITIVE,
  ARM_DRIFT_UNCERTAIN,
  SHOULDER_TILT_POSITIVE,
  SWAY_POSITIVE,
  SWAY_UNCERTAIN,
  statusFromThresholds,
} from "@/lib/scoring";
import { speak, stopSpeaking } from "@/lib/speak";
import { est, type ModuleProps } from "./types";

const HOLD_MS = 10_000;

/** Shared 10-second pose hold used by B — Balance and A — Arms. */
export function PoseModule({
  onMeasured,
  facing,
  variant,
}: ModuleProps & { variant: "balance" | "arms" }) {
  const { videoRef, ready, error, start, stop } = useCamera(facing);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "running" | "done">("idle");
  const [remaining, setRemaining] = useState(10);
  const [live, setLive] = useState<{ left: number; right: number }>({
    left: 0,
    right: 0,
  });
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const lmRef = useRef<any>(null);
  const dataRef = useRef({
    mids: [] as number[],
    tilts: [] as number[],
    leftStart: null as number | null,
    rightStart: null as number | null,
    leftLast: 0,
    rightLast: 0,
    /* Frozen on the first frame of the hold — recomputing these every frame
       let the divisor drift with the very motion it was meant to normalise
       (e.g. a falling arm shrinking its own arm-length divisor). */
    shoulderWidthBase: null as number | null,
    armLengthBase: null as number | null,
    /* Peak |drift| seen at any point in the hold, not just start vs. final
       frame, and unsigned so upward drift registers as readily as downward. */
    leftPeakDrift: 0,
    rightPeakDrift: 0,
  });

  const instruction =
    variant === "balance"
      ? "Stand still with your arms at your sides for ten seconds. Sit if standing is unsafe."
      : "Hold both arms straight out in front of you, palms up, and close your eyes for ten seconds.";

  useEffect(
    () => () => {
      doneRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
      stopSpeaking();
    },
    [],
  );

  const draw = (landmarks: { x: number; y: number }[]) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0B6BF0";
    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc((1 - p.x) * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const loop = () => {
    const video = videoRef.current;
    const lm = lmRef.current;
    if (video && lm && video.readyState >= 2) {
      const res = lm.detectForVideo(video, performance.now());
      const pts = res.landmarks?.[0] as { x: number; y: number }[] | undefined;
      if (pts && pts.length > 28) {
        draw(pts);
        const d = dataRef.current;
        const ls = pts[11]!;
        const rs = pts[12]!;
        const lw = pts[15]!;
        const rw = pts[16]!;
        if (variant === "balance") {
          if (d.shoulderWidthBase === null) {
            d.shoulderWidthBase = Math.max(0.05, Math.hypot(ls.x - rs.x, ls.y - rs.y));
          }
          const lh = pts[23]!;
          const rh = pts[24]!;
          d.mids.push((ls.x + rs.x + lh.x + rh.x) / 4);
          d.tilts.push((Math.atan2(rs.y - ls.y, rs.x - ls.x) * 180) / Math.PI);
        } else {
          if (d.armLengthBase === null) {
            d.armLengthBase = Math.max(0.1, Math.hypot(ls.x - lw.x, ls.y - lw.y));
          }
          if (d.leftStart === null) {
            d.leftStart = lw.y - ls.y;
            d.rightStart = rw.y - rs.y;
          }
          d.leftLast = lw.y - ls.y;
          d.rightLast = rw.y - rs.y;
          const armLength = d.armLengthBase;
          const leftDrift = (d.leftLast - (d.leftStart ?? 0)) / armLength;
          const rightDrift = (d.rightLast - (d.rightStart ?? 0)) / armLength;
          d.leftPeakDrift = Math.max(d.leftPeakDrift, Math.abs(leftDrift));
          d.rightPeakDrift = Math.max(d.rightPeakDrift, Math.abs(rightDrift));
          setLive({ left: leftDrift, right: rightDrift });
        }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
    const d = dataRef.current;
    if (variant === "balance") {
      const mids = d.mids;
      const mean = mids.reduce((a, b) => a + b, 0) / (mids.length || 1);
      const sd = Math.sqrt(mids.reduce((a, b) => a + (b - mean) ** 2, 0) / (mids.length || 1));
      const width = d.shoulderWidthBase ?? 0.2;
      const sway = mids.length ? sd / width : 0;
      /* A brief large lurch averages away in the whole-hold standard
         deviation, so the peak single-frame excursion decides the status —
         the SD is kept only as a supporting figure. */
      const peakSway = mids.length ? Math.max(...mids.map((m) => Math.abs(m - mean))) / width : 0;
      const tilt = d.tilts.length
        ? Math.max(...d.tilts.map((t) => Math.abs(Math.abs(t) - 180) % 180))
        : 0;
      const status =
        mids.length === 0
          ? "unchecked"
          : tilt >= SHOULDER_TILT_POSITIVE
            ? "positive"
            : statusFromThresholds(peakSway, SWAY_POSITIVE, SWAY_UNCERTAIN);
      onMeasured(status, [
        est("Peak lateral sway (of shoulder width)", peakSway.toFixed(2)),
        est("Average lateral sway, SD (of shoulder width)", sway.toFixed(2)),
        est("Shoulder-line tilt", `${tilt.toFixed(1)}°`),
      ]);
    } else {
      const leftDrift = d.leftPeakDrift;
      const rightDrift = d.rightPeakDrift;
      const worst = Math.max(leftDrift, rightDrift);
      const asym = Math.abs(leftDrift - rightDrift);
      const status =
        d.leftStart === null
          ? "unchecked"
          : asym >= ARM_ASYM_POSITIVE
            ? "positive"
            : statusFromThresholds(worst, ARM_DRIFT_POSITIVE, ARM_DRIFT_UNCERTAIN);
      onMeasured(status, [
        est("Peak left arm drift", leftDrift.toFixed(2)),
        est("Peak right arm drift", rightDrift.toFixed(2)),
        est("Side-to-side difference", asym.toFixed(2)),
      ]);
    }
    stop();
    setPhase("done");
  };

  const begin = async () => {
    setPhase("loading");
    doneRef.current = false;
    await start();
    dataRef.current = {
      mids: [],
      tilts: [],
      leftStart: null,
      rightStart: null,
      leftLast: 0,
      rightLast: 0,
      shoulderWidthBase: null,
      armLengthBase: null,
      leftPeakDrift: 0,
      rightPeakDrift: 0,
    };
    try {
      lmRef.current = await loadPoseLandmarker();
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      /* observer questions remain available */
    }
    setPhase("running");
    speak(instruction);
    const startedAt = Date.now();
    tickRef.current = window.setInterval(() => {
      const left = Math.max(0, HOLD_MS - (Date.now() - startedAt));
      setRemaining(Math.ceil(left / 1000));
      if (left <= 0) finish();
    }, 200);
  };

  return (
    <div className="space-y-5">
      <Reticle>
        <video ref={videoRef} muted playsInline className="size-full scale-x-[-1] object-cover" />
        <canvas ref={canvasRef} width={480} height={600} className="absolute inset-0 size-full" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-base text-white/80">
            {error ?? "Stand back so your shoulders and hands are in frame."}
          </div>
        )}
      </Reticle>

      {variant === "arms" && phase === "running" && (
        <div className="space-y-2">
          {(["left", "right"] as const).map((side) => (
            <div key={side}>
              <p className="eyebrow text-white/80">{side} wrist drift</p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${Math.min(100, Math.abs(live[side]) * 300)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-white/90 sm:text-base">
        {phase === "running"
          ? `Hold… ${remaining}s`
          : phase === "done"
            ? "Hold recorded."
            : instruction}
      </p>

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        {phase === "idle" || phase === "loading" ? (
          <PrimaryButton onClick={begin} disabled={phase === "loading"}>
            {phase === "loading" ? "Starting…" : "Check"}
          </PrimaryButton>
        ) : null}
        <SecondaryButton onClick={() => speak(instruction)}>Replay instruction</SecondaryButton>
      </div>
    </div>
  );
}
