import React from "react";
import { AlertTriangle, Info } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  variant?: "danger" | "info";
  title: string;
  message: React.ReactNode;
  /** Wenn gesetzt, wird ein Bestätigen-Button neben "Abbrechen" gezeigt. Ohne diese Prop wird stattdessen ein einzelner "OK"-Button (auf onCancel) gerendert - für reine Hinweis-/Alert-Dialoge. */
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  id?: string;
}

/**
 * Generischer Bestätigungs-/Hinweis-Dialog, extrahiert aus 9 nahezu identischen
 * Inline-Modals (CommunitiesView, PeopleView, ShiftsView). Zwei Modi je nach
 * Vorhandensein von onConfirm: Bestätigungsdialog (Abbrechen/Bestätigen) oder
 * reiner Hinweis-Dialog (ein OK-Button).
 */
export default function ConfirmDialog({
  isOpen,
  variant = "danger",
  title,
  message,
  onConfirm,
  confirmLabel = "Ja, Löschen",
  cancelLabel = "Abbrechen",
  onCancel,
  id,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const isAlertOnly = !onConfirm;
  const Icon = variant === "danger" ? AlertTriangle : Info;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60] animate-fade-in" id={id}>
      <div className="bg-slate-900 rounded-2xl p-6 text-white max-w-sm w-full border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-start space-x-3">
          <div
            className={`p-2 rounded-xl border shrink-0 ${
              variant === "danger"
                ? "bg-rose-950/40 border-rose-900/30 text-rose-500"
                : "bg-slate-950 border-slate-800 text-emerald-450"
            }`}
          >
            <Icon className={`h-6 w-6 ${variant === "danger" ? "text-rose-500" : "text-emerald-400"}`} />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <h4 className="text-sm font-bold text-white uppercase tracking-tight font-mono">{title}</h4>
            <p className="text-xs text-slate-350 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className={`flex items-center pt-2 border-t border-slate-800 ${isAlertOnly ? "justify-end" : "justify-end space-x-2"}`}>
          {isAlertOnly ? (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
            >
              OK
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                className="px-3.5 py-2 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`px-3.5 py-2 text-white text-xs font-semibold rounded-lg transition cursor-pointer ${
                  variant === "danger" ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
