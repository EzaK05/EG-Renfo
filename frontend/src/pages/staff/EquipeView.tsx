import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorBox, GlassCard, InputField, PrimaryButton, SelectField } from "../../components/ui";
import { useConfigReference } from "../../hooks/useConfigReference";
import { api, ApiError } from "../../lib/api";
import { formatMoney } from "../../lib/format";

type SousOnglet = "encadreurs" | "seances" | "paie";

interface Tutor {
  id: string;
  nom: string;
  prenoms: string;
  telephone: string;
  matieres: string[];
  bases: string[];
  statut: "ACTIF" | "INACTIF";
  categorieAnciennete: string;
  tauxAnciennete: number;
}
interface CategorieAnciennete {
  id: string;
  nom: string;
  taux: number;
}
interface SeanceItem {
  id: string;
  date: string;
  jour: string;
  horaire: string;
  base: string;
  niveau: string;
  serie: string;
  groupe: string;
  matieres: string[];
  type: string;
  idEncadreur: string;
  nomEncadreur: string;
  statut: "PREVUE" | "FAITE" | "ANNULEE";
}
interface RapportSalaireItem {
  id: string;
  nom: string;
  prenoms: string;
  categorieAnciennete: string;
  tauxParSeance: number;
  nombreBlocs: number;
  equivalentSeances: number;
  salaireTotal: number;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex-1 py-2 rounded-lg text-xs font-bold ${active ? "bg-rouge text-white" : "bg-gray-100 text-gray-500"}`}>
      {children}
    </button>
  );
}

export function EquipeView() {
  const [tab, setTab] = useState<SousOnglet>("encadreurs");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900">Équipe</h2>
        <span className="text-xs font-bold text-rouge">ENCADREURS &amp; MATIÈRES</span>
      </div>
      <div className="flex gap-2">
        <TabButton active={tab === "encadreurs"} onClick={() => setTab("encadreurs")}>
          Encadreurs
        </TabButton>
        <TabButton active={tab === "seances"} onClick={() => setTab("seances")}>
          Séances
        </TabButton>
        <TabButton active={tab === "paie"} onClick={() => setTab("paie")}>
          Paie
        </TabButton>
      </div>

      {tab === "encadreurs" && <EncadreursTab />}
      {tab === "seances" && <SeancesTab />}
      {tab === "paie" && <PaieTab />}
    </div>
  );
}

function EncadreursTab() {
  const queryClient = useQueryClient();
  const config = useConfigReference().data;
  const categoriesQuery = useQuery({ queryKey: ["config", "categories-anciennete"], queryFn: () => api.get<CategorieAnciennete[]>("/config/categories-anciennete") });
  const matieresQuery = useQuery({ queryKey: ["config", "matieres"], queryFn: () => api.get<{ id: string; name: string }[]>("/config/matieres") });
  const tutorsQuery = useQuery({ queryKey: ["tutors"], queryFn: () => api.get<Tutor[]>("/staff/tutors") });

  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [telephone, setTelephone] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [baseIds, setBaseIds] = useState<string[]>([]);
  const [matiereIds, setMatiereIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ id: string; pin: string } | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function creerEncadreur() {
    setError(null);
    if (!nom || !prenoms || baseIds.length === 0 || !categorieId) {
      setError("Nom, prénoms, catégorie et au moins une base sont requis.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<{ id: string; pin: string }>("/staff/tutors", { nom, prenoms, telephone, categorieAncienneteId: categorieId, baseIds, matiereIds });
      setSuccess(res);
      setNom("");
      setPrenoms("");
      setTelephone("");
      setBaseIds([]);
      setMatiereIds([]);
      await queryClient.invalidateQueries({ queryKey: ["tutors"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changerCategorie(tutorId: string, categorieAncienneteId: string) {
    await api.patch(`/staff/tutors/${tutorId}/anciennete`, { categorieAncienneteId });
    await queryClient.invalidateQueries({ queryKey: ["tutors"] });
  }

  async function toggleStatut(tutor: Tutor) {
    const nouveauStatut = tutor.statut === "ACTIF" ? "INACTIF" : "ACTIF";
    await api.patch(`/staff/tutors/${tutor.id}/statut`, { statut: nouveauStatut });
    await queryClient.invalidateQueries({ queryKey: ["tutors"] });
  }

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-3">
        <div className="text-xs font-bold text-rouge uppercase tracking-widest">Nouvel encadreur</div>
        {success && (
          <div className="p-3 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200">
            Créé — ID {success.id}, PIN {success.pin}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <InputField placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} />
          <InputField placeholder="Prénoms" value={prenoms} onChange={(e) => setPrenoms(e.target.value)} />
        </div>
        <InputField placeholder="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Catégorie d'ancienneté (tarif/séance)</label>
          <SelectField value={categorieId} onChange={(e) => setCategorieId(e.target.value)}>
            <option value="">-- Catégorie --</option>
            {categoriesQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom} ({c.taux} F/séance)
              </option>
            ))}
          </SelectField>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Bases où il/elle intervient</label>
          <div className="flex gap-2">
            {config?.bases.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggle(baseIds, setBaseIds, b.id)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold border transition-colors ${baseIds.includes(b.id) ? "bg-rouge text-white border-rouge" : "bg-gray-50 text-gray-500 border-gray-200"}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Matières enseignées</label>
          <div className="flex flex-wrap gap-2">
            {matieresQuery.data?.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(matiereIds, setMatiereIds, m.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${matiereIds.includes(m.id) ? "bg-rouge text-white border-rouge" : "bg-gray-50 text-gray-500 border-gray-200"}`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        <PrimaryButton onClick={creerEncadreur} disabled={submitting} className="w-full">
          Créer l'encadreur
        </PrimaryButton>
      </GlassCard>

