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
- **Commit-Spalte immer mit echtem, kopierbarem Hash füllen** (`git log -1
  --format="%h"`), nicht mit einer Commit-Nachricht als Text - sonst muss
  der nächste Durchlauf den Hash erst per `git log --grep` suchen, statt ihn
  direkt für `git diff <hash>..HEAD` verwenden zu können. Reicht ein
  einzelner Fix-Commit nicht (mehrere Commits seit dem letzten Audit-Eintrag),
  den Hash des LETZTEN Commits der Reihe eintragen.

## Audit-Historie

| Datum | Commit | Umfang | Ergebnis |
|---|---|---|---|
| 2026-08-06 | `28ac5f8` | Vollständiger Erst-Audit (Sicherheit, Performance, Bugs, Code-Qualität), gesamte Codebase (119 Dateien, ~22.400 Zeilen) via 4 parallele Recherche-Agenten | 24 Funde, siehe unten |
| 2026-08-06 | siehe Commit "Kritische Sicherheitsfunde behoben" | Fix der 3 kritischen Sicherheitsfunde: `server/conflicts.ts` (XSS-Escaping), `server/routes/exportHtmlTemplate.ts` (PIN-Hash-Leak), `server/auth.ts`/`server/routes/auth.ts` (Brute-Force-Sperre) | Alle 3 verifiziert (End-to-End gegen echten Server getestet) und aus der Liste entfernt. Restliche 21 Funde unverändert offen. |
| 2026-08-06 | siehe Commit "6 von 7 Hoch-Funden behoben" | Fix von 6 der 7 Hoch-Funde: max_persons-Inkonsistenz (`CalendarCard.tsx`, `conflicts.ts`), serverseitige Kapazitätsprüfung (`shifts.ts`), Server-Guard letzte Lagerleitung (`auth.ts`), Konflikt-Umbesetzen-Bug (`DashboardConflicts.tsx`, neue `onRemoveAssignmentImmediate`-Prop-Kette), unbehandelte Promise-Rejection (`CalendarCard.tsx`), Code-Splitting pro Tab (`TabContentManager.tsx`, React.lazy) | Alle 6 verifiziert (Lint/Build/Browser-Test/E2E-Suite) und aus der Liste entfernt. "Jede Mutation lädt komplette DB neu" bewusst zurückgestellt (größter Punkt, eigene Analyse nötig). |
| 2026-08-06 | siehe Commit "6 von 8 Mittel-Funden behoben" | Fix von 6 der 8 Mittel-Funde: HTTP-Status-Tippfehler 444→404 (`shifts.ts`), PII-Zugriffsbeschränkung auf `notes`-Feld (`people.ts`), React.memo + useCallback-Stabilisierung (`CalendarCard.tsx`, `ShiftRow.tsx`, `CalendarView.tsx`, `ShiftsView.tsx`), `any`-Typen entfernt (`CalendarCard.tsx`), doppelte Filterlogik zusammengeführt (`HeaderGlobalSearch.tsx`), min/max-Validierung client- und serverseitig (`ServiceFormModal.tsx`, `shifts.ts`), Basis-Sicherheits-Header ohne CSP (`server.ts`) | Alle 6 verifiziert (Lint/Build/Node-Verifikationsskript/E2E-Suite, 7/7 grün) und aus der Liste entfernt. `xlsx`-Abhängigkeit und vollständige CSP bewusst zurückgestellt (echte Entscheidungsfragen, siehe unten). |
| 2026-08-06 | siehe Commit "Vollständige CSP + xlsx-Risiko-Entscheidung" | Entscheidung Nutzer: `xlsx`-Risiko bewusst akzeptiert (kein CDN-Umstieg); vollständige Content-Security-Policy umgesetzt (`server.ts`, nur Produktion, dynamischer SHA-256-Hash des Inline-Scripts aus `dist/index.html`, `style-src 'unsafe-inline'` für html2canvas/jsPDF-Export) | Beide letzten Mittel-Punkte aus der Liste entfernt. CSP gegen echten Produktions-Build mit Playwright verifiziert (Login, alle Sidebar-Tabs, QR-Kartendruck, PDF-Export/Druckcenter) - keine `securitypolicyviolation`-Events, keine CSP-Konsolenfehler. E2E-Suite (7/7) und Lint weiterhin grün. |
| 2026-08-06 | siehe Commit "7 Niedrig-Funde behoben" | Alle 7 Niedrig-Funde: tote Props/Imports entfernt (9 Dateien), 3 Tailwind-Tippfehler korrigiert, globale JSON-Fehlerbehandlung + fehlende try/catch in den beiden ungeschützten async-Handlern ergänzt (`server.ts`, `system.ts`, `program.ts`), `writeDB()`-Datei-Backup non-blocking gemacht (`db.ts`), `computeConflicts()` auf Map-basierte Zählung umgestellt (`conflicts.ts`), fehlendes `useMemo` in `ShiftsView.tsx` ergänzt; `key?: any` war bereits aus dem Hoch-Batch entfernt (nur Listeneintrag bereinigt) | Alle verifiziert (Lint/Build/E2E-Suite, 7/7 grün - ein Timeout in `assignment-undo.spec.ts` beim ersten Lauf war Sandbox-Flake, isoliert erneut grün) und aus der Liste entfernt. Keine offenen Punkte mehr außer dem zurückgestellten Hoch-Fund. |
| 2026-08-06 | siehe Commit "Mutation-Reload-Analyse: Teil B, Firestore-Schreibkosten" | Analyse des Hoch-Funds "Mutation-Reload" ergab 2 unabhängige Probleme: (A) 13 GET-Reloads pro Mutation im Frontend (Performance/UX, kostet KEINE Firestore-Reads, da `readDB()` rein aus dem In-Memory-Cache liest) und (B) ein bislang undokumentierter Firestore-Kostentreiber im Schreibpfad - `writeFirestoreDoc()`/`deleteFirestoreDoc()` lösten JE Dokument einen zusätzlichen Metadata-Stempel-Write aus (`server/firebase.ts`), d.h. jede Mutation kostete mind. 2 Writes statt 1, bei mehreren geänderten Dokumenten sogar 2N statt N+1. Teil B umgesetzt: Metadata-Stempel jetzt zentral einmal pro `writeDB()`-Aufruf statt pro Dokument (`server/db.ts`, `server/firebase.ts`). | Per Code-Trace für 4 Szenarien verifiziert (1 Dokument: unverändert 2 Writes; 3 Dokumente: 6→4 Writes, -33%; nur Settings-Änderung: unverändert 1 Write; Dokumente+Settings gleichzeitig: 2K+1→K+1 Writes). Live-Test gegen echtes Firestore in dieser Sandbox nicht möglich (kein Service-Account) - Fallback-Pfad (hier aktiv) per Lint/Build/E2E-Suite (7/7, 1 bestätigter Sandbox-Flake) verifiziert unverändert. Teil A (Frontend-Reload) folgt als nächster Schritt, Hoch-Fund bleibt bis dahin offen. |
| 2026-08-06 | siehe Commit "Mutation-Reload Teil A: useShiftsData.ts" | Erster von 9 Hooks auf lokale State-Updates umgestellt: `useShiftsData.ts` (Schichten + Zuweisungen, 7 Mutationen) nutzt jetzt die Server-Antwort direkt (`setShifts`/`setAssignments`) statt `loadDatabase(true)`; Konflikte gezielt über `/api/conflicts` statt komplettem Reload; Offline-Queue-Fall (`handleUpdateAssignmentStatus`) repliziert die Server-Logik lokal exakt (status/accepted/decline_reason), da bei fehlender Verbindung nur eine synthetische Warteschlangen-Antwort zurückkommt. | Live gegen echten Produktions-Build mit Playwright verifiziert: Selbst-Eintragen (14→3 Requests), Status ändern über das Rückmeldungs-Modal (1 Request, korrekt keine Konflikt-Neuberechnung nötig), Austragen inkl. Undo-Fenster (2 Requests nach Fristablauf), Schicht bearbeiten (2 Requests) - jeweils UI-Korrektheit per Screenshot geprüft, keine Konsolenfehler. E2E-Suite (7/7) und Lint/Build weiterhin grün. Verbleibende 8 Hooks (26 Mutationen) folgen. |
| 2026-08-06 | siehe Commit "Mutation-Reload Teil A: restliche 8 Hooks" | Alle verbleibenden Mutations-Hooks umgestellt: `useUsersData`, `useServicesData` (inkl. kaskadierendem lokalem Entfernen betroffener Schichten/Zuweisungen bei Dienst-Löschung, wie der Server es auch macht), `useMaterialsData`, `useRolesData`, `useCommunitiesData`, `useTalentActsData` (inkl. Reorder/Clear), `useSogData`. Dabei einen echten PII-Fund im Vorbeigehen gefunden und behoben: `POST`/`PUT /users` gaben bislang den ungefilterten Datensatz inkl. `pin_hash` zurück - unbemerkt, weil das Frontend die Antwort bisher verwarf und stattdessen den sauberen (`sanitizeUsers`) `GET /users`-Endpunkt neu lud. Jetzt mit `sanitizeUser()` serverseitig gefiltert (`server/routes/people.ts`), analog zum bereits bestehenden GET-Endpunkt. `useCampsData.ts` bewusst NICHT umgestellt: Lagerjahr wechseln/anlegen betrifft praktisch alle camp-gebundenen Daten auf einmal, ist eine seltene Admin-Aktion und zeigt ohnehin einen Ladezustand - der bisherige volle Reload ist hier die richtige Wahl, nicht Teil des ursprünglichen Funds (nutzte bereits `loadDatabase(false)`, nicht das kritisierte `loadDatabase(true)`-Muster). | Live gegen echten Produktions-Build mit Playwright verifiziert: Person anlegen/bearbeiten/löschen (inkl. Undo-Fenster), Dienst bearbeiten (inkl. Konflikt-Neuberechnung), Gemeinde bearbeiten (inkl. korrekt neu berechneter Gesamt-Teilnehmerzahl im UI), Rolle anlegen, Talentshow-Beitrag anlegen - je 1 Request statt 13, UI-Korrektheit per Screenshot geprüft, keine Konsolenfehler. `useMaterialsData`/`useTalentActsData` zusätzlich per bestehendem E2E-Test (`material-create.spec.ts`) abgedeckt. Volle E2E-Suite (7/7) und Lint/Build grün. Hoch-Fund "Mutation-Reload" damit vollständig behoben und aus der Liste entfernt. |
| 2026-08-07 | `0f2e73b` | **Audit-Baseline für den nächsten Durchlauf** (kein neuer Fund - reiner Referenz-Eintrag, weil vorherige Zeilen nur Commit-Nachrichten statt Hashes enthielten, siehe korrigierte Pflegeregel oben). Stand: alle Kritisch/Hoch/Mittel/Niedrig-Funde aus dem Erst-Audit behoben, keine offenen Audit-Funde mehr. | Nächster Audit-Durchlauf kann direkt `git diff 0f2e73b..HEAD --name-only` ausführen, um zu sehen, was sich seitdem geändert hat. |
| 2026-08-07 | `e32d6e6` | Kein Audit-Fund, sondern Umsetzung der geplanten Verbesserung "Einfaches Fehler-Monitoring in Produktion" (aus dem Abschnitt "Geplante Verbesserungen" unten entfernt, dort umgesetzt): `server/errorLog.ts`, `ErrorBoundary.tsx`, `errorReporting.ts`, konfigurierbare Push-Alerts über neues `is_error_monitor`-Feld. Dabei entdeckt und mitbehoben: `CampsView.tsx`-Statistik-Kacheln zeigten wegen falscher Feld-Zuweisung seit jeher `undefined` an. Neuer offener Punkt dokumentiert (nicht behoben, braucht Freigabe): fehlende `@types/react`/`@types/react-dom` im gesamten Projekt (siehe "Bewusste Entscheidungen" unten). | Geprüfte/geänderte Dateien: die 12 Dateien aus dem Commit-Diff. Nicht erneut geprüft: alles andere (kein vollständiger Audit-Durchlauf). |
| 2026-08-07 | `7251db9` | Nutzer-Freigabe für den zuvor dokumentierten Punkt "fehlende `@types/react`/`@types/react-dom`" eingeholt und umgesetzt (aus "Bewusste Entscheidungen" entfernt, dort erledigt). Installation deckte testweise vorab genau 8 Typfehler in 3 Dateien auf, alle 8 behoben: totes Coden in `CalendarView.tsx` entfernt, `title`-Prop auf Lucide-Icons in `ShiftDeployWizard.tsx` durch `<title>`-Kindelement ersetzt (SVG-konform, war vermutlich unsichtbares totes Tooltip), `children`-Typ in `Tooltip.tsx` präzisiert. | Geprüfte/geänderte Dateien: `package.json`, `package-lock.json`, `CalendarView.tsx`, `ShiftDeployWizard.tsx`, `Tooltip.tsx`. Nicht erneut geprüft: alles andere. `npm run lint` ab jetzt mit echter React-Typprüfung statt implizitem `any` - künftige Audits/Änderungen an React-Komponenten profitieren davon automatisch. |
| 2026-08-07 | `fc8bf4d` | Kein Audit-Fund, sondern Nutzeranfrage zum Supply-Chain-Risiko: keine automatischen Update-Bots gefunden (kein Dependabot/Renovate), CI nutzt bereits lockfile-exaktes `npm ci`. Reales Risiko lag bei manuellem `npm install`/`npm update` ohne zeitlichen Puffer gegen kompromittierte npm-Accounts. `.npmrc` mit `min-release-age=10` (npms nativer Cooldown-Mechanismus) ergänzt; per Bisektion gegen die echte npm-Registry verifiziert, dass dies erst ab npm 11.10.0 wirkt (ältere Versionen ignorieren es stillschweigend) - dafür `engines.npm` in `package.json` dokumentiert und CLAUDE.md Abschnitt 16 mit fester Prüfregel ergänzt. | Geprüfte/geänderte Dateien: `.npmrc` (neu), `package.json`, `CLAUDE.md`. `npm install --dry-run`, `npm run lint`, `npm run build` weiterhin fehlerfrei. Kein vollständiger Audit-Durchlauf. |
| 2026-08-07 | `8dbdd12` | Vollständige Farbsystem-/Kontrast-Analyse auf Nutzeranfrage, mit Freigabe zur strukturellen Design-Token-Umstellung umgesetzt. Zwei Root-Cause-Funde: (1) Theming war als riesige Liste einzeln enumerierter CSS-Klassen-Overrides gebaut - neue Komponenten/Opacity-Varianten fielen unbemerkt auf die rohe Dunkel-Farbe zurück, konkret an 6 Stellen mit praktisch unlesbarem Text bestätigt. (2) ~26 im Code verwendete Zwischen-Farbstufen (z.B. `text-slate-450`) existierten in Tailwinds Palette gar nicht und erzeugten an über 45 Stellen wirkungsloses CSS. Behoben durch Umstellung auf echte Tailwind-v4-CSS-Variablen pro Theme (automatische Abdeckung aller Opacity-Varianten/Verläufe/künftiger Komponenten), mit bewusster Ausnahme für slate-800/850/900/950 + white/black/slate-100/150/200 (dort weiterhin präzise Klassen-Listen, da diese Stufen im Code für zwei gegensätzliche Zwecke genutzt werden - z.B. `text-slate-950` als dunkle Schrift auf Akzent-Buttons UND als Hintergrund-Token). | Lint/Build grün, Playwright-Screenshots aller 4 Themes über 5 Ansichten (inkl. Druckvorschau, PWA-Modal), keine Konsolenfehler, volle E2E-Suite (7/7) grün. Dabei einen Gradient-Kollateralschaden gefunden und direkt mitbehoben (Dashboard-"Nächste Schicht"-Kachel blieb nach der Umstellung dunkel). |
| 2026-08-07 | `2d81600` | Vollständige Firestore-Kostenanalyse auf Nutzeranfrage (Phase-1-Bestandsaufnahme im Chat, kein Datei-Artefakt). Ergebnis: App liest/schreibt bereits fast ausschließlich über serverseitigen In-Memory-Cache mit dokumentweisem Diff-Sync - die meisten typischen Kostentreiber existieren hier strukturell nicht. 3 echte Lücken mit Freigabe behoben: (1) `notifications`-Collection ohne Aufräum-Strategie, wuchs unbegrenzt über Lagerjahre - jetzt 90-Tage-Aufbewahrung. (2) Offline-Warteschlange ohne serverseitige Idempotenz-Prüfung, konnte bei Verbindungsabbruch zwischen Server-Antwort und Client-Bestätigung eine erstellende Aktion doppelt anlegen - neue `server/idempotency.ts`-Middleware cached Antworten pro Warteschlangen-ID. (3) `pushSubscriptions`/`sogStations` fehlten in `FIRESTORE_COLLECTIONS`, gingen bei jedem Serverneustart mit aktivem Firestore verloren - jetzt Teil der regulären Collection-Liste inkl. einmaliger Migration von Alt-Daten aus dem lokalen Backup. | Lint/Build grün, alle 3 Fixes live gegen echten Server verifiziert (Idempotenz: gleicher Key -> kein Duplikat, unterschiedlicher Key -> normale neue Aktion; Notifications-Pruning: künstlich vor-datierte Benachrichtigung wurde beim nächsten Versand korrekt entfernt). Firestore-Migrationspfad nur per Code-Review geprüft (kein Service-Account in dieser Sandbox verfügbar). Volle E2E-Suite (7/7) grün. |
| 2026-08-07 | `527d470` | Kein Audit-Fund, sondern 2 Nutzeranfragen: (1) Selbst-Eintragen bei voller Schicht war bisher komplett blockiert (Button ausgeblendet), obwohl der Server ein force-Übersteuern längst unterstützte - jetzt per ConfirmDialog erreichbar (`CalendarView.tsx`/`CalendarCard.tsx`, gleiches Muster wie `ShiftsView.tsx`). (2) Im Vorbeigehen einen echten Berechtigungs-Fund entdeckt und mitbehoben: Den Zusage-/Absage-Status einer fremden Zuordnung konnte bislang jede Bereichsleitung ändern, zusätzlich ließen mehrere UI-Stellen (Kalenderkarten, Kalender-Tabellenansicht, Schichten-verwalten-Liste, Dashboard-Quick-Finder) das Klick-Ziel für JEDEN Nutzer offen unabhängig von der Rolle, mit stillem serverseitigen 403. Neue `isSelfOrLagerleitung`-Prüfung (`server/auth.ts`) ersetzt `isSelfOrManager` an den beiden Status-Routen (`PUT /assignments/:id/status`, `/accepted`); alle betroffenen UI-Stellen entsprechend ausgeblendet/deaktiviert. Schichtplanung (Zu-/Abteilen selbst) bleibt bewusst unverändert Sache der Bereichsleitung. | Lint/Build grün. Live gegen echten Server per curl verifiziert: Bereichsleitung erhält jetzt 403 beim Versuch, den Status einer fremden Zuordnung zu ändern, Lagerleitung weiterhin 200; Selbst-Eintragen bei voller Schicht liefert ohne force 409 (CONFL_CAPACITY), mit force 201. Volle E2E-Suite (7/7) grün. |
| 2026-08-07 | `09823a4` | Kein Audit-Fund, sondern Nutzeranfrage im Rahmen der Hosting-Vorbereitung (Render-Umzug wegen Gratis-Tarif-Aufweckzeit): App-Start zeigte bisher einen leeren "Lade…"-Bildschirm, bis Sitzungsprüfung UND komplettes Datenladen durch waren - bei einem gerade aufwachenden Gratis-Server bis zu 20-50 Sekunden, obwohl der letzte bekannte Stand längst im Browser vorhanden war. Jetzt wird nach jedem Laden ein Schnappschuss (Datenstand + lastChange-Zeitstempel, an userId gebunden) in localStorage gesichert und beim nächsten Start sofort damit gerendert, während die echte Sitzungsprüfung parallel im Hintergrund läuft (`useZeltlagerData.ts`, `App.tsx`). Bestätigt/widerlegt die echte Prüfung eine andere Person, wird der Schnappschuss sofort verworfen (Schutz für geteilte Geräte) und beim Abmelden gelöscht. Bei wirklich neuen Serverdaten erscheint ein dezenter Toast-Hinweis statt eines kommentarlosen Datenwechsels. Beim Testen echten Nebenfund entdeckt und mitbehoben: `writeDB()` aktualisierte den In-Memory-lastChange-Stempel bisher NUR bei aktivem Firestore - im lokalen db.json-Fallback-Modus blieb `GET /api/sync-check` dauerhaft auf dem Wert vom Serverstart eingefroren, wodurch sowohl das bestehende 5-Minuten-Polling als auch der neue Hinweis wirkungslos gewesen wären (`server/db.ts`, `server/firebase.ts`). | Lint/Build grün. Mit Playwright gegen den echten Produktions-Build verifiziert (`NODE_ENV=production node dist/server.cjs`): sofortige Anzeige des gecachten Stands bewiesen, indem API-Antworten künstlich 20s verzögert wurden - Dashboard mit vollem Cache-Inhalt erschien nach ~13s (Sandbox-Basisverzögerung), deutlich vor den 20s; "Aktualisiert"-Hinweis nach echter serverseitiger Datenänderung (neue Person angelegt) bestätigt erschienen. Volle E2E-Suite (7/7) grün. |

