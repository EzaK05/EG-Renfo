import argon2 from "argon2";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError, NotFoundError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStats } from "../middleware/auth.js";
import { generatePin } from "../services/pin.js";
import { nextIdInSequence } from "../services/sequentialId.js";

export const tutorsRouter = Router();
tutorsRouter.use(requireAuth("staff"), requireStats);

function serializeTutor(t: any) {
  return {
    id: t.displayId,
    nom: t.lastName,
    prenoms: t.firstName,
    telephone: t.phone ?? "",
    matieres: t.matieres.map((m: any) => m.matiere.name),
    bases: t.bases.map((b: any) => b.base.name),
    statut: t.status,
    categorieAnciennete: t.seniorityTier.name,
    tauxAnciennete: Number(t.seniorityTier.ratePerSession),
  };
}

const tutorInclude = {
  matieres: { include: { matiere: true } },
  bases: { include: { base: true } },
  seniorityTier: true,
} as const;

// ---- Créer un encadreur (équivalent creerEncadreur) ----
const createTutorSchema = z.object({
  nom: z.string().min(1),
  prenoms: z.string().min(1),
  telephone: z.string().optional(),
  categorieAncienneteId: z.string(),
  baseIds: z.array(z.string()).min(1),
  matiereIds: z.array(z.string()).default([]),
});

tutorsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createTutorSchema.parse(req.body);

    const tier = await prisma.seniorityTier.findUnique({ where: { id: data.categorieAncienneteId } });
    if (!tier) throw new AppError("Catégorie d'ancienneté invalide.");

    const existingIds = (await prisma.tutor.findMany({ where: { displayId: { startsWith: "ENC" } }, select: { displayId: true } })).map(
      (t) => t.displayId
    );
    const displayId = nextIdInSequence(existingIds, "ENC");
    const pin = generatePin(4);
    const pinHash = await argon2.hash(pin);

    const tutor = await prisma.tutor.create({
      data: {
        firstName: data.prenoms,
        lastName: data.nom.toUpperCase(),
        phone: data.telephone || null,
        seniorityTierId: tier.id,
        pinHash,
        displayId,
        bases: { create: data.baseIds.map((baseId) => ({ baseId })) },
        matieres: { create: data.matiereIds.map((matiereId) => ({ matiereId })) },
      },
    });

    res.status(201).json({ id: tutor.displayId, pin, nom: `${tutor.lastName} ${tutor.firstName}` });
  })
);

// ---- Liste des encadreurs (équivalent getListeEncadreurs) ----
tutorsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const tutors = await prisma.tutor.findMany({ include: tutorInclude, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
    res.json(tutors.map(serializeTutor));
  })
);

// ---- Changer l'ancienneté (équivalent modifierCategorieAncienneteEncadreur) ----
tutorsRouter.patch(
  "/:displayId/anciennete",
  asyncHandler(async (req, res) => {
    const { categorieAncienneteId } = z.object({ categorieAncienneteId: z.string() }).parse(req.body);
    const tier = await prisma.seniorityTier.findUnique({ where: { id: categorieAncienneteId } });
    if (!tier) throw new AppError("Catégorie d'ancienneté invalide.");

    const tutor = await prisma.tutor.findUnique({ where: { displayId: req.params.displayId } });
    if (!tutor) throw new NotFoundError("Encadreur introuvable.");

    await prisma.tutor.update({ where: { id: tutor.id }, data: { seniorityTierId: tier.id } });
    res.json({ message: "Ancienneté mise à jour." });
  })
);

// ---- Activer/désactiver (équivalent modifierStatutEncadreur) ----
tutorsRouter.patch(
  "/:displayId/statut",
  asyncHandler(async (req, res) => {
    const { statut } = z.object({ statut: z.enum(["ACTIF", "INACTIF"]) }).parse(req.body);
    const tutor = await prisma.tutor.findUnique({ where: { displayId: req.params.displayId } });
    if (!tutor) throw new NotFoundError("Encadreur introuvable.");

    await prisma.tutor.update({ where: { id: tutor.id }, data: { status: statut } });
    res.json({ message: "Statut mis à jour." });
  })
);
