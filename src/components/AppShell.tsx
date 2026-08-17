import { Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import type { ReactNode } from "react";
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
        "inline-flex min-h-16 items-center gap-3 rounded-lg bg-alert-high px-6 text-lg font-extrabold uppercase tracking-wide text-white shadow-lg shadow-black/40 hover:brightness-110",
        className,
      )}
    >
      <Phone aria-hidden className="size-6" />
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

  return (
    <div className="relative flex min-h-screen flex-col">
      <Decor />
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-10">
        <Link to="/" className="title-light text-2xl sm:text-3xl">
          BEFAST AI
        </Link>
        <div className="flex items-center gap-3">
          {started && (
            <span className="glass rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.16em]">
              Since onset {elapsed}
            </span>
          )}
          <Link
            to="/history"
            className="glass rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] hover:bg-white/20"
          >
            History
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 pb-40 sm:px-10">{children}</main>

      {started && (
        <div className="fixed bottom-16 right-4 z-40 sm:bottom-20 sm:right-8">
          <EmergencyCallButton />
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/20 bg-black/70 px-5 py-3 text-center text-xs leading-snug text-white backdrop-blur-md sm:text-sm">
        {DISCLAIMER}
      </footer>
    </div>
  );
}
