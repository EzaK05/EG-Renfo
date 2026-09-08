import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../lib/api";

// Coquille visuelle partagée par les 3 pages de connexion (staff/élève/encadreur) — les 3 espaces
// ont des champs et un backend différents, mais le même patron d'UI (voir plan Phase 1 : une seule
// SPA React avec des vues qui partagent leurs patterns plutôt que 3 apps séparées).
export function LoginCard({
  title,
  onSubmit,
  children,
  submitting,
  error,
}: {
  title: string;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  submitting: boolean;
  error: string | null;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-rouge p-6">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-4">
        <div>
          <h1 className="text-xl font-black text-rouge uppercase tracking-tight">Excellence Group</h1>
          <p className="text-jaune font-bold text-xs tracking-widest">{title}</p>
        </div>
        <div className="space-y-3 text-left">{children}</div>
        {error && <div className="text-red-600 text-sm font-bold">{error}</div>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-rouge text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-60"
        >
          {submitting ? "Connexion..." : "Connexion"}
        </button>
        <Link to="/" className="block text-xs text-gray-400 hover:text-gray-600">
          ← Changer d'espace
        </Link>
      </form>
    </div>
  );
}

export function fieldInputClass() {
  return "w-full border border-gray-200 rounded-lg p-3 text-center focus:border-rouge focus:outline-none";
}

export function errorMessageFromApi(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Une erreur est survenue. Réessaie.";
}
