import { useAuth } from "../../auth/AuthContext";
import { HomeShell } from "../HomeShell";

export function StaffHome() {
  const { session } = useAuth();
  const displayName = session?.kind === "staff" ? session.displayName : "";
  return <HomeShell title={`Bienvenue, ${displayName}`} subtitle="Espace équipe" />;
}
