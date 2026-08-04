import React from "react";
import { Bell, Clock } from "lucide-react";
import { Notification as DbNotification } from "../types";

interface AlertsNotificationLogProps {
  notifications: DbNotification[];
  loadingFeeds: boolean;
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
}

function formatTime(isoString: string) {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " - " + date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  } catch (e) {
    return isoString;
  }
}

/** Rechte Spalte: Liste der empfangenen Benachrichtigungen des aktuellen Nutzers. */
export default function AlertsNotificationLog({ notifications, loadingFeeds, onMarkAllRead, onClearNotifications }: AlertsNotificationLogProps) {
  return (
    <div className="tech-panel p-5 md:p-6 rounded-2xl border border-emerald-500/10 flex flex-col h-full min-h-[500px]">
      {/* Log Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-extrabold font-mono text-white tracking-tight">Deine empfangenen Alerts</h3>
            <span className="text-[10px] text-slate-500 font-mono">NEUSTE DIENSTPLAN-BENACHRICHTIGUNGEN</span>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={onMarkAllRead} className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 cursor-pointer">
              Gelesen
            </button>
            <span className="text-slate-700">|</span>
            <button onClick={onClearNotifications} className="text-[10px] font-bold text-rose-455 text-rose-400 font-mono flex items-center gap-1 cursor-pointer">
              Leeren
            </button>
          </div>
        )}
      </div>

      {/* Notification logs list */}
      {loadingFeeds ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-20">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[10px] font-mono text-slate-500">Lade Verlauf...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 py-20">
          <div className="p-3 bg-slate-950/40 rounded-full border border-slate-850">
            <Bell className="h-6 w-6 text-slate-750 text-slate-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-300">Dein Posteingang ist leer</p>
            <p className="text-[10px] text-slate-500 max-w-[220px] mx-auto mt-1 leading-normal">
              Hier zeigen wir deine erhaltenen Alerts für eingeteilte Schichten, Verschiebungen und Lagerupdates an.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3.5 rounded-xl border transition-all ${
                n.read ? "bg-slate-950/10 border-slate-900 text-slate-500" : "bg-slate-950/60 border-emerald-500/20 text-white shadow-[0_2px_10px_rgba(16,185,129,0.03)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-xs font-extrabold flex items-center gap-1.5 leading-snug">
                  {!n.read && <span className="bg-emerald-500 h-1.5 w-1.5 rounded-full shrink-0 animate-pulse" />}
                  {n.title}
                </h4>
                <span className="text-[9px] font-mono text-slate-500 flex items-center gap-0.5 shrink-0">
                  <Clock className="h-2.5 w-2.5" />
                  {formatTime(n.timestamp)}
                </span>
              </div>
              {/* Content text */}
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed whitespace-pre-line border-t border-slate-900/60 pt-1.5">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
