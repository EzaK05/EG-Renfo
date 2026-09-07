import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { attachSession } from "./middleware/auth.js";
import { authRouter } from "./routes/auth.js";

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(attachSession);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);

// TODO (Phase 3) : routes élèves/encadreurs/paiements/séances/dashboard, dans l'ordre défini
// par le plan de migration (espace élève, puis encadreur, puis staff/admin en dernier).

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur." });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API démarrée sur http://localhost:${port}`);
});
