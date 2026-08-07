import React from "react";
import { CheckCircle2, ShoppingBag, Hourglass } from "lucide-react";

interface MaterialStatusBadgeProps {
  status?: string;
}

/** Statuspille (Ausstehend/Bestellt/Erhalten) für Materialbestellungen. Extrahiert aus MaterialsView.tsx. */
export default function MaterialStatusBadge({ status }: MaterialStatusBadgeProps) {
  switch (status) {
    case "received":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3.5 w-3.5" /> Erhalten
        </span>
      );
    case "ordered":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <ShoppingBag className="h-3.5 w-3.5" /> Bestellt
        </span>
      );
    case "pending":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Hourglass className="h-3.5 w-3.5" /> Ausstehend
        </span>
      );
  }
}
