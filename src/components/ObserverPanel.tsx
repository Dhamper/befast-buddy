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
    <div className="glass rounded-[28px] p-5 sm:p-7">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-16 w-full items-center justify-between gap-4 text-left"
      >
        <span>
          <span className="eyebrow block text-white/80">Observer questions</span>
          <span className="text-base text-white/90">
            Answer these if the camera can't be used — a “Yes” always counts.
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={cn("size-6 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <ul className="mt-5 space-y-5">
          {info.observer.map((q) => (
            <li key={q.id}>
              <p className="mb-3 text-base">{q.question}</p>
              <div className="flex flex-wrap gap-3">
                {OPTIONS.map((o) => {
                  const active =
                    q.id in answers && answers[q.id] === o.value;
                  return (
                    <button
                      key={String(o.label)}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onChange(q.id, o.value)}
                      className={cn(
                        "min-h-16 flex-1 rounded-lg border px-5 font-mono text-sm uppercase tracking-[0.14em]",
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
