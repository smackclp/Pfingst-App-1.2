import React from "react";

interface ToastProps {
  message: string | null;
}

/** Rendert die von useToast() verwaltete Kurzmeldung unten rechts. */
export default function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-emerald-500/30 text-white px-4.5 py-3 rounded-2xl shadow-2xl text-xs font-semibold flex items-center space-x-2.5 shadow-black/60 backdrop-blur-md animate-slide-up select-none">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
      <span>{message}</span>
    </div>
  );
}
