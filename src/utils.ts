// Date Utilities for Pfingstlager Application
import { GERMAN_MONTHS_SHORT, GERMAN_WEEKDAYS_SHORT, GERMAN_WEEKDAYS_LONG } from "./constants";

// Detect if we are inside a sandboxed or normal iframe
export function isInsideIframe(): boolean {
  try {
    return typeof window !== "undefined" && window.self !== window.top;
  } catch (e) {
    return true; // SecurityError means we are definitely in a cross-origin sandboxed iframe
  }
}

// Safely query if serviceWorker is supported and accessible in the current context
export function hasServiceWorkerSupport(): boolean {
  if (typeof window === "undefined" || isInsideIframe()) {
    return false;
  }
  try {
    return "serviceWorker" in navigator;
  } catch (e) {
    return false;
  }
}

// Safe wrapper around localStorage to prevent DOMExceptions / SecurityErrors inside iframe sandboxes
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined') {
        const storage = window.localStorage;
        if (storage) {
          return storage.getItem(key);
        }
      }
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
    return null;
  },
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined') {
        const storage = window.localStorage;
        if (storage) {
          storage.setItem(key, value);
        }
      }
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
  },
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        const storage = window.localStorage;
        if (storage) {
          storage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
  }
};

export interface Camp {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  title: string;
}

export const PFINGSTEN_DATES: Record<number, { start_date: string; end_date: string; title: string }> = {
  2026: { start_date: "2026-05-23", end_date: "2026-05-25", title: "Pfingstlager 2026" },
  2027: { start_date: "2027-05-15", end_date: "2027-05-17", title: "Pfingstlager 2027" },
  2028: { start_date: "2028-06-03", end_date: "2028-06-05", title: "Pfingstlager 2028" },
  2029: { start_date: "2029-05-19", end_date: "2029-05-21", title: "Pfingstlager 2029" },
  2030: { start_date: "2030-06-08", end_date: "2030-06-10", title: "Pfingstlager 2030" },
  2031: { start_date: "2031-05-31", end_date: "2031-06-02", title: "Pfingstlager 2031" },
  2032: { start_date: "2032-05-15", end_date: "2032-05-17", title: "Pfingstlager 2032" },
  2033: { start_date: "2033-06-04", end_date: "2033-06-06", title: "Pfingstlager 2033" },
  2034: { start_date: "2034-05-27", end_date: "2034-05-29", title: "Pfingstlager 2034" },
  2035: { start_date: "2035-05-12", end_date: "2035-05-14", title: "Pfingstlager 2035" },
};

/**
 * Safely adds specified days to a YYYY-MM-DD string
 */
export function addDays(dateStr: string, days: number): string {
  if (!dateStr || dateStr === "Haupt") return dateStr;
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Returns human-readable label for camp day, e.g. "Samstag, 23. Mai 2026"
 */
export function getDayLabel(dateStr: string, activeCamp?: Camp): string {
  if (dateStr === "Haupt") return "Dauerhaft";
  if (!activeCamp) return dateStr;

  const sat = activeCamp.start_date;
  const sun = addDays(sat, 1);
  const mon = activeCamp.end_date;

  const formatDateLabel = (str: string) => {
    try {
      const parts = str.split("-");
      if (parts.length !== 3) return str;
      const day = parseInt(parts[2], 10);
      const month = GERMAN_MONTHS_SHORT[parseInt(parts[1], 10) - 1];
      return `${day}. ${month} ${parts[0]}`;
    } catch {
      return str;
    }
  };

  if (dateStr === sat) return `Samstag, ${formatDateLabel(sat)} (Anreisetag)`;
  if (dateStr === sun) return `Sonntag, ${formatDateLabel(sun)} (Tag 2)`;
  if (dateStr === mon) return `Montag, ${formatDateLabel(mon)} (Abreisetag)`;

  return formatDateLabel(dateStr);
}

/**
 * Formats date to a short German label like "Sa.", "So.", "Mo."
 */
export function getDayAbbrev(dateStr: string, activeCamp?: Camp): string {
  if (dateStr === "Haupt") return "";
  if (!activeCamp) return "";

  const sat = activeCamp.start_date;
  const sun = addDays(sat, 1);
  const mon = activeCamp.end_date;

  if (dateStr === sat) return "Sa.";
  if (dateStr === sun) return "So.";
  if (dateStr === mon) return "Mo.";
  return "";
}

/**
 * Formats a YYYY-MM-DD date to DD.MM.YYYY
 */
export function formatDateGerman(dateStr: string): string {
  if (!dateStr || dateStr === "Haupt") return "Dauerhaft";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

/**
 * Returns short German weekday name, e.g. "Sa", "So", "Mo"
 */
export function getDayNameShort(dateStr: string): string {
  if (!dateStr || dateStr === "Haupt") return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return "";
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return GERMAN_WEEKDAYS_SHORT[date.getDay()] || "";
}

/**
 * Returns full German weekday name, e.g. "Samstag", "Sonntag"
 */
export function getDayName(dateStr: string): string {
  if (!dateStr || dateStr === "Haupt") return "Dauerhaft";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return "";
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return GERMAN_WEEKDAYS_LONG[date.getDay()] || "";
}

/**
 * Formats a date with a short weekday prefix (Sa, So, Mo) based on active camp dates.
 * Output style: "Sa, 23.05." or similar.
 */
export function formatDateWithDayPrefix(dateStr: string, activeCamp?: Camp): string {
  if (!dateStr || dateStr === "Haupt") return "Dauerhaft";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  
  let prefix = "";
  if (activeCamp) {
    const sat = activeCamp.start_date;
    const sun = addDays(sat, 1);
    const mon = activeCamp.end_date;
    
    if (dateStr === sat) prefix = "Sa, ";
    else if (dateStr === sun) prefix = "So, ";
    else if (dateStr === mon) prefix = "Mo, ";
  }
  
  if (!prefix) {
    const sName = getDayNameShort(dateStr);
    prefix = sName ? `${sName}, ` : "";
  }
  
  return `${prefix}${parts[2]}.${parts[1]}.`;
}

/**
 * Safely shows a notification using either the Service Worker (required on Android Chrome)
 * or the standard browser Notification API as a fallback.
 */
export function sendLocalNotification(title: string, options?: any) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("Notifications not supported in this environment.");
      return;
    }
    
    if (window.Notification.permission !== "granted") {
      console.warn("Notification permission is not granted.");
      return;
    }
  } catch (e) {
    console.warn("Notification API access denied in this context:", e);
    return;
  }

  // Set default app branding and badge configs
  const notificationOptions = {
    body: options?.body || "",
    icon: window.location.origin + "/logo-192.png",
    badge: window.location.origin + "/logo-192.png",
    vibrate: [200, 100, 200],
    ...options
  };

  // Deduplication guard to ensure identical notifications are never fired consecutively in short intervals
  const cacheKey = `notif_${title}_${notificationOptions.body}`;
  const now = Date.now();
  if (typeof (window as any)._lastNotifTimestamps !== "object") {
    (window as any)._lastNotifTimestamps = {};
  }
  const lastTime = (window as any)._lastNotifTimestamps[cacheKey] || 0;
  if (now - lastTime < 3500) {
    console.log("[Deduplication] Blocked duplicate notification trigger within interval:", title);
    return;
  }
  (window as any)._lastNotifTimestamps[cacheKey] = now;

  const isAndroid = /Android/i.test(navigator.userAgent);

  const fireStandardNotification = () => {
    try {
      new window.Notification(title, notificationOptions);
      console.log("Fired single standard browser notification:", title);
    } catch (e) {
      console.error("Standard browser Notification failed:", e);
    }
  };

  // Choose exactly ONE delivery mechanism to avoid multi-firing
  if (hasServiceWorkerSupport()) {
    navigator.serviceWorker.getRegistration()
      .then((reg) => {
        if (reg) {
          // If we have an active service worker registration, use it to show the notification ONCE
          reg.showNotification(title, notificationOptions)
            .then(() => {
              console.log("Fired single Service Worker notification:", title);
            })
            .catch((err) => {
              console.warn("SW showNotification failed, trying standard fallback:", err);
              if (!isAndroid) fireStandardNotification();
            });
        } else {
          // Fallback if no active service worker is registered
          if (!isAndroid) fireStandardNotification();
        }
      })
      .catch((err) => {
        console.warn("Failed to query serviceWorker registration, fallback to standard:", err);
        if (!isAndroid) fireStandardNotification();
      });
  } else {
    // Desktop native fallback
    fireStandardNotification();
  }
}

