import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBox, InputField, Modal, PrimaryButton } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { DashboardView } from "./DashboardView";
import { EncaissementView } from "./EncaissementView";
import { EquipeView } from "./EquipeView";
import { InscriptionView } from "./InscriptionView";

type Tab = "insc" | "pay" | "equipe" | "dash";

const NAV: { id: Tab; label: string; protégé: boolean }[] = [
  { id: "insc", label: "Inscrire", protégé: false },
  { id: "pay", label: "Encaisser", protégé: false },
  { id: "equipe", label: "Équipe", protégé: true },
  { id: "dash", label: "Statistiques", protégé: true },
];

export function StaffApp() {
  const { session, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("insc");
  const [statsUnlocked, setStatsUnlocked] = useState(false);
  const [askUnlock, setAskUnlock] = useState<Tab | null>(null);

  const canSeeStats = session?.kind === "staff" && (session.canSeeStats || statsUnlocked);

  function goTo(t: Tab) {
    const meta = NAV.find((n) => n.id === t)!;
    if (meta.protégé && !canSeeStats) {
      setAskUnlock(t);
      return;
    }
    setTab(t);
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="bg-white p-4 border-b-2 border-jaune sticky top-0 z-40 flex justify-between items-center">
        <span className="text-sm font-extrabold text-rouge tracking-tight leading-tight">
          Excellence Group
          <br />
          {session?.kind === "staff" ? session.displayName : ""}
        </span>
        <button onClick={() => logout()} className="text-[10px] bg-gray-100 px-3 py-1 rounded-full font-bold text-gray-600">
          Déconnexion
        </button>
      </header>

      <div className="p-4 max-w-xl mx-auto">
        {tab === "insc" && <InscriptionView />}
        {tab === "pay" && <EncaissementView />}
        {tab === "equipe" && canSeeStats && <EquipeView />}
        {tab === "dash" && canSeeStats && <DashboardView />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex py-3 z-50">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => goTo(n.id)} className={`flex-1 text-[11px] font-bold ${tab === n.id ? "text-rouge" : "text-gray-500"}`}>
            {n.label}
          </button>
        ))}
      </nav>

      {askUnlock && (
        <StatsUnlockModal
          onClose={() => setAskUnlock(null)}
          onUnlocked={() => {
            setStatsUnlocked(true);
            setTab(askUnlock);
            setAskUnlock(null);
          }}
        />
      )}
    </div>
  );
}

function StatsUnlockModal({ onClose, onUnlocked }: { onClose: () => void; onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function valider() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await api.post<{ authorized: boolean }>("/auth/verify-stats-access", { password });
      if (res.authorized) onUnlocked();
      else setError("Code non autorisé.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h3 className="font-extrabold text-gray-900 text-lg text-center">Accès restreint</h3>
      <p className="text-xs text-gray-500 mt-1 mb-4 text-center">Entre un code autorisé pour voir les statistiques.</p>
      <InputField type="password" placeholder="Code PIN" value={password} onChange={(e) => setPassword(e.target.value)} className="text-center mb-3" />
      {error && <ErrorBox>{error}</ErrorBox>}
      <div className="flex gap-3 mt-3">
        <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-lg">
          Annuler
        </button>
        <PrimaryButton onClick={valider} disabled={submitting} className="flex-1">
          Valider
        </PrimaryButton>
      </div>
    </Modal>
  );
}
