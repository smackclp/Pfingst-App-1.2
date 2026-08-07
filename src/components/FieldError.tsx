import React from "react";
import { AlertCircle } from "lucide-react";

interface FieldErrorProps {
  message?: string;
}

/** Zeigt eine Formularfehlermeldung direkt unter dem betroffenen Feld statt als Popup/Toast. */
export default function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p className="text-rose-400 text-[11px] font-semibold mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      <span>{message}</span>
    </p>
  );
}
