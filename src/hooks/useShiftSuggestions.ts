import React from "react";

export interface ShiftSuggestion {
  user_id: string;
  year: number;
  camp_title: string;
}

/**
 * Lädt Vorjahres-Zuteilungsvorschläge für eine Schicht, sobald triggerShiftId
 * gesetzt ist (z.B. weil der Zuordnungs-Assistent für diese Schicht geöffnet
 * wurde). Identische Logik war zuvor unabhängig in CalendarView.tsx und
 * ShiftsView.tsx implementiert.
 */
export function useShiftSuggestions(triggerShiftId: string | null) {
  const [suggestions, setSuggestions] = React.useState<ShiftSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);

  React.useEffect(() => {
    if (triggerShiftId) {
      setLoadingSuggestions(true);
      setSuggestions([]);
      fetch(`/api/shifts/${triggerShiftId}/suggestions`)
        .then((res) => {
          if (!res.ok) return [];
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return res.json();
          }
          return [];
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setSuggestions(data);
          }
        })
        .catch((err) => console.error("Error loading shift suggestions:", err))
        .finally(() => setLoadingSuggestions(false));
    } else {
      setSuggestions([]);
    }
  }, [triggerShiftId]);

  return { suggestions, loadingSuggestions };
}
