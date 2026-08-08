import React from "react";
import { Check, RefreshCw, Send } from "lucide-react";
import { User } from "../types";

interface AlertsAdminComposerProps {
  users: User[];
  targetUserId: string;
  onTargetUserIdChange: (id: string) => void;
  customTitle: string;
  onCustomTitleChange: (title: string) => void;
  customBody: string;
  onCustomBodyChange: (body: string) => void;
  adminTestingStatus: "idle" | "sending" | "success" | "error";
  adminSuccessMessage: string;
  onTriggerAdminTest: () => void;
}

/** Abschnitt 5 (nur Lagerleitung): manuelle Test-/Live-Benachrichtigung an einen beliebigen Helfer senden. */
export default function AlertsAdminComposer({
  users,
  targetUserId,
  onTargetUserIdChange,
  customTitle,
  onCustomTitleChange,
  customBody,
  onCustomBodyChange,
  adminTestingStatus,
  adminSuccessMessage,
  onTriggerAdminTest,
}: AlertsAdminComposerProps) {
  return (
    <div className="tech-panel p-5 md:p-6 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-950/5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/35 rounded-full text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
          Admin-Bereich 🛠️
        </span>
        <span className="text-slate-500 text-[10px] font-mono">Dienstplan-Koordinatoren Werkzeug</span>
      </div>
      <h3 className="text-sm font-extrabold font-mono text-white uppercase tracking-wider flex items-center gap-2">
        📢 Live-Pushup Sende-Center & Helfer-Debugger
      </h3>
      <p className="text-slate-350 text-xs leading-relaxed">
        Als Camp-Administrator kannst du hier jedem Helfer im Zeltlager manuell eine Live-Pushup oder einen Testalarm auf sein Gerät senden. Perfekt, um im Feld zu prüfen, ob die Berechtigungen von verunsicherten Helfern richtig erteilt sind.
      </p>

      <div className="space-y-3.5 pt-2 border-t border-slate-900">
        {/* Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Ziel-Empfänger (Helfer auswählen):</label>
          <select
            value={targetUserId}
            onChange={(e) => onTargetUserIdChange(e.target.value)}
            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-sans focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="" disabled>-- Empfänger auswählen --</option>
            {users.map((u) => (
              <option key={`admin-notif-user-${u.id}`} value={u.id}>
                {u.display_name} ({u.access_role === "lagerleitung" ? "Lagerleitung" : u.access_role === "bereichsleiter" ? "Bereichsleitung" : "Helfer*in"}) {u.active ? "• Aktiv ✓" : "• Inaktiv 💤"}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Benachrichtigungs-Titel:</label>
          <input
            type="text"
            value={customTitle}
            onChange={(e) => onCustomTitleChange(e.target.value)}
            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-sans focus:outline-none focus:border-emerald-500"
            placeholder="z.B. Dienstplan-Alarm! 🏕️"
          />
        </div>

        {/* Content Message */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-slate-400 font-mono font-bold uppercase block">Inhalt & Nachricht:</label>
          <textarea
            rows={2}
            value={customBody}
            onChange={(e) => onCustomBodyChange(e.target.value)}
            className="w-full text-xs bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-sans focus:outline-none focus:border-emerald-500 resize-none"
            placeholder="z.B. Deine Nachmittagsschicht hat sich um 30 Min verschoben..."
          />
        </div>

        {/* Submit actions */}
        <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={onTriggerAdminTest}
            disabled={adminTestingStatus === "sending" || !targetUserId}
            className={`px-4.5 py-2.5 font-extrabold text-xs rounded-xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer ${
              adminTestingStatus === "success"
                ? "bg-emerald-600 border border-emerald-400 text-white"
                : adminTestingStatus === "error"
                ? "bg-rose-900 border border-rose-500 text-white"
                : "bg-slate-900 hover:bg-slate-850 hover:text-emerald-450 text-white border border-slate-850"
            }`}
          >
            {adminTestingStatus === "sending" ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Sende Live-Push...
              </>
            ) : adminTestingStatus === "success" ? (
              <>
                <Check className="h-3.5 w-3.5 animate-bounce text-white" />
                Live-Push erfolgreich gesendet!
              </>
            ) : adminTestingStatus === "error" ? (
              "Fehlgeschlagen ✕"
            ) : (
              <>
                <Send className="h-3.5 w-3.5 text-emerald-450 text-emerald-400" />
                Live-Benachrichtigung losschicken!
              </>
            )}
          </button>

          <div className="text-[10px] text-slate-500 font-mono">
            Empfänger-ID: <span className="text-emerald-400 font-bold">{targetUserId || "keine"}</span>
          </div>
        </div>

        {adminSuccessMessage && (
          <p className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/25 animate-fade-in text-center">
            ✓ {adminSuccessMessage} Das Backend hat den Push-Auftrag entgegengenommen und im Verlauf gespeichert.
          </p>
        )}
      </div>
    </div>
  );
}
