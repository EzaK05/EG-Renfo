import type { NextFunction, Request, Response } from "express";
import { verifySession, type SessionKind, type SessionPayload } from "../lib/jwt.js";

const COOKIE_NAME = "eg_session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload;
    }
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;

// Lit le cookie de session sur toutes les requêtes, sans bloquer si absent —
// laisse chaque route décider si elle exige une session (via requireAuth ci-dessous).
export function attachSession(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const payload = verifySession(token);
    if (payload) req.session = payload;
  }
  next();
}

// Équivalent centralisé de _verifierToken() + les vérifications `if (session.base)` /
// `if (!session.canSeeStats)` répétées dans chaque fonction de Code.gs — ici, une seule
// couche middleware appliquée par route plutôt que dupliquée dans chaque handler.
export function requireAuth(...allowedKinds: SessionKind[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session) {
      return res.status(401).json({ error: "Session expirée. Reconnectez-vous." });
    }
    if (allowedKinds.length > 0 && !allowedKinds.includes(req.session.kind)) {
      return res.status(403).json({ error: "Accès non autorisé pour ce type de compte." });
    }
    next();
  };
}

// Réservé aux comptes staff avec canSeeStats (équivalent de verifierCodeSpecifique / session.canSeeStats).
export function requireStats(req: Request, res: Response, next: NextFunction) {
  if (req.session?.kind !== "staff" || !req.session.canSeeStats) {
    return res.status(403).json({ error: "Réservé à l'administration et aux superviseurs." });
  }
  next();
}
