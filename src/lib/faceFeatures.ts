/**
 * Pure feature math over MediaPipe FaceLandmarker blendshape output. Takes
 * only the categories array — no video element or React state — so the same
 * function can run against a live camera frame or, later, against a batch of
 * frames pulled from an offline dataset for accuracy evaluation.
 */

export type Blendshape = { categoryName: string; score: number };

export type FaceAsymmetry = {
  smile: number;
  frown: number;
  brow: number;
  /** Combined 0..1 index used for the live meter and (via peak tracking) the final score. */
  index: number;
};

export function faceAsymmetry(categories: Blendshape[]): FaceAsymmetry {
  const get = (n: string) => categories.find((c) => c.categoryName === n)?.score ?? 0;
  const smile = Math.abs(get("mouthSmileLeft") - get("mouthSmileRight"));
  const frown = Math.abs(get("mouthFrownLeft") - get("mouthFrownRight"));
  const brow = Math.abs(get("browOuterUpLeft") - get("browOuterUpRight"));
  const index = Math.min(1, smile * 1.6 + frown * 0.8 + brow * 0.8);
  return { smile, frown, brow, index };
}

/** 0..1 eyelid-opening / gaze-direction asymmetry from a single frame's blendshapes. */
export function lidGazeAsymmetry(categories: Blendshape[]): number {
  const get = (n: string) => categories.find((c) => c.categoryName === n)?.score ?? 0;
  const lid = Math.abs(get("eyeBlinkLeft") - get("eyeBlinkRight"));
  const gaze = Math.abs(get("eyeLookOutLeft") - get("eyeLookOutRight"));
  return Math.min(1, lid + gaze * 0.5);
}

/** Median of a value observed over multiple frames — robust to a single blink outlier. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
