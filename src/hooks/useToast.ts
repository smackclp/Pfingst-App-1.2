import React from "react";

/**
 * Kurzzeitige Erfolgs-/Hinweismeldung unten rechts, verschwindet nach 3.5s.
 * Extrahiert aus DashboardView.tsx (dortiges showToast/toastMessage).
 */
export function useToast() {
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  return { toastMessage, showToast };
}
