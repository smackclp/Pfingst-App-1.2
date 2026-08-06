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
| 2026-08-06 | siehe Commit "6 von 7 Hoch-Funden behoben" | Fix von 6 der 7 Hoch-Funde: max_persons-Inkonsistenz (`CalendarCard.tsx`, `conflicts.ts`), serverseitige Kapazitätsprüfung (`shifts.ts`), Server-Guard letzte Lagerleitung (`auth.ts`), Konflikt-Umbesetzen-Bug (`DashboardConflicts.tsx`, neue `onRemoveAssignmentImmediate`-Prop-Kette), unbehandelte Promise-Rejection (`CalendarCard.tsx`), Code-Splitting pro Tab (`TabContentManager.tsx`, React.lazy) | Alle 6 verifiziert (Lint/Build/Browser-Test/E2E-Suite) und aus der Liste entfernt. "Jede Mutation lädt komplette DB neu" bewusst zurückgestellt (größter Punkt, eigene Analyse nötig). |
| 2026-08-06 | siehe Commit "6 von 8 Mittel-Funden behoben" | Fix von 6 der 8 Mittel-Funde: HTTP-Status-Tippfehler 444→404 (`shifts.ts`), PII-Zugriffsbeschränkung auf `notes`-Feld (`people.ts`), React.memo + useCallback-Stabilisierung (`CalendarCard.tsx`, `ShiftRow.tsx`, `CalendarView.tsx`, `ShiftsView.tsx`), `any`-Typen entfernt (`CalendarCard.tsx`), doppelte Filterlogik zusammengeführt (`HeaderGlobalSearch.tsx`), min/max-Validierung client- und serverseitig (`ServiceFormModal.tsx`, `shifts.ts`), Basis-Sicherheits-Header ohne CSP (`server.ts`) | Alle 6 verifiziert (Lint/Build/Node-Verifikationsskript/E2E-Suite, 7/7 grün) und aus der Liste entfernt. `xlsx`-Abhängigkeit und vollständige CSP bewusst zurückgestellt (echte Entscheidungsfragen, siehe unten). |

---

## Offene Funde

### Kritisch

_Keine offenen Punkte mehr - siehe Audit-Historie._

### Hoch

- [ ] **Jede Mutation lädt die komplette Datenbank neu (13 Endpunkte)**
  `src/hooks/useZeltlagerData.ts:136-194`, `loadDatabase()`, 33 Aufrufstellen
  in den `use*Data.ts`-Hooks. Ein Tap auf "Zusagen" löst 13 HTTP-Requests aus
  statt einer lokalen optimistischen Aktualisierung - widerspricht direkt
  "Offline First"/"Hohe Geschwindigkeit" aus CLAUDE.md. Größter verbleibender
  Punkt, betrifft potenziell jeden Mutations-Aufruf im gesamten Projekt -
  braucht vor der Umsetzung eine eigene Analyse/Freigabe, nicht im
  Vorbeigehen mitgemacht.

### Mittel

- [ ] **Verwundbare `xlsx`-Abhängigkeit** (`package.json`, `^0.18.5`,
  bekannte Prototype-Pollution/ReDoS-Advisories, HIGH severity laut
  `npm audit`). Bestätigt: 0.18.5 ist die letzte auf dem offiziellen
  npm-Registry verfügbare Version, gefixte Versionen (≥0.19.3/≥0.20.2) gibt
  es nur noch über SheetJS' eigenes CDN (cdn.sheetjs.com), nicht npm. Reine
  Abhängigkeits-Entscheidung, wartet auf Freigabe: Umstieg auf CDN-Version
  (neue Vertrauens-/Update-Frage) vs. Risiko akzeptieren (nur clientseitig,
  nur bei bewusstem Excel-Import durch Bereichsleitung+ nutzbar,
  `src/hooks/useCommunityImport.ts:125`).

- [ ] **Vollständige Content-Security-Policy fehlt weiterhin.** Die
  risikofreien Basis-Header (X-Content-Type-Options, X-Frame-Options,
  Referrer-Policy) sind seit dem letzten Fix-Durchlauf gesetzt
  (`server.ts`). Eine echte CSP wurde bewusst nicht im Vorbeigehen ergänzt:
  `index.html` enthält ein festes Inline-`<script>` (Early-Error-Suppression),
  das für `script-src` einen eigenen, korrekt berechneten SHA-Hash bräuchte
  (sonst entweder App kaputt oder `'unsafe-inline'` und die CSP damit
  wirkungslos für genau den Fall, den sie verhindern soll). Braucht eine
  eigene, sorgfältig getestete Umsetzung statt einer schnellen Ergänzung.

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