      <GlassCard>
        <div className="text-xs font-bold text-rouge uppercase tracking-widest mb-3">Liste des encadreurs</div>
        <div className="space-y-3">
          {tutorsQuery.data?.map((t) => (
            <div key={t.id} className="border border-gray-100 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-900">
                    {t.nom} {t.prenoms} <span className="text-xs text-gray-400 font-mono">{t.id}</span>
                  </div>
                  <div className="text-xs text-gray-500">{t.telephone} · {t.bases.join(", ")}</div>
                  <div className="text-xs text-gray-400">{t.matieres.join(", ")}</div>
                </div>
                <button
                  onClick={() => toggleStatut(t)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full ${t.statut === "ACTIF" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"}`}
                >
                  {t.statut}
                </button>
              </div>
              <select
                defaultValue={categoriesQuery.data?.find((c) => c.nom === t.categorieAnciennete)?.id ?? ""}
                onChange={(e) => changerCategorie(t.id, e.target.value)}
                className="text-[10px] font-bold border border-gray-200 rounded px-1.5 py-1 mt-2"
              >
                {categoriesQuery.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function SeancesTab() {
  const queryClient = useQueryClient();
  const config = useConfigReference().data;
  const matieresQuery = useQuery({ queryKey: ["config", "matieres"], queryFn: () => api.get<{ id: string; name: string }[]>("/config/matieres") });
  const tutorsQuery = useQuery({ queryKey: ["tutors"], queryFn: () => api.get<Tutor[]>("/staff/tutors") });

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const seancesQuery = useQuery({ queryKey: ["seances", date], queryFn: () => api.get<SeanceItem[]>(`/sessions/jour?date=${date}`) });

  const [baseId, setBaseId] = useState("");
  const [niveauId, setNiveauId] = useState("");
  const [serieId, setSerieId] = useState("");
  const [horaire, setHoraire] = useState("Matin");
  const [type, setType] = useState<"NORMALE" | "CONGES" | "PREPA_BAC">("NORMALE");
  const [matiereIds, setMatiereIds] = useState<string[]>([]);
  const [tutorId, setTutorId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const niveau = config?.niveaux.find((n) => n.id === niveauId);

  async function creerSeance() {
    setError(null);
    if (!baseId || !niveauId || !tutorId || matiereIds.length === 0) {
      setError("Base, niveau, matière(s) et encadreur sont requis.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/sessions", { date, horaire, baseId, niveauId, serieId: serieId || undefined, matiereIds, tutorId, type });
      await queryClient.invalidateQueries({ queryKey: ["seances"] });
      setMatiereIds([]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur.");
    } finally {
      setSubmitting(false);
    }
  }

  async function changerStatut(id: string, statut: SeanceItem["statut"]) {
    await api.patch(`/sessions/${id}`, { statut });
    await queryClient.invalidateQueries({ queryKey: ["seances"] });
  }

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="text-xs font-bold text-rouge uppercase tracking-widest mb-3">Séances du jour</div>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setDate((d) => new Date(new Date(d).getTime() - 86400000).toISOString().slice(0, 10))} className="p-2.5 rounded-lg bg-gray-100 text-gray-600 font-black">
            ‹
          </button>
          <InputField type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 text-center font-bold" />
          <button onClick={() => setDate((d) => new Date(new Date(d).getTime() + 86400000).toISOString().slice(0, 10))} className="p-2.5 rounded-lg bg-gray-100 text-gray-600 font-black">
            ›
          </button>
        </div>
        <div className="space-y-2">
          {seancesQuery.data?.length === 0 && <p className="text-center text-sm text-gray-400 italic py-2">Aucune séance ce jour.</p>}
          {seancesQuery.data?.map((s) => (
            <div key={s.id} className="border border-gray-100 rounded-lg p-2 text-xs flex justify-between items-center">
              <div>
                <span className="font-bold">{s.base} · {s.niveau}{s.serie ? ` ${s.serie}` : ""}{s.groupe ? ` (${s.groupe})` : ""}</span>
                <br />
                {s.horaire} · {s.matieres.join(", ")} · {s.nomEncadreur}
              </div>
              <select value={s.statut} onChange={(e) => changerStatut(s.id, e.target.value as SeanceItem["statut"])} className="text-[10px] font-bold border border-gray-200 rounded px-1 py-1">
                <option value="PREVUE">Prévue</option>
                <option value="FAITE">Faite</option>
                <option value="ANNULEE">Annulée</option>
              </select>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="space-y-3">
        <div className="text-xs font-bold text-rouge uppercase tracking-widest">Déclarer une séance</div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField value={baseId} onChange={(e) => setBaseId(e.target.value)}>
            <option value="">-- Base --</option>
            {config?.bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            value={niveauId}
            onChange={(e) => {
              setNiveauId(e.target.value);
              setSerieId("");
            }}
          >
            <option value="">-- Niveau --</option>
            {config?.niveaux.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </SelectField>
        </div>
        {niveau?.hasSeries && (
          <SelectField value={serieId} onChange={(e) => setSerieId(e.target.value)}>
            <option value="">-- Série --</option>
            {niveau.series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </SelectField>
        )}
        <div className="grid grid-cols-2 gap-3">
          <SelectField value={horaire} onChange={(e) => setHoraire(e.target.value)}>
            <option value="Matin">Matin</option>
            <option value="Soir">Soir</option>
          </SelectField>
          <SelectField value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="NORMALE">Normale</option>
            <option value="CONGES">Congés</option>
            <option value="PREPA_BAC">Prépa BAC</option>
          </SelectField>
        </div>
        <div className="flex flex-wrap gap-2">
          {matieresQuery.data?.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMatiereIds((ids) => (ids.includes(m.id) ? ids.filter((i) => i !== m.id) : [...ids, m.id]))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${matiereIds.includes(m.id) ? "bg-rouge text-white border-rouge" : "bg-gray-50 text-gray-500 border-gray-200"}`}
            >
              {m.name}
            </button>
          ))}
        </div>
        <SelectField value={tutorId} onChange={(e) => setTutorId(e.target.value)}>
          <option value="">-- Encadreur --</option>
          {tutorsQuery.data
            ?.filter((t) => t.statut === "ACTIF")
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.nom} {t.prenoms}
              </option>
            ))}
        </SelectField>
        {error && <ErrorBox>{error}</ErrorBox>}
        <PrimaryButton onClick={creerSeance} disabled={submitting} className="w-full">
          Déclarer la séance
        </PrimaryButton>
      </GlassCard>
    </div>
  );
}

function PaieTab() {
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [rapport, setRapport] = useState<RapportSalaireItem[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function calculer() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debut) params.set("debut", debut);
      if (fin) params.set("fin", fin);
      setRapport(await api.get<RapportSalaireItem[]>(`/payroll?${params.toString()}`));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <GlassCard className="space-y-3">
        <div className="text-xs font-bold text-rouge uppercase tracking-widest">Période</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Du</label>
            <InputField type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Au</label>
            <InputField type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
          </div>
        </div>
        <PrimaryButton onClick={calculer} disabled={loading} className="w-full">
          Calculer
        </PrimaryButton>
        <p className="text-[10px] text-gray-400">2 blocs de 4h = 1 séance payée ; un bloc isolé = une demi-séance.</p>
      </GlassCard>

      <GlassCard>
        <div className="text-xs font-bold text-rouge uppercase tracking-widest mb-3">Récapitulatif</div>
        {!rapport && <p className="text-sm text-gray-400 italic text-center">Choisis une période puis clique "Calculer".</p>}
        {rapport && (
          <div className="space-y-2">
            {rapport.map((r) => (
              <div key={r.id} className="flex justify-between border-b border-gray-100 pb-2 text-sm">
                <div>
                  <div className="font-bold">
                    {r.nom} {r.prenoms}
                  </div>
                  <div className="text-xs text-gray-400">
                    {r.categorieAnciennete} · {r.nombreBlocs} bloc(s) = {r.equivalentSeances} séance(s)
                  </div>
                </div>
                <div className="font-bold text-rouge">{formatMoney(r.salaireTotal)}</div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
