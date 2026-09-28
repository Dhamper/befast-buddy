import type { Measurement, SignStatus } from "@/lib/scoring";

export type ModuleProps = {
  onMeasured: (status: SignStatus, measurements: Measurement[]) => void;
  facing: "user" | "environment";
};

export const est = (label: string, value: string, raw?: number): Measurement => ({
  label,
  value: `${value} · prototype estimate`,
  ...(raw !== undefined && Number.isFinite(raw) ? { raw } : {}),
});
