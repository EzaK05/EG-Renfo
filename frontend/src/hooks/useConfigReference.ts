import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ConfigReference {
  bases: { id: string; name: string; code: string }[];
  niveaux: { id: string; name: string; code: string; hasSeries: boolean; isExamClass: boolean; series: { id: string; name: string }[] }[];
  tariffs: { niveauId: string; serieId: string | null; baseId: string | null; monthlyAmount: number; registrationFee: number }[];
  allowlist: { baseId: string; niveauId: string; serieId: string | null }[];
  periods: { key: string; label: string }[];
  currentPeriodKey: string;
}

export function useConfigReference() {
  return useQuery({
    queryKey: ["config", "reference"],
    queryFn: () => api.get<ConfigReference>("/config/reference"),
    staleTime: 5 * 60 * 1000,
  });
}

// Remplace _baseAutorisePourNiveau() côté frontend : la combinaison est-elle dans l'allowlist ?
export function isAllowed(config: ConfigReference, baseId: string, niveauId: string, serieId: string | null): boolean {
  return config.allowlist.some((a) => a.baseId === baseId && a.niveauId === niveauId && a.serieId === serieId);
}

export function findTariff(config: ConfigReference, niveauId: string, serieId: string | null, baseId: string) {
  const specific = config.tariffs.find((t) => t.niveauId === niveauId && t.serieId === serieId && t.baseId === baseId);
  if (specific) return specific;
  return config.tariffs.find((t) => t.niveauId === niveauId && t.serieId === serieId && t.baseId === null);
}
