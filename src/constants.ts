/**
 * Application-wide constant configurations for Pfingstlager Dienstplan
 */

// LocalStorage Keys
export const STORAGE_KEYS = {
  THEME: "theme",
  INSTALL_BANNER_HIDDEN: "zeltlager_dashboard_install_banner_hidden_v1",
  WELCOME_CHECKED: "zeltlager_checked_user_welcome_v1",
  PWA_SETUP_DISMISSED: "zeltlager_pwa_setup_dismissed_v1",
  ONBOARDING_SEEN: "zeltlager_onboarding_seen_v1",
  OFFLINE_QUEUE: "zeltlager_offline_queue_v1",
  ALERTED_IDS_PREFIX: "zeltlager_alerted_ids_",
  CURRENT_USER_ID: "zeltlager_current_user_id",
};

// Date & Time Constants
export const GERMAN_MONTHS_SHORT = [
  "Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"
];

export const GERMAN_WEEKDAYS_SHORT = [
  "So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"
];

export const GERMAN_WEEKDAYS_LONG = [
  "Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"
];

// App Roles & Categories
export const USER_ROLES = ["HV", "Leiter", "Teamer", "Küche"];

export const SERVICE_CATEGORIES = ["Wache", "Küche", "Programm", "Logistik", "Technik"];

export const SHIFT_STATUSES = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  MAYBE: "maybe",
} as const;

export const CONFLICT_TYPES = {
  OVERLAP: "overlap",
  OVERCAPACITY: "overcapacity",
} as const;

export const MATERIAL_STATUSES = {
  PENDING: "pending",
  ORDERED: "ordered",
  RECEIVED: "received",
} as const;
