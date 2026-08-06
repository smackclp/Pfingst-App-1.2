# Code-Audit Pfingst-App-1.2

Diese Datei ist das lebende Protokoll aller Audit-Funde (Sicherheit, Performance,
Bugs/Korrektheit, Code-Qualität) für dieses Projekt. Claude soll diese Datei bei
jedem größeren Arbeitsschritt im Blick behalten und den Nutzer aktiv daran
erinnern, solange offene Punkte bestehen.

## Pflegeregeln (für Claude, verbindlich)

1. **Erledigte Punkte werden gelöscht, nicht nur abgehakt.** Das gilt für
   JEDEN Punkt in dieser Datei, unabhängig vom Abschnitt - Audit-Funde
   (Kritisch/Hoch/Mittel/Niedrig) genauso wie "Geplante Verbesserungen" oder
   künftige neue Abschnitte. Sobald ein Punkt erledigt und verifiziert ist
   (Lint/Build/Tests grün, Umsetzung tatsächlich erfolgt), wird der Eintrag
   komplett aus dieser Datei entfernt statt nur markiert. Die Datei soll
   immer nur zeigen, was *noch* offen ist. Der Commit, der den Punkt
   umsetzt, aktualisiert diese Datei im selben Zug (Eintrag raus).
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
| 2026-08-06 | siehe Commit "Vollständige CSP + xlsx-Risiko-Entscheidung" | Entscheidung Nutzer: `xlsx`-Risiko bewusst akzeptiert (kein CDN-Umstieg); vollständige Content-Security-Policy umgesetzt (`server.ts`, nur Produktion, dynamischer SHA-256-Hash des Inline-Scripts aus `dist/index.html`, `style-src 'unsafe-inline'` für html2canvas/jsPDF-Export) | Beide letzten Mittel-Punkte aus der Liste entfernt. CSP gegen echten Produktions-Build mit Playwright verifiziert (Login, alle Sidebar-Tabs, QR-Kartendruck, PDF-Export/Druckcenter) - keine `securitypolicyviolation`-Events, keine CSP-Konsolenfehler. E2E-Suite (7/7) und Lint weiterhin grün. |
| 2026-08-06 | siehe Commit "7 Niedrig-Funde behoben" | Alle 7 Niedrig-Funde: tote Props/Imports entfernt (9 Dateien), 3 Tailwind-Tippfehler korrigiert, globale JSON-Fehlerbehandlung + fehlende try/catch in den beiden ungeschützten async-Handlern ergänzt (`server.ts`, `system.ts`, `program.ts`), `writeDB()`-Datei-Backup non-blocking gemacht (`db.ts`), `computeConflicts()` auf Map-basierte Zählung umgestellt (`conflicts.ts`), fehlendes `useMemo` in `ShiftsView.tsx` ergänzt; `key?: any` war bereits aus dem Hoch-Batch entfernt (nur Listeneintrag bereinigt) | Alle verifiziert (Lint/Build/E2E-Suite, 7/7 grün - ein Timeout in `assignment-undo.spec.ts` beim ersten Lauf war Sandbox-Flake, isoliert erneut grün) und aus der Liste entfernt. Keine offenen Punkte mehr außer dem zurückgestellten Hoch-Fund. |

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

_Keine offenen Punkte mehr - siehe Audit-Historie._

### Niedrig (Aufräumen, kein akutes Risiko)

_Keine offenen Punkte mehr - siehe Audit-Historie._

---

## Geplante Verbesserungen (kein Audit-Fund, aus App-Bewertung 2026-08-06)

Keine Bugs/Sicherheits-/Performance-Funde, sondern Funktionswünsche, die bei
einer Gesamtbewertung der App als offen identifiziert wurden. Passend zu den
"Geplanten Kernfunktionen" in CLAUDE.md Abschnitt 10.

- [ ] **Automatische Erinnerungen bei unbestätigten Schichten.** Wenn ein
  Helfer eine Schicht lange nicht bestätigt, soll automatisch eine
  freundliche Erinnerung verschickt werden (entlastet Bereichsleitungen,
  siehe CLAUDE.md Abschnitt 10).
- [ ] **Einfaches Fehler-Monitoring in Produktion.** Bislang kein
  zentrales Logging/Alerting für Laufzeitfehler im Live-Betrieb.
