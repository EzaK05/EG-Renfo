import jwt from "jsonwebtoken";

// Remplace les tokens UUID + CacheService (2h) de l'app GAS actuelle par un JWT signé,
// stocké côté client dans un cookie httpOnly (voir routes/auth.ts).
export type SessionKind = "staff" | "student" | "tutor";

export interface StaffSessionPayload {
  kind: "staff";
  sub: string; // UserAccount.id
  role: "ADMIN" | "SUPERVISOR" | "STAFF";
  baseId: string | null;
  canSeeStats: boolean;
  displayName: string;
}

export interface StudentSessionPayload {
  kind: "student";
  sub: string; // Student.id
  baseId: string;
  niveauId: string;
  serieId: string | null;
}

export interface TutorSessionPayload {
  kind: "tutor";
  sub: string; // Tutor.id
}

export type SessionPayload = StaffSessionPayload | StudentSessionPayload | TutorSessionPayload;

const SESSION_TTL = "8h";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "change-me-generate-a-real-random-secret") {
    throw new Error(
      "SESSION_SECRET manquant ou laissé à sa valeur par défaut — génère une vraie valeur dans backend/.env avant de démarrer le serveur."
    );
  }
  return secret;
}

export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: SESSION_TTL });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, getSecret()) as SessionPayload;
  } catch {
    return null;
  }
}
