# Code-Audit Pfingst-App-1.2

Diese Datei ist das lebende Protokoll aller Audit-Funde (Sicherheit, Performance,
Bugs/Korrektheit, Code-Qualität) für dieses Projekt. Claude soll diese Datei bei
jedem größeren Arbeitsschritt im Blick behalten und den Nutzer aktiv daran
erinnern, solange offene Punkte bestehen.

## Pflegeregeln (für Claude, verbindlich)

1. **Erledigte Punkte werden gelöscht, nicht nur abgehakt.** Sobald ein Fund
   behoben und verifiziert ist (Lint/Build/Tests grün, Fix tatsächlich
   umgesetzt), wird der Eintrag komplett aus dieser Datei entfernt statt nur
   markiert. Die Datei soll immer nur zeigen, was *noch* offen ist. Der Commit,
   der den Fix macht, sollte auch diese Datei aktualisieren (Eintrag raus).
2. **Bei jeder Sitzung, in der an diesem Projekt gearbeitet wird**, kurz
   prüfen, ob offene Punkte bestehen, und den Nutzer daran erinnern (z. B. am
   Anfang oder Ende der Antwort, kurz und unaufdringlich - keine Wall of Text
   bei jeder einzelnen Nachricht).
3. **Inkrementelles Audit statt immer alles neu prüfen** (siehe unten).
4. Neue Funde aus einem Folge-Audit werden nach demselben Schema (Tabelle,
   Schweregrad, Datei:Zeile, Risiko) ergänzt.

## Inkrementeller Audit-Mechanismus

Jeder Audit-Durchlauf trägt sich unten unter "Audit-Historie" mit Datum und
Git-Commit-Hash ein, gegen den geprüft wurde. Für den **nächsten** Audit gilt:

- Zuerst `git diff <letzter-Audit-Commit>..HEAD --name-only` ausführen, um zu
  sehen, welche Dateien sich seither geändert haben.
- **Nur geänderte Dateien werden vollständig neu geprüft.** Unveränderte
  Dateien werden übersprungen - es sei denn, einer der folgenden Fälle trifft
  zu (dann lohnt sich ein erneuter Blick trotzdem):
  - Die geänderte Datei hängt eng mit einer unveränderten zusammen (z. B. eine
    Route in `server/routes/shifts.ts` geändert, aber `server/conflicts.ts`
    nicht - dort aber verwandte Logik, die aus dem Zusammenspiel heraus neu
    bewertet werden sollte).
  - Es geht um eine **projektweite/übergreifende** Kategorie, die sich nicht
    an einzelnen Dateien festmacht (z. B. neue bekannte CVEs in unveränderten
    Abhängigkeiten in `package.json`, ein neues Sicherheitsmuster, das beim
    letzten Mal noch nicht gesucht wurde).
  - Seit dem letzten Audit ist viel Zeit vergangen bzw. sehr viele Commits
    sind dazugekommen (Faustregel: mehr als ~30 Commits oder mehr als ~2
    Monate) - dann lieber einen vollständigen Audit statt eines rein
    inkrementellen fahren, da sich Annahmen über das Gesamtsystem in der
    Zwischenzeit verschoben haben können.
  - Der Nutzer bittet explizit um einen kompletten Neu-Audit eines Bereichs.
- Das Ergebnis (welche Dateien geprüft wurden, welche übersprungen) kurz in
  der Audit-Historie vermerken, damit der nächste Durchlauf darauf aufbauen
  kann.

## Audit-Historie

| Datum | Commit | Umfang | Ergebnis |
|---|---|---|---|
| 2026-08-06 | `28ac5f8` | Vollständiger Erst-Audit (Sicherheit, Performance, Bugs, Code-Qualität), gesamte Codebase (119 Dateien, ~22.400 Zeilen) via 4 parallele Recherche-Agenten | 24 Funde, siehe unten |
| 2026-08-06 | siehe Commit "Kritische Sicherheitsfunde behoben" | Fix der 3 kritischen Sicherheitsfunde: `server/conflicts.ts` (XSS-Escaping), `server/routes/exportHtmlTemplate.ts` (PIN-Hash-Leak), `server/auth.ts`/`server/routes/auth.ts` (Brute-Force-Sperre) | Alle 3 verifiziert (End-to-End gegen echten Server getestet) und aus der Liste entfernt. Restliche 21 Funde unverändert offen. |

---

## Offene Funde

### Kritisch

_Keine offenen Punkte mehr - siehe Audit-Historie._

