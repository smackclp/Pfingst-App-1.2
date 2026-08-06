import React from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Hält den Tastatur-Fokus innerhalb eines geöffneten Modals gefangen: Tab am
 * letzten fokussierbaren Element springt zurück zum ersten (und Shift+Tab
 * umgekehrt), statt unbemerkt in den Hintergrund zu wandern. Ergänzt
 * useEscapeKey um die zweite Hälfte sauberer Tastaturbedienung für Dialoge.
 * Liefert einen Ref, der auf den sichtbaren Modal-Container (nicht das
 * Hintergrund-Overlay) gesetzt werden muss.
 */
export function useFocusTrap<T extends HTMLElement>(isOpen: boolean): React.RefObject<T | null> {
  const containerRef = React.useRef<T>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const all: HTMLElement[] = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const focusable: HTMLElement[] = all.filter((el: HTMLElement) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return containerRef;
}