- [ ] **Wetter-Hinweis auf dem Dashboard.** Für die Outdoor-Nutzung beim
  Festival relevant (siehe CLAUDE.md Abschnitt 4, Outdoor-Fokus).
- [ ] **Kurzes Feedback-/Fehlermelde-Formular für Helfer.** Niedrigschwellige
  Möglichkeit, Probleme oder Feedback direkt aus der App zu melden.

---

## Bewusste Entscheidungen (Nutzer-Freigabe, kein offener Punkt mehr)

- **`xlsx`-Abhängigkeit (`package.json`, `^0.18.5`):** HIGH-severity
  Prototype-Pollution/ReDoS-Advisories laut `npm audit`, kein Fix auf dem
  offiziellen npm-Registry verfügbar (nur über SheetJS' eigenes CDN,
  cdn.sheetjs.com). Nutzer-Entscheidung: Risiko bewusst akzeptieren, kein
  CDN-Umstieg. Betrifft nur clientseitigen Excel-Import durch
  Bereichsleitung+ (`src/hooks/useCommunityImport.ts:125`). Bei einer
  zukünftigen größeren Abhängigkeits-Aufräumaktion erneut aufgreifen, falls
  sich die Verfügbarkeitslage ändert (z. B. `xlsx` doch wieder auf npm
  gepflegt wird).

- **Content-Security-Policy (`server.ts`):** Vollständig umgesetzt, nur in
  Produktion aktiv (`NODE_ENV === "production"`). Der Hash für
  `script-src` wird beim Serverstart automatisch aus dem tatsächlichen
  Inline-`<script>` in `dist/index.html` berechnet - ändert sich der
  Inhalt, ändert sich der Hash mit, statt die CSP still zu brechen. Im
  Dev-Modus bewusst deaktiviert, da Vites HMR/React-Refresh-Preamble
  eigene, versionsabhängige Inline-Scripts injiziert, die eine strikte CSP
  unvorhersehbar brechen würden. `style-src` enthält `'unsafe-inline'`,
  weil html2canvas (PDF-/Druck-Export) dynamisch berechnete `<style>`-Tags
  injiziert, für die kein statischer Hash möglich ist - deutlich kleineres
  Risiko als `script-src 'unsafe-inline'` (keine Code-Ausführung). Erlaubte
  externe Hosts: `fonts.googleapis.com`/`fonts.gstatic.com` (Google Fonts),
  `api.qrserver.com` (QR-Code-Generierung für Helfer-QuickLogin-Karten),
  `open.spotify.com` (eingebetteter Talentshow-Playlist-Player).

- **Zentrale Fehlerbehandlung (`server.ts`):** Als letzte Middleware nach
  allen Routen registriert. Fängt sowohl automatisch von Express
  abgefangene synchrone throws als auch explizit per `next(err)`
  durchgereichte Fehler ab und antwortet einheitlich mit
  `{error: "..."}` + Status 500 statt Express' HTML-Standardfehlerseite.
  Die zwei einzigen `async`-Handler ohne `await` im gesamten Backend
  (`server/routes/system.ts` `/seed/restore`, `server/routes/program.ts`
  `POST /materials`) waren dadurch bislang ungeschützt: ein synchroner
  throw in einer `async`-Funktion wird zur unbehandelten Promise-Rejection
  statt automatisch von Express abgefangen zu werden (Express 4-Verhalten,
  in Express 5 behoben). `/seed/restore` verlor das unnötige `async`
  (kein `await` im Body), `/materials` bekam ein eigenes try/catch für den
  Teil vor dem Notification-Versand.

*Nicht als Fund gewertet (geprüft, aber unproblematisch): PIN-Hashing
(scrypt + Salt + timingSafeEqual), Rollenprüfungen auf allen anderen
mutierenden Routen, `db.json`/`.env`/Firebase-Service-Account korrekt
gitignored, keine Race Conditions in `readDB()/writeDB()` (synchron, kein
await dazwischen), `addDays()`-Datumslogik trotz UTC/lokal-Mix numerisch
verifiziert korrekt, bereits erledigtes Lazy-Loading von
jspdf/html2canvas/xlsx funktioniert nachweislich.*