### Hoch

- [ ] **Keine serverseitige Kapazitätsprüfung bei Zuweisung**
  `server/routes/shifts.ts` `POST /assignments` (Zeilen 233-313) validiert
  nur Zeitüberschneidung pro Nutzer, nie `max_persons`/`min_persons`. Zwei
  gleichzeitige Selbst-Eintragungen können eine Schicht überbuchen, ohne dass
  eine der beiden Anfragen abgelehnt wird.

- [ ] **"Letzte Lagerleitung kann sich nicht selbst degradieren" nur clientseitig**
  `src/components/AccessRoleManager.tsx:60-64` blockt es im UI;
  `server/routes/auth.ts` `PUT /auth/admin/access-role/:userId` (91-105) hat
  keine äquivalente Prüfung. Ein direkter API-Call kann alle
  Lagerleitungs-Zugänge entziehen → Team komplett ausgesperrt.

- [ ] **Konflikt-"Umbesetzen" kann trotz Erfolgsmeldung wirkungslos bleiben**
  `src/components/DashboardConflicts.tsx:132-149` ruft
  `onRemoveAssignment` (= `handleRemoveAssignmentWithUndo`,
  `src/App.tsx:106-115`) auf, was nur einen 6-Sekunden-Undo-Timer startet,
  nicht sofort löscht. Verlässt die Bereichsleitung die Seite innerhalb der
  Frist, verfällt der Timer ungenutzt (`useUndoableDelete.ts:67-71`), die
  alte Zuweisung bleibt bestehen - UI zeigt aber "umbesetzt".

- [ ] **`max_persons`-Prüfung inkonsistent zwischen Ansichten**
  `src/components/CalendarCard.tsx` (Zeilen 64,119-127,178,314) liest nur
  `svc.max_persons` (Service-Standard); `src/components/ShiftRow.tsx:57`
  löst korrekt den Schicht-Override auf
  (`s.max_persons ?? svc.max_persons`); `server/conflicts.ts:76` prüft
  ebenfalls nur den Service-Standard. Individuelle Kapazitäts-Anpassungen
  einer einzelnen Schicht wirken je nach Ansicht unterschiedlich oder gar
  nicht.

- [ ] **Jede Mutation lädt die komplette Datenbank neu (13 Endpunkte)**
  `src/hooks/useZeltlagerData.ts:136-194`, `loadDatabase()`, 33 Aufrufstellen
  in den `use*Data.ts`-Hooks. Ein Tap auf "Zusagen" löst 13 HTTP-Requests aus
  statt einer lokalen optimistischen Aktualisierung - widerspricht direkt
  "Offline First"/"Hohe Geschwindigkeit" aus CLAUDE.md.

- [ ] **Kein Code-Splitting pro Tab, 846 KB / 225 KB gzip Hauptbundle**
  `src/components/TabContentManager.tsx:3-14` importiert alle Tab-Views
  statisch. Ein Helfer, der nur "Mein Plan" nutzt, lädt auch alle
  Admin-Ansichten (CampsView, VerwaltungHubView, ProgramSog*, etc.) beim
  ersten Laden mit.

- [ ] **Unbehandelte Promise-Rejection bei Selbst-Eintragung im Kalender**
  `src/components/CalendarCard.tsx:317,384,435` ruft `onAddAssignment` ohne
  `await`/`try-catch` auf. Bei Zeitüberschneidung (Server antwortet 409)
  passiert beim Klick sichtbar nichts - kein Fehlerhinweis. Verletzt CLAUDE.md
  §8 ("Nutzer informieren"). `ShiftsView.tsx:184-200` macht es an anderer
  Stelle bereits richtig (Vorlage vorhanden).

### Mittel

- [ ] **HTTP-Statuscode-Typo**: `res.status(444)` statt `404` für
  "Zuweisung nicht gefunden" (`server/routes/shifts.ts:383`), während der
  fast identische Handler 17 Zeilen weiter unten korrekt 404 nutzt.

- [ ] **Zu weiter PII-Lesezugriff**: `GET /users`
  (`server/routes/people.ts:11-14`) liefert E-Mail, Telefon und interne
  Notizen jedes Nutzers an jeden eingeloggten Helfer, nicht nur die für die
  Schicht-Zuweisung nötigen Namen.

- [ ] **`CalendarCard`/`ShiftRow` nicht memoized** → unnötige
  O(n)-Neuberechnungen bei jedem Öffnen eines Zuweisungs-Popovers
  (`CalendarCard.tsx:407-430`, dupliziert in `ShiftDeployWizard.tsx`). Kein
  einziges `React.memo` im gesamten `src/components/`-Ordner.

