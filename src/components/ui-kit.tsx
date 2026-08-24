import { Link } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { SignStatus } from "@/lib/scoring";

export function GlassCard({
  children,
  className,
  notch,
}: {
  children: ReactNode;
  className?: string;
  notch?: "tr" | "bl";
}) {
  return (
    <div
      className={cn(
        "glass rounded-[20px] p-5 sm:rounded-[28px] sm:p-7 lg:p-8",
        notch === "tr" && "notch-tr rounded-none",
        notch === "bl" && "notch-bl rounded-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

const base =
  // min-h-16 is deliberate everywhere: a 64px target stays tappable one-handed
  // under stress. Only the horizontal padding and label size flex with width.
  "inline-flex min-h-16 min-w-0 items-center justify-center gap-2 px-5 text-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 disabled:opacity-50 sm:gap-3 sm:px-8";

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "rounded-[8px] bg-primary text-base font-extrabold uppercase tracking-wide text-primary-foreground hover:bg-primary/85 sm:text-lg",
        className,
      )}
    />
  );
}

export function SecondaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "glass rounded-[8px] font-mono text-xs uppercase tracking-[0.14em] text-foreground hover:bg-white/20 sm:text-sm sm:tracking-[0.18em]",
        className,
      )}
    />
  );
}

export function PrimaryLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        base,
        "rounded-[8px] bg-primary text-base font-extrabold uppercase tracking-wide text-primary-foreground hover:bg-primary/85 sm:text-lg",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function SecondaryLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        base,
        "glass rounded-[8px] font-mono text-xs uppercase tracking-[0.14em] text-foreground hover:bg-white/20 sm:text-sm sm:tracking-[0.18em]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function StatusChip({ status }: { status: SignStatus }) {
  const map: Record<SignStatus, { label: string; className: string }> = {
    positive: {
      label: "Sign flagged",
      className: "bg-alert-high/90 text-white border-transparent",
    },
    uncertain: {
      label: "Uncertain",
      className: "bg-alert-mid/90 text-black border-transparent",
    },
    negative: {
      label: "Completed",
      className: "bg-done/90 text-black border-transparent",
    },
    unchecked: {
      label: "Not checked",
      className: "glass text-foreground",
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.16em]",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}

/** White corner brackets + centred edge ticks, as on the Face slide. */
export function Reticle({ children, midline }: { children: ReactNode; midline?: boolean }) {
  const corner = "pointer-events-none absolute h-7 w-7 border-white border-[3px] sm:h-10 sm:w-10";
  const tick = "pointer-events-none absolute bg-white";
  return (
    // media-frame keeps a single 4:5 ratio and caps the height in dvh, so the
    // frame never pushes the action buttons off screen. A single ratio also
    // keeps PoseModule's 480x600 landmark canvas aligned at every width.
    <div className="media-frame relative overflow-hidden rounded-[18px] bg-black/60">
      {children}
      <div className="absolute inset-2 sm:inset-3">
        <div className={cn(corner, "left-0 top-0 border-b-0 border-r-0")} />
        <div className={cn(corner, "right-0 top-0 border-b-0 border-l-0")} />
        <div className={cn(corner, "bottom-0 left-0 border-r-0 border-t-0")} />
        <div className={cn(corner, "bottom-0 right-0 border-l-0 border-t-0")} />
        <div className={cn(tick, "left-1/2 top-0 h-[3px] w-6 -translate-x-1/2 sm:w-8")} />
        <div className={cn(tick, "bottom-0 left-1/2 h-[3px] w-6 -translate-x-1/2 sm:w-8")} />
        <div className={cn(tick, "left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 sm:h-8")} />
        <div className={cn(tick, "right-0 top-1/2 h-6 w-[3px] -translate-y-1/2 sm:h-8")} />
        {midline && (
          <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/45" />
        )}
      </div>
    </div>
  );
}

/** Large decorative notched glass shapes bleeding off the canvas corners. */
export function Decor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="notch-bl absolute bottom-10 -left-[15vw] h-[38vh] w-[55vw] border border-white/20 bg-white/5 sm:-left-24 sm:h-72 sm:w-80" />
      <div className="notch-tr absolute top-24 -right-[12vw] h-[32vh] w-[48vw] border border-white/20 bg-white/5 sm:-right-16 sm:h-64 sm:w-72" />
    </div>
  );
}
