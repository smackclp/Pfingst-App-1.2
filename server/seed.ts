import webpush from "web-push";
import { User, Service, Shift, ShiftAssignment, DB, AccessRole } from "./types";
import { hashPin } from "./pin";

// Standard-PIN für alle Seed-Nutzer*innen ("1234"). Muss beim ersten produktiven
// Einsatz von der Lagerleitung geändert werden (Hinweis erscheint im Frontend).
const DEFAULT_SEED_PIN = "1234";

/**
 * Weist jedem Seed-Nutzer eine sinnvolle Standard-Zugriffsrolle zu:
 * - "user-maria" (Hauptleitung laut notes) -> lagerleitung
 * - fachliche Rolle enthält "HV" (Hauptverantwortliche/r eines Bereichs) -> bereichsleiter
 * - alle anderen -> helfer
 * Jede*r bekommt zusätzlich eine gehashte Standard-PIN, damit sich niemand ausgesperrt
 * findet; die PIN sollte nach dem ersten Login persönlich geändert werden.
 */
function withAccessDefaults(users: User[]): User[] {
  const defaultPinHash = hashPin(DEFAULT_SEED_PIN);
  return users.map((u) => {
    let access_role: AccessRole = "helfer";
    if (u.id === "user-maria") {
      access_role = "lagerleitung";
    } else if (u.role && u.role.includes("HV")) {
      access_role = "bereichsleiter";
    }
    return { ...u, access_role, pin_hash: defaultPinHash };
  });
}

// Fester Notfall-/Erstzugang für die Lagerleitung, unabhängig vom Personen-Roster.
// Nützlich, falls einmal niemand mehr auf einen Lagerleitungs-Account zugreifen kann.
// PIN sollte nach dem ersten Login umgehend geändert werden (Menü: eigene PIN ändern).
const ADMIN_BOOTSTRAP_USER: User = {
  id: "user-admin-lagerleitung",
  first_name: "Admin",
  last_name: "Zugang",
  display_name: "Admin-Zugang",
  role: "Administration",
  active: true,
  access_role: "lagerleitung",
  pin_hash: hashPin("9000"),
};

