import { Link } from "react-router-dom";

// Équivalent d'Accueil.html — jamais implémenté côté GAS (voir plan, Phase 0).
export function Landing() {
  const espaces = [
    { to: "/equipe/connexion", label: "Équipe", desc: "Inscriptions, encaissement, encadreurs, statistiques" },
    { to: "/eleve/connexion", label: "Élève", desc: "Profil, notes, moyennes, examens blancs" },
    { to: "/encadreur/connexion", label: "Encadreur", desc: "Séances, paie" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-rouge p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center space-y-6">
        <div>
          <h1 className="text-xl font-black text-rouge uppercase tracking-tight">Excellence Group</h1>
          <p className="text-jaune font-bold text-xs tracking-widest">CHOISIS TON ESPACE</p>
        </div>
        <div className="space-y-3">
          {espaces.map((e) => (
            <Link
              key={e.to}
              to={e.to}
              className="block rounded-lg border border-gray-200 p-4 text-left hover:border-rouge transition-colors"
            >
              <div className="font-extrabold text-gray-900">{e.label}</div>
              <div className="text-xs text-gray-500">{e.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
