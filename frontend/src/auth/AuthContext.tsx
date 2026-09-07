import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../lib/api";

// Reflète les 3 payloads de session possibles définis côté backend (backend/src/lib/jwt.ts) —
// remplace les 3 "typeCompte" (équipe/eleve/encadreur) de l'app GAS actuelle.
export type Session =
  | { kind: "staff"; sub: string; role: "ADMIN" | "SUPERVISOR" | "STAFF"; baseId: string | null; canSeeStats: boolean; displayName: string }
  | { kind: "student"; sub: string; baseId: string; niveauId: string; serieId: string | null }
  | { kind: "tutor"; sub: string };

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<Session>("/auth/me");
      setSession(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setSession(null);
      else throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setSession(null);
  }, []);

  return <AuthContext.Provider value={{ session, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé sous <AuthProvider>.");
  return ctx;
}
