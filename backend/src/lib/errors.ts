// Erreur métier avec statut HTTP explicite — les messages sont volontairement les mêmes que dans
// Code.gs (ex: "Session expirée. Reconnectez-vous.") pour préserver le comportement observé par les
// utilisateurs pendant la migration (voir Phase 3 du plan : parité comportementale avant bascule).
export class AppError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Session expirée. Reconnectez-vous.") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}
