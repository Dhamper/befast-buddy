import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, EmergencyCallButton } from "@/components/AppShell";
import {
  GlassCard,
  PrimaryButton,
  SecondaryButton,
  SecondaryLink,
  SegmentedTabs,
} from "@/components/ui-kit";
import { byLetter } from "@/lib/content";
import { assess, ONSET_OPTIONS, resolveSign, type Letter } from "@/lib/scoring";
import { useElapsed, useSession } from "@/lib/session";
import { EMERGENCY } from "@/theme";

export const Route = createFileRoute("/emergency")({
  head: () => ({
    meta: [
      { title: "Emergency action — BEFAST AI" },
      {
        name: "description",
        content:
          "Call emergency services, follow the waiting checklist, and hand responders a summary of onset time and flagged stroke warning signs.",
      },
      { property: "og:title", content: "Emergency action — BEFAST AI" },
      {
        property: "og:description",
        content: "Call now, then use the waiting checklist and handoff summary.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Emergency,
});

const CHECKLIST = [
  "Note the exact time symptoms started.",
  "Do not give food, water or medication.",
  "Keep the person lying down with the head slightly raised.",
  "Unlock the door so responders can get in.",
  "Gather their medication list and ID.",
  "Stay with them and watch their breathing.",
];

function Emergency() {
  const { session } = useSession();
  const elapsed = useElapsed(session.onsetRecordedAt);
  const result = assess(session.results, session.onset);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"checklist" | "summary">("checklist");
  const onsetLabel = ONSET_OPTIONS.find((o) => o.key === session.onset)?.label ?? "not recorded";

  const summary = [
    "BEFAST AI — handoff summary (prototype screening, not a diagnosis)",
    `Generated: ${new Date().toLocaleString()}`,
    `Reported onset: ${onsetLabel}`,
    `Time since onset (tracked): ${elapsed}`,
    `Mode: ${session.mode === "self" ? "self-check" : "checked by another person"}`,
    `Urgency tier: ${result.headline}`,
    "",
    ...(["B", "E", "F", "A", "S", "T"] as Letter[]).map((l) => {
      const r = session.results[l];
      const status = resolveSign(r);
      const stamp = r?.completedAt ? new Date(r.completedAt).toLocaleTimeString() : "not checked";
      const measures = (r?.measurements ?? []).map((m) => `${m.label}: ${m.value}`).join("; ");
      return `${l} ${byLetter(l).label}: ${status} (${stamp})${measures ? ` — ${measures}` : ""}`;
    }),
    "",
    "All automated numbers are unvalidated prototype estimates.",
  ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  const download = () => {
    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "befast-handoff-summary.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell fitViewport>
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-2 sm:gap-4">
        <div className="shrink-0 rounded-[16px] border-2 border-alert-high bg-alert-high/25 p-3 sm:rounded-[28px] sm:p-7">
          <p className="eyebrow mb-1 sm:mb-3">Emergency action</p>
          <h1 className="display-xl text-2xl sm:text-display">Call {EMERGENCY.number} now</h1>
          <p className="mt-1 text-sm sm:mt-4 sm:text-lg">
            {result.headline}. Say “possible stroke” and give the onset time.
          </p>
          <div className="mt-2 sm:mt-6">
            <EmergencyCallButton className="min-h-12 w-full justify-center py-2 text-base sm:min-h-16 sm:py-6 sm:text-2xl" />
          </div>
          <p className="mt-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] sm:mt-3 sm:text-xs sm:tracking-[0.16em]">
            {EMERGENCY.label} · time since onset {elapsed}
          </p>
        </div>

        <SegmentedTabs
          options={[
            { value: "checklist", label: "While you wait" },
            { value: "summary", label: "Handoff summary" },
          ]}
          value={tab}
          onChange={setTab}
        />

        <GlassCard className="min-h-0 flex-1 overflow-hidden p-3 sm:p-7">
          {tab === "checklist" ? (
            <ul className="space-y-2 sm:space-y-3">
              {CHECKLIST.map((c) => (
                <li key={c} className="flex gap-2 text-sm text-white/90 sm:gap-3 sm:text-base">
                  <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-white" />
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <pre className="size-full overflow-hidden whitespace-pre-wrap break-words rounded-[8px] bg-black/40 p-2 font-mono text-[0.55rem] leading-snug sm:p-4 sm:text-xs sm:leading-relaxed">
              {summary}
            </pre>
          )}
        </GlassCard>

        <div className="grid shrink-0 gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <PrimaryButton onClick={copy} className="min-h-11 sm:min-h-16">
            {copied ? "Copied" : "Copy text"}
          </PrimaryButton>
          <SecondaryButton onClick={download} className="min-h-11 sm:min-h-16">
            Download card
          </SecondaryButton>
          <a
            href="https://www.google.com/maps/search/stroke+hospital+emergency+near+me"
            target="_blank"
            rel="noreferrer"
            className="glass inline-flex min-h-11 items-center justify-center rounded-[8px] px-5 text-center font-mono text-xs uppercase tracking-[0.14em] hover:bg-white/20 sm:min-h-16 sm:px-6 sm:text-sm sm:tracking-[0.18em]"
          >
            Find nearest hospital
          </a>
          <SecondaryLink to="/results" className="min-h-11 sm:min-h-16">
            Back to result
          </SecondaryLink>
        </div>
      </div>
    </AppShell>
  );
}
