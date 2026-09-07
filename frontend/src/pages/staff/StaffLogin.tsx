import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { api } from "../../lib/api";
import { errorMessageFromApi, fieldInputClass, LoginCard } from "../LoginCard";

// Équivalent de verifierLogin() côté GAS — espace staff/admin.
export function StaffLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/auth/login/staff", { username, password });
      await refresh();
      navigate("/equipe");
    } catch (err) {
      setError(errorMessageFromApi(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginCard title="ESPACE ÉQUIPE" onSubmit={handleSubmit} submitting={submitting} error={error}>
      <input
        className={fieldInputClass()}
        placeholder="Identifiant"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        autoComplete="username"
      />
      <input
        className={fieldInputClass()}
        placeholder="Mot de passe"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
    </LoginCard>
  );
}