export const initialUsers: User[] = [
  { id: "user-maria", first_name: "Maria", last_name: "Sp.", display_name: "Maria", role: "HV", active: true, notes: "Hauptleitung" },
  { id: "user-robert-g", first_name: "Robert", last_name: "G.", display_name: "Robert G.", role: "Leiter", active: true },
  { id: "user-mika", first_name: "Mika", last_name: "K.", display_name: "Mika", role: "HV / Teamer", active: true },
  { id: "user-dirk", first_name: "Dirk", last_name: "S.", display_name: "Dirk", role: "Teamer", active: true },
  { id: "user-monika", first_name: "Monika", last_name: "B.", display_name: "Monika", role: "HV / Küche", active: true },
  { id: "user-robert-l", first_name: "Robert", last_name: "L.", display_name: "Robert L.", role: "HV / Teamer", active: true },
  { id: "user-verena-o", first_name: "Verena", last_name: "O.", display_name: "Verena O.", role: "HV / Teamer", active: true },
  { id: "user-verena-l", first_name: "Verena", last_name: "L.", display_name: "Verena L.", role: "HV / Teamer", active: true },
  { id: "user-anna-st", first_name: "Anna", last_name: "St.", display_name: "Anna St.", role: "Teamer", active: true },
  { id: "user-johannes", first_name: "Johannes", last_name: "P.", display_name: "Johannes", role: "Teamer / Pastor", active: true },
  { id: "user-tine", first_name: "Tine", last_name: "M.", display_name: "Tine", role: "Teamer", active: true },
  { id: "user-wiebke", first_name: "Wiebke", last_name: "H.", display_name: "Wiebke", role: "HV / Teamer", active: true },
  { id: "user-caro", first_name: "Caro", last_name: "B.", display_name: "Caro", role: "HV / Teamer", active: true },
  { id: "user-markus", first_name: "Markus", last_name: "K.", display_name: "Markus", role: "HV / Imbiss", active: true },
  { id: "user-bekki", first_name: "Bekki", last_name: "H.", display_name: "Bekki", role: "HV", active: true },
  { id: "user-dennis", first_name: "Dennis", last_name: "W.", display_name: "Dennis", role: "Teamer", active: true },
  { id: "user-anne-w", first_name: "Anne", last_name: "W.", display_name: "Anne W.", role: "HV", active: true },
  { id: "user-marlies-benten", first_name: "Marlies", last_name: "B.", display_name: "Marlies", role: "Teamer", active: true },
  { id: "user-maike", first_name: "Maike", last_name: "N.", display_name: "Maike", role: "HV / Teamer", active: true },
  { id: "user-anja", first_name: "Anja", last_name: "P.", display_name: "Anja", role: "HV", active: true },
  { id: "user-judith", first_name: "Judith", last_name: "U.", display_name: "Judith", role: "Teamer", active: true },
  { id: "user-laura", first_name: "Laura", last_name: "D.", display_name: "Laura", role: "Teamer", active: true },
  { id: "user-simon-h", first_name: "Simon", last_name: "H.", display_name: "Simon H.", role: "Teamer", active: true },
  { id: "user-arne", first_name: "Arne", last_name: "F.", display_name: "Arne", role: "Teamer", active: true },
  { id: "user-thomas-v", first_name: "Thomas", last_name: "V.", display_name: "Thomas", role: "HV / Technik", active: true },
  { id: "user-fabian", first_name: "Fabian", last_name: "Z.", display_name: "Fabian", role: "Teamer / Technik", active: true },
  { id: "user-maria-sp", first_name: "Maria", last_name: "Sp.", display_name: "Maria Sp.", role: "HV", active: true },
  { id: "user-vanessa", first_name: "Vanessa", last_name: "S.", display_name: "Vanessa", role: "Teamer", active: true },
  { id: "user-neele", first_name: "Neele", last_name: "G.", display_name: "Neele", role: "Teamer", active: true },
  { id: "user-petra", first_name: "Petra", last_name: "K.", display_name: "Petra", role: "Teamer", active: true },
  { id: "user-constanze", first_name: "Constanze", last_name: "M.", display_name: "Constanze", role: "Teamer", active: true },
  { id: "user-jutta", first_name: "Jutta", last_name: "O.", display_name: "Jutta", role: "Teamer", active: true },
  { id: "user-freya", first_name: "Freya", last_name: "B.", display_name: "Freya", role: "Teamer", active: true },
  { id: "user-haffe", first_name: "Haffe", last_name: "W.", display_name: "Haffe", role: "Teamer", active: true },
  { id: "user-jette", first_name: "Jette", last_name: "R.", display_name: "Jette", role: "Teamer", active: true },
  { id: "user-greta", first_name: "Greta", last_name: "H.", display_name: "Greta", role: "Teamer", active: true },
  { id: "user-caroline", first_name: "Caroline", last_name: "F.", display_name: "Caroline", role: "Teamer", active: true },
  { id: "user-johann", first_name: "Johann", last_name: "V.", display_name: "Johann", role: "Teamer", active: true },
  { id: "user-simon-k", first_name: "Simon", last_name: "K.", display_name: "Simon K.", role: "Teamer", active: true },
  { id: "user-thea", first_name: "Thea", last_name: "N.", display_name: "Thea", role: "Teamer", active: true },
  { id: "user-heidi", first_name: "Heidi", last_name: "K.", display_name: "Heidi", role: "Teamer", active: true },
  { id: "user-haus", first_name: "Haus", last_name: "Gast", display_name: "Haus", role: "Teamer", active: true },
  { id: "user-maria-g", first_name: "Maria", last_name: "G.", display_name: "Maria G.", role: "Teamer", active: true },
  { id: "user-verena-m", first_name: "Verena", last_name: "M.", display_name: "Verena M.", role: "Teamer", active: true },
  { id: "user-leo", first_name: "Leo", last_name: "", display_name: "Leo", role: "Teamer", active: true },
];

