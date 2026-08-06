import React from "react";

/** Schließt einen Dialog/ein Modal per Escape-Taste - Standard-Erwartung für Tastaturnutzung. */
export function useEscapeKey(isOpen: boolean, onClose: () => void) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}
