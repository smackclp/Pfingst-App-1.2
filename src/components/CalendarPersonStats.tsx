import React from "react";
import { Calendar, X, Copy, Check } from "lucide-react";
import { User, Shift, Service, ShiftAssignment } from "../types";

interface CalendarPersonStatsProps {
  personStats: {
    user: User;
    totalHours: number;
    shiftCount: number;
    freeDays: string[];
  };
  startDate: string;
  sunDate: string;
  endDate: string;
  assignments: ShiftAssignment[];
  shifts: Shift[];
  services: Service[];
  users: User[];
  onClearPersonFilter: () => void;
  formatDateGerman: (dateStr: string) => string;
  showToast: (msg: string) => void;
}

export default function CalendarPersonStats({
  personStats,
  startDate,
  sunDate,
  endDate,
  assignments,
  shifts,
  services,
  users,
  onClearPersonFilter,
  formatDateGerman,
  showToast
}: CalendarPersonStatsProps) {
  const [copySuccess, setCopySuccess] = React.useState<boolean>(false);

  const handleCopyWhatsApp = () => {
    const userAss = assignments.filter((a) => a.user_id === personStats.user.id);
    const userShifts = userAss
      .map((a) => shifts.find((s) => s.id === a.shift_id))
      .filter((s): s is Shift => !!s);

    if (userShifts.length === 0) {
      showToast(`${personStats.user.display_name} hat aktuell keine eingetragenen Schichten.`);
      return;
    }

    // Sort by date then start_time
    const sortedShifts = [...userShifts].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.start_time.localeCompare(b.start_time);
    });

    let text = `⛺ *Dienstplan für ${personStats.user.display_name}* 🏕️\n`;
    text += `Gesamtzeit: ${personStats.totalHours} Std (${personStats.shiftCount} Schichten)\n\n`;

    sortedShifts.forEach((shift, index) => {
      const svc = services.find((sv) => sv.id === shift.service_id);
      if (!svc) return;

      const dateLabel = shift.date === "Haupt" ? "Allgemein" : formatDateGerman(shift.date);
      const otherAssignments = assignments.filter(
        (a) => a.shift_id === shift.id && a.user_id !== personStats.user.id
      );
      const coworkers = otherAssignments
        .map((a) => users.find((usr) => usr.id === a.user_id)?.display_name)
        .filter(Boolean);

      text += `*${index + 1}. ${svc.title}*\n`;
      text += `📅 Datum: ${dateLabel}\n`;
      text += `⏰ Zeit: ${shift.start_time} - ${shift.end_time} Uhr\n`;
      text += `📍 Ort: ${svc.location || "Lagergelände"}\n`;
      if (shift.notes) {
        text += `📝 Info: ${shift.notes}\n`;
      }
      if (coworkers.length > 0) {
        text += `👥 Mitstreiter: ${coworkers.join(", ")}\n`;
      }
      text += `\n`;
    });

    text += `📲 Pfingstlager Dienstplan-App`;

    try {
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
      showToast("Fehler beim Kopieren des Textes.");
    }
  };

  const handleDownloadIcs = () => {
    const userAss = assignments.filter((a) => a.user_id === personStats.user.id);
    const userShifts = userAss
      .map((a) => shifts.find((s) => s.id === a.shift_id))
      .filter((s): s is Shift => !!s && s.date !== "Haupt");

    if (userShifts.length === 0) {
      showToast("Diese Person hat keine Schichten, für die Kalendereinträge erstellt werden können.");
      return;
    }

    const icsLines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Pfingstlager Dienstplan v2.0//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH"
    ];

    userShifts.forEach((shift) => {
      const svc = services.find((sv) => sv.id === shift.service_id);
      if (!svc) return;

      const dateStr = shift.date.replace(/-/g, "");
      const startTimeStr = shift.start_time.replace(/:/g, "");
      const endTimeStr = shift.end_time.replace(/:/g, "");

      const dtStart = `${dateStr}T${startTimeStr}00`;

      let endDayStr = dateStr;
      const [startH] = shift.start_time.split(":").map(Number);
      const [endH] = shift.end_time.split(":").map(Number);
      if (endH < startH) {
        const d = new Date(shift.date);
        d.setDate(d.getDate() + 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        endDayStr = `${year}${month}${day}`;
      }
      const dtEnd = `${endDayStr}T${endTimeStr}00`;

      const otherAssignments = assignments.filter(
        (a) => a.shift_id === shift.id && a.user_id !== personStats.user.id
      );
      const coworkers = otherAssignments
        .map((a) => {
          const u = users.find((usr) => usr.id === a.user_id);
          return u ? u.display_name : null;
        })
        .filter((name): name is string => !!name);

      const coworkerText = coworkers.length > 0 ? `\\nMitstreiter: ${coworkers.join(", ")}` : "";

      const summary = svc.title;
      const location = svc.location || "Lagergelände";
      const description = `Kategorie: ${svc.category}\\nOrt: ${location}${coworkerText}${
        shift.notes ? `\\nHinweis: ${shift.notes}` : ""
      }`;

      icsLines.push(
        "BEGIN:VEVENT",
        `UID:shift-${shift.id}-${personStats.user.id}@pfingstlager2026`,
        `DTSTAMP:${dateStr}T120000Z`,
        `LAST-MODIFIED:${dateStr}T120000Z`,
        `SEQUENCE:0`,
        `DTSTART;TZID=Europe/Berlin:${dtStart}`,
        `DTEND;TZID=Europe/Berlin:${dtEnd}`,
        `SUMMARY:${summary}`,
        `LOCATION:${location}`,
        `DESCRIPTION:${description}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        `DESCRIPTION:Erinnerung: ${summary} beginnt in 30 Minuten!`,
        "END:VALARM",
        "END:VEVENT"
      );
    });

    icsLines.push("END:VCALENDAR");

    const blob = new Blob([icsLines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dienstplan_${personStats.user.display_name.toLowerCase().replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-500/25 flex flex-col md:flex-row justify-between gap-4 animate-fade-in shadow-xs">
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-white flex items-center space-x-2 font-display">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
          <span>Fokus: {personStats.user.first_name} {personStats.user.last_name}</span>
          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-450 text-emerald-450 px-2.5 py-1 rounded border border-emerald-400/30 font-semibold uppercase">
            {personStats.user.role}
          </span>
        </h4>
        <p className="text-xs text-slate-400 font-sans">Persönliche Belegungsstatistik für das Pfingst-Zeltlager.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold md:self-center">
        <div className="bg-slate-950/60 border border-emerald-500/10 px-3 py-1.5 rounded-lg">
          <span className="text-slate-400 font-mono text-[10px]">TOTAL_STUNDEN: </span>
          <span className="font-mono font-bold text-emerald-400 text-sm">{personStats.totalHours} Std</span>
        </div>
        <div className="bg-slate-950/60 border border-emerald-500/10 px-3 py-1.5 rounded-lg">
          <span className="text-slate-400 font-mono text-[10px]">SCHICHTEN_COUNT: </span>
          <span className="font-mono font-bold text-emerald-400 text-sm">{personStats.shiftCount}x</span>
        </div>
        <div className="bg-slate-950/60 border border-emerald-500/10 px-3 py-1.5 rounded-lg text-xs md:text-sm">
          <span className="text-slate-400 font-mono text-[10px]">FREIE_TAGE: </span>
          <span className="font-mono font-bold text-emerald-400">
            {personStats.freeDays.length === 0
              ? "Keine"
              : personStats.freeDays
                  .map((d) => formatDateGerman(d))
                  .join(", ")}
          </span>
        </div>

        <button
          onClick={handleCopyWhatsApp}
          className={`flex items-center space-x-1.5 px-3.5 py-1.5 font-mono font-bold rounded-lg text-xs tracking-tight transition shadow-md active:scale-95 cursor-pointer whitespace-nowrap ${
            copySuccess 
              ? "bg-emerald-500 text-slate-950 shadow-emerald-500/10" 
              : "bg-slate-950 hover:bg-slate-900 border border-emerald-500/30 hover:border-emerald-500/80 text-emerald-450"
          }`}
        >
          {copySuccess ? (
            <>
              <Check className="h-4 w-4 shrink-0" />
              <span>Kopiert!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 shrink-0" />
              <span>Dienstplan kopieren</span>
            </>
          )}
        </button>

        <button
          onClick={handleDownloadIcs}
          className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white font-mono font-bold rounded-lg text-xs tracking-tight transition shadow-md active:scale-95 shadow-emerald-500/10 cursor-pointer whitespace-nowrap"
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span>Kalender (.ics)</span>
        </button>
      </div>
    </div>
  );
}
