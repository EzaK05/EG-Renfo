import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type Session } from "./AuthContext";

// Garde de route — équivalent du middleware requireAuth() côté backend, côté client :
// évite d'afficher une page protégée le temps qu'une requête API échoue en 401.
export function RequireAuth({ kind, redirectTo, children }: { kind: Session["kind"]; redirectTo: string; children: ReactNode }) {
  const { session, loading } = useAuth();

  if (loading) return <div className="p-6 text-center text-gray-400">Chargement...</div>;
  if (!session || session.kind !== kind) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
}
