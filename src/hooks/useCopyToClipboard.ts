import React from "react";

/**
 * Kopiert Text in die Zwischenablage und markiert die auslösende Stelle (per id)
 * für eine kurze Zeit als "kopiert". Extrahiert aus DashboardView.tsx (handleCopy)
 * und ProgramView.tsx (handleCopySogWhatsApp) - beide identisches Muster
 * (Flag setzen, nach 2s zurücksetzen).
 */
export function useCopyToClipboard(timeoutMs: number = 2000, onError?: (msg: string) => void) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copy = React.useCallback(
    (id: string, text: string) => {
      try {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), timeoutMs);
      } catch (err) {
        console.error(err);
        onError?.("Fehler beim Kopieren.");
      }
    },
    [timeoutMs, onError]
  );

  return { copiedId, copy };
}