- [ ] **Verwundbare `xlsx`-Abhängigkeit** (`package.json`, `^0.18.5`,
  bekannte Prototype-Pollution/ReDoS-Advisories ohne gefixte Version am
  öffentlichen Registry). Nur clientseitig beim Excel-Import nutzbar
  (`src/hooks/useCommunityImport.ts:125`), Angriffsfläche daher begrenzt.

- [ ] **Keine CORS-/Security-Header** (kein `helmet`, kein CSP) in
  `server.ts` - würde den XSS-Fund oben zusätzlich entschärfen.

- [ ] **`CalendarCard.tsx` mit `any`-Typen** (`users: any[]`,
  `suggestions: any[]`, `onRemoveAssignment: (...) => any`), obwohl
  `ShiftRow.tsx` dieselben Props bereits korrekt typisiert und `User` sogar
  ungenutzt importiert wird.

- [ ] **Duplizierte Filterlogik** in `src/components/HeaderGlobalSearch.tsx`
  (Zeilen 60-129): 7 fast identische `useMemo`-Blöcke mit derselben
  `toLowerCase().includes()`-Kette statt eines gemeinsamen Helpers.

- [ ] **`ServiceFormModal.tsx` validiert nicht `max_persons >= min_persons`**
  (weder Client noch Server) - führt zu dauerhaft unerfüllbaren
  Kapazitätsvorgaben.

### Niedrig (Aufräumen, kein akutes Risiko)

- [ ] Tote Props/Imports: `CalendarPersonStats.tsx` (`startDate`, `sunDate`,
  `endDate`, `onClearPersonFilter` nie gelesen), `AlertsView.tsx`
  (`onUpdateUser` ungenutzt), `CalendarView.tsx` (8 ungenutzte
  lucide-react-Icon-Importe), `DashboardView.tsx` (`addDays`),
  `Navigation.tsx` (`isAdmin`-Prop), `ShiftRow.tsx` (`MapPin`-Icon,
  `loadingSuggestions`-Prop), `server/db.ts` (`webpush`, `Camp`, `Shift`,
  `ShiftAssignment`), `server/routes/auth.ts` (`sanitizeUsers`),
  `server/routes/program.ts` (`requireMinRole`).
- [ ] Tailwind-Tippfehler ohne Wirkung (erzeugen keine CSS-Regel):
  `placeholder-slate-705`, `focus:border-cyan-505`, `border-slate-705`
  (`PersonFormModal.tsx:262,273`, `PrintView.tsx:204-205`).
- [ ] Uneinheitliches Error-Handling zwischen `server/routes/*.ts`-Dateien
  (`notifications.ts` mit durchgängigem try/catch, andere Routen ohne).
- [ ] `server/db.ts` `writeDB()` macht bei jeder Schreibung ein
  **synchrones, blockierendes** `fs.writeFileSync` der kompletten Datei
  (Zeilen 94-98) - bei aktueller Datengröße unkritisch (~85 KB), aber
  blockiert den Event-Loop und wird bei mehr Daten/parallelen Schreibungen
  zum Problem.
- [ ] `computeConflicts()` in `server/conflicts.ts:72-84` ist
  O(Schichten × Zuweisungen) statt einer Map-basierten Zählung - bei
  aktueller Größe (~17.000 Operationen) trivial, aber leicht zu verbessern.
- [ ] `ShiftsView.tsx:149` (`visibleShifts`-Filter) nicht in `useMemo`
  gewrappt, anders als der Rest der Datei.
- [ ] Bedeutungslose `key?: any;` in den Prop-Interfaces von
  `CalendarCard.tsx:7` und `ShiftRow.tsx:7` (React-`key` ist nie als Prop
  zugreifbar).

---

*Nicht als Fund gewertet (geprüft, aber unproblematisch): PIN-Hashing
(scrypt + Salt + timingSafeEqual), Rollenprüfungen auf allen anderen
mutierenden Routen, `db.json`/`.env`/Firebase-Service-Account korrekt
gitignored, keine Race Conditions in `readDB()/writeDB()` (synchron, kein
await dazwischen), `addDays()`-Datumslogik trotz UTC/lokal-Mix numerisch
verifiziert korrekt, bereits erledigtes Lazy-Loading von
jspdf/html2canvas/xlsx funktioniert nachweislich.*
