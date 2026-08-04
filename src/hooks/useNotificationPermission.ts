import React from "react";

/** Verfolgt den Browser-Berechtigungsstatus für Push-Benachrichtigungen (pollt alle 1.5s). */
export function useNotificationPermission(): string {
  const [browserPermission, setBrowserPermission] = React.useState<string>(() => {
    return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const updatePermission = () => {
      if ("Notification" in window) {
        setBrowserPermission(Notification.permission);
      }
    };
    const interval = setInterval(updatePermission, 1500);
    return () => clearInterval(interval);
  }, []);

  return browserPermission;
}