/**
 * Utility helper to convert URL safe base64 to standard Uint8Array key context
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registers a native W3C Push Subscription directly associated with the specified helper userId
 */
export async function registerPushSubscription(userId: string): Promise<void> {
  if (!hasServiceWorkerSupport() || typeof window === "undefined" || !("PushManager" in window)) {
    console.warn("W3C Push Messages are not supported or blocked in this browser context.");
    return;
  }

  try {
    const permission = Notification.permission;
    if (permission !== "granted") {
      console.warn("Notification permission is not granted; skipping push registration.");
      return;
    }

    const reg = await navigator.serviceWorker.ready;
    if (!reg) {
      console.warn("No active PWA Service Worker ready.");
      return;
    }

    // 1. Fetch backend generated VAPID public key
    const res = await fetch("/api/notifications/vapid-public-key");
    if (!res.ok) {
      console.error("VAPID public key retrieval failed:", res.statusText);
      return;
    }
    const { publicKey } = await res.json();
    if (!publicKey) {
      console.warn("VAPID public key is empty or null.");
      return;
    }

    // 2. Generate/Retrieve subscription block from browser
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    console.log("Device push subscription recognized: ", subscription.endpoint);

    // 3. Register this endpoint to the backend
    const saveRes = await fetch("/api/notifications/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        subscription
      })
    });

    if (saveRes.ok) {
      console.log("Success: Push subscription successfully synchronized to database.");
    }
  } catch (err) {
    console.error("Failed to setup Web Push Subscription for active browser:", err);
  }
}

/**
 * Unsubscribes current browser push endpoint and deregisters it on the backend.
 * Wipes registered subscriptions for this user in db.json to guarantee no duplicate push notifications.
 */
export async function unregisterPushSubscription(userId: string, cleanupAll: boolean = true): Promise<{ success: boolean; message: string }> {
  if (!hasServiceWorkerSupport() || typeof window === "undefined") {
    return { success: false, message: "Unterstützung für Service Worker fehlt im Browser." };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let endpoint: string | undefined = undefined;

    if ("PushManager" in window) {
      try {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          endpoint = sub.endpoint;
          // Deactivate native subscription
          const unsubSuccess = await sub.unsubscribe();
          console.log("Native browser push unsubscribe result:", unsubSuccess);
        }
      } catch (subErr) {
        console.warn("Failed to natively unsubscribe from PushManager:", subErr);
      }
    }

    // Call cleanup API endpoint
    const res = await fetch("/api/notifications/push-unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        endpoint,
        unsubscribeAll: cleanupAll
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, message: errData.error || "Server-Fehler beim Löschen des Push-Abonnements." };
    }

    const data = await res.json();
    return { success: true, message: data.message || "Abo erfolgreich gelöscht." };
  } catch (err: any) {
    console.error("Failed to unregister push subscription:", err);
    return { success: false, message: err.message || "Deregistrierung fehlgeschlagen." };
  }
}


