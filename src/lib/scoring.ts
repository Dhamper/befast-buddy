/**
 * Rule-based, auditable scoring for the BEFAST prototype.
 * Every threshold below is an UNVALIDATED PROTOTYPE VALUE — not clinical.
 */

export type SignStatus = "positive" | "uncertain" | "negative" | "unchecked";
export type Letter = "B" | "E" | "F" | "A" | "S" | "T";

/** Lateral sway of the body midpoint, as a fraction of shoulder width. PROTOTYPE VALUE. */
export const SWAY_POSITIVE = 0.28;
export const SWAY_UNCERTAIN = 0.16;
/** Shoulder-line tilt in degrees. PROTOTYPE VALUE. */
export const SHOULDER_TILT_POSITIVE = 9;
/** Missed peripheral targets on one side (out of 4). PROTOTYPE VALUE. */
export const EYE_FIELD_MISSES_POSITIVE = 2;
export const EYE_FIELD_MISSES_UNCERTAIN = 1;
/** Eyelid opening asymmetry ratio. PROTOTYPE VALUE. */
export const LID_ASYM_POSITIVE = 0.35;
export const LID_ASYM_UNCERTAIN = 0.2;
/** Face smile/brow asymmetry index (0..1). PROTOTYPE VALUE. */
export const FACE_ASYM_POSITIVE = 0.3;
export const FACE_ASYM_UNCERTAIN = 0.18;
/** Wrist drift as a fraction of arm length over the 10s hold. PROTOTYPE VALUE. */
export const ARM_DRIFT_POSITIVE = 0.18;
export const ARM_DRIFT_UNCERTAIN = 0.1;
/** Difference between the two arms' drift. PROTOTYPE VALUE. */
export const ARM_ASYM_POSITIVE = 0.12;
/** Word-level transcript accuracy against the target phrase. PROTOTYPE VALUE. */
export const SPEECH_ACCURACY_POSITIVE = 0.6;
export const SPEECH_ACCURACY_UNCERTAIN = 0.85;
/** Long pauses (>1.2s) inside the recording, as a slurring/word-finding proxy. PROTOTYPE VALUE. */
export const SPEECH_PAUSES_UNCERTAIN = 2;

export type Measurement = { label: string; value: string };

export type ModuleResult = {
  /** Result from automated measurement only. */
  measured: SignStatus;
  measurements: Measurement[];
  /** Observer questions: true = yes (sign present), false = no, null = not sure. */
  observer: Record<string, boolean | null>;
  completedAt?: number;
  skippedCamera?: boolean;
};

export type OnsetKey = "now" | "under1" | "1to3" | "3to45" | "over45" | "unknown";

export const ONSET_OPTIONS: { key: OnsetKey; label: string }[] = [
  { key: "now", label: "Right now / minutes ago" },
  { key: "under1", label: "Less than 1 hour ago" },
  { key: "1to3", label: "1–3 hours ago" },
  { key: "3to45", label: "3–4.5 hours ago" },
  { key: "over45", label: "More than 4.5 hours ago" },
  { key: "unknown", label: "Unknown / present on waking" },
];

/**
 * Resolve one sign to a single status. The precedence is deliberate and
 * fail-safe, in this order:
 *
 *  1. An observer "Yes" outranks everything, including a clean camera reading.
 *     A human saying they see the sign is the strongest evidence here.
 *  2. Otherwise the camera measurement escalates.
 *  3. A "Not sure" is never treated as reassurance — it downgrades to uncertain.
 *  4. Only an automated measurement can CLEAR a sign. Observer "No" answers
 *     alone leave it unchecked, because the questions the user never answered
 *     carry no information: previously a single "No" out of three questions,
 *     with the camera never run, reported the sign as "Completed".
 */
export function resolveSign(result?: ModuleResult): SignStatus {
  if (!result) return "unchecked";
  const answers = Object.values(result.observer);

  if (answers.some((a) => a === true)) return "positive";
  if (result.measured === "positive") return "positive";
  if (result.measured === "uncertain") return "uncertain";
  if (answers.some((a) => a === null)) return "uncertain";
  if (result.measured === "negative") return "negative";
  return "unchecked";
}

export type Tier = "positive" | "uncertain" | "clear";

export type Assessment = {
  tier: Tier;
  headline: string;
  action: string;
  flagged: Letter[];
  uncertain: Letter[];
};

export function assess(
  results: Partial<Record<Letter, ModuleResult>>,
  onset: OnsetKey | null,
): Assessment {
  const letters: Letter[] = ["B", "E", "F", "A", "S"];
  const flagged: Letter[] = [];
  const uncertain: Letter[] = [];
  for (const l of letters) {
    const s = resolveSign(results[l]);
    if (s === "positive") flagged.push(l);
    else if (s === "uncertain") uncertain.push(l);
  }

  const onsetLine =
    onset === "unknown"
      ? "Onset time unknown — tell the responders when the person was last known to be normal."
      : onset === "over45"
        ? "Onset over 4.5 hours ago — still call now; treatment options remain."
        : "Note the exact onset time and give it to the responders.";

  if (flagged.length > 0) {
    return {
      tier: "positive",
      headline: "URGENT — signs consistent with possible stroke",
      action: `Call emergency services now. ${onsetLine}`,
      flagged,
      uncertain,
    };
  }
  if (uncertain.length > 0) {
    return {
      tier: "uncertain",
      headline: "URGENT — inconclusive, treat as possible stroke",
      action: `Call emergency services now. ${onsetLine}`,
      flagged,
      uncertain,
    };
  }
  return {
    tier: "clear",
    headline: "No warning signs detected by this prototype",
    action:
      "This does not rule out a stroke. If anything seems wrong, call emergency services immediately.",
    flagged,
    uncertain,
  };
}

/** True as soon as any single sign is flagged positive or uncertain. */
export function shouldOfferEmergency(results: Partial<Record<Letter, ModuleResult>>): boolean {
  return (["B", "E", "F", "A", "S"] as Letter[]).some((l) => {
    const s = resolveSign(results[l]);
    return s === "positive" || s === "uncertain";
  });
}

export function statusFromThresholds(
  value: number,
  positive: number,
  uncertainAt: number,
): SignStatus {
  if (value >= positive) return "positive";
  if (value >= uncertainAt) return "uncertain";
  return "negative";
}

/**
 * Word-level accuracy of a transcript against a target phrase, as the length
 * of their longest common (in-order) subsequence over the target length. A
 * scrambled utterance of the right words no longer scores full marks — a
 * plain bag-of-words match couldn't tell "the quick brown fox" from
 * "fox brown the quick".
 */
export function transcriptAccuracy(target: string, said: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z\s']/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const t = norm(target);
  const s = norm(said);
  if (t.length === 0) return 0;
  const dp: number[][] = Array.from({ length: t.length + 1 }, () =>
    new Array<number>(s.length + 1).fill(0),
  );
  for (let i = 1; i <= t.length; i++) {
    for (let j = 1; j <= s.length; j++) {
      dp[i]![j] =
        t[i - 1] === s[j - 1] ? dp[i - 1]![j - 1]! + 1 : Math.max(dp[i - 1]![j]!, dp[i]![j - 1]!);
    }
  }
  return dp[t.length]![s.length]! / t.length;
}
