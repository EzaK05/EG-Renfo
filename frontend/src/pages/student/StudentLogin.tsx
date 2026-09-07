import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";
import { errorMessageFromApi, fieldInputClass, LoginCard } from "../LoginCard";

// Équivalent de verifierLoginEleve() côté GAS — espace élève (jamais implémenté en GAS, construit ici à neuf).
export function StudentLogin() {
  const [matriculeLycee, setMatriculeLycee] = useState("");
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
      await api.post("/auth/login/student", { matriculeLycee, pin });
      await refresh();
      navigate("/eleve");
    } catch (err) {
      setError(errorMessageFromApi(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginCard title="ESPACE ÉLÈVE" onSubmit={handleSubmit} submitting={submitting} error={error}>
      <input
        className={fieldInputClass()}
        placeholder="Matricule lycée"
        value={matriculeLycee}
        onChange={(e) => setMatriculeLycee(e.target.value)}
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
