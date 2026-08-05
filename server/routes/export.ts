import { Router } from "express";
import fs from "fs";
import path from "path";
import { readDB } from "../db";
import { Camp } from "../types";
import { authMiddleware, requireMinRole } from "../auth";
import { buildExportHtml } from "./exportHtmlTemplate";

const router = Router();

// Zur Laufzeit einmalig eingelesen (nicht bei jedem Request), da der Inhalt
// sich nur bei einem Server-Neustart (= neuem Deploy) ändern kann. Pfad relativ
// zu process.cwd() (wie auch db.json in db.ts/firebase.ts), NICHT relativ zur
// kompilierten Datei: der Produktions-Build bündelt server.ts per esbuild in
// eine einzelne dist/server.cjs, unter der export.client.js nicht mitläge.
const CLIENT_SCRIPT_PATH = path.join(process.cwd(), "server", "routes", "export.client.js");
const clientScript = fs.readFileSync(CLIENT_SCRIPT_PATH, "utf-8");

// Export enthält den kompletten Dienstplan inkl. Namen -> mind. Bereichsleiter-Rechte nötig.
router.get("/export-html", authMiddleware, requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const activeCampId = db.activeCampId || "camp-2026";
  const activeCamp: Camp = (db.camps || []).find((c) => c.id === activeCampId) || { id: "camp-2026", year: 2026, start_date: "2026-05-23", end_date: "2026-05-25", title: "Pfingstlager 2026" };

  const filteredShifts = db.shifts.filter((s) => s.camp_id === activeCampId);
  const campShiftIds = new Set(filteredShifts.map((s) => s.id));
  const filteredAssignments = db.assignments.filter((a) => campShiftIds.has(a.shift_id));

  const addDaysString = (dateStr: string, days: number): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const formatDateShort = (dateStr: string): string => {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1];
    return `${day}. ${month}`;
  };

  const html = buildExportHtml({ activeCamp, db, filteredShifts, filteredAssignments, clientScript });

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Content-Disposition", `attachment; filename=dienstplan_${activeCamp.title.toLowerCase().replace(/\s+/g, '_')}.html`);
  res.send(html);
});

export default router;
