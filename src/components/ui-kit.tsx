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
        "glass rounded-[28px] p-6 sm:p-8",
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
  "inline-flex min-h-16 items-center justify-center gap-3 px-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/60 disabled:opacity-50";

export function PrimaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "rounded-[8px] bg-primary text-lg font-extrabold uppercase tracking-wide text-primary-foreground hover:bg-primary/85",
        className,
      )}
    />
  );
}

export function SecondaryButton({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={cn(
        base,
        "glass rounded-[8px] font-mono text-sm uppercase tracking-[0.18em] text-foreground hover:bg-white/20",
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
        "rounded-[8px] bg-primary text-lg font-extrabold uppercase tracking-wide text-primary-foreground hover:bg-primary/85",
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
        "glass rounded-[8px] font-mono text-sm uppercase tracking-[0.18em] text-foreground hover:bg-white/20",
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
export function Reticle({
  children,
  midline,
}: {
  children: ReactNode;
  midline?: boolean;
}) {
  const corner =
    "pointer-events-none absolute h-10 w-10 border-white border-[3px]";
  const tick = "pointer-events-none absolute bg-white";
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px] bg-black/60 sm:aspect-[3/4]">
      {children}
      <div className="absolute inset-3">
        <div className={cn(corner, "left-0 top-0 border-b-0 border-r-0")} />
        <div className={cn(corner, "right-0 top-0 border-b-0 border-l-0")} />
        <div className={cn(corner, "bottom-0 left-0 border-r-0 border-t-0")} />
        <div className={cn(corner, "bottom-0 right-0 border-l-0 border-t-0")} />
        <div className={cn(tick, "left-1/2 top-0 h-[3px] w-8 -translate-x-1/2")} />
        <div
          className={cn(tick, "bottom-0 left-1/2 h-[3px] w-8 -translate-x-1/2")}
        />
        <div className={cn(tick, "left-0 top-1/2 h-8 w-[3px] -translate-y-1/2")} />
        <div
          className={cn(tick, "right-0 top-1/2 h-8 w-[3px] -translate-y-1/2")}
        />
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
      <div className="notch-bl absolute -left-24 bottom-10 h-72 w-80 border border-white/20 bg-white/5" />
      <div className="notch-tr absolute -right-16 top-24 h-64 w-72 border border-white/20 bg-white/5" />
    </div>
  );
}
