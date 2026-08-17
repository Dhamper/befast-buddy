import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Letter, ModuleResult, OnsetKey } from "./scoring";

export type Mode = "self" | "other";

export type Session = {
  startedAt: number;
  mode: Mode;
  onset: OnsetKey | null;
  onsetRecordedAt: number | null;
  permissions: { camera: boolean; mic: boolean } | null;
  results: Partial<Record<Letter, ModuleResult>>;
};

const KEY = "befast.session.v1";
const HISTORY_KEY = "befast.history.v1";

function emptySession(): Session {
  return {
    startedAt: Date.now(),
    mode: "self",
    onset: null,
    onsetRecordedAt: null,
    permissions: null,
    results: {},
  };
}

type Ctx = {
  session: Session;
  setMode: (m: Mode) => void;
  setOnset: (o: OnsetKey) => void;
  setPermissions: (p: { camera: boolean; mic: boolean }) => void;
  saveResult: (l: Letter, r: ModuleResult) => void;
  reset: () => void;
  archive: () => void;
  history: Session[];
  clearHistory: () => void;
};

const SessionContext = createContext<Ctx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(emptySession);
  const [history, setHistory] = useState<Session[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw) as Session);
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h) as Session[]);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
  }, [session]);

  const value = useMemo<Ctx>(() => {
    const persistHistory = (next: Session[]) => {
      setHistory(next);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    };
    return {
      session,
      setMode: (mode) => setSession((s) => ({ ...s, mode })),
      setOnset: (onset) =>
        setSession((s) => ({ ...s, onset, onsetRecordedAt: Date.now() })),
      setPermissions: (permissions) =>
        setSession((s) => ({ ...s, permissions })),
      saveResult: (l, r) =>
        setSession((s) => ({
          ...s,
          results: { ...s.results, [l]: { ...r, completedAt: Date.now() } },
        })),
      reset: () => setSession(emptySession()),
      archive: () => persistHistory([session, ...history].slice(0, 20)),
      history,
      clearHistory: () => persistHistory([]),
    };
  }, [session, history]);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

/** Live elapsed time since the recorded onset answer, formatted mm:ss / hh:mm. */
export function useElapsed(from: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return useCallback(() => {
    if (!from) return "--:--";
    const s = Math.max(0, Math.floor((now - from) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
      : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }, [now, from])();
}
