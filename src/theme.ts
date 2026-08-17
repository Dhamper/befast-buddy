export const theme = {
  sky: "#C7E4F3", // pale top band, bottom of card gradients
  blueBright: "#0B6BF0", // primary buttons, active states, progress
  blueMid: "#0D4CC0", // top of module-card gradients
  navy: "#061428", // mid page background
  black: "#000000", // bottom page background
  glassFill: "rgba(255,255,255,0.08)",
  glassBorder: "rgba(255,255,255,0.28)",
  textOnDark: "#FFFFFF",
  alertHigh: "#FF3B4E", // sign flagged / emergency
  alertMid: "#FFB020", // uncertain
  done: "#31D0AA", // module completed (never means "healthy")
} as const;

/** Emergency service label + number. Thailand EMS by default. */
export const EMERGENCY = {
  number: "1669",
  label: "Emergency Medical Services (Thailand)",
} as const;

export const DISCLAIMER =
  "BEFAST AI is an educational prototype. It cannot diagnose a stroke. If you suspect a stroke, call emergency services immediately.";
