import React from "react";
import { Trash2 } from "lucide-react";

interface UndoToastProps {
  toast: { id: string; label: string } | null;
  onUndo: (id: string) => void;
}

/** Zweites Sicherheitsnetz nach einer Löschbestätigung: zeigt "X gelöscht" mit Rückgängig-Button, solange die Aktion noch nicht endgültig ausgeführt wurde. */
export default function UndoToast({ toast, onUndo }: UndoToastProps) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-24 right-5 z-50 bg-slate-900 border border-amber-500/30 text-white pl-4 pr-2.5 py-2.5 rounded-2xl shadow-2xl text-xs font-semibold flex items-center gap-3 shadow-black/60 backdrop-blur-md animate-slide-up select-none">
      <Trash2 className="h-4 w-4 text-amber-400 shrink-0" />
      <span className="truncate max-w-[180px]">"{toast.label}" gelöscht</span>
      <button
        type="button"
        onClick={() => onUndo(toast.id)}
        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer transition active:scale-95 shrink-0 whitespace-nowrap"
      >
        Rückgängig
      </button>
    </div>
  );
}
