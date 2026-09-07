import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBox, GlassCard, InputField, PrimaryButton, SelectField } from "../../components/ui";
import { api, ApiError } from "../../lib/api";
import { formatMoney } from "../../lib/format";

type Tab = "grille" | "notes" | "moyennes" | "examens";

interface Profil {
  id: string;
  nom: string;
  prenoms: string;
  niveau: string;
}
interface ConfigNotes {
  matieres: { id: string; name: string }[];
  typesNote: string[];
  echelles: number[];
  trimestres: string[];
  typesExamenBlanc: string[];
  estClasseExamen: boolean;
  bareme: number | null;
}
interface PeriodStatus {
  periodKey: string;
  paye: number;
  du: number;
  statut: "avant" | "exonere" | "paye" | "partiel" | "impaye";
}
interface Grille {
  periods: { key: string; label: string }[];
  eleve: { montantMensuel: number; statutParPeriode: Record<string, PeriodStatus> };
}
interface Note {
  id: string;
  trimestre: string;
  matiere: string;
  type: string;
  note: number;
  echelle: number;
}
interface Moyenne {
  id: string;
  trimestre: string;
  matiere: string;
  generale: boolean;
  moyenne: number;
  rang: string;
}
interface ExamMatiere {
  id: string;
  type: string;
  matiere: string;
  note: number;
}
interface ExamTotal {
  id: string;
  type: string;
  total: number;
  bareme: number;
}