export const initialServices: Service[] = [
  { id: "service-aw", title: "Awareness-Team", description: "Beobachten, Unterstützen und Ansprechpartner sein", location: "Lagergelände", color: "#8b5cf6", category: "Wache", default_duration: 120, min_persons: 2, max_persons: 4, responsible_id: "user-maria" },
  { id: "service-bStage", title: "Bühne", description: "Bühnenbereich betreuen und koordinieren", location: "Bühne", color: "#3b82f6", category: "Technik", default_duration: 180, min_persons: 1, max_persons: 3, responsible_id: "user-mika" },
  { id: "service-bunter-abend", title: "Bunter Abend Orga", description: "Organisation des abendlichen Entertainment-Programms", location: "Bühne", color: "#ec4899", category: "Programm", default_duration: 150, min_persons: 1, max_persons: 4, responsible_id: "user-mika" },
  { id: "service-don-bosco", title: "Don Bosco Cafe", description: "Verkauf und Bewirtung im gemütlichen Zelt-Cafe", location: "Cafe", color: "#f59e0b", category: "Küche", default_duration: 180, min_persons: 1, max_persons: 2, responsible_id: "user-monika" },
  { id: "service-essen", title: "Essensausgabe", description: "Essen schöpfen und Küchenhilfe", location: "gr. Speisesaal", color: "#10b981", category: "Küche", default_duration: 90, min_persons: 2, max_persons: 6, responsible_id: "user-robert-l" },
  { id: "service-fussball", title: "Fussballpokalschießen", description: "Turnierorganisation und Betreuung", location: "Fussballplatz / Haupthaus", color: "#10b981", category: "Programm", default_duration: 90, min_persons: 2, max_persons: 5, responsible_id: "user-verena-o" },
  { id: "service-gottesdienst", title: "Gottesdienste Orga", description: "Planung und Durchführung von Zeltgottesdiensten", location: "Zeltkirche", color: "#6366f1", category: "Programm", default_duration: 120, min_persons: 2, max_persons: 5, responsible_id: "user-verena-l" },
  { id: "service-gute-nacht", title: "Gute Nacht", description: "Abendlicher Rundgang und Ruhe im Lager", location: "Zelte", color: "#1e1b4b", category: "Wache", default_duration: 60, min_persons: 1, max_persons: 2, responsible_id: "user-caro" },
  { id: "service-imbiss", title: "Imbiss", description: "Zubereitung von Pommes, Burgern und Crêpes", location: "Imbisswagen", color: "#ef4444", category: "Küche", default_duration: 180, min_persons: 1, max_persons: 4, responsible_id: "user-markus" },
  { id: "service-info", title: "Infowagen", description: "Anmeldungen, Fragen und Materialverleih", location: "Infowagen", color: "#14b8a6", category: "Logistik", default_duration: 180, min_persons: 1, max_persons: 2, responsible_id: "user-bekki" },
  { id: "service-kaffeezelt", title: "Kaffeezelt", description: "Bewirtung im Kaffeezelt", location: "Kaffeezelt", color: "#f59e0b", category: "Küche", default_duration: 120, min_persons: 1, max_persons: 3, responsible_id: "user-anne-w" },
  { id: "service-kiosk", title: "Kiosk", description: "Süßigkeiten- und Getränkeverkauf", location: "Kiosk", color: "#f43f5e", category: "Logistik", default_duration: 180, min_persons: 1, max_persons: 3, responsible_id: "user-caro" },
  { id: "service-wc", title: "WC Dienst", description: "Toilettenwagen reinigen und auffüllen", location: "Toilettenwagen", color: "#6b7280", category: "Hygiene", default_duration: 240, min_persons: 1, max_persons: 4, responsible_id: "user-maike" },
  { id: "service-kreativ-gross", title: "Kreatives Großprojekt", description: "Kreativ- und Bastelaktionen für das ganze Lager", location: "Remise", color: "#ec4899", category: "Programm", default_duration: 120, min_persons: 2, max_persons: 4, responsible_id: "user-anja" },
  { id: "service-wache", title: "Nachtwache", description: "Schutz- und Sicherheitsdienst in der Nacht", location: "Lagergelände", color: "#0f172a", category: "Wache", default_duration: 120, min_persons: 2, max_persons: 5, responsible_id: "user-maike" },
  { id: "service-patinnen", title: "Pat:innen System", description: "Betreuungssystem für neue Lagerteilnehmer:innen", location: "Lagerplatz", color: "#8b5cf6", category: "Logistik", default_duration: 120, min_persons: 2, max_persons: 4, responsible_id: "user-wiebke" },
  { id: "service-schmier", title: "Schmierkomando", description: "Brötchen schmieren für Ausflüge", location: "gr. Speisesaal", color: "#84cc16", category: "Küche", default_duration: 120, min_persons: 2, max_persons: 5, responsible_id: "user-anne-w" },
  { id: "service-spiel", title: "Spiel ohne Grenzen", description: "Großes Geländespiel für Kindergruppen", location: "Sportplatz / Gelände", color: "#f97316", category: "Programm", default_duration: 240, min_persons: 3, max_persons: 8, responsible_id: "user-simon-k" },
  { id: "service-talentshow-vorbereitung", title: "Talentshow Vorbereitungen", description: "Anmeldung und Betreuung vor dem Auftritt", location: "Maria Saal", color: "#84cc16", category: "Programm", default_duration: 120, min_persons: 2, max_persons: 4, responsible_id: "user-thomas-v" },
  { id: "service-technik", title: "Technik", description: "Technik am Tower und auf der Bühne betreuen", location: "Tower und Bühne", color: "#3b82f6", category: "Technik", default_duration: 180, min_persons: 2, max_persons: 4, responsible_id: "user-thomas-v" },
  { id: "service-zeltkirche", title: "Zeltkirche", description: "Betreuung des religiösen Bereichs", location: "Zeltkirche", color: "#6366f1", category: "Programm", default_duration: 120, min_persons: 1, max_persons: 4, responsible_id: "user-maria-sp" },
  { id: "service-strassen", title: "Straßenempfang", description: "Einweisen der neuen Busse an der Zufahrtstraße", location: "Strasse", color: "#06b6d4", category: "Logistik", default_duration: 120, min_persons: 2, max_persons: 5, responsible_id: "user-judith" },
  { id: "service-einweihung", title: "Platzeinweisung", description: "Einweisung der Belegungsgruppen auf die Zeltwiese", location: "Zeltwiese", color: "#22c55e", category: "Logistik", default_duration: 210, min_persons: 2, max_persons: 4, responsible_id: "user-verena-l" },
  { id: "service-platz", title: "Platzdienst", description: "Müll sammeln und Platz sauber halten", location: "Zeltwiese", color: "#16a34a", category: "Hygiene", default_duration: 480, min_persons: 2, max_persons: 4, responsible_id: "user-constanze" },
  { id: "service-bubble", title: "Bubble Football", description: "Betreuung des Riesenball-Turniers", location: "Sportplatz", color: "#3b82f6", category: "Programm", default_duration: 90, min_persons: 1, max_persons: 3, responsible_id: "user-johannes" },
  { id: "service-malwettbewerb", title: "Malwettbewerb", description: "Kreativprogramm mit Leinwänden", location: "Remise", color: "#ec4899", category: "Programm", default_duration: 120, min_persons: 1, max_persons: 5, responsible_id: "user-anja" },
  { id: "service-gästebetreuung", title: "Gästebetreuung/ Kasse", description: "Gäste empfangen und Kassenbuch führen", location: "Empfang", color: "#a855f7", category: "Logistik", default_duration: 180, min_persons: 1, max_persons: 3, responsible_id: "user-robert-g" },
  { id: "service-morgenlob", title: "Morgenlob", description: "Kurzer geistlicher Einstieg in den Tag", location: "Essensausgabe", color: "#eab308", category: "Programm", default_duration: 60, min_persons: 1, max_persons: 2, responsible_id: "user-haffe" },
  { id: "service-casting", title: "Casting Talentshow", description: "Auswahl und Vorbereitung der Talentshow-Teilnehmer", location: "Maria Saal", color: "#84cc16", category: "Programm", default_duration: 75, min_persons: 1, max_persons: 4, responsible_id: "user-dirk" },
  { id: "service-moderation", title: "Talentshow Moderation", description: "Moderation der Talentshow auf der Hauptbühne", location: "Bühne", color: "#d946ef", category: "Programm", default_duration: 150, min_persons: 1, max_persons: 3, responsible_id: "user-simon-k" },
  { id: "service-talentshow", title: "Talentshow Jury/ Orga", description: "Organisation und Bewertung der Talentshow", location: "Bühne / Freizeithalle", color: "#06b6d4", category: "Programm", default_duration: 150, min_persons: 1, max_persons: 4, responsible_id: "user-verena-l" },
  { id: "service-waschstrasse", title: "Waschstrasse", description: "Waschstraße für Geschirr & Töpfe", location: "Zeltplatz", color: "#38bdf8", category: "Logistik", default_duration: 120, min_persons: 1, max_persons: 4, responsible_id: "user-robert-g" },
];

