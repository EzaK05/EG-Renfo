import argon2 from "argon2";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signSession } from "../lib/jwt.js";
import { SESSION_COOKIE_NAME } from "../middleware/auth.js";

export const authRouter = Router();

const isProd = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: isProd,
  maxAge: 8 * 60 * 60 * 1000, // 8h, aligné sur signSession()
};

// ---- Staff (équivalent verifierLogin) ----
const staffLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/login/staff", async (req, res) => {
  const parsed = staffLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Identifiant et mot de passe requis." });

  const user = await prisma.userAccount.findUnique({ where: { username: parsed.data.username.toLowerCase().trim() } });
  if (!user || !user.active || !(await argon2.verify(user.passwordHash, parsed.data.password))) {
    return res.status(401).json({ error: "Identifiant ou mot de passe incorrect." });
  }

  const token = signSession({
    kind: "staff",
    sub: user.id,
    role: user.role,
    baseId: user.baseId,
    canSeeStats: user.canSeeStats,
    displayName: user.displayName,
  });
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);
  res.json({
    displayName: user.displayName,
    role: user.role,
    baseId: user.baseId,
    canSeeStats: user.canSeeStats,
  });
});

// ---- Élève (équivalent verifierLoginEleve) ----
const studentLoginSchema = z.object({
  matriculeLycee: z.string().min(1),
  pin: z.string().min(1),
});

authRouter.post("/login/student", async (req, res) => {
  const parsed = studentLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Matricule et code requis." });

  const student = await prisma.student.findFirst({
    where: { matriculeLycee: parsed.data.matriculeLycee.trim().toUpperCase() },
  });
  if (!student || !(await argon2.verify(student.pinHash, parsed.data.pin))) {
    return res.status(401).json({ error: "Matricule ou code incorrect." });
  }

  const token = signSession({
    kind: "student",
    sub: student.id,
    baseId: student.baseId,
    niveauId: student.niveauId,
    serieId: student.serieId,
  });
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);
  res.json({ id: student.id, nom: student.lastName, prenoms: student.firstName });
});

// ---- Encadreur (équivalent verifierLoginEncadreur) ----
const tutorLoginSchema = z.object({
  idEncadreur: z.string().min(1),
  pin: z.string().min(1),
});

authRouter.post("/login/tutor", async (req, res) => {
  const parsed = tutorLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Identifiant et code requis." });

  const tutor = await prisma.tutor.findFirst({
    where: { displayId: parsed.data.idEncadreur.trim().toUpperCase() },
  });
  if (!tutor || !(await argon2.verify(tutor.pinHash, parsed.data.pin))) {
    return res.status(401).json({ error: "Identifiant ou code incorrect." });
  }
  if (tutor.status !== "ACTIF") {
    return res.status(403).json({ error: "Compte inactif." });
  }

  const token = signSession({ kind: "tutor", sub: tutor.id });
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions);
  res.json({ id: tutor.id, nom: tutor.lastName, prenoms: tutor.firstName });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME);
  res.status(204).end();
});

authRouter.get("/me", (req, res) => {
  if (!req.session) return res.status(401).json({ error: "Session expirée." });
  res.json(req.session);
});
