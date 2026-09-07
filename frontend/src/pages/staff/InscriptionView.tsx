import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ErrorBox, GlassCard, InputField, PrimaryButton, SectionHeader, SelectField } from "../../components/ui";
import { findTariff, isAllowed, useConfigReference } from "../../hooks/useConfigReference";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../auth/AuthContext";

const ECOLE_AUTRE = "__AUTRE__";

export function InscriptionView() {
  const configQuery = useConfigReference();
  const schoolsQuery = useQuery({ queryKey: ["config", "schools"], queryFn: () => api.get<string[]>("/config/schools") });
  const { session } = useAuth();
  const staffBaseId = session?.kind === "staff" ? session.baseId : null;

  const [baseId, setBaseId] = useState(staffBaseId ?? "");
  const [niveauId, setNiveauId] = useState("");
  const [serieId, setSerieId] = useState("");
  const [nom, setNom] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [sexe, setSexe] = useState<"M" | "F">("M");
  const [ecole, setEcole] = useState("");
  const [ecoleAutre, setEcoleAutre] = useState("");
  const [matriculeLycee, setMatriculeLycee] = useState("");
  const [telEleve, setTelEleve] = useState("");
  const [telParent, setTelParent] = useState("");
  const [isSocial, setIsSocial] = useState(false);
  const [montantMensuelSocial, setMontantMensuelSocial] = useState("");
  const [fraisInscriptionSocial, setFraisInscriptionSocial] = useState("");
  const [moisArrivee, setMoisArrivee] = useState("");
  const [moyenInscription, setMoyenInscription] = useState<"Espèces" | "Wave" | "Orange Money">("Espèces");
  const [tierceInscription, setTierceInscription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ id: string; nom: string; pin: string; montantMensuel: number } | null>(null);

  const config = configQuery.data;
  const niveau = useMemo(() => config?.niveaux.find((n) => n.id === niveauId), [config, niveauId]);
  const serie = niveau?.hasSeries ? niveau.series.find((s) => s.id === serieId) : undefined;
  const alerteAllowlist = config && baseId && niveauId ? !isAllowed(config, baseId, niveauId, niveau?.hasSeries ? serieId || null : null) : false;
  const tarif = config && niveauId && baseId ? findTariff(config, niveauId, niveau?.hasSeries ? serieId || null : null, baseId) : undefined;

  function resetForm() {
    setNom("");
    setPrenoms("");
    setEcole("");
    setEcoleAutre("");
    setMatriculeLycee("");
    setTelEleve("");
    setTelParent("");
    setIsSocial(false);
    setMontantMensuelSocial("");
    setFraisInscriptionSocial("");
    setMoisArrivee("");
    setTierceInscription("");
    setNiveauId("");
    setSerieId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!baseId || !niveauId || !matriculeLycee || !moisArrivee) {
      setError("Merci de compléter tous les champs obligatoires.");
      return;
    }
    if (niveau?.hasSeries && !serieId) {
      setError("Série requise pour ce niveau.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.post<{ id: string; nom: string; pin: string; montantMensuel: number }>("/staff/students", {
        baseId,
        niveauId,
        serieId: niveau?.hasSeries ? serieId : undefined,
        nom,
        prenoms,
        sexe,
        ecole: ecole === ECOLE_AUTRE ? "Autre" : ecole,
        ecoleAutre: ecole === ECOLE_AUTRE ? ecoleAutre : undefined,
        matriculeLycee,
        telEleve,
        telParent,
        isSocial,
        montantMensuelSocial: isSocial && montantMensuelSocial ? Number(montantMensuelSocial) : undefined,
        fraisInscriptionSocial: isSocial && fraisInscriptionSocial ? Number(fraisInscriptionSocial) : undefined,
        moisArrivee,
        moyenInscription,
        tierceInscription: tierceInscription || undefined,
      });
      setSuccess(result);
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue.");
    } finally {
      setSubmitting(false);
    }
  }

  if (configQuery.isLoading) return <p className="text-center text-gray-400 italic py-8">Chargement...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900">Inscription</h2>
        <span className="text-xs font-bold text-jaune">NOUVEAU DOSSIER</span>
      </div>

      {success && (
        <GlassCard className="border-l-4 border-l-green-500">
          <p className="font-bold text-green-700">Inscription réussie — {success.nom}</p>
          <p className="text-sm text-gray-600 mt-1">
            ID : <span className="font-mono font-bold">{success.id}</span> · Code PIN : <span className="font-mono font-bold">{success.pin}</span> · Montant mensuel :{" "}
            {success.montantMensuel} F
          </p>
          <p className="text-xs text-gray-400 mt-1">Communique l'ID et le PIN à l'élève pour qu'il/elle accède à son espace.</p>
        </GlassCard>
      )}

      <form onSubmit={handleSubmit}>
        <GlassCard className="space-y-4">
          <SectionHeader>Identité</SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <InputField placeholder="Nom" required value={nom} onChange={(e) => setNom(e.target.value)} />
            <InputField placeholder="Prénoms" required value={prenoms} onChange={(e) => setPrenoms(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField value={sexe} onChange={(e) => setSexe(e.target.value as "M" | "F")}>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </SelectField>
            <InputField placeholder="Matricule lycée" required value={matriculeLycee} onChange={(e) => setMatriculeLycee(e.target.value)} />
          </div>

          <div>
            <SelectField value={ecole} onChange={(e) => setEcole(e.target.value)} required>
              <option value="" disabled>
                -- École --
              </option>
              {schoolsQuery.data?.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={ECOLE_AUTRE}>Autre (préciser)</option>
            </SelectField>
            {ecole === ECOLE_AUTRE && (
              <InputField className="mt-2" placeholder="Nom de l'école" required value={ecoleAutre} onChange={(e) => setEcoleAutre(e.target.value)} />
            )}
          </div>

          <SectionHeader>Base &amp; Niveau</SectionHeader>
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              value={baseId}
              disabled={!!staffBaseId}
              onChange={(e) => {
                setBaseId(e.target.value);
                setNiveauId("");
                setSerieId("");
              }}
              required
              className="font-bold text-rouge"
            >
              <option value="" disabled>
                -- Base --
              </option>
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
              required
              className="font-bold text-rouge"
            >
              <option value="" disabled>
                -- Niveau --
              </option>
              {config?.niveaux.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </SelectField>
          </div>
          {niveau?.hasSeries && (
            <SelectField value={serieId} onChange={(e) => setSerieId(e.target.value)} required className="bg-yellow-50 border-jaune font-bold text-rouge">
              <option value="" disabled>
                -- Série --
              </option>
              {niveau.series.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectField>
          )}
          {alerteAllowlist && <ErrorBox>⚠️ Cette base n'accueille pas ce profil ({niveau?.name}{serie ? " " + serie.name : ""}).</ErrorBox>}

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Mois d'arrivée (1er mois de cours suivi)</label>
            <SelectField value={moisArrivee} onChange={(e) => setMoisArrivee(e.target.value)} required>
              <option value="" disabled>
                -- Mois d'arrivée --
              </option>
              {config?.periods.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </SelectField>
          </div>

          <SectionHeader>Contacts</SectionHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm">WhatsApp Élève</label>
              <InputField type="tel" value={telEleve} onChange={(e) => setTelEleve(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">WhatsApp Parent</label>
              <InputField type="tel" value={telParent} onChange={(e) => setTelParent(e.target.value)} />
            </div>
          </div>

          <div className="bg-orange-50 p-3 rounded-xl border border-orange-200">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" checked={isSocial} onChange={(e) => setIsSocial(e.target.checked)} className="w-5 h-5 text-orange-600 rounded" />
              <span className="text-sm font-bold text-orange-800">Cas Social</span>
            </label>
            {isSocial && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Frais d'inscription (si différent de {tarif?.registrationFee ?? "-"} FCFA)</label>
                  <InputField type="number" placeholder={String(tarif?.registrationFee ?? "")} value={fraisInscriptionSocial} onChange={(e) => setFraisInscriptionSocial(e.target.value)} className="border-orange-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Montant mensuel (si différent du barème : {tarif?.monthlyAmount ?? "-"} FCFA)</label>
                  <InputField type="number" placeholder={String(tarif?.monthlyAmount ?? "")} value={montantMensuelSocial} onChange={(e) => setMontantMensuelSocial(e.target.value)} className="border-orange-300" />
                </div>
              </div>
            )}
          </div>

          <SectionHeader>Paiement du frais d'inscription</SectionHeader>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <SelectField value={moyenInscription} onChange={(e) => setMoyenInscription(e.target.value as typeof moyenInscription)}>
                <option value="Espèces">Espèces</option>
                <option value="Wave">Wave</option>
                <option value="Orange Money">Orange Money</option>
              </SelectField>
              <InputField placeholder="Encaissé par un tiers..." value={tierceInscription} onChange={(e) => setTierceInscription(e.target.value)} className="text-xs italic" />
            </div>
          </div>

          {error && <ErrorBox>{error}</ErrorBox>}

          <PrimaryButton type="submit" disabled={submitting} className="w-full">
            {submitting ? "Enregistrement..." : "Valider l'Inscription"}
          </PrimaryButton>
        </GlassCard>
      </form>
    </div>
  );
}
