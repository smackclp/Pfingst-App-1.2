import React from "react";
import { CalendarClock, Check, MapPin, PartyPopper } from "lucide-react";
import { Service, Shift, ShiftAssignment } from "../types";
import { timeToMinutes, getDayName, formatDateGerman } from "../utils";

interface NextShiftEntry {
  assignment: ShiftAssignment;
  shift: Shift;
}

interface DashboardNextShiftProps {
  nextShiftEntry: NextShiftEntry | null;
  services: Service[];
  onUpdateAssignmentStatus: (assignmentId: string, status: "pending" | "accepted" | "declined" | "maybe", declineReason?: string) => Promise<void>;
  showToast: (msg: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  accepted: "Zugesagt ✓",
  maybe: "Vielleicht ?",
  declined: "Abgesagt",
  pending: "Noch nicht bestätigt",
};

/**
 * Prominente "Was ist als Nächstes dran"-Kachel ganz oben im Dashboard:
 * zeigt die eigene nächste anstehende Schicht auf einen Blick, ohne dass
 * man erst zu "Mein Plan" navigieren muss. Für Helfer, die die App nur
 * kurz zwischendurch öffnen, die wichtigste Info zuerst und ohne Klick.
 */
export default function DashboardNextShift({ nextShiftEntry, services, onUpdateAssignmentStatus, showToast }: DashboardNextShiftProps) {
  if (!nextShiftEntry) {
    return (
      <div
        className="bg-gradient-to-br from-slate-900 to-slate-950 p-6 rounded-2xl border border-emerald-500/20 shadow-xl flex items-center gap-4"
        id="dashboard-next-shift-empty"
      >
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
          <PartyPopper className="h-7 w-7 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-black text-white font-display">Aktuell keine anstehende Schicht für dich eingeplant</p>
          <p className="text-xs text-slate-400 mt-0.5">Schau bei „Mein Plan" vorbei, falls du eine Schicht übernehmen möchtest.</p>
        </div>
      </div>
    );
  }

  const { assignment, shift } = nextShiftEntry;
  const service = services.find((s) => s.id === shift.service_id);

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const isToday = shift.date === todayStr;
  const isTomorrow = shift.date === tomorrowStr;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isOngoing = isToday && nowMinutes >= timeToMinutes(shift.start_time) && nowMinutes < timeToMinutes(shift.end_time);

  const dayLabel = isToday ? "Heute" : isTomorrow ? "Morgen" : `${getDayName(shift.date)}, ${formatDateGerman(shift.date)}`;

  const status = assignment.status || "pending";
  const needsResponse = status === "pending" || status === "maybe";

  const handleQuickAccept = async () => {
    try {
      await onUpdateAssignmentStatus(assignment.id, "accepted");
      showToast("✅ Schicht zugesagt!");
    } catch {
      showToast("❌ Konnte nicht gespeichert werden.");
    }
  };

  return (
    <div
      className={`p-6 rounded-2xl border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isOngoing ? "bg-gradient-to-br from-emerald-950/60 to-slate-950 border-emerald-500" : "bg-gradient-to-br from-slate-900 to-slate-950 border-emerald-500/20"
      }`}
      id="dashboard-next-shift"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
          <CalendarClock className="h-7 w-7 text-emerald-400" />
        </div>
        <div>
          <p className="text-[11px] font-bold font-mono uppercase tracking-wider text-emerald-400">{isOngoing ? "🔴 Läuft gerade" : "Deine nächste Schicht"}</p>
          <p className="text-lg font-black text-white font-display mt-0.5">
            {dayLabel}, {shift.start_time}–{shift.end_time} Uhr
          </p>
          <p className="text-sm text-slate-300 font-sans mt-0.5">{service?.title || "Dienst"}</p>
          {service?.location && (
            <p className="text-xs text-slate-400 font-sans flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span>{service.location}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        <span
          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border ${
            status === "accepted"
              ? "bg-emerald-950/40 border-emerald-500/25 text-emerald-400"
              : status === "maybe"
              ? "bg-amber-950/40 border-amber-500/25 text-amber-400"
              : status === "declined"
              ? "bg-rose-950/40 border-rose-500/25 text-rose-400"
              : "bg-slate-900 border-slate-700 text-slate-400"
          }`}
        >
          {STATUS_LABEL[status]}
        </span>
        {needsResponse && (
          <button
            onClick={handleQuickAccept}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer"
            id="dashboard-next-shift-accept-btn"
          >
            <Check className="h-4 w-4" />
            <span>Zusagen</span>
          </button>
        )}
      </div>
    </div>
  );
}
