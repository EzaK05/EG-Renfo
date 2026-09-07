import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";

export function HomeShell({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen">
      <header className="bg-white p-4 border-b-2 border-jaune sticky top-0 flex justify-between items-center">
        <span className="text-sm font-extrabold text-rouge tracking-tight">
          Excellence Group
          <br />
          {subtitle}
        </span>
        <button onClick={() => logout()} className="text-[10px] bg-gray-100 px-3 py-1 rounded-full font-bold text-gray-600">
          Déconnexion
        </button>
      </header>
      <main className="p-4 max-w-xl mx-auto space-y-4">
        <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
        {children ?? <p className="text-sm text-gray-400 italic">À construire — voir Phase 3 du plan de migration.</p>}
      </main>
    </div>
  );
}
