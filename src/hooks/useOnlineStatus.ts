import React from "react";

/** Verfolgt den Online-/Offline-Status des Browsers. */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));

  React.useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}
