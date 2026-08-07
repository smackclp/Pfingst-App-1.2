import { readDB, writeDB } from "./db";
import { Notification } from "./types";
import webpush from "web-push";

// Ohne Aufräumen wächst die notifications-Collection unbegrenzt über
// Lagerjahre hinweg (jede Benachrichtigung erzeugt ein neues Dokument, siehe
// AUDIT.md) und vergrößert jeden vollständigen Firestore-Reload (Serverstart).
// 90 Tage decken ein Lagerjahr inkl. Nachbereitung großzügig ab.
const NOTIFICATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Dispatches a notification to a user. Saves to db.json for local UI polling
 * and sends standard Web Push notification to any registered mobile or browser subscriptions.
 */
export async function sendNotificationToUser(userId: string, title: string, body: string) {
  try {
    const db = readDB();
    if (!db.notifications) {
      db.notifications = [];
    }

    // 1. Save in the db array
    const newNotification: Notification = {
      id: `notification-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId,
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false,
    };
    db.notifications.push(newNotification);

    // Alte Benachrichtigungen jenseits der Aufbewahrungsfrist entfernen, statt
    // die Collection unbegrenzt wachsen zu lassen.
    const cutoff = Date.now() - NOTIFICATION_RETENTION_MS;
    db.notifications = db.notifications.filter((n) => {
      const ts = n?.timestamp ? new Date(n.timestamp).getTime() : 0;
      return !ts || ts >= cutoff;
    });

    writeDB(db);

    // Find user
    const user = db.users.find((u) => u.id === userId);
    if (user) {
      console.log(`Notification created locally for helper ${user.display_name}: "${title}"`);
    }

    // 2. Forward to physical devices via Web-Push Protocol if user has subscriptions
    const subscriptions = db.pushSubscriptions?.filter((sub) => sub.userId === userId) || [];
    
    if (subscriptions.length > 0 && db.vapidKeys) {
      console.log(`Directing native Web Push to ${subscriptions.length} devices for ${user?.display_name || userId}`);
      
      webpush.setVapidDetails(
        "mailto:reddevil89@web.de",
        db.vapidKeys.publicKey,
        db.vapidKeys.privateKey
      );

      const payload = JSON.stringify({
        title,
        body,
        id: newNotification.id,
        timestamp: newNotification.timestamp
      });

      // Fire delivery in parallel
      const deliveryPromises = subscriptions.map(async (subItem) => {
        try {
          await webpush.sendNotification(subItem.subscription, payload);
          console.log(`Push successfully acknowledged for endpoint: ${subItem.subscription.endpoint.slice(0, 45)}...`);
        } catch (err: any) {
          console.warn(`Push transmission failed for endpoint: ${subItem.subscription.endpoint.slice(0, 45)}... Error:`, err.statusCode || err);
          // Clean up expired (410) or deleted (404) subscriptions
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log(`Cleaning up expired subscription from db.json`);
            const currentDb = readDB();
            if (currentDb.pushSubscriptions) {
              currentDb.pushSubscriptions = currentDb.pushSubscriptions.filter(
                (ps) => ps.subscription?.endpoint !== subItem.subscription?.endpoint
              );
              writeDB(currentDb);
            }
          }
        }
      });

      // Execute push deliveries in background
      Promise.all(deliveryPromises).catch((err) => {
        console.error("Parallel push delivery error:", err);
      });
    }

  } catch (error) {
    console.error("Failed to run sendNotificationToUser:", error);
  }
}
