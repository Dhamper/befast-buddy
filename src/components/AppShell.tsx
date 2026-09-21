import { Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { DISCLAIMER, EMERGENCY } from "@/theme";
import { useElapsed, useSession } from "@/lib/session";
import { Decor } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import logoAsset from "@/assets/befast-logo.png.asset.json";

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
  fitViewport = false,
}: {
  children: ReactNode;
  showSession?: boolean;
  /**
   * Lock the page to exactly one screen: the shell takes the viewport height
   * and main never scrolls, so the page's own flex children have to share the
   * space that is left. Only for pages designed to fit.
   */
  fitViewport?: boolean;
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
    <div
      className={cn("relative flex flex-col", fitViewport ? "h-app overflow-hidden" : "min-h-app")}
    >
      <Decor />
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-6 sm:py-5 lg:px-10">
        <Link to="/" aria-label="BEFAST AI home" className="block shrink-0">
          <img
            src={logoAsset.url}
            alt="BEFAST AI"
            width={512}
            height={512}
            className="size-14 rounded-[8px] object-contain sm:size-16"
          />
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {started && (
            <span
              className="glass rounded-full px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.16em]"
              aria-label={`Time since onset ${elapsed}`}
            >
              <span className="hidden sm:inline">Since onset </span>
              {elapsed}
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
        className={cn(
          "px-4 sm:px-6 lg:px-10",
          fitViewport ? "flex min-h-0 flex-1 flex-col overflow-hidden" : "flex-1",
        )}
        style={{
          // Clear the fixed footer, plus the floating call button when shown.
          // A fit page reserves only what the button actually occupies, since
          // every pixel it gives up has to come out of the content.
          paddingBottom: started
            ? `calc(var(--app-footer-h) + ${fitViewport ? "5.5rem" : "7rem"})`
            : `calc(var(--app-footer-h) + ${fitViewport ? "0.75rem" : "2rem"})`,
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
