// Zentrale Stelle für Anmeldung & Token-Verwaltung im Frontend.
// Warum ein globaler fetch-Interceptor statt 30+ einzelne fetch()-Aufrufe anzupassen?
// -> Geringeres Risiko, konsistentes Verhalten, und neue Komponenten funktionieren
//    automatisch ohne dass jemand daran denken muss, den Auth-Header zu setzen.

const TOKEN_KEY = "pfingsten_auth_token";

export type AccessRole = "helfer" | "bereichsleiter" | "lagerleitung";

export interface AuthUser {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  role: string;
  access_role?: AccessRole;
  active: boolean;
  notes?: string;
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage kann in seltenen Fällen (privates Browsing, Safari-Quota) fehlschlagen.
  }
}

// Pfade, die OHNE Login erreichbar sein müssen (Login-Bildschirm selbst).
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/login-directory"];

let interceptorInstalled = false;
let onUnauthorized: (() => void) | null = null;

/** Wird von useZeltlagerData einmalig gesetzt: was passieren soll, wenn eine Anfrage 401 zurückgibt. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

/**
 * Patcht window.fetch EINMALIG, damit jede Anfrage an /api/* automatisch den
 * Bearer-Token mitschickt (falls vorhanden) und bei 401 zentral reagiert wird.
 * Muss vor dem ersten API-Aufruf der App laufen (siehe main.tsx).
 */
export function installAuthFetchInterceptor() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

    const isApiCall = url.startsWith("/api/");
    const isPublic = PUBLIC_API_PATHS.some((p) => url.startsWith(p));

    let finalInit = init;
    if (isApiCall && !isPublic) {
      const token = getAuthToken();
      if (token) {
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
        headers.set("Authorization", `Bearer ${token}`);
        finalInit = { ...init, headers };
      }
    }

    const response = await originalFetch(input, finalInit);

    if (isApiCall && !isPublic && response.status === 401) {
      // Session abgelaufen/ungültig -> zentral ausloggen, Login-Bildschirm zeigen.
      setAuthToken(null);
      onUnauthorized?.();
    }

    return response;
  };
}

export async function loginWithPin(userId: string, pin: string): Promise<{ token: string; accessRole: AccessRole; user: AuthUser }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, pin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Anmeldung fehlgeschlagen.");
  }
  return data;
}

export async function fetchLoginDirectory(): Promise<{ id: string; display_name: string }[]> {
  const res = await fetch("/api/auth/login-directory");
  if (!res.ok) throw new Error("Namensliste konnte nicht geladen werden.");
  return res.json();
}

export async function fetchCurrentSession(): Promise<{ user: AuthUser; accessRole: AccessRole } | null> {
  const token = getAuthToken();
  if (!token) return null;
  const res = await fetch("/api/auth/me");
  if (!res.ok) {
    setAuthToken(null);
    return null;
  }
  return res.json();
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    setAuthToken(null);
  }
}

export async function changeOwnPin(currentPin: string, newPin: string): Promise<void> {
  const res = await fetch("/api/auth/change-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPin, newPin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "PIN konnte nicht geändert werden.");
}
