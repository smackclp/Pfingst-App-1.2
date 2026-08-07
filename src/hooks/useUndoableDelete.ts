import React from "react";

interface PendingEntry {
  timer: ReturnType<typeof setTimeout>;
  commit: () => void | Promise<void>;
}

interface ActiveToast {
  id: string;
  label: string;
}

const UNDO_DELAY_MS = 6000;

/**
 * Verzögert eine Lösch-Aktion um ein paar Sekunden: der Eintrag verschwindet
 * sofort aus der Liste (isPending), ein Toast zeigt "X gelöscht - Rückgängig".
 * Erst wenn die Zeit ohne Klick auf Rückgängig abläuft, wird commit() (der
 * eigentliche API-Aufruf) ausgeführt. Ergänzt bestehende Bestätigungsdialoge
 * um ein zweites Sicherheitsnetz, ersetzt sie nicht.
 */
export function useUndoableDelete(delayMs: number = UNDO_DELAY_MS) {
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(new Set());
  const [activeToast, setActiveToast] = React.useState<ActiveToast | null>(null);
  const entriesRef = React.useRef<Map<string, PendingEntry>>(new Map());

  const scheduleDelete = React.useCallback(
    (id: string, label: string, commit: () => void | Promise<void>) => {
      const existing = entriesRef.current.get(id);
      if (existing) clearTimeout(existing.timer);

      setPendingIds((prev) => new Set(prev).add(id));
      setActiveToast({ id, label });

      const timer = setTimeout(() => {
        entriesRef.current.delete(id);
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setActiveToast((cur) => (cur?.id === id ? null : cur));
        commit();
      }, delayMs);

      entriesRef.current.set(id, { timer, commit });
    },
    [delayMs]
  );

  const undo = React.useCallback((id: string) => {
    const entry = entriesRef.current.get(id);
    if (entry) {
      clearTimeout(entry.timer);
      entriesRef.current.delete(id);
    }
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setActiveToast((cur) => (cur?.id === id ? null : cur));
  }, []);

  const isPending = React.useCallback((id: string) => pendingIds.has(id), [pendingIds]);

  React.useEffect(() => {
    return () => {
      entriesRef.current.forEach((entry) => clearTimeout(entry.timer));
    };
  }, []);

  return { isPending, scheduleDelete, undo, activeToast };
}
