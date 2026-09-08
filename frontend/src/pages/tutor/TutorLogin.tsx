import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";
import { errorMessageFromApi, fieldInputClass, LoginCard } from "../LoginCard";

// Équivalent de verifierLoginEncadreur() côté GAS — espace encadreur (jamais implémenté en GAS, construit ici à neuf).
export function TutorLogin() {
  const [idEncadreur, setIdEncadreur] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/login/tutor", { idEncadreur, pin });
      await refresh();
      navigate("/encadreur");
    } catch (err) {
      setError(errorMessageFromApi(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginCard title="ESPACE ENCADREUR" onSubmit={handleSubmit} submitting={submitting} error={error}>
      <input
        className={fieldInputClass()}
        placeholder="Identifiant encadreur"
        value={idEncadreur}
        onChange={(e) => setIdEncadreur(e.target.value)}
        autoComplete="username"
      />
      <input
        className={fieldInputClass()}
        placeholder="Code PIN"
        type="password"
        inputMode="numeric"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        autoComplete="current-password"
      />
    </LoginCard>
  );
}
