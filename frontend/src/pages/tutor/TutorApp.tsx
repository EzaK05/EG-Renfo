import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { GlassCard, InputField, PrimaryButton } from "../../components/ui";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";

type Tab = "seances" | "paie" | "evolution";

interface SeanceItem {
  id: string;
  date: string;
  horaire: string;
  base: string;
  niveau: string;
  serie: string;
  matieres: string[];
  type: string;
  statut: string;
}
interface Paie {
  categorieAnciennete: string;
  tauxParSeance: number;
  nombreBlocs: number;
  equivalentSeances: number;
  salaireTotal: number;
}
interface EvolutionItem {
  periode: string;
  nombreSeances: number;
  montant: number;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex-1 py-2 rounded-lg text-xs font-bold ${active ? "bg-rouge text-white" : "bg-gray-100 text-gray-500"}`}>
      {children}
    </button>
  );
}

export function TutorApp() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>("seances");

  return (
    <div className="min-h-screen">
      <header className="bg-white p-4 border-b-2 border-jaune sticky top-0 z-40 flex justify-between items-center">
        <span className="text-sm font-extrabold text-rouge tracking-tight">Espace Encadreur</span>
        <button onClick={() => logout()} className="text-[10px] bg-gray-100 px-3 py-1 rounded-full font-bold text-gray-600">
          Déconnexion
        </button>
      </header>

      <div className="p-4 max-w-xl mx-auto space-y-4">
        <div className="flex gap-2">
          <TabButton active={tab === "seances"} onClick={() => setTab("seances")}>
            Mes séances
          </TabButton>
          <TabButton active={tab === "paie"} onClick={() => setTab("paie")}>
            Ma paie
          </TabButton>
          <TabButton active={tab === "evolution"} onClick={() => setTab("evolution")}>
            Évolution
          </TabButton>
        </div>

        {tab === "seances" && <SeancesTab />}
        {tab === "paie" && <PaieTab />}
        {tab === "evolution" && <EvolutionTab />}
      </div>
    </div>
  );
}

function SeancesTab() {
  const query = useQuery({ queryKey: ["tutor", "seances"], queryFn: () => api.get<SeanceItem[]>("/sessions/mine") });
  return (
    <div className="space-y-2">
      {query.data?.length === 0 && <p className="text-center text-sm text-gray-400 italic py-4">Aucune séance enregistrée.</p>}
      {query.data?.map((s) => (
        <GlassCard key={s.id} className="text-sm">
          <div className="flex justify-between">
            <span className="font-bold">
              {s.base} · {s.niveau}
              {s.serie ? ` ${s.serie}` : ""}
            </span>
            <span className="text-xs font-bold text-gray-400">{s.date}</span>
          </div>
          <div className="text-xs text-gray-500">
            {s.horaire} · {s.matieres.join(", ")}
          </div>
          <div className="text-[10px] font-bold text-rouge mt-1">{s.statut}</div>
        </GlassCard>
      ))}
    </div>
  );
}

function PaieTab() {
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [result, setResult] = useState<Paie | null>(null);

  async function calculer() {
    const params = new URLSearchParams();
    if (debut) params.set("debut", debut);
    if (fin) params.set("fin", fin);
    setResult(await api.get<Paie>(`/payroll/mine?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <InputField type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
          <InputField type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
        </div>
        <PrimaryButton onClick={calculer} className="w-full">
          Calculer
        </PrimaryButton>
      </GlassCard>
      {result && (
        <GlassCard className="text-center space-y-1">
          <div className="text-xs text-gray-400">{result.categorieAnciennete} · {formatMoney(result.tauxParSeance)}/séance</div>
          <div className="text-2xl font-black text-rouge">{formatMoney(result.salaireTotal)}</div>
          <div className="text-xs text-gray-400">
            {result.nombreBlocs} bloc(s) = {result.equivalentSeances} séance(s)
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function EvolutionTab() {
  const query = useQuery({ queryKey: ["tutor", "evolution"], queryFn: () => api.get<EvolutionItem[]>("/payroll/mine/evolution") });
  return (
    <div className="space-y-2">
      {query.data?.map((e) => (
        <div key={e.periode} className="flex justify-between items-center bg-white border border-gray-100 rounded-lg p-3 text-sm">
          <span className="font-bold">{e.periode}</span>
          <span className="text-xs text-gray-400">{e.nombreSeances} séance(s)</span>
          <span className="font-bold text-rouge">{formatMoney(e.montant)}</span>
        </div>
      ))}
    </div>
  );
}