---

## Offene Funde

### Kritisch

_Keine offenen Punkte mehr - siehe Audit-Historie._

### Hoch

_Keine offenen Punkte mehr - siehe Audit-Historie._

### Mittel

- [ ] **Keine zentrale Input-Validierung** (`server/routes/*.ts`). Kein
  `zod`/`joi`/vergleichbares Schema - jede Route validiert Eingaben manuell
  und verstreut mit eigenen `if`-Checks. Fehleranfällig (leicht einen Fall
  zu vergessen), schwer vollständig zu auditieren.
- [ ] **Hauptbundle relativ groß** (`vite.config.ts`, Build-Output
  `dist/assets/index-*.js`). 522 KB / 154 KB gzip im immer geladenen
  Haupt-Chunk (plus ein weiteres, immer geladenes 53-KB-gzip-Chunk),
  obwohl die großen Libraries (xlsx/jspdf/html2canvas) bereits korrekt
  lazy-geladen werden. Widerspricht dem in CLAUDE.md Abschnitt 4 explizit
  genannten Fokus auf langsame Internetverbindungen/schlechte
  Netzabdeckung.
- [ ] **Transitive `uuid`-Schwachstelle über `firebase-admin`**
  (`package.json`, `firebase-admin: ^14.2.0`). `npm audit` meldet moderate
  Severity (fehlende Buffer-Bounds-Prüfung in `uuid` v3/v5/v6, erreicht
  über `@google-cloud/storage` → `gaxios`/`teeny-request`). Anders als beim
  bereits bewusst akzeptierten `xlsx`-Risiko unten wurde diese noch nicht
  bewertet - insbesondere ob der App-Codepfad `@google-cloud/storage`
  überhaupt erreicht (diese App nutzt nur Firestore, nicht Cloud Storage)
  oder es eine rein transitive, nie ausgeführte Abhängigkeit ist.
