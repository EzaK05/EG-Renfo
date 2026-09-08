import { PrismaClient } from "@prisma/client";

// Singleton — évite d'ouvrir une nouvelle connexion à chaque hot-reload en dev (tsx watch).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
