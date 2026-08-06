import { DB, Conflict, Shift } from "./types";
import { timeToMinutes, formatDateGerman } from "./db";

// conflict.message wird im Frontend per dangerouslySetInnerHTML gerendert
// (DashboardConflicts.tsx) - Diensttitel sind von Bereichsleitung+ frei
// editierbar (ServiceFormModal) und müssen deshalb escaped werden, bevor sie
// in den HTML-String eingebettet werden. Sonst könnte ein bösartig
// benannter Dienst Skriptcode bei jedem Betrachter der Konflikt-Übersicht
// ausführen (Stored XSS).
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function getDayName(dateStr: string): string {
  if (!dateStr || dateStr === "Haupt" || dateStr === "Camp") return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return "";
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const date = new Date(year, month, day);
  const days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  return days[date.getDay()] || "";
}

export function computeConflicts(db: DB): Conflict[] {
  const conflicts: Conflict[] = [];
  const { users, services, shifts, assignments } = db;

  // 1. Double occupancy (overlap)
  const userAssignmentsMap = new Map<string, string[]>(); // userId -> sids[]
  for (const a of assignments) {
    if (!userAssignmentsMap.has(a.user_id)) {
      userAssignmentsMap.set(a.user_id, []);
    }
    userAssignmentsMap.get(a.user_id)!.push(a.shift_id);
  }

  for (const [userId, shiftIds] of userAssignmentsMap.entries()) {
    const user = users.find((u) => u.id === userId);
    if (!user) continue;

    const userShifts = shiftIds
      .map((sid) => shifts.find((s) => s.id === sid))
      .filter((s): s is Shift => !!s);

    for (let i = 0; i < userShifts.length; i++) {
      for (let j = i + 1; j < userShifts.length; j++) {
        const s1 = userShifts[i];
        const s2 = userShifts[j];

        if (s1.date === s2.date) {
          if (s1.date === "Haupt" || s2.date === "Haupt") continue;
          const start1 = timeToMinutes(s1.start_time);
          const end1 = timeToMinutes(s1.end_time);
          const start2 = timeToMinutes(s2.start_time);
          const end2 = timeToMinutes(s2.end_time);

          if (start1 < end2 && start2 < end1) {
            const svc1 = services.find((s) => s.id === s1.service_id);
            const svc2 = services.find((s) => s.id === s2.service_id);
            const svc1Title = escapeHtml(svc1?.title || "Dienst");
            const svc2Title = escapeHtml(svc2?.title || "Dienst");

            conflicts.push({
              id: `overlap-${userId}-${s1.id}-${s2.id}`,
              type: "overlap",
              message: `Überschneidung am ${getDayName(s1.date)}, ${formatDateGerman(s1.date)} zwischen <strong><u>${svc1Title}</u></strong> (${getDayName(s1.date)}, ${s1.start_time}-${s1.end_time} Uhr) und <strong><u>${svc2Title}</u></strong> (${getDayName(s2.date)}, ${s2.start_time}-${s2.end_time} Uhr)`,
              userId,
              userName: user.display_name,
              shiftId1: s1.id,
              shiftId2: s2.id,
              serviceTitle1: svc1?.title,
              serviceTitle2: svc2?.title,
              timeRange: `${s1.start_time}-${s1.end_time} vs ${s2.start_time}-${s2.end_time}`,
            });
          }
        }
      }
    }
  }

  // 2. Overcapacity (above service max occupants) or too few info
  for (const s of shifts) {
    const svc = services.find((sv) => sv.id === s.service_id);
    if (!svc) continue;
    const assignedCount = assignments.filter((a) => a.shift_id === s.id).length;
    if (assignedCount > svc.max_persons) {
      conflicts.push({
        id: `overcapacity-${s.id}`,
        type: "overcapacity",
        message: `Überbelegung für <strong><u>${escapeHtml(svc.title)}</u></strong> am ${getDayName(s.date)}, ${formatDateGerman(s.date)} (${getDayName(s.date)}, ${s.start_time}-${s.end_time} Uhr): ${assignedCount} von max. ${svc.max_persons} Personen zugeordnet.`,
        shiftId1: s.id,
      });
    }
  }

  return conflicts;
}