- [ ] **Rate-Limiting nur beim Login** (`server/auth.ts`). Alle anderen
  authentifizierten Routen haben keine Drosselung - ein gültiges (z. B.
  gestohlenes) Token könnte die API ungebremst belasten.

### Niedrig (Aufräumen, kein akutes Risiko)

- [ ] **Kein Graceful Shutdown** (`server.ts:151`, `app.listen(...)`).
  Keine `SIGTERM`/`SIGINT`-Handler. Bei einem Neustart/Deploy kann eine
  laufende Anfrage mitten in einem Firestore-Write abgebrochen werden
  statt sauber zu Ende geführt zu werden.
- [ ] **Unstrukturiertes Logging** (`server.ts`, `server/*.ts`). 52
  verstreute `console.log`/`error`/`warn`-Aufrufe, keine Log-Level, keine
  Request-IDs. Macht Fehlersuche in Produktion schwerer, besonders in
  Kombination mit dem fehlenden Health-Check-Endpoint (siehe "Geplante
  Verbesserungen" unten).
- [ ] **`tsconfig.json` weiterhin ohne `strict`/`noImplicitAny`.** Der
  `@types/react`-Fix (siehe Audit-Historie) hat nur die React-Symptome
  behoben; der Rest der Codebase (Backend, Utility-Funktionen) läuft
  weiterhin ohne echte Nullchecks/strikte Typprüfung.

---

## Geplante Verbesserungen (kein Audit-Fund, aus App-Bewertung 2026-08-06)

Keine Bugs/Sicherheits-/Performance-Funde, sondern Funktionswünsche, die bei
einer Gesamtbewertung der App als offen identifiziert wurden. Passend zu den
"Geplanten Kernfunktionen" in CLAUDE.md Abschnitt 10.

- [ ] **Automatische Erinnerungen bei unbestätigten Schichten.** Wenn ein
  Helfer eine Schicht lange nicht bestätigt, soll automatisch eine
  freundliche Erinnerung verschickt werden (entlastet Bereichsleitungen,
  siehe CLAUDE.md Abschnitt 10). Kann die für das Fehler-Monitoring gebaute
  Push-Infrastruktur (`sendNotificationToUser()`) wiederverwenden.
- [ ] **Wetter-Hinweis auf dem Dashboard.** Für die Outdoor-Nutzung beim
  Festival relevant (siehe CLAUDE.md Abschnitt 4, Outdoor-Fokus). Ließe sich
  z. B. über eine kostenlose Wetter-API ohne API-Key (Open-Meteo) umsetzen.
- [ ] **Kurzes Feedback-/Fehlermelde-Formular für Helfer.** Niedrigschwellige
  Möglichkeit, Probleme oder Feedback direkt aus der App zu melden - die
  menschliche Ergänzung zum technischen Fehler-Monitoring.

### Weitere professionelle nächste Schritte (Vorschlag 2026-08-07)

- [ ] **Health-Check-Endpoint (`/api/health`) + externes Uptime-Monitoring.**
  Aktuell kein Endpoint, der von außen prüfbar ist, ob der Server überhaupt
  noch antwortet. Kombiniert mit einem kostenlosen externen Monitor (z. B.
  UptimeRobot) würde ein kompletter Ausfall während des Festivals sofort
  auffallen - ergänzt das interne Fehler-Monitoring um den Fall, dass der
  Server gar nicht mehr reagiert.
- [ ] **Automatisiertes, regelmäßiges Firestore-Backup.** Bisher gibt es nur
  den manuellen Backup-Mechanismus beim Lagerjahr-Reset. Ein täglicher
  automatischer Export wäre ein echtes Sicherheitsnetz gegen Datenverlust
  während des laufenden Lagers.
- [ ] **Admin-Änderungsprotokoll (Audit-Log).** Wer hat wann eine Schicht
  gelöscht, eine Person entfernt, eine Rolle geändert? Aktuell nicht
  nachvollziehbar. Schafft Vertrauen bei mehreren Bereichsleitungen und
  hilft beim Klären von Missverständnissen.
- [ ] **Test-Coverage erweitern.** Die E2E-Suite (`tests/`) deckt nur
  Login/Material/Schicht-Status/Undo-Flows ab (5 Spec-Dateien). Gemeinden-
  Import, Programm/Talentshow, Spiel ohne Grenzen, PDF-/Druck-Export und das
  neue Fehler-Monitoring haben keinen einzigen Test - vor dem nächsten
  echten Festival-Einsatz die verlässlichste Absicherung gegen Regressionen.

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
