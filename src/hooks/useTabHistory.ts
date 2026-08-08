import React from "react";

/**
 * Verwaltet den aktuell aktiven Tab und hängt jeden Wechsel in den Browser-
 * Verlauf ein (history.pushState), damit der Zurück-Button/die Wisch-Geste
 * - wie bei einer normalen Website - einen Schritt innerhalb der App
 * zurückgeht, statt die App zu beenden. Betrifft besonders die als
 * Standalone-PWA installierte App (manifest.json: display "standalone"),
 * die ohne eigenen Verlaufs-Stack beim ersten Zurück-Schritt sofort
 * schließt. Die URL selbst bleibt bewusst unverändert (kein Routing,
 * keine Server-Auswirkung) - nur der Verlaufs-Stack wächst/schrumpft mit
 * den Tab-Wechseln.
 */
export function useTabHistory(initialTab: string): [string, (tab: string) => void] {
  const [currentTab, setCurrentTabState] = React.useState<string>(initialTab);
  const currentTabRef = React.useRef(currentTab);
  currentTabRef.current = currentTab;

  React.useEffect(() => {
    // Aktuellen Verlaufseintrag mit dem Start-Tab markieren, damit der
    // erste Zurück-Schritt bereits einen Vergleichswert hat.
    window.history.replaceState({ tab: currentTabRef.current }, "");

    const handlePopState = (event: PopStateEvent) => {
      const tab = event.state?.tab;
      if (tab && tab !== currentTabRef.current) {
        setCurrentTabState(tab);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setCurrentTab = React.useCallback((tab: string) => {
    if (tab === currentTabRef.current) return;
    window.history.pushState({ tab }, "");
    setCurrentTabState(tab);
  }, []);

  return [currentTab, setCurrentTab];
}
