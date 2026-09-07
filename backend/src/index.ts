import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { ZodError } from "zod";
import { AppError } from "./lib/errors.js";
import { attachSession } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";
import { configRouter } from "./routes/config.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { payrollRouter } from "./routes/payroll.js";
import { sessionsRouter } from "./routes/sessions.js";
import { studentSelfRouter } from "./routes/studentSelf.js";
import { studentsRouter } from "./routes/students.js";
import { tutorsRouter } from "./routes/tutors.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(attachSession);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/config", configRouter);
app.use("/api/staff/students", studentsRouter);
app.use("/api/staff/tutors", tutorsRouter);
app.use("/api/staff/dashboard", dashboardRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/sessions", sessionsRouter);
app.use("/api/eleve", studentSelfRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.issues[0]?.message ?? "Données invalides." });
  }
  console.error(err);
  res.status(500).json({ error: "Erreur serveur." });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API démarrée sur http://localhost:${port}`);
});