const BADGE_CLASSES: Record<PeriodStatus["statut"], string> = {
  paye: "bg-green-100 text-green-700",
  partiel: "bg-orange-100 text-orange-700",
  impaye: "bg-red-100 text-red-700",
  exonere: "bg-gray-100 text-gray-400",
  avant: "bg-gray-100 text-gray-400",
};

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex-1 py-2 rounded-lg text-xs font-bold ${active ? "bg-rouge text-white" : "bg-gray-100 text-gray-500"}`}>
      {children}
    </button>
  );
}

export function StudentApp() {
  const { logout } = useAuth();
  const [tab, setTab] = useState<Tab>("grille");
  const profilQuery = useQuery({ queryKey: ["eleve", "profil"], queryFn: () => api.get<Profil>("/eleve/profil") });
  const configQuery = useQuery({ queryKey: ["eleve", "config-notes"], queryFn: () => api.get<ConfigNotes>("/eleve/config-notes") });

  return (
    <div className="min-h-screen">
      <header className="bg-white p-4 border-b-2 border-jaune sticky top-0 z-40 flex justify-between items-center">
        <span className="text-sm font-extrabold text-rouge tracking-tight leading-tight">
          {profilQuery.data ? `${profilQuery.data.nom} ${profilQuery.data.prenoms}` : "Espace élève"}
          <br />
          <span className="text-gray-400 font-normal text-xs">{profilQuery.data?.niveau}</span>
        </span>
        <button onClick={() => logout()} className="text-[10px] bg-gray-100 px-3 py-1 rounded-full font-bold text-gray-600">
          Déconnexion
        </button>
      </header>

      <div className="p-4 max-w-xl mx-auto space-y-4">
        <div className="flex gap-2">
          <TabButton active={tab === "grille"} onClick={() => setTab("grille")}>
            Paiements
          </TabButton>
          <TabButton active={tab === "notes"} onClick={() => setTab("notes")}>
            Notes
          </TabButton>
          <TabButton active={tab === "moyennes"} onClick={() => setTab("moyennes")}>
            Moyennes
          </TabButton>
          {configQuery.data?.estClasseExamen && (
            <TabButton active={tab === "examens"} onClick={() => setTab("examens")}>
              Examens
            </TabButton>
          )}
        </div>

        {tab === "grille" && <GrilleTab />}
        {tab === "notes" && configQuery.data && <NotesTab config={configQuery.data} />}
        {tab === "moyennes" && configQuery.data && <MoyennesTab config={configQuery.data} />}
        {tab === "examens" && configQuery.data && <ExamensTab config={configQuery.data} />}
      </div>
    </div>
  );
}

function GrilleTab() {
  const query = useQuery({ queryKey: ["eleve", "grille"], queryFn: () => api.get<Grille>("/eleve/grille") });
  if (!query.data) return <p className="text-center text-gray-400 italic py-8">Chargement...</p>;
  return (
    <GlassCard className="space-y-3">
      <div className="text-xs font-bold text-gray-400">Montant mensuel : {formatMoney(query.data.eleve.montantMensuel)}</div>
      <div className="grid grid-cols-4 gap-2">
        {query.data.periods.map((p) => {
          const st = query.data!.eleve.statutParPeriode[p.key];
          return (
            <div key={p.key} className={`p-2 rounded-lg text-center text-[11px] font-bold ${BADGE_CLASSES[st.statut]}`}>
              {p.label.split(" ")[0].slice(0, 3)}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 italic">Vert = payé, orange = partiel, rouge = impayé. Contacte le staff pour régulariser un paiement.</p>
    </GlassCard>
  );
}

function NotesTab({ config }: { config: ConfigNotes }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["eleve", "notes"], queryFn: () => api.get<Note[]>("/eleve/notes") });
  const [trimestre, setTrimestre] = useState(config.trimestres[0]);
  const [matiereId, setMatiereId] = useState(config.matieres[0]?.id ?? "");
  const [type, setType] = useState(config.typesNote[0]);
  const [echelle, setEchelle] = useState(config.echelles[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function ajouter() {
    setError(null);
    try {
      await api.post("/eleve/notes", { trimestre, matiereId, type, echelle, note: Number(note) });
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["eleve", "notes"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur.");
    }
  }

  async function supprimer(id: string) {
    await api.delete(`/eleve/notes/${id}`);
    await queryClient.invalidateQueries({ queryKey: ["eleve", "notes"] });
  }

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <SelectField value={trimestre} onChange={(e) => setTrimestre(e.target.value)}>
            {config.trimestres.map((t) => (
              <option key={t} value={t}>
                {t} trimestre
              </option>
            ))}
          </SelectField>
          <SelectField value={matiereId} onChange={(e) => setMatiereId(e.target.value)}>
            {config.matieres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectField>
        </div>
        <SelectField value={type} onChange={(e) => setType(e.target.value)}>
          {config.typesNote.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-2">
          <SelectField value={echelle} onChange={(e) => setEchelle(Number(e.target.value))}>
            {config.echelles.map((e) => (
              <option key={e} value={e}>
                Sur {e}
              </option>
            ))}
          </SelectField>
          <InputField type="number" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <PrimaryButton onClick={ajouter} className="w-full">
          Ajouter
        </PrimaryButton>
      </GlassCard>
      <div className="space-y-2">
        {query.data?.map((n) => (
          <div key={n.id} className="flex justify-between items-center bg-white border border-gray-100 rounded-lg p-3 text-sm">
            <div>
              <div className="font-bold">{n.matiere}</div>
              <div className="text-xs text-gray-400">
                {n.type} · {n.trimestre} trimestre
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-rouge">
                {n.note}/{n.echelle}
              </span>
              <button onClick={() => supprimer(n.id)} className="text-xs text-gray-400 hover:text-red-500">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MoyennesTab({ config }: { config: ConfigNotes }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["eleve", "moyennes"], queryFn: () => api.get<Moyenne[]>("/eleve/moyennes") });
  const [trimestre, setTrimestre] = useState(config.trimestres[0]);
  const [generale, setGenerale] = useState(false);
  const [matiereId, setMatiereId] = useState(config.matieres[0]?.id ?? "");
  const [moyenne, setMoyenne] = useState("");
  const [rang, setRang] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function ajouter() {
    setError(null);
    try {
      await api.post("/eleve/moyennes", { trimestre, generale, matiereId: generale ? undefined : matiereId, moyenne: Number(moyenne), rang: rang || undefined });
      setMoyenne("");
      setRang("");
      await queryClient.invalidateQueries({ queryKey: ["eleve", "moyennes"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur.");
    }
  }

  async function supprimer(id: string) {
    await api.delete(`/eleve/moyennes/${id}`);
    await queryClient.invalidateQueries({ queryKey: ["eleve", "moyennes"] });
  }

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-2">
        <SelectField value={trimestre} onChange={(e) => setTrimestre(e.target.value)}>
          {config.trimestres.map((t) => (
            <option key={t} value={t}>
              {t} trimestre
            </option>
          ))}
        </SelectField>
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <input type="checkbox" checked={generale} onChange={(e) => setGenerale(e.target.checked)} /> Moyenne générale
        </label>
        {!generale && (
          <SelectField value={matiereId} onChange={(e) => setMatiereId(e.target.value)}>
            {config.matieres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </SelectField>
        )}
        <div className="grid grid-cols-2 gap-2">
          <InputField type="number" placeholder="Moyenne /20" value={moyenne} onChange={(e) => setMoyenne(e.target.value)} />
          <InputField placeholder="Rang (optionnel)" value={rang} onChange={(e) => setRang(e.target.value)} />
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <PrimaryButton onClick={ajouter} className="w-full">
          Ajouter
        </PrimaryButton>
      </GlassCard>
      <div className="space-y-2">
        {query.data?.map((m) => (
          <div key={m.id} className="flex justify-between items-center bg-white border border-gray-100 rounded-lg p-3 text-sm">
            <div>
              <div className="font-bold">{m.generale ? "Moyenne générale" : m.matiere}</div>
              <div className="text-xs text-gray-400">
                {m.trimestre} trimestre {m.rang ? `· Rang ${m.rang}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-rouge">{m.moyenne}/20</span>
              <button onClick={() => supprimer(m.id)} className="text-xs text-gray-400 hover:text-red-500">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamensTab({ config }: { config: ConfigNotes }) {
  const queryClient = useQueryClient();
  const matieresQuery = useQuery({ queryKey: ["eleve", "examens", "matieres"], queryFn: () => api.get<ExamMatiere[]>("/eleve/examens-blancs/matieres") });
  const totauxQuery = useQuery({ queryKey: ["eleve", "examens", "totaux"], queryFn: () => api.get<ExamTotal[]>("/eleve/examens-blancs/totaux") });

  const [type, setType] = useState(config.typesExamenBlanc[0]);
  const [matiereId, setMatiereId] = useState(config.matieres[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [total, setTotal] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function ajouterMatiere() {
    setError(null);
    try {
      await api.post("/eleve/examens-blancs/matieres", { type, matiereId, note: Number(note) });
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["eleve", "examens", "matieres"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur.");
    }
  }
  async function ajouterTotal() {
    setError(null);
    try {
      await api.post("/eleve/examens-blancs/totaux", { type, total: Number(total) });
      setTotal("");
      await queryClient.invalidateQueries({ queryKey: ["eleve", "examens", "totaux"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur.");
    }
  }
  async function supprimerMatiere(id: string) {
    await api.delete(`/eleve/examens-blancs/matieres/${id}`);
    await queryClient.invalidateQueries({ queryKey: ["eleve", "examens", "matieres"] });
  }
  async function supprimerTotal(id: string) {
    await api.delete(`/eleve/examens-blancs/totaux/${id}`);
    await queryClient.invalidateQueries({ queryKey: ["eleve", "examens", "totaux"] });
  }

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-2">
        <SelectField value={type} onChange={(e) => setType(e.target.value)}>
          {config.typesExamenBlanc.map((t) => (
            <option key={t} value={t}>
              {t === "LOCAL" ? "Local" : "Régional"}
            </option>
          ))}
        </SelectField>
        {error && <ErrorBox>{error}</ErrorBox>}

        <div className="border-t border-dashed pt-3">
          <div className="text-xs font-bold text-gray-500 mb-1">Note par matière</div>
          <div className="grid grid-cols-2 gap-2">
            <SelectField value={matiereId} onChange={(e) => setMatiereId(e.target.value)}>
              {config.matieres.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </SelectField>
            <InputField type="number" placeholder="Note /20" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <PrimaryButton onClick={ajouterMatiere} className="w-full mt-2">
            Ajouter
          </PrimaryButton>
        </div>

        <div className="border-t border-dashed pt-3">
          <div className="text-xs font-bold text-gray-500 mb-1">Total sur {config.bareme}</div>
          <InputField type="number" placeholder={`Total /${config.bareme}`} value={total} onChange={(e) => setTotal(e.target.value)} />
          <PrimaryButton onClick={ajouterTotal} className="w-full mt-2">
            Ajouter
          </PrimaryButton>
        </div>
      </GlassCard>

      <div className="space-y-2">
        {matieresQuery.data?.map((m) => (
          <div key={m.id} className="flex justify-between items-center bg-white border border-gray-100 rounded-lg p-3 text-sm">
            <div>
              {m.matiere} · {m.type === "LOCAL" ? "Local" : "Régional"}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-rouge">{m.note}/20</span>
              <button onClick={() => supprimerMatiere(m.id)} className="text-xs text-gray-400 hover:text-red-500">
                ✕
              </button>
            </div>
          </div>
        ))}
        {totauxQuery.data?.map((t) => (
          <div key={t.id} className="flex justify-between items-center bg-white border border-gray-100 rounded-lg p-3 text-sm">
            <div>Total · {t.type === "LOCAL" ? "Local" : "Régional"}</div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-rouge">
                {t.total}/{t.bareme}
              </span>
              <button onClick={() => supprimerTotal(t.id)} className="text-xs text-gray-400 hover:text-red-500">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
