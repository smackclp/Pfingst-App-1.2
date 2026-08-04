import { Router } from "express";
import { readDB, writeDB } from "../db";
import { Camp } from "../types";
import { requireRole } from "../auth";

const router = Router();

const pfingstenDates: Record<number, { start_date: string; end_date: string; title: string }> = {
  2026: { start_date: "2026-05-23", end_date: "2026-05-25", title: "Pfingstlager 2026" },
  2027: { start_date: "2027-05-15", end_date: "2027-05-17", title: "Pfingstlager 2027" },
  2028: { start_date: "2028-06-03", end_date: "2028-06-05", title: "Pfingstlager 2028" },
  2029: { start_date: "2029-05-19", end_date: "2029-05-21", title: "Pfingstlager 2029" },
  2030: { start_date: "2030-06-08", end_date: "2030-06-10", title: "Pfingstlager 2030" },
  2031: { start_date: "2031-05-31", end_date: "2031-06-02", title: "Pfingstlager 2031" },
  2032: { start_date: "2032-05-15", end_date: "2032-05-17", title: "Pfingstlager 2032" },
  2033: { start_date: "2033-06-04", end_date: "2033-06-06", title: "Pfingstlager 2033" },
  2034: { start_date: "2034-05-27", end_date: "2034-05-29", title: "Pfingstlager 2034" },
  2035: { start_date: "2035-05-12", end_date: "2035-05-14", title: "Pfingstlager 2035" },
};

router.get("/camps", (req, res) => {
  const db = readDB();
  res.json({
    camps: db.camps || [],
    activeCampId: db.activeCampId || "camp-2026",
  });
});

router.post("/camps", requireRole("lagerleitung"), (req, res) => {
  const db = readDB();
  const { year, copyFromCampId } = req.body;
  if (!year) {
    return res.status(400).json({ error: "Jahr fehlt" });
  }

  const campId = `camp-${year}`;
  if (!db.camps) db.camps = [];
  const existing = db.camps.find((c) => c.id === campId);
  if (existing) {
    return res.status(400).json({ error: `Ein Lager für das Jahr ${year} existiert bereits.` });
  }

  const info = pfingstenDates[Number(year)];
  if (!info) {
    return res.status(400).json({ error: `Pfingsten-Daten für das Jahr ${year} sind nicht hinterlegt.` });
  }

  const newCamp: Camp = {
    id: campId,
    year: Number(year),
    start_date: info.start_date,
    end_date: info.end_date,
    title: info.title,
  };

  db.camps.push(newCamp);

  if (copyFromCampId) {
    const sourceCamp = db.camps.find((c) => c.id === copyFromCampId);
    if (sourceCamp) {
      const sourceShifts = db.shifts.filter((s) => s.camp_id === copyFromCampId);
      sourceShifts.forEach((sh) => {
        let newDate = sh.date;
        if (sh.date === sourceCamp.start_date) {
          newDate = newCamp.start_date;
        } else if (sh.date === sourceCamp.end_date) {
          newDate = newCamp.end_date;
        } else if (sh.date !== "Haupt") {
          const sStart = new Date(sourceCamp.start_date);
          const shDate = new Date(sh.date);
          const diffDays = Math.round((shDate.getTime() - sStart.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            const nStart = new Date(newCamp.start_date);
            nStart.setDate(nStart.getDate() + 1);
            newDate = nStart.toISOString().split("T")[0];
          } else if (diffDays === 0) {
            newDate = newCamp.start_date;
          } else if (diffDays === 2) {
            newDate = newCamp.end_date;
          }
        }

        db.shifts.push({
          id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          service_id: sh.service_id,
          date: newDate,
          start_time: sh.start_time,
          end_time: sh.end_time,
          notes: sh.notes,
          camp_id: newCamp.id,
        });
      });
    }
  }

  db.activeCampId = campId;
  writeDB(db);
  res.status(201).json({ camp: newCamp, activeCampId: campId });
});

router.post("/camps/active", requireRole("lagerleitung"), (req, res) => {
  const db = readDB();
  const { activeCampId } = req.body;
  if (!activeCampId) {
    return res.status(400).json({ error: "activeCampId fehlt" });
  }
  db.activeCampId = activeCampId;
  writeDB(db);
  res.json({ success: true, activeCampId });
});

export default router;
