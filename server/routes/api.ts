import { Router } from "express";
import { recordApiHit } from "../firebase";

import peopleRouter from "./people";
import shiftsRouter from "./shifts";
import campsRouter from "./camps";
import programRouter from "./program";
import systemRouter from "./system";

const router = Router();

// Middleware to log client API queries in-memory for server statistics
router.use((req, res, next) => {
  if (req.path !== "/stats" && req.path !== "/sync-check") {
    recordApiHit();
  }
  next();
});

// Register domain sub-routers
router.use(peopleRouter);
router.use(shiftsRouter);
router.use(campsRouter);
router.use(programRouter);
router.use(systemRouter);

export default router;
