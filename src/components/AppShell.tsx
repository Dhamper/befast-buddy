import { Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { DISCLAIMER, EMERGENCY } from "@/theme";
import { useElapsed, useSession } from "@/lib/session";
import { Decor } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export function EmergencyCallButton({ className }: { className?: string }) {
  return (
    <a
      href={`tel:${EMERGENCY.number}`}
      aria-label={`Call ${EMERGENCY.number}, ${EMERGENCY.label}`}
      className={cn(
        "inline-flex min-h-16 items-center gap-2 rounded-[8px] bg-alert-high px-5 text-base font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/40 hover:brightness-110 sm:gap-3 sm:px-6 sm:text-lg",
        className,
      )}
    >
      <Phone aria-hidden className="size-5 shrink-0 sm:size-6" />
      Call {EMERGENCY.number}
    </a>
  );
}

export function AppShell({
  children,
  showSession = true,
}: {
  children: ReactNode;
  showSession?: boolean;
}) {
  const { session } = useSession();
  const elapsed = useElapsed(session.onsetRecordedAt);
  const started = showSession && session.onset !== null;
  const footerRef = useRef<HTMLElement | null>(null);

  /*
   * The disclaimer footer is fixed and its height changes with viewport width
   * (it wraps to 1-4 lines) and with the safe-area inset. Publish the measured
   * height as --app-footer-h so main's bottom padding and the floating call
   * button can both clear it exactly, at any screen size.
   */
  useEffect(() => {
    const el = footerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const publish = () =>
      document.documentElement.style.setProperty("--app-footer-h", `${el.offsetHeight}px`);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="min-h-app relative flex flex-col">
      <Decor />
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
        <Link to="/" className="title-light text-xl sm:text-2xl lg:text-3xl">
          BEFAST AI
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {started && (
            <span className="glass rounded-full px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.16em]">
              Since onset {elapsed}
            </span>
          )}
          <Link
            to="/history"
            className="glass rounded-full px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] hover:bg-white/20 sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.16em]"
          >
            History
          </Link>
        </div>
      </header>

      <main
        className="flex-1 px-4 sm:px-6 lg:px-10"
        style={{
          // Clear the fixed footer, plus the floating call button when shown.
          paddingBottom: started
            ? "calc(var(--app-footer-h) + 7rem)"
            : "calc(var(--app-footer-h) + 2rem)",
        }}
      >
        {children}
      </main>

      {started && (
        <div
          className="fixed right-4 z-40 sm:right-8"
          style={{ bottom: "calc(var(--app-footer-h) + 1rem)" }}
        >
          <EmergencyCallButton />
        </div>
      )}

      <footer
        ref={footerRef}
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/20 bg-black/70 px-4 pt-3 text-center text-[0.7rem] leading-snug text-white backdrop-blur-md sm:px-6 sm:text-sm"
        style={{
          // Keep the text above the iPhone home indicator.
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
        }}
      >
        {DISCLAIMER}
      </footer>
    </div>
  );
}
