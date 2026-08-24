import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LetterInfo } from "@/lib/content";

const OPTIONS: { value: boolean | null; label: string }[] = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
  { value: null, label: "Not sure" },
];

export function ObserverPanel({
  info,
  answers,
  onChange,
  forceOpen,
}: {
  info: LetterInfo;
  answers: Record<string, boolean | null>;
  onChange: (id: string, value: boolean | null) => void;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!forceOpen);
  return (
    <div className="glass rounded-[20px] p-4 sm:rounded-[28px] sm:p-7">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-16 w-full items-center justify-between gap-3 text-left sm:gap-4"
      >
        <span className="min-w-0">
          <span className="eyebrow block text-white/80">Observer questions</span>
          <span className="text-sm text-white/90 sm:text-base">
            Answer these if the camera can't be used — a “Yes” always counts.
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-5 shrink-0 transition-transform sm:size-6", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul className="mt-4 space-y-5 sm:mt-5">
          {info.observer.map((q) => (
            <li key={q.id}>
              <p className="mb-3 text-sm sm:text-base">{q.question}</p>
              {/* basis-0 + tight tracking keeps all three answers on one row
                  down to a 320px screen, where they used to wrap. */}
              <div className="flex gap-2 sm:gap-3">
                {OPTIONS.map((o) => {
                  const active = q.id in answers && answers[q.id] === o.value;
                  return (
                    <button
                      key={String(o.label)}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange(q.id, o.value)}
                      className={cn(
                        "min-h-16 min-w-0 flex-1 basis-0 rounded-[8px] border px-2 font-mono text-[0.7rem] uppercase tracking-[0.06em] sm:px-5 sm:text-sm sm:tracking-[0.14em]",
                        active
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-white/30 bg-white/10 hover:bg-white/20",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