interface SeedShiftData {
  id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  assigned: string[];
}

export const seedShiftsData: SeedShiftData[] = [
  // --- HAUPT (Allgemeine Zuweisungen) ---
  { id: "shift-haupt-aw", service_id: "service-aw", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Awarnessteam", assigned: ["user-maria", "user-robert-g"] },
  { id: "shift-haupt-bStage", service_id: "service-bStage", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Bühne", assigned: ["user-mika", "user-dirk"] },
  { id: "shift-haupt-bunter-abend", service_id: "service-bunter-abend", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Bunter Abend Orga", assigned: ["user-mika", "user-dirk"] },
  { id: "shift-haupt-don-bosco", service_id: "service-don-bosco", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Don Bosco Cafe", assigned: ["user-anja"] },
  { id: "shift-haupt-essen", service_id: "service-essen", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Essensausgabe", assigned: ["user-mika"] },
  { id: "shift-haupt-fussball", service_id: "service-fussball", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Fussballpokalschießen Orga", assigned: ["user-verena-o"] },
  { id: "shift-haupt-gottesdienst", service_id: "service-gottesdienst", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Gottesdienste Orga", assigned: ["user-verena-l", "user-anna-st", "user-johannes", "user-tine", "user-wiebke", "user-verena-o"] },
  { id: "shift-haupt-gute-nacht", service_id: "service-gute-nacht", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Gute Nacht", assigned: ["user-caro"] },
  { id: "shift-haupt-imbiss", service_id: "service-imbiss", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Ort: Imbiss", assigned: ["user-markus", "user-dirk"] },
  { id: "shift-haupt-info", service_id: "service-info", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Ort: Infowagen", assigned: ["user-bekki", "user-dennis"] },
  { id: "shift-haupt-kiosk", service_id: "service-kiosk", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Ort: Kiosk", assigned: ["user-caro", "user-marlies-benten"] },
  { id: "shift-haupt-wc", service_id: "service-wc", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Klodienst", assigned: ["user-maike"] },
  { id: "shift-haupt-kreativ-gross", service_id: "service-kreativ-gross", date: "Camp", start_time: "Dauerhaft", end_time: "", notes: "Kreatives Großprojekt", assigned: ["user-anja", "user-mika"] },
  { id: "shift-haupt-wache", service_id: "service-wache", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Nachtwache", assigned: ["user-maike", "user-dennis", "user-judith", "user-laura", "user-simon-h", "user-arne", "user-verena-l"] },
  { id: "shift-haupt-patinnen", service_id: "service-patinnen", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Pat:innen System", assigned: ["user-wiebke", "user-caro", "user-maria"] },
  { id: "shift-haupt-schmier", service_id: "service-schmier", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Ort: gr. Speisesaal", assigned: ["user-anne-w"] },
  { id: "shift-haupt-spiel", service_id: "service-spiel", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Spiel ohne Grenzen", assigned: ["user-simon-k", "user-thea", "user-verena-o", "user-maike", "user-dirk", "user-dennis", "user-wiebke", "user-vanessa", "user-marlies-benten", "user-judith"] },
  { id: "shift-haupt-talentshow-vorbereitung", service_id: "service-talentshow-vorbereitung", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Talentshow Vorbereitungen", assigned: ["user-thomas-v", "user-verena-l", "user-dirk"] },
  { id: "shift-haupt-technik", service_id: "service-technik", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Ort: Tower und Bühne", assigned: ["user-thomas-v", "user-fabian"] },
  { id: "shift-haupt-waschstrasse", service_id: "service-waschstrasse", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Waschstrasse", assigned: ["user-robert-g", "user-maria"] },
  { id: "shift-haupt-zeltkirche", service_id: "service-zeltkirche", date: "Haupt", start_time: "Dauerhaft", end_time: "", notes: "Ort: Zeltkirche", assigned: ["user-maria-sp", "user-anne-w", "user-caro", "user-freya"] },

  // --- SATURDAY (2026-05-23) ---
  { id: "shift-sat-strassen", service_id: "service-strassen", date: "2026-05-23", start_time: "11:30", end_time: "13:00", notes: "Ort: Strasse", assigned: ["user-judith", "user-vanessa", "user-anne-w", "user-petra", "user-neele", "user-marlies-benten", "user-maria-g"] },
  { id: "shift-sat-einweihung", service_id: "service-einweihung", date: "2026-05-23", start_time: "11:30", end_time: "15:00", notes: "Ort: Zeltwiese", assigned: ["user-verena-m", "user-dennis", "user-maike"] },
  { id: "shift-sat-info1", service_id: "service-info", date: "2026-05-23", start_time: "12:00", end_time: "15:30", assigned: ["user-bekki"] },
  { id: "shift-sat-gaeste", service_id: "service-gästebetreuung", date: "2026-05-23", start_time: "13:00", end_time: "16:00", notes: "Ort: Empfang / Haus", assigned: ["user-robert-g", "user-heidi"] },
  { id: "shift-sat-kiosk1", service_id: "service-kiosk", date: "2026-05-23", start_time: "13:00", end_time: "16:00", notes: "Ort: Kiosk", assigned: ["user-caro", "user-maria-sp", "user-simon-k"] },
  { id: "shift-sat-platz1", service_id: "service-platz", date: "2026-05-23", start_time: "14:00", end_time: "22:00", notes: "Ort: Zeltwiese", assigned: ["user-jutta", "user-constanze"] },
  { id: "shift-sat-fussball-orga", service_id: "service-fussball", date: "2026-05-23", start_time: "14:00", end_time: "15:30", notes: "Ort: Haupthaus", assigned: ["user-verena-o", "user-wiebke"] },
  { id: "shift-sat-bubble", service_id: "service-bubble", date: "2026-05-23", start_time: "14:00", end_time: "15:30", notes: "Ort: Sportplatz", assigned: ["user-johannes", "user-neele", "user-johann"] },
  { id: "shift-sat-imbiss1", service_id: "service-imbiss", date: "2026-05-23", start_time: "14:00", end_time: "17:00", notes: "Ort: Imbiss, ab 15 Uhr Wiebke", assigned: ["user-markus", "user-simon-h", "user-wiebke"] },
  { id: "shift-sat-wc1", service_id: "service-wc", date: "2026-05-23", start_time: "15:00", end_time: "19:00", notes: "Ort: Toilettenwagen", assigned: ["user-laura", "user-vanessa"] },
  { id: "shift-sat-info2", service_id: "service-info", date: "2026-05-23", start_time: "15:30", end_time: "19:00", assigned: ["user-robert-g"] },
  { id: "shift-sat-fussball-turnier", service_id: "service-fussball", date: "2026-05-23", start_time: "15:30", end_time: "17:00", notes: "Ort: Fussballplatz", assigned: ["user-verena-o", "user-greta", "user-caroline", "user-johann"] },
  { id: "shift-sat-kiosk2", service_id: "service-kiosk", date: "2026-05-23", start_time: "16:00", end_time: "19:00", notes: "Ort: Kiosk", assigned: ["user-maria", "user-neele"] },
  { id: "shift-sat-malwettbewerb", service_id: "service-malwettbewerb", date: "2026-05-23", start_time: "16:00", end_time: "18:00", notes: "Ort: Remise", assigned: ["user-anja", "user-judith", "user-maike", "user-marlies-benten", "user-thea"] },
  { id: "shift-sat-imbiss2", service_id: "service-imbiss", date: "2026-05-23", start_time: "17:00", end_time: "20:00", notes: "Ort: Imbiss", assigned: ["user-markus", "user-johannes", "user-leo", "user-verena-o"] },
  { id: "shift-sat-kiosk3", service_id: "service-kiosk", date: "2026-05-23", start_time: "19:00", end_time: "23:59", notes: "Ort: Kiosk, Open End", assigned: ["user-verena-l", "user-verena-o"] },
  { id: "shift-sat-wc2", service_id: "service-wc", date: "2026-05-23", start_time: "19:00", end_time: "23:00", notes: "Ort: Toilettenwagen", assigned: ["user-maria-sp", "user-caroline"] },
  { id: "shift-sat-bunter", service_id: "service-bunter-abend", date: "2026-05-23", start_time: "19:00", end_time: "00:00", notes: "Ort: Bühne, Moderation", assigned: ["user-simon-k", "user-wiebke"] },
  { id: "shift-sat-info3", service_id: "service-info", date: "2026-05-23", start_time: "19:00", end_time: "23:00", assigned: ["user-bekki"] },
  { id: "shift-sat-imbiss3", service_id: "service-imbiss", date: "2026-05-23", start_time: "20:00", end_time: "23:59", notes: "Ort: Imbiss, Open End", assigned: ["user-anne-w", "user-tine", "user-markus", "user-maria-g"] },
  { id: "shift-sat-wache1", service_id: "service-wache", date: "2026-05-23", start_time: "22:00", end_time: "00:00", assigned: ["user-vanessa", "user-verena-o", "user-simon-h"] },

  // --- SUNDAY (2026-05-24) ---
  { id: "shift-sun-wache1", service_id: "service-wache", date: "2026-05-24", start_time: "00:00", end_time: "02:00", assigned: ["user-vanessa", "user-verena-o", "user-simon-h"] },
  { id: "shift-sun-wache2", service_id: "service-wache", date: "2026-05-24", start_time: "02:00", end_time: "04:00", assigned: ["user-judith", "user-marlies-benten", "user-dennis"] },
  { id: "shift-sun-wache3", service_id: "service-wache", date: "2026-05-24", start_time: "04:00", end_time: "06:00", assigned: ["user-maike", "user-laura", "user-dennis"] },
  { id: "shift-sun-platz1", service_id: "service-platz", date: "2026-05-24", start_time: "06:00", end_time: "14:00", notes: "Ort: Zeltwiese, ab 8 Uhr Constanze", assigned: ["user-maria", "user-freya", "user-constanze"] },
  { id: "shift-sun-info1", service_id: "service-info", date: "2026-05-24", start_time: "07:30", end_time: "11:00", assigned: ["user-bekki"] },
  { id: "shift-sun-wc1", service_id: "service-wc", date: "2026-05-24", start_time: "07:00", end_time: "11:00", notes: "Ort: Toilettenwagen", assigned: ["user-freya"] },
  { id: "shift-sun-morgenlob", service_id: "service-morgenlob", date: "2026-05-24", start_time: "08:00", end_time: "09:00", notes: "Ort: Essensausgabe", assigned: ["user-johannes"] },
  { id: "shift-sun-imbiss1", service_id: "service-imbiss", date: "2026-05-24", start_time: "10:00", end_time: "13:00", notes: "Ort: Imbiss", assigned: ["user-simon-h", "user-dirk", "user-markus"] },
  { id: "shift-sun-kiosk1", service_id: "service-kiosk", date: "2026-05-24", start_time: "11:30", end_time: "14:00", notes: "Ort: Kiosk, ab 13:30 Verena L.", assigned: ["user-verena-o", "user-marlies-benten", "user-verena-l"] },
  { id: "shift-sun-wc2", service_id: "service-wc", date: "2026-05-24", start_time: "11:00", end_time: "15:00", notes: "Ort: Toilettenwagen", assigned: ["user-johann", "user-vanessa"] },
  { id: "shift-sun-info2", service_id: "service-info", date: "2026-05-24", start_time: "11:00", end_time: "14:00", assigned: ["user-dennis"] },
  { id: "shift-sun-casting1", service_id: "service-casting", date: "2026-05-24", start_time: "12:15", end_time: "13:30", notes: "Ort: Maria Saal", assigned: ["user-dirk", "user-verena-l", "user-thomas-v"] },
  { id: "shift-sun-imbiss2", service_id: "service-imbiss", date: "2026-05-24", start_time: "13:00", end_time: "16:00", notes: "Ort: Imbiss", assigned: ["user-markus"] },
  { id: "shift-sun-spiel", service_id: "service-spiel", date: "2026-05-24", start_time: "13:30", end_time: "17:30", notes: "Ort: Bühne / Gelände", assigned: ["user-simon-k", "user-thea", "user-verena-o", "user-marlies-benten", "user-dennis", "user-maike", "user-wiebke", "user-judith", "user-laura"] },
  { id: "shift-sun-kiosk2", service_id: "service-kiosk", date: "2026-05-24", start_time: "14:00", end_time: "16:00", notes: "Ort: Kiosk", assigned: ["user-neele", "user-caro"] },
  { id: "shift-sun-platz2", service_id: "service-platz", date: "2026-05-24", start_time: "14:00", end_time: "22:00", notes: "Ort: Zeltwiese", assigned: ["user-constanze", "user-jutta"] },
  { id: "shift-sun-info3", service_id: "service-info", date: "2026-05-24", start_time: "14:00", end_time: "18:00", assigned: ["user-bekki"] },
  { id: "shift-sun-wc3", service_id: "service-wc", date: "2026-05-24", start_time: "15:00", end_time: "19:00", notes: "Ort: Toilettenwagen", assigned: ["user-robert-g"] },
  { id: "shift-sun-imbiss3", service_id: "service-imbiss", date: "2026-05-24", start_time: "16:00", end_time: "19:00", notes: "Ort: Imbiss", assigned: ["user-markus", "user-maria"] },
  { id: "shift-sun-casting2", service_id: "service-casting", date: "2026-05-24", start_time: "17:00", end_time: "18:00", notes: "Ort: Maria Saal", assigned: ["user-dirk", "user-verena-l", "user-thomas-v"] },
  { id: "shift-sun-info4", service_id: "service-info", date: "2026-05-24", start_time: "18:00", end_time: "23:00", assigned: ["user-robert-g"] },
  { id: "shift-sun-moderation", service_id: "service-moderation", date: "2026-05-24", start_time: "18:30", end_time: "21:30", notes: "Ort: Bühne, Moderation", assigned: ["user-simon-k", "user-verena-o"] },
  { id: "shift-sun-talentshow", service_id: "service-talentshow", date: "2026-05-24", start_time: "18:30", end_time: "21:30", notes: "Ort: Bühne / Freizeithalle, Jury/Orga", assigned: ["user-verena-l", "user-thomas-v", "user-dirk"] },
  { id: "shift-sun-wc4", service_id: "service-wc", date: "2026-05-24", start_time: "19:00", end_time: "23:00", notes: "Ort: Toilettenwagen", assigned: ["user-wiebke", "user-jette", "user-greta", "user-caroline"] },
  { id: "shift-sun-imbiss4", service_id: "service-imbiss", date: "2026-05-24", start_time: "19:00", end_time: "23:59", notes: "Ort: Imbiss, Open End", assigned: ["user-tine", "user-markus", "user-maike"] },
  { id: "shift-sun-kiosk3", service_id: "service-kiosk", date: "2026-05-24", start_time: "19:00", end_time: "23:59", notes: "Ort: Kiosk, Open End", assigned: ["user-bekki", "user-freya"] },
  { id: "shift-sun-wache4", service_id: "service-wache", date: "2026-05-24", start_time: "22:00", end_time: "00:00", assigned: ["user-wiebke", "user-marlies-benten", "user-johannes"] },

  // --- MONDAY (2026-05-25) ---
  { id: "shift-mon-wache1", service_id: "service-wache", date: "2026-05-25", start_time: "00:00", end_time: "02:00", assigned: ["user-verena-o", "user-mika", "user-wiebke"] },
  { id: "shift-mon-wache2", service_id: "service-wache", date: "2026-05-25", start_time: "02:00", end_time: "04:00", notes: "Bereitschaft: Dennis", assigned: ["user-laura", "user-maike", "user-dennis"] },
  { id: "shift-mon-wache3", service_id: "service-wache", date: "2026-05-25", start_time: "04:00", end_time: "06:00", notes: "Bereitschaft: Robert G.", assigned: ["user-laura", "user-dennis", "user-robert-g"] },
  { id: "shift-mon-platz1", service_id: "service-platz", date: "2026-05-25", start_time: "06:00", end_time: "14:00", notes: "Ort: Zeltwiese, ab 8 Uhr Constanze", assigned: ["user-freya", "user-maria", "user-constanze"] },
  { id: "shift-mon-info1", service_id: "service-info", date: "2026-05-25", start_time: "07:30", end_time: "10:00", assigned: ["user-dennis"] },
  { id: "shift-mon-wc1", service_id: "service-wc", date: "2026-05-25", start_time: "07:00", end_time: "11:00", notes: "Ort: Toilettenwagen", assigned: ["user-freya"] },
  { id: "shift-mon-morgenlob", service_id: "service-morgenlob", date: "2026-05-25", start_time: "08:00", end_time: "09:00", assigned: ["user-haffe"] },
  { id: "shift-mon-info2", service_id: "service-info", date: "2026-05-25", start_time: "10:00", end_time: "13:59", notes: "Open End", assigned: ["user-bekki"] },
  { id: "shift-mon-imbiss1", service_id: "service-imbiss", date: "2026-05-25", start_time: "10:00", end_time: "13:59", notes: "Ort: Imbiss, Open End", assigned: ["user-simon-h", "user-dirk", "user-markus"] },
  { id: "shift-mon-kiosk1", service_id: "service-kiosk", date: "2026-05-25", start_time: "11:30", end_time: "14:00", notes: "Ort: Kiosk, Open End", assigned: ["user-judith", "user-marlies-benten"] },
  { id: "shift-mon-wc2", service_id: "service-wc", date: "2026-05-25", start_time: "11:00", end_time: "14:59", notes: "Ort: Toilettenwagen, Open End", assigned: ["user-anne-w", "user-maike"] },
];

export const initialShifts: Shift[] = seedShiftsData.map(s => ({
  id: s.id,
  service_id: s.service_id,
  date: s.date,
  start_time: s.start_time,
  end_time: s.end_time,
  notes: s.notes || ""
}));

export const initialAssignments: ShiftAssignment[] = (() => {
  const list: ShiftAssignment[] = [];
  let aCount = 1;
  for (const s of seedShiftsData) {
    for (const uid of s.assigned) {
      list.push({
        id: `ass-${aCount++}`,
        shift_id: s.id,
        user_id: uid,
        assigned_at: new Date().toISOString()
      });
    }
  }
  return list;
})();

export function getDefaultSeedDB(targetYear: number = 2026): DB {
  let vapidKeys = { publicKey: "", privateKey: "" };
  try {
    const keys = webpush.generateVAPIDKeys();
    vapidKeys = { publicKey: keys.publicKey, privateKey: keys.privateKey };
  } catch (err) {
    console.warn("Could not generate VAPID keys in seed:", err);
  }

  const campId = `camp-${targetYear}`;
  const startDate = targetYear === 2027 ? "2027-05-15" : `${targetYear}-05-23`;
  const endDate = targetYear === 2027 ? "2027-05-17" : `${targetYear}-05-25`;
  const title = `Pfingstlager ${targetYear}`;

  const dateMap: Record<string, string> = {
    "2026-05-23": targetYear === 2027 ? "2027-05-15" : `${targetYear}-05-23`,
    "2026-05-24": targetYear === 2027 ? "2027-05-16" : `${targetYear}-05-24`,
    "2026-05-25": targetYear === 2027 ? "2027-05-17" : `${targetYear}-05-25`,
  };

  const shifts = initialShifts.map(s => ({
    ...s,
    camp_id: campId,
    date: dateMap[s.date] || s.date
  }));

  return {
    users: [...withAccessDefaults(initialUsers), ADMIN_BOOTSTRAP_USER],
    services: initialServices,
    shifts,
    assignments: initialAssignments,
    camps: [
      { id: campId, year: targetYear, start_date: startDate, end_date: endDate, title }
    ],
    activeCampId: campId,
    pushSubscriptions: [],
    materials: [],
    functionalRoles: [
      { id: "role-einkauf", name: "Einkauf", user_id: null },
      { id: "role-schichtplanung", name: "Schichtplanung", user_id: "user-verena-m" }
    ],
    communities: [
      { id: "comm-1", name: "Sankt Michael", location: "Schorndorf", participants: 24, camp_id: campId },
      { id: "comm-2", name: "Heilig Kreuz", location: "Stuttgart", participants: 18, camp_id: campId },
      { id: "comm-3", name: "Sankt Markus", location: "Ludwigsburg", participants: 32, camp_id: campId }
    ],
    talentActs: [],
    vapidKeys,
    notifications: []
  };
}
