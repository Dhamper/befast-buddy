import { useEffect, useRef, useState } from "react";
import { Reticle, PrimaryButton, SecondaryButton } from "@/components/ui-kit";
import { useCamera } from "@/lib/useCamera";
import { loadFaceLandmarker } from "@/lib/vision";
import { FACE_ASYM_POSITIVE, FACE_ASYM_UNCERTAIN, statusFromThresholds } from "@/lib/scoring";
import { speak } from "@/lib/speak";
import { est, type ModuleProps } from "./types";

const STEPS = [
  "Hold your face neutral and still.",
  "Now smile as broadly as you can.",
  "Now raise both eyebrows.",
];

export function FaceModule({ onMeasured, facing }: ModuleProps) {
  const { videoRef, ready, error, start, stop } = useCamera(facing);
  const [loading, setLoading] = useState(false);
  const [asym, setAsym] = useState<number | null>(null);
  const [step, setStep] = useState(-1);
  const [frames, setFrames] = useState<string[]>([]);
  const landmarkerRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const peakRef = useRef({ smile: 0, brow: 0 });

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const loop = () => {
    const video = videoRef.current;
    const lm = landmarkerRef.current;
    if (video && lm && video.readyState >= 2) {
      const res = lm.detectForVideo(video, performance.now());
      const bs = res.faceBlendshapes?.[0]?.categories as
        { categoryName: string; score: number }[] | undefined;
      if (bs) {
        const get = (n: string) => bs.find((c) => c.categoryName === n)?.score ?? 0;
        const smile = Math.abs(get("mouthSmileLeft") - get("mouthSmileRight"));
        const frown = Math.abs(get("mouthFrownLeft") - get("mouthFrownRight"));
        const brow = Math.abs(get("browOuterUpLeft") - get("browOuterUpRight"));
        const index = Math.min(1, smile * 1.6 + frown * 0.8 + brow * 0.8);
        peakRef.current.smile = Math.max(peakRef.current.smile, smile);
        peakRef.current.brow = Math.max(peakRef.current.brow, brow);
        setAsym(index);
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setFrames((f) => [...f.slice(-1), canvas.toDataURL("image/jpeg", 0.6)]);
  };

  const begin = async () => {
    setLoading(true);
    await start();
    try {
      landmarkerRef.current = await loadFaceLandmarker();
      rafRef.current = requestAnimationFrame(loop);
      peakRef.current = { smile: 0, brow: 0 };
      setStep(0);
      speak(STEPS[0]!);
    } catch {
      /* observer questions remain available */
    }
    setLoading(false);
  };

  const next = () => {
    captureFrame();
    if (step < STEPS.length - 1) {
      const n = step + 1;
      setStep(n);
      speak(STEPS[n]!);
      return;
    }
    const peak = Math.min(1, peakRef.current.smile * 1.6 + peakRef.current.brow * 0.8);
    const status = statusFromThresholds(peak, FACE_ASYM_POSITIVE, FACE_ASYM_UNCERTAIN);
    onMeasured(status, [
      est("Left/right asymmetry index", peak.toFixed(2)),
      est("Peak smile asymmetry", peakRef.current.smile.toFixed(2)),
      est("Peak brow asymmetry", peakRef.current.brow.toFixed(2)),
    ]);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stop();
    setStep(STEPS.length);
  };

  return (
    <div className="space-y-5">
      <Reticle midline>
        <video ref={videoRef} muted playsInline className="size-full scale-x-[-1] object-cover" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-base text-white/80">
            {error ?? "Camera preview appears here. Mirrored, on device only."}
          </div>
        )}
      </Reticle>

      {asym !== null && step >= 0 && step < STEPS.length && (
        <div>
          <p className="eyebrow mb-2 text-white/80">Live asymmetry meter</p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${Math.min(100, asym * 240)}%` }}
            />
          </div>
        </div>
      )}

      <p className="text-base text-white/90">
        {step < 0
          ? "Hold neutral, then smile, then raise your eyebrows. Three quick steps."
          : step < STEPS.length
            ? STEPS[step]
            : "Face check recorded."}
      </p>

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        {step < 0 ? (
          <PrimaryButton onClick={begin} disabled={loading}>
            {loading ? "Starting…" : "Check"}
          </PrimaryButton>
        ) : step < STEPS.length ? (
          <PrimaryButton onClick={next}>
            {step === STEPS.length - 1 ? "Finish face check" : "Next step"}
          </PrimaryButton>
        ) : null}
        <SecondaryButton onClick={() => speak(STEPS[Math.max(0, step)] ?? "")}>
          Replay instruction
        </SecondaryButton>
      </div>

      {frames.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {frames.map((f) => (
            <img
              key={f.slice(-24)}
              src={f}
              alt="Saved face frame kept on this device only"
              className="h-24 rounded-[8px] border border-white/25 sm:h-28"
            />
          ))}
        </div>
      )}
    </div>
  );
}
