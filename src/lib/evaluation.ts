/**
 * Accuracy-evaluation metrics for a continuous score against a binary ground
 * truth label — the sensitivity/specificity/ROC/AUC analysis CONCLUSION.md's
 * "Recommended evaluation methodology" section calls for. Pure and dataset
 * agnostic: feed it {score, positive} pairs from any source (an offline
 * dataset replay, a manual annotation pass, a live pilot) and it doesn't
 * care where the score came from.
 */

export type LabeledScore = {
  /** The continuous measurement, e.g. faceAsymmetry(...).index. Higher = more abnormal. */
  score: number;
  /** Ground truth: true = condition present (e.g. palsy side, dysarthric speaker). */
  positive: boolean;
  /** Optional identifier carried through for reporting (filename, participant id). */
  id?: string;
};

export type ConfusionCounts = {
  threshold: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
};

export type ConfusionMetrics = ConfusionCounts & {
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
  accuracy: number;
};

/** Counts at a single "score >= threshold => positive" decision rule. */
export function confusionAt(samples: LabeledScore[], threshold: number): ConfusionCounts {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const s of samples) {
    const predicted = s.score >= threshold;
    if (predicted && s.positive) tp++;
    else if (predicted && !s.positive) fp++;
    else if (!predicted && s.positive) fn++;
    else tn++;
  }
  return { threshold, tp, fp, tn, fn };
}

/** Ratio, or null when the denominator is zero (undefined rather than misleadingly 0). */
function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? NaN : numerator / denominator;
}

export function metricsAt(samples: LabeledScore[], threshold: number): ConfusionMetrics {
  const c = confusionAt(samples, threshold);
  return {
    ...c,
    sensitivity: ratio(c.tp, c.tp + c.fn),
    specificity: ratio(c.tn, c.tn + c.fp),
    ppv: ratio(c.tp, c.tp + c.fp),
    npv: ratio(c.tn, c.tn + c.fn),
    accuracy: ratio(c.tp + c.tn, samples.length),
  };
}

/**
 * Sweeps every score present in the sample as a candidate threshold (plus one
 * above and below the range), sorted by descending sensitivity — the ROC
 * curve. Ties at the same threshold are collapsed to one point.
 */
export function rocCurve(samples: LabeledScore[]): ConfusionMetrics[] {
  if (samples.length === 0) return [];
  const scores = [...new Set(samples.map((s) => s.score))].sort((a, b) => a - b);
  const thresholds = [scores[0]! - 1, ...scores, scores[scores.length - 1]! + 1];
  return thresholds.map((t) => metricsAt(samples, t)).sort((a, b) => b.threshold - a.threshold);
}

/** Area under the ROC curve via the trapezoidal rule over (fpr, tpr) points. */
export function auc(curve: ConfusionMetrics[]): number {
  const points = curve
    .map((m) => ({ fpr: 1 - m.specificity, tpr: m.sensitivity }))
    .filter((p) => Number.isFinite(p.fpr) && Number.isFinite(p.tpr))
    .sort((a, b) => a.fpr - b.fpr);
  let area = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    area += ((a.tpr + b.tpr) / 2) * (b.fpr - a.fpr);
  }
  return area;
}

/**
 * The lowest threshold that keeps sensitivity at or above `minSensitivity` —
 * CONCLUSION.md's "operating points fixed at a pre-specified minimum
 * sensitivity rather than chosen by inspection". Returns null if no
 * threshold in the sample reaches that sensitivity.
 */
export function thresholdForSensitivity(
  samples: LabeledScore[],
  minSensitivity: number,
): ConfusionMetrics | null {
  const curve = rocCurve(samples).filter((m) => m.sensitivity >= minSensitivity);
  if (curve.length === 0) return null;
  return curve.reduce((best, m) => (m.threshold > best.threshold ? m : best));
}
