export type AccessRole = "helfer" | "bereichsleiter" | "lagerleitung";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email?: string;
  phone?: string;
  role: string;
  active: boolean;
  notes?: string;
  is_buyer?: boolean;
  /** Erhält Push-Benachrichtigungen bei neu erkannten App-Fehlern (Fehler-Monitoring). */
  is_error_monitor?: boolean;
  /** App-Zugriffsrolle (Berechtigungsstufe), unabhängig vom fachlichen "role"-Feld oben. */
  access_role?: AccessRole;
  /** Serverseitig gehashte PIN ("salt:hash"). Wird NIE an den Client gesendet. */
  pin_hash?: string;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  location: string;
  color: string;
  category: string;
  default_duration: number; // minutes
  min_persons: number;
  max_persons: number;
  responsible_id?: string;
}

export interface Shift {
  id: string;
  service_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  notes?: string;
  camp_id?: string;
  min_persons?: number;
  max_persons?: number;
}

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  user_id: string;
  assigned_at: string;
  accepted?: boolean;
  status?: 'pending' | 'accepted' | 'declined' | 'maybe';
  status_updated_at?: string;
  decline_reason?: string;
}

export interface Camp {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  title: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export interface PushSubscriptionItem {
  /** Stabile Dokument-ID für die Firestore-Spiegelung (server/firebase.ts) - unabhängig vom Endpoint, damit ein Update der Subscription nicht die ID ändert. */
  id: string;
  userId: string;
  subscription: any;
}

export interface MaterialItem {
  id: string;
  user_id: string;
  item_name: string;
  url?: string;
  purpose: string;
  quantity?: number;
  price?: string;
  created_at: string;
  status?: 'pending' | 'ordered' | 'received';
  camp_id?: string;
}

export interface FunctionalRole {
  id: string;
  name: string;
  user_id: string | null;
}

export interface Community {
  id: string;
  name: string;
  location: string;
  participants: number;
  camp_id: string;
}

export interface DB {
  users: User[];
  services: Service[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  camps?: Camp[];
  activeCampId?: string;
  notifications?: Notification[];
  pushSubscriptions?: PushSubscriptionItem[];
  vapidKeys?: {
    publicKey: string;
    privateKey: string;
  };
  materials?: MaterialItem[];
  functionalRoles?: FunctionalRole[];
  communities?: Community[];
  talentActs?: TalentAct[];
  sogGroups?: SogTeamGroup[];
  sogStations?: SogStation[];
  /** Ein Eintrag pro Lagerjahr (camp_id), damit Rotationszeiten pro Jahr erhalten bleiben. */
  sogSettings?: (SogSettings & { camp_id: string })[];
}

export interface TalentAct {
  id: string;
  camp_id: string;
  community_name: string;
  talents_names: string;
  act_type: string;
  song_title?: string;
  play_until?: string;
  fade_out: boolean;
  fade_out_desc?: string;
  microphones_count: number;
  instruments?: string;
  lighting_mood?: string;
  spotify_link?: string;
  without_rating: boolean;
  order_index: number;
}

/** "Spiel ohne Grenzen": Gruppen-Einteilung der Gemeinden. */
export interface SogTeamGroup {
  id: string;
  name: string;
  communityIds: string[];
  camp_id?: string;
}

/** "Spiel ohne Grenzen": einzelne Spielstation inkl. Helfer-Zuordnung. */
export interface SogStation {
  id: string;
  number: number;
  title: string;
  description: string;
  location: string;
  materialNeeded: string;
  helperIds: string[];
  camp_id?: string;
}

/** "Spiel ohne Grenzen": Rotationszeiten für den Laufplan. */
export interface SogSettings {
  startTime: string;
  roundDuration: number;
  breakDuration: number;
}

export interface Conflict {
  id: string;
  type: 'overlap' | 'overcapacity';
  message: string;
  userId?: string;
  userName?: string;
  shiftId1?: string;
  shiftId2?: string;
  serviceTitle1?: string;
  serviceTitle2?: string;
  timeRange?: string;
}
