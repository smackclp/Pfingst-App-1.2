// App-Zugriffsrolle (Berechtigungsstufe). Steuert, was jemand sehen/tun darf.
// Unabhängig vom fachlichen "role"-Feld unten (z.B. "HV", "Küche"), das nur die
// Funktion im Lager beschreibt.
export type AccessRole = "helfer" | "bereichsleiter" | "lagerleitung";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email?: string;
  phone?: string;
  role: string; // e.g. "HV", "Leiter", "Teamer", "Küche"
  active: boolean;
  notes?: string;
  is_buyer?: boolean;
  access_role?: AccessRole; // Berechtigungsstufe, s.o. (pin_hash bleibt serverseitig, kommt nie zum Client)
}

export interface Service {
  id: string;
  title: string;
  description: string;
  location: string;
  color: string; // HEX color or tailwind name
  category: string; // e.g. "Wache", "Küche", "Programm", "Logistik", "Technik"
  default_duration: number; // in minutes
  min_persons: number;
  max_persons: number;
  responsible_id?: string; // User ID
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

export interface Camp {
  id: string;
  year: number;
  start_date: string;
  end_date: string;
  title: string;
}

export interface ShiftAssignment {
  id: string;
  shift_id: string;
  user_id: string;
  assigned_at: string; // ISO datetime
  accepted?: boolean;
  status?: 'pending' | 'accepted' | 'declined' | 'maybe';
  status_updated_at?: string; // ISO datetime tracking when status changed
  decline_reason?: string; // Optional reasoning for declines
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

export interface DashboardStats {
  openShiftsCount: number;
  understaffedShiftsCount: number;
  conflictCount: number;
  totalUsersCount: number;
  totalShiftsCount: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export interface MaterialItem {
  id: string;
  user_id: string;     // von wem wird es bestellt (selected or logged-in person)
  item_name: string;   // Artikel
  url?: string;        // Website url z.b. Amazon
  purpose: string;     // wofür wird es benötigt
  quantity?: number;   // optional Menge
  price?: string;      // optional Preis
  created_at: string;  // ISO timestamp
  status?: 'pending' | 'ordered' | 'received'; // optional status management
}

export interface FunctionalRole {
  id: string;
  name: string;        // e.g. "Einkauf", "Schichtplanung"
  user_id: string | null; // Helper user ID assigned
}

export interface Community {
  id: string;
  name: string;         // Gemeindename
  location: string;     // Ort
  participants: number; // Anzahl Teilnehmer*innen
  camp_id: string;      // Tied to a specific camp
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


