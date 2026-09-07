import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBox, GlassCard, InputField, Modal, PrimaryButton, SelectField } from "../../components/ui";
import { useConfigReference } from "../../hooks/useConfigReference";
import { api, ApiError } from "../../lib/api";
import { formatMoney } from "../../lib/format";

interface PeriodStatus {
  periodKey: string;
  paye: number;
  du: number;
  statut: "avant" | "exonere" | "paye" | "partiel" | "impaye";
  ajuste: boolean;
}
interface Eleve {
  id: string;
  nom: string;
  prenoms: string;
  casSocial: boolean;
  moisArrivee: string;
  montantMensuel: number;
  statutParPeriode: Record<string, PeriodStatus>;
}
interface Grille {
  periods: { key: string; label: string }[];
  eleves: Eleve[];
}

function abregerMois(label: string): string {
  return label.split(" ")[0].split("-").map((m) => m.slice(0, 3)).join("-");
}

const BADGE_CLASSES: Record<PeriodStatus["statut"], string> = {
  paye: "bg-green-100 text-green-700",
  partiel: "bg-orange-100 text-orange-700",
  impaye: "bg-red-100 text-red-700",
  exonere: "bg-gray-100 text-gray-400",
  avant: "bg-gray-100 text-gray-400",
};

export function EncaissementView() {
  const { session } = useAuth();
  const staffBaseId = session?.kind === "staff" ? session.baseId : null;
  const config = useConfigReference().data;

  const [baseId, setBaseId] = useState(staffBaseId ?? "");
  const [niveauId, setNiveauId] = useState("");
  const [serieId, setSerieId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const niveau = config?.niveaux.find((n) => n.id === niveauId);

  const grilleQuery = useQuery({
    queryKey: ["grille", baseId, niveauId, serieId],
    queryFn: () => api.get<Grille>(`/staff/students?baseId=${baseId}&niveauId=${niveauId}${serieId ? `&serieId=${serieId}` : ""}`),
    enabled: !!baseId && !!niveauId,
  });

  const eleves = grilleQuery.data?.eleves ?? [];
  const filtered = useMemo(() => eleves.filter((e) => `${e.nom} ${e.prenoms}`.toLowerCase().includes(search.toLowerCase())), [eleves, search]);
  const selected = eleves.find((e) => e.id === selectedId) ?? null;

  const [payModal, setPayModal] = useState<{ periodKey: string } | null>(null);
  const [pauseModal, setPauseModal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900">Encaissement</h2>
        <span className="text-xs font-bold text-rouge">SUIVI MENSUEL</span>
      </div>

      <GlassCard className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">1. Base</label>
          <SelectField
            value={baseId}
            disabled={!!staffBaseId}
            onChange={(e) => {
              setBaseId(e.target.value);
              setNiveauId("");
              setSerieId("");
              setSelectedId(null);
            }}
            className="font-bold text-rouge bg-gray-50"
          >
            <option value="">-- Sélectionner --</option>
            {config?.bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div className={!baseId ? "opacity-50 pointer-events-none" : ""}>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">2. Classe</label>
          <SelectField
            value={niveauId}
            onChange={(e) => {
              setNiveauId(e.target.value);
              setSerieId("");
              setSelectedId(null);
            }}
            className="font-bold text-rouge"
          >
            <option value="">Choisir la base d'abord</option>
            {config?.niveaux.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </SelectField>
        </div>

        {niveau?.hasSeries && (
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">3. Série</label>
            <SelectField value={serieId} onChange={(e) => setSerieId(e.target.value)} className="bg-yellow-50 border-jaune font-bold text-rouge">
              <option value="">-- Série --</option>
              {niveau.series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          </div>
        )}

        <div className={!niveauId ? "opacity-50 pointer-events-none" : ""}>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">4. Élève</label>
          <InputField placeholder="Tapez un nom pour filtrer..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-2" />
          <SelectField value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value || null)} className="font-bold text-rouge">
            <option value="">Choisir la classe d'abord</option>
            {filtered.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom} {e.prenoms}
              </option>
            ))}
          </SelectField>
        </div>
      </GlassCard>

      {selected && grilleQuery.data && (
        <GlassCard className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-extrabold text-gray-900">
              {selected.nom} {selected.prenoms}
            </span>
            <span className="text-xs font-bold text-gray-400">{formatMoney(selected.montantMensuel)}/mois</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {grilleQuery.data.periods.map((p) => {
              const st = selected.statutParPeriode[p.key];
              const clickable = st.statut === "partiel" || st.statut === "impaye";
              return (
                <button
                  key={p.key}
                  disabled={!clickable}
                  onClick={() => setPayModal({ periodKey: p.key })}
                  className={`p-2 rounded-lg text-center text-[11px] font-bold border-2 border-transparent transition-all ${BADGE_CLASSES[st.statut]} ${clickable ? "cursor-pointer active:scale-95" : "cursor-default"}`}
                >
                  {abregerMois(p.label)}
                  {st.ajuste && "*"}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-gray-400 italic">Touche un mois en orange ou rouge pour encaisser. Gris = rien à payer (avant arrivée, pause, ou exonération). * = montant ajusté ponctuellement.</p>
          <button onClick={() => setPauseModal(true)} className="w-full text-center text-[11px] font-bold text-gray-500 mt-1 pt-3 border-t border-dashed border-gray-200">
            Marquer une pause ou un abandon sur plusieurs mois
          </button>
        </GlassCard>
      )}

      {payModal && selected && grilleQuery.data && (
        <PaymentModal
          studentId={selected.id}
          period={grilleQuery.data.periods.find((p) => p.key === payModal.periodKey)!}
          status={selected.statutParPeriode[payModal.periodKey]}
          onClose={() => setPayModal(null)}
        />
      )}
      {pauseModal && selected && grilleQuery.data && <PauseModal studentId={selected.id} periods={grilleQuery.data.periods} onClose={() => setPauseModal(false)} />}
    </div>
  );
}

function PaymentModal({ studentId, period, status, onClose }: { studentId: string; period: { key: string; label: string }; status: PeriodStatus; onClose: () => void }) {
  const queryClient = useQueryClient();
  const restant = Math.max(0, status.du - status.paye);
  const [montant, setMontant] = useState(String(restant));
  const [moyen, setMoyen] = useState<"Espèces" | "Wave" | "Orange Money">("Espèces");
  const [tierce, setTierce] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAjustement, setShowAjustement] = useState(false);
  const [ajustementMontant, setAjustementMontant] = useState("");
  const [ajustementMotif, setAjustementMotif] = useState("");
  const [ajustementError, setAjustementError] = useState<string | null>(null);
  const [ajustementSubmitting, setAjustementSubmitting] = useState(false);

  async function confirmerPaiement() {
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/staff/students/${studentId}/paiements`, { periodKey: period.key, montant: Number(montant), moyen, tierce: tierce || undefined });
      await queryClient.invalidateQueries({ queryKey: ["grille"] });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmerAjustement() {
    setAjustementError(null);
    setAjustementSubmitting(true);
    try {
      await api.post(`/staff/students/${studentId}/ajustements`, { periodKey: period.key, montantDu: Number(ajustementMontant), motif: ajustementMotif || undefined });
      await queryClient.invalidateQueries({ queryKey: ["grille"] });
      onClose();
    } catch (err) {
      setAjustementError(err instanceof ApiError ? err.message : "Erreur.");
    } finally {
      setAjustementSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h3 className="font-extrabold text-gray-900 text-lg mb-1">Encaisser un mois</h3>
      <p className="text-xs text-gray-500 mb-4">{period.label}</p>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Montant (reste dû : {restant} F)</label>
          <InputField type="number" value={montant} onChange={(e) => setMontant(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Moyen de paiement</label>
          <SelectField value={moyen} onChange={(e) => setMoyen(e.target.value as typeof moyen)}>
            <option value="Espèces">Espèces</option>
            <option value="Wave">Wave</option>
            <option value="Orange Money">Orange Money</option>
          </SelectField>
        </div>
        <InputField placeholder="Encaissé par un tiers (optionnel)..." value={tierce} onChange={(e) => setTierce(e.target.value)} className="text-xs italic" />
        {error && <ErrorBox>{error}</ErrorBox>}
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-lg">
          Annuler
        </button>
        <PrimaryButton onClick={confirmerPaiement} disabled={submitting} className="flex-1">
          Confirmer
        </PrimaryButton>
      </div>

      <button onClick={() => setShowAjustement((v) => !v)} className="w-full text-left text-[11px] font-bold text-orange-600 mt-4 pt-3 border-t border-dashed border-gray-200">
        Ajuster le montant dû de ce mois (Cas Social, correction...)
      </button>
      {showAjustement && (
        <div className="mt-3 bg-orange-50 p-3 rounded-xl border border-orange-200 space-y-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-1">Nouveau montant dû pour ce mois (0 = rien à payer)</label>
            <InputField type="number" value={ajustementMontant} onChange={(e) => setAjustementMontant(e.target.value)} className="border-orange-300" />
          </div>
          <InputField placeholder="Motif (optionnel)..." value={ajustementMotif} onChange={(e) => setAjustementMotif(e.target.value)} className="border-orange-300 text-xs italic" />
          {ajustementError && <ErrorBox>{ajustementError}</ErrorBox>}
          <button onClick={confirmerAjustement} disabled={ajustementSubmitting} className="w-full bg-orange-600 text-white font-bold py-2.5 rounded-lg text-sm disabled:opacity-50">
            Enregistrer l'ajustement
          </button>
        </div>
      )}
    </Modal>
  );
}

function PauseModal({ studentId, periods, onClose }: { studentId: string; periods: { key: string; label: string }[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [periodDebut, setPeriodDebut] = useState(periods[0]?.key ?? "");
  const [periodFin, setPeriodFin] = useState(periods[0]?.key ?? "");
  const [jusquaFin, setJusquaFin] = useState(false);
  const [motif, setMotif] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function appliquer() {
    setError(null);
    setSubmitting(true);
    try {
      const fin = jusquaFin ? periods[periods.length - 1].key : periodFin;
      await api.post(`/staff/students/${studentId}/ajustements/plage`, { periodDebut, periodFin: fin, montantDu: 0, motif: motif || undefined });
      await queryClient.invalidateQueries({ queryKey: ["grille"] });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h3 className="font-extrabold text-gray-900 text-lg mb-1">Marquer une pause / un abandon</h3>
      <p className="text-xs text-gray-500 mb-4">Met le montant dû à 0 F sur toute une plage de mois.</p>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Du mois</label>
          <SelectField value={periodDebut} onChange={(e) => setPeriodDebut(e.target.value)}>
            {periods.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </SelectField>
        </div>
        {!jusquaFin && (
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Au mois (inclus)</label>
            <SelectField value={periodFin} onChange={(e) => setPeriodFin(e.target.value)}>
              {periods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </SelectField>
          </div>
        )}
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600">
          <input type="checkbox" checked={jusquaFin} onChange={(e) => setJusquaFin(e.target.checked)} />
          Jusqu'à la fin de l'année scolaire (abandon)
        </label>
        <InputField placeholder="Motif (optionnel)..." value={motif} onChange={(e) => setMotif(e.target.value)} className="text-xs italic" />
        {error && <ErrorBox>{error}</ErrorBox>}
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 font-bold py-3 rounded-lg">
          Annuler
        </button>
        <button onClick={appliquer} disabled={submitting} className="flex-1 bg-gray-600 text-white font-bold py-3 rounded-lg disabled:opacity-50">
          Appliquer
        </button>
      </div>
    </Modal>
  );
}
