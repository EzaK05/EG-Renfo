import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GlassCard } from "../../components/ui";
import { api } from "../../lib/api";
import { formatMoney } from "../../lib/format";

interface Stats {
  totalEleves: number;
  totalEncaisse: number;
  repartitionBase: { base: string; count: number }[];
  repartitionNiveau: { niveau: string; count: number }[];
  recouvrementParPeriode: { periodeKey: string; periode: string; du: number; encaisse: number }[];
  periodeCouranteKey: string;
}

interface RecouvrementDetail {
  periodeLabel: string;
  parBase: { base: string; attendu: number; encaisse: number }[];
  parNiveau: { niveau: string; attendu: number; encaisse: number }[];
  totalAttendu: number;
  totalEncaisse: number;
}

function Bar({ label, right, pct, color }: { label: string; right: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1">
        <span className="text-gray-700">{label}</span>
        <span className="text-rouge">{right}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function abregerMois(label: string): string {
  const motPrincipal = label.split(" ")[0];
  return motPrincipal.split("-").map((m) => m.slice(0, 3)).join("-");
}

function EvolutionChart({ data }: { data: Stats["recouvrementParPeriode"] }) {
  const w = 320,
    h = 150,
    padL = 8,
    padR = 8,
    padT = 10,
    padB = 24;
  const innerW = w - padL - padR,
    innerH = h - padT - padB;
  const maxVal = Math.max(1, ...data.map((r) => Math.max(r.encaisse, r.du)));
  const n = data.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const xAt = (i: number) => padL + i * stepX;
  const yAt = (val: number) => padT + innerH - (val / maxVal) * innerH;

  const pointsEncaisse = data.map((r, i) => `${xAt(i)},${yAt(r.encaisse)}`).join(" ");
  const pointsAttendu = data.map((r, i) => `${xAt(i)},${yAt(r.du)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <polyline points={pointsAttendu} fill="none" stroke="#d1d5db" strokeWidth={2} strokeDasharray="4,3" />
        <polyline points={pointsEncaisse} fill="none" stroke="#16a34a" strokeWidth={2.5} />
        {data.map((r, i) => (
          <circle key={r.periodeKey} cx={xAt(i)} cy={yAt(r.encaisse)} r={3} fill="#16a34a" />
        ))}
        {data.map((r, i) => (
          <text key={r.periodeKey} x={xAt(i)} y={h - 6} fontSize={9} textAnchor="middle" fill="#9ca3af">
            {abregerMois(r.periode)}
          </text>
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-1 justify-center text-[10px] font-bold text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 border-t-2 border-green-600 inline-block" /> Encaissé
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 border-t-2 border-dashed border-gray-300 inline-block" /> Attendu
        </span>
      </div>
    </div>
  );
}

export function DashboardView() {
  const statsQuery = useQuery({ queryKey: ["dashboard", "stats"], queryFn: () => api.get<Stats>("/staff/dashboard/stats") });
  const [periodeKey, setPeriodeKey] = useState<string | null>(null);
  const [dateFiltre, setDateFiltre] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (statsQuery.data && !periodeKey) setPeriodeKey(statsQuery.data.periodeCouranteKey);
  }, [statsQuery.data, periodeKey]);

  const recouvrementQuery = useQuery({
    queryKey: ["dashboard", "recouvrement", periodeKey],
    queryFn: () => api.get<RecouvrementDetail>(`/staff/dashboard/recouvrement?periode=${periodeKey}`),
    enabled: !!periodeKey,
  });

  const jourQuery = useQuery({
    queryKey: ["dashboard", "jour", dateFiltre],
    queryFn: () => api.get<{ total: number }>(`/staff/dashboard/jour?date=${dateFiltre}`),
  });

  if (statsQuery.isLoading) return <p className="text-center text-gray-400 italic py-8">Chargement...</p>;
  if (statsQuery.isError) return <p className="text-center text-red-500 text-sm">Erreur de chargement du tableau de bord.</p>;
  const stats = statsQuery.data!;

  function changerPeriode(delta: number) {
    if (!periodeKey) return;
    const idx = stats.recouvrementParPeriode.findIndex((r) => r.periodeKey === periodeKey);
    const next = stats.recouvrementParPeriode[idx + delta];
    if (next) setPeriodeKey(next.periodeKey);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-gray-900">Tableau de bord</h2>
        <span className="text-xs font-bold text-rouge">TEMPS RÉEL</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="text-center border-l-4 border-l-blue-500">
          <div className="text-[10px] font-bold text-gray-400 uppercase">Total Élèves</div>
          <div className="text-2xl font-black text-gray-800 mt-1">{stats.totalEleves}</div>
        </GlassCard>
        <GlassCard className="text-center border-l-4 border-l-green-500">
          <div className="text-[10px] font-bold text-gray-400 uppercase">Total Encaissé</div>
          <div className="text-xl font-black text-green-600 mt-1">{formatMoney(stats.totalEncaisse)}</div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Effectifs par base</div>
        <div className="space-y-3">
          {stats.repartitionBase.map((b) => (
            <Bar key={b.base} label={b.base} right={`${b.count} élève(s)`} pct={stats.totalEleves > 0 ? Math.round((b.count / stats.totalEleves) * 100) : 0} color="bg-jaune" />
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Effectifs par niveau</div>
        <div className="space-y-3">
          {stats.repartitionNiveau
            .filter((n) => n.count > 0)
            .map((n) => (
              <Bar key={n.niveau} label={n.niveau} right={`${n.count} élève(s)`} pct={stats.totalEleves > 0 ? Math.round((n.count / stats.totalEleves) * 100) : 0} color="bg-rouge" />
            ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Recouvrement du mois</div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <button onClick={() => changerPeriode(-1)} className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 font-bold">
            ‹
          </button>
          <select value={periodeKey ?? ""} onChange={(e) => setPeriodeKey(e.target.value)} className="border border-gray-200 rounded-lg p-2 text-center font-bold text-rouge flex-1">
            {stats.recouvrementParPeriode.map((r) => (
              <option key={r.periodeKey} value={r.periodeKey}>
                {r.periode}
              </option>
            ))}
          </select>
          <button onClick={() => changerPeriode(1)} className="w-9 h-9 rounded-lg border border-gray-200 text-gray-500 font-bold">
            ›
          </button>
        </div>

        {recouvrementQuery.data ? (
          <>
            <div className="text-center mb-4">
              <div className="text-2xl font-black text-gray-800">{formatMoney(recouvrementQuery.data.totalEncaisse)}</div>
              <div className="text-xs text-gray-400 font-bold">
                sur {formatMoney(recouvrementQuery.data.totalAttendu)} attendus (
                {recouvrementQuery.data.totalAttendu > 0 ? Math.min(100, Math.round((recouvrementQuery.data.totalEncaisse / recouvrementQuery.data.totalAttendu) * 100)) : 0}%)
              </div>
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Par base</div>
            <div className="space-y-2 mb-4">
              {recouvrementQuery.data.parBase
                .filter((b) => b.attendu > 0 || b.encaisse > 0)
                .map((b) => (
                  <Bar key={b.base} label={b.base} right={`${formatMoney(b.encaisse)} / ${formatMoney(b.attendu)}`} pct={b.attendu > 0 ? Math.min(100, Math.round((b.encaisse / b.attendu) * 100)) : 0} color="bg-jaune" />
                ))}
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Par classe</div>
            <div className="space-y-2">
              {recouvrementQuery.data.parNiveau
                .filter((n) => n.attendu > 0 || n.encaisse > 0)
                .map((n) => (
                  <Bar key={n.niveau} label={n.niveau} right={`${formatMoney(n.encaisse)} / ${formatMoney(n.attendu)}`} pct={n.attendu > 0 ? Math.min(100, Math.round((n.encaisse / n.attendu) * 100)) : 0} color="bg-rouge" />
                ))}
            </div>
          </>
        ) : (
          <p className="text-center text-sm text-gray-400 italic py-4">Chargement...</p>
        )}
      </GlassCard>

      <GlassCard>
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Évolution des recettes sur l'année</div>
        <EvolutionChart data={stats.recouvrementParPeriode} />
      </GlassCard>

      <GlassCard className="text-center border-l-4 border-l-purple-500">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recettes du jour</div>
          <input type="date" value={dateFiltre} onChange={(e) => setDateFiltre(e.target.value)} className="text-xs p-1 border rounded text-gray-700 font-bold bg-white outline-none" />
        </div>
        <div className="text-3xl font-black text-purple-600">{jourQuery.data ? formatMoney(jourQuery.data.total) : "..."}</div>
      </GlassCard>
    </div>
  );
}
