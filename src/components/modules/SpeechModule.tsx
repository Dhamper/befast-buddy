import { useEffect, useRef, useState } from "react";
import { Reticle, PrimaryButton, SecondaryButton } from "@/components/ui-kit";
import { SPEECH_PHRASE } from "@/lib/content";
import {
  SPEECH_ACCURACY_POSITIVE,
  SPEECH_ACCURACY_UNCERTAIN,
  SPEECH_PAUSES_UNCERTAIN,
  transcriptAccuracy,
  type SignStatus,
} from "@/lib/scoring";
import { speak } from "@/lib/speak";
import { est, type ModuleProps } from "./types";

export function SpeechModule({ onMeasured }: ModuleProps) {
  const [phase, setPhase] = useState<"idle" | "recording" | "done">("idle");
  const [transcript, setTranscript] = useState("");
  const [levels, setLevels] = useState<number[]>(Array(28).fill(0.08));
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const statsRef = useRef({ start: 0, pauses: 0, lastVoice: 0, voiced: 0 });

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const finish = (text: string) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    const s = statsRef.current;
    const duration = (Date.now() - s.start) / 1000;
    const accuracy = text ? transcriptAccuracy(SPEECH_PHRASE, text) : 0;
    let status: SignStatus;
    if (!text) status = "uncertain";
    else if (accuracy < SPEECH_ACCURACY_POSITIVE) status = "positive";
    else if (accuracy < SPEECH_ACCURACY_UNCERTAIN || s.pauses > SPEECH_PAUSES_UNCERTAIN)
      status = "uncertain";
    else status = "negative";

    onMeasured(status, [
      est("Word accuracy vs target phrase", `${Math.round(accuracy * 100)}%`),
      est("Speaking duration", `${duration.toFixed(1)}s`),
      est("Long pauses (>1.2s)", String(s.pauses)),
      { label: "Transcript", value: text || "nothing recognised" },
    ]);
    setPhase("done");
  };

  const begin = async () => {
    setError(null);
    setTranscript("");
    statsRef.current = {
      start: Date.now(),
      pauses: 0,
      lastVoice: Date.now(),
      voiced: 0,
    };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone unavailable or denied — use the observer questions below instead.");
      return;
    }
    streamRef.current = stream;
    setPhase("recording");
    speak("Read the phrase on screen out loud.");

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let peak = 0;
      for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
      setLevels((l) => [...l.slice(1), Math.max(0.08, peak)]);
      const now = Date.now();
      if (peak > 0.06) {
        if (now - statsRef.current.lastVoice > 1200) statsRef.current.pauses++;
        statsRef.current.lastVoice = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    let heard = "";
    if (SR) {
      const rec = new SR();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        let txt = "";
        for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
        heard = txt.trim();
        setTranscript(heard);
      };
      rec.onerror = () => undefined;
      recRef.current = rec;
      try {
        rec.start();
      } catch {
        /* ignore */
      }
    } else {
      setError(
        "This browser can't transcribe speech — listen for slurring and use the observer questions.",
      );
    }

    window.setTimeout(() => finish(heard), 8000);
  };

  const targetWords = SPEECH_PHRASE.split(" ");
  const saidWords = transcript
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/);

  return (
    <div className="space-y-5">
      <Reticle>
        {/*
          28 fixed 6px bars plus gaps needed ~280px, which overflowed the ~200px
          of usable frame width on a small phone. The bars now share the
          available width and only cap at their original size.
        */}
        <div className="absolute inset-0 flex items-center justify-center gap-0.5 px-5 sm:gap-1 sm:px-10">
          {levels.map((l, i) => (
            <span
              key={i}
              className="min-w-px max-w-1.5 flex-1 basis-0 rounded-full bg-primary"
              style={{ height: `${Math.min(90, l * 160)}%` }}
            />
          ))}
        </div>
      </Reticle>

      <div className="glass rounded-[20px] p-4 sm:p-5">
        <p className="eyebrow mb-2 text-white/80">Read this out loud</p>
        <p className="text-section font-semibold">{SPEECH_PHRASE}</p>
      </div>

      {phase === "done" && (
        <div className="glass rounded-[20px] p-4 sm:p-5">
          <p className="eyebrow mb-3 text-white/80">Transcript diff</p>
          <p className="flex flex-wrap gap-1.5 text-base sm:gap-2 sm:text-lg">
            {targetWords.map((w) => {
              const hit = saidWords.includes(w.toLowerCase().replace(/[^a-z']/g, ""));
              return (
                <span
                  key={w}
                  className={
                    hit ? "rounded bg-done/25 px-2" : "rounded bg-alert-high/30 px-2 line-through"
                  }
                >
                  {w}
                </span>
              );
            })}
          </p>
          <p className="mt-3 break-words font-mono text-[0.65rem] uppercase tracking-[0.1em] text-white/70 sm:text-xs sm:tracking-[0.14em]">
            Heard: {transcript || "nothing recognised"}
          </p>
        </div>
      )}

      {error && <p className="text-base text-alert-mid">{error}</p>}

      <div className="grid gap-3 sm:flex sm:flex-wrap">
        {phase !== "recording" && (
          <PrimaryButton onClick={begin}>
            {phase === "done" ? "Record again" : "Check"}
          </PrimaryButton>
        )}
        {phase === "recording" && <PrimaryButton disabled>Recording… 8s</PrimaryButton>}
        <SecondaryButton onClick={() => speak(SPEECH_PHRASE)}>Hear the phrase</SecondaryButton>
      </div>
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.1em] text-white/70 sm:text-xs sm:tracking-[0.14em]">
        Audio stays on this device. Nothing is uploaded.
      </p>
    </div>
  );
}
