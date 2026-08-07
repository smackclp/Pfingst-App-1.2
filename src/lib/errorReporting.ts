/**
 * Meldet einen Frontend-Fehler an das Fehler-Monitoring (server/errorLog.ts).
 * Best-effort/fire-and-forget: darf selbst niemals werfen oder die
 * aufrufende Stelle blockieren - sonst könnte das Melden eines Fehlers
 * selbst neue Fehler bzw. Endlosschleifen auslösen.
 */
export function reportClientError(message: string, stack?: string): void {
  try {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: String(message || "Unbekannter Fehler").slice(0, 500),
        stack: stack ? String(stack).slice(0, 2000) : undefined,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    }).catch(() => {
      // Bewusst kein Retry/Queue: eine fehlgeschlagene Fehler-Meldung (z.B.
      // bei fehlender Verbindung) soll selbst kein weiteres Problem auslösen.
    });
  } catch {
    // Siehe oben.
  }
}
