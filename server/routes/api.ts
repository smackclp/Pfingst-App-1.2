import { Router } from "express";
import { recordApiHit } from "../firebase";
import { authMiddleware } from "../auth";
import { idempotencyMiddleware } from "../idempotency";

import authRouter from "./auth";
import peopleRouter from "./people";
import shiftsRouter from "./shifts";
import campsRouter from "./camps";
import programRouter from "./program";
import systemRouter from "./system";
import notificationsRouter from "./notifications";

const router = Router();

// Middleware to log client API queries in-memory for server statistics
router.use((req, res, next) => {
  if (req.path !== "/stats" && req.path !== "/sync-check") {
    recordApiHit();
  }
  next();
});

// Öffentliche Auth-Routen (Login-Verzeichnis, Login, Logout, eigenes Profil).
// MUSS vor dem globalen authMiddleware-Gate stehen.
router.use(authRouter);

// Ab hier ist für ALLE Routen eine gültige Session erforderlich.
router.use(authMiddleware);

// Verhindert doppelte Verarbeitung erneut gesendeter Offline-Warteschlangen-
// Aktionen (siehe server/idempotency.ts). Betrifft nur Requests mit dem
// X-Idempotency-Key-Header - normale Anfragen bleiben unverändert.
router.use(idempotencyMiddleware);

// Register domain sub-routers
router.use(peopleRouter);
router.use(shiftsRouter);
router.use(campsRouter);
router.use(programRouter);
router.use(systemRouter);
router.use(notificationsRouter);

export default router;
