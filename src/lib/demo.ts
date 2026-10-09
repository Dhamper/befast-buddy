/**
 * Screenshot bypass. While true, every check still runs in full, but every
 * sign resolves to normal and a 80–95% confidence line is shown. Nothing fake
 * is stored — set back to false and real scoring returns, including for
 * sessions saved while it was on.
 */
export const demoBypass = true;

/** A stable 80.0–95.0 per (session, letter), so it doesn't change between renders and pages. */
export function demoConfidence(seed: number, letter: string): number {
  let h = Math.abs(Math.floor(seed)) % 2147483647;
  for (const c of letter) h = (h * 31 + c.charCodeAt(0)) % 2147483647;
  h = (h ^ (h >>> 7)) % 2147483647;
  return 80 + (h % 151) / 10;
}

/** Mean confidence across the five scored signs, for the overall result. */
export function demoOverallConfidence(seed: number): number {
  const letters = ["B", "E", "F", "A", "S"];
  const mean = letters.reduce((sum, l) => sum + demoConfidence(seed, l), 0) / letters.length;
  return Math.round(mean * 10) / 10;
}
