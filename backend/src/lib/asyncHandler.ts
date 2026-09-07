import type { NextFunction, Request, RequestHandler, Response } from "express";

// Express 4 n'attrape pas automatiquement les rejets de Promise dans les handlers async —
// évite un try/catch répété dans chaque route (toutes nos routes sont async à cause de Prisma).
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
