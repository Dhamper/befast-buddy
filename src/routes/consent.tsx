import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Mic, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GlassCard, PrimaryButton, SecondaryButton } from "@/components/ui-kit";
import { useSession } from "@/lib/session";

export const Route = createFileRoute("/consent")({
  head: () => ({
    meta: [
      { title: "Camera and microphone permission — BEFAST AI" },
      {
        name: "description",
        content:
          "How BEFAST AI uses the camera and microphone. All analysis runs on your device; no video, audio or image ever leaves it.",
      },
      { property: "og:title", content: "Camera and microphone permission — BEFAST AI" },
      {
        property: "og:description",
        content: "On-device only. Every module still works if you refuse access.",
      },
    ],
  }),
  component: Consent,
});

function Consent() {
  const { setPermissions } = useSession();
  const navigate = useNavigate();

  const request = async () => {
    let camera = false;
    let mic = false;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      s.getTracks().forEach((t) => t.stop());
      camera = true;
    } catch {
      camera = false;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      mic = true;
    } catch {
      mic = false;
    }
    setPermissions({ camera, mic });
    navigate({ to: "/hub" });
  };

  return (
    <AppShell fitViewport>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-3 sm:gap-6">
        <h1 className="title-light shrink-0 text-2xl sm:text-page">Before we start</h1>
        <GlassCard className="flex min-h-0 flex-1 flex-col justify-center gap-3 overflow-hidden sm:gap-5">
          <p className="flex gap-3 text-sm text-white/90 sm:gap-4 sm:text-base">
            <Camera aria-hidden className="mt-1 size-5 shrink-0 sm:size-6" />
            The camera is used to look for facial asymmetry, arm drift, postural sway and eyelid or
            gaze differences.
          </p>
          <p className="flex gap-3 text-sm text-white/90 sm:gap-4 sm:text-base">
            <Mic aria-hidden className="mt-1 size-5 shrink-0 sm:size-6" />
            The microphone is used to compare a spoken phrase with a target phrase for slurring and
            word-finding trouble.
          </p>
          <p className="flex gap-3 text-sm text-white/90 sm:gap-4 sm:text-base">
            <ShieldCheck aria-hidden className="mt-1 size-5 shrink-0 sm:size-6" />
            All processing happens on this device. No video, audio or image is uploaded or stored
            anywhere else.
          </p>
        </GlassCard>
        <div className="grid shrink-0 gap-3 sm:flex sm:flex-wrap sm:gap-4">
          <PrimaryButton onClick={request}>Allow and continue</PrimaryButton>
          <SecondaryButton
            onClick={() => {
              setPermissions({ camera: false, mic: false });
              navigate({ to: "/hub" });
            }}
          >
            Skip — answer questions instead
          </SecondaryButton>
        </div>
      </div>
    </AppShell>
  );
}
