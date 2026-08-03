import React from "react";
import { Mail, Phone, Edit3, Trash2 } from "lucide-react";
import { User } from "../types";
import { Tooltip } from "./Tooltip";

interface PersonCardProps {
  key?: React.Key;
  u: User;
  isAdmin: boolean;
  onEditClick: (u: User) => void;
  onDeleteClick: (id: string, name: string) => void;
}

export default function PersonCard({ u, isAdmin, onEditClick, onDeleteClick }: PersonCardProps) {
  return (
    <div 
      id={`person-card-${u.id}`}
      className={`rounded-2xl border p-5 flex flex-col space-y-4 hover:border-emerald-500/20 transition-all ${
        u.active 
          ? "bg-slate-900/80 border-slate-800 text-slate-100 shadow-[0_4px_20px_0_rgba(0,0,0,0.35)]" 
          : "bg-slate-900/40 border-slate-850 text-slate-400 opacity-60"
      }`}
    >
      {/* Header Box */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800/60 pb-3">
        <div className="truncate">
          <h4 className="text-sm font-bold text-white leading-none truncate flex items-center flex-wrap gap-1.5 font-display" title={`${u.first_name} ${u.last_name}`}>
            {u.first_name} {u.last_name}
            {!u.active && (
              <span className="text-[9px] text-slate-400 font-mono bg-slate-950 py-0.5 px-1.5 rounded border border-slate-800">
                Inaktiv
              </span>
            )}
            {u.is_buyer && (
              <span className="text-[9px] text-amber-400 font-mono bg-amber-955 bg-amber-900/40 py-0.5 px-1.5 rounded border border-amber-500/25 font-bold" title="Einkäufer für Materialbestellungen">
                📦 Einkäufer
              </span>
            )}
          </h4>
          <p className="text-[10px] text-slate-400 mt-1.5 font-semibold uppercase tracking-wider font-mono">
            ID: <span className="text-emerald-400 font-bold">{u.display_name}</span>
          </p>
        </div>

        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-950/80 border border-emerald-500/20 text-emerald-400 truncate select-none font-mono">
          {u.role || "MEMBER"}
        </span>
      </div>

      {/* Contact Data & Notes */}
      <div className="text-xs space-y-1.5 flex-1">
        {(u.email || u.phone) ? (
          <div className="space-y-1.5 text-slate-300">
            {u.email && (
              <p className="flex items-center space-x-1.5 truncate">
                <Mail className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
                <span className="truncate hover:underline hover:text-emerald-400 text-slate-200" title={u.email}>{u.email}</span>
              </p>
            )}
            {u.phone && (
              <p className="flex items-center space-x-1.5 font-mono text-slate-200">
                <Phone className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
                <span>{u.phone}</span>
              </p>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic py-0.5 font-mono">NO_CONTACT_DATA</p>
        )}

        {u.notes && (
          <div className="bg-slate-950/75 p-2 rounded-lg border border-slate-800 text-[11px] leading-relaxed text-slate-300 mt-2 font-sans">
            <span className="font-bold block text-[9px] font-mono uppercase tracking-wider text-slate-500">Notizen / Internes</span>
            <p className="italic leading-snug mt-1 text-slate-300">{u.notes}</p>
          </div>
        )}
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div className="pt-2 border-t border-slate-800 flex items-center justify-end space-x-2">
          <Tooltip content="Helfer-Dienstrollen, Handynummern, Kontaktdaten und Lagerstatus anpassen" position="top" delay={150}>
            <button
              onClick={() => onEditClick(u)}
              className="p-1.5 bg-slate-950/40 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 rounded-lg transition cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Diese Person dauerhaft aus der Helferkartei löschen (Zuweisungen gehen verloren)" position="top" delay={150}>
            <button
              onClick={() => onDeleteClick(u.id, u.display_name)}
              className="p-1.5 bg-slate-950/40 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
