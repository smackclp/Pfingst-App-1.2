# CHANGELOG

Kurzüberblick über jeden Commit auf `Beta`, sehr knapp zusammengefasst - als
Referenz für spätere Projekte (welche Muster/Techniken wurden wo eingesetzt).
Für Details: `git show <Hash>`. Chronologisch, ältester zuerst.

## 2026-08-03 – Ausgangspunkt

- `d4e7fc5` Ausgangsstand übernommen (React 19 + Vite 6 + TS Frontend, Express 4 + Firestore Backend), Build/Dev-Server lokal verifiziert.

## 2026-08-04 – Rollen/Sicherheit, UX-Redesign, erste Aufräumarbeiten

- `1e30431` Echtes Rollen- & Sessionsystem eingeführt (Helfer/Bereichsleiter/Lagerleitung), PIN-Login statt freier Namenseingabe, Backend-Routen serverseitig abgesichert.
- `5ded195`–`bb27e1c` UX-Analyse & Redesign-Entscheidungen dokumentiert und umgesetzt: helles Theme als Standard, Bottom-Navigation mobil, Kalender/Druck zusammengelegt, Dashboard-Rollentrennung.
- `65e33d8`, `b14b032` Notfall-Admin-Account dokumentiert, Verwaltungsseite zum Zuweisen von Zugriffsrollen ergänzt.
- `c01e152`–`45553d6` CLAUDE.md als Projekt-Entwicklungsrichtlinie angelegt und mehrfach verfeinert.
- `b8d876b`, `f7f5021` CLAUDE.md-Korrekturen (Branch-Groß-/Kleinschreibung, Next.js→Vite-Tippfehler im Tech-Stack).
- `84d25d2` Firestore-Sicherheitslücke geschlossen: Admin-SDK statt offenem Client-Zugriff.
- `9848c27` Einmaliges Migrationsskript für Firestore-Projektwechsel (Backup-Import).
- `7eec8ec` Bugfix: Änderungen (z. B. Rollenwechsel) landeten nie in Firestore.
- `7de4d82` Sonnenlicht-Modus (hoher Kontrast/größere Schrift für Outdoor-Nutzung) ergänzt.
- `f66da89`–`711d1c6` Refactor-Phasen 1–3: gemeinsame Bausteine extrahiert, `AlertsView`/`CalendarView`/`ShiftsView`/`ShiftRow` aus Monolith-Dateien in kleinere Komponenten aufgeteilt.

## 2026-08-05 – Refactor abgeschlossen, Kernfunktionen ausgebaut

- `3d931b4`–`5c3f5d5` Refactor-Phasen 4–10: `DashboardView`, `CommunitiesView`, `PeopleView`, `ProgramView`, `MaterialsView`/`PrintView`/`Header`, Backend-Routen und `export.ts` in fachlich getrennte, kleinere Dateien aufgeteilt.
- `98daa05`, `05f177d` CLAUDE.md-Klarstellung zur Datei-Aufteilungsregel (fachliche Verantwortung statt künstlicher Verkleinerung).
- `2e3e6ee` Header zeigt aktives Lagerjahr + Zeitstempel der letzten Code-Änderung.
- `22cb8f4` Bugfix: fehlende `accessRole`-Prop machte Admin-Buttons unsichtbar.
- `92da2b2` Toter Code entfernt (Spotify-Reste, ungenutzte Helper, No-op-IIFE).
- `be65485` `window.location.reload()`-Anti-Pattern im Dashboard durch gezieltes Neuladen ersetzt.
- `1988a3f` Seiteneffekt aus `useMemo` in `useEffect` verschoben (React-Anti-Pattern behoben).
- `5bd2009`, `583d54c` (05.–06.) Neues Lagerjahr leert automatisch Gemeinden/Programm/Bestellliste/SoG, später auf Archivieren statt Löschen umgestellt.
- `002c364` "Spiel ohne Grenzen"-Daten von LocalStorage auf serverseitige Speicherung umgestellt (Geräte-übergreifend synchron).
- `aa8974d` Spotify-Wiedergabeliste für die Talentshow eingebettet, ohne eigene Client-ID/OAuth.
- `1db8509` Horizontalen Scrollbalken-Bug behoben, Header verschlankt.
- `851668b` PWA-Install-Kachel auf mobil beschränkt, Bestätigungsdialog vor SoG-Neueinteilung.
- `7a65c46` Onboarding-Modal (4 kurze Schritte) für neue Nutzer.

## 2026-08-06 – Architektur, UX-Härtung, vollständiges Sicherheits-Audit

- `2d63a41` `useZeltlagerData.ts` (648 Zeilen) in fachliche Domain-Hooks aufgeteilt.
- `efc6b1d` Ungenutzte `@google/genai`-Abhängigkeit entfernt.
- `ee6005b` Offline-Warteschlange für unkritische Aktionen (Schicht-Status, Bestellliste, Talentshow) - Kernstück des Offline-First-Anspruchs.
- `c3678fb` "Nächste Schicht"-Kachel prominent auf dem Dashboard.
- `4859470` Browser-native `alert()`/`confirm()`-Dialoge durch In-App-UI ersetzt (Konsistenz, Testbarkeit).
- `8993423`, `e1ab7e2`, `f47d9f7` Rückgängig-Sicherheitsnetz (zeitverzögertes Löschen mit Undo) schrittweise auf alle kritischen Lösch-/Änderungsaktionen ausgeweitet.
- `072c604` Formularfehler inline statt als Popup.
- `5e57594`, `0883d73`, `28ac5f8` Barrierefreiheit: erster Check, vollständige Fokusfallen + Escape in Modals, Farbkontrast auf WCAG AA angehoben.
- `897838d` Kurz-Onboarding erscheint erneut pro Lagerjahr statt nur einmalig pro Gerät.
- `f92cd49` Globale Suche um Material, Gemeinden und Programm erweitert.
- `9116ce3` Playwright-E2E-Tests für die 3 kritischsten Nutzerpfade eingerichtet (Basis für spätere Testsuite).
- `f2e8e68` Lagerjahr-Reset abgesichert: Vorlauf-Undo-Frist + echte serverseitige Sicherungskopie vor dem Reset.
- `d21003d` Bereichsleitung sieht standardmäßig nur eigene Dienste (Fokussierung statt Überforderung).
- `0b2af4d` **AUDIT.md eingeführt**: lebendes Protokoll für Audit-Funde mit Pflegeprozess (erledigt = löschen, nicht nur abhaken).
- `be88e7e` Kritische Sicherheitsfunde behoben: XSS-Escaping, PIN-Hash-Leak im API-Response, Brute-Force-Sperre beim Login.
- `f88f300` 6 von 7 Hoch-Funden behoben: Kapazitätsprüfung serverseitig, Konflikt-Umbesetzen-Bug, Code-Splitting pro Tab.
- `95f0331` 6 von 8 Mittel-Funden behoben: PII-Feldschutz, React.memo/useCallback-Stabilisierung, Server+Client-Validierung.
- `1d40d4f` Vollständige Content-Security-Policy umgesetzt; `xlsx`-Supply-Chain-Risiko bewusst als Restrisiko akzeptiert (dokumentierte Entscheidung).
- `b7dda84` 7 Niedrig-Funde behoben (reines Aufräumen, keine Verhaltensänderung).
- `056c4d4`, `dd791b0` AUDIT.md um "Geplante Verbesserungen"-Abschnitt ergänzt, Löschregel auf alle Abschnitte verallgemeinert.
- `8483b41`, `0de043d` Mutation-Reload-Optimierung Teil A/B gestartet: Firestore-Metadata-Stempel entkoppelt, erster Hook (`useShiftsData`) auf lokale State-Updates statt Komplett-Reload umgestellt.

## 2026-08-07 – Performance-Feinschliff, Fehler-Monitoring, Supply-Chain-Härtung

- `0f2e73b` Mutation-Reload abgeschlossen: alle 9 Daten-Hooks aktualisieren jetzt lokal per Server-Antwort statt komplett neu zu laden (13 Requests → 1 pro Aktion). Dabei PII-Leck in `POST/PUT /users` (ungefilterter `pin_hash`) im Vorbeigehen gefunden und behoben.
- `c39a300` AUDIT.md-Pflegeregel korrigiert: Historie-Einträge brauchen echte, kopierbare Commit-Hashes statt Nachrichtentext.
- `c62e297` Gemeinsamer Hook-Helfer (`src/lib/apiMutations.ts`) für wiederkehrende Mutations-Boilerplate über alle Daten-Hooks eingeführt.
- `e32d6e6` **Fehler-Monitoring** eingebaut: zentrales Backend-/Frontend-Fehlerlogging (In-Memory-Ringpuffer + lokale JSON-Sicherung, kein Firestore-Zugriff), React-`ErrorBoundary` mit Fallback-UI, konfigurierbare Push-Alerts per neuem `is_error_monitor`-Nutzerflag mit 30-Min-Cooldown gegen Kostenspitzen.
- `7251db9` `@types/react`/`@types/react-dom` nachgerüstet (fehlten komplett, TS behandelte React-Code stillschweigend als `any`); die dadurch aufgedeckten 8 Typfehler in 3 Dateien behoben (u. a. totes Coden, falsches `title`-Prop auf SVG-Icons).
- `fc8bf4d` **Supply-Chain-Schutz**: `.npmrc` mit `min-release-age=10` (npms nativer 10-Tage-Cooldown gegen frisch veröffentlichte bösartige Paketversionen); per Bisektion verifiziert, dass dies erst ab npm ≥ 11.10.0 wirkt, entsprechend in CLAUDE.md dokumentiert.
- `8f731c0` Ausnahmeregel für dringende Sicherheits-Patches ergänzt: Cooldown darf pro Paket gezielt übersprungen werden, aber nur nach Recherche auf offiziellen Quellen (npm audit, GitHub Security Advisories, OSV.dev, NVD, Paket-Changelog) und Bewertung von Schweregrad/Echtheit.

## 2026-08-07 (Forts.) – Design-Tokens, Firestore-Kosten, Hosting-Recherche, lokaler Cache

- `8dbdd12` Farbsystem strukturell auf echte Design-Tokens umgestellt (Hell-/Sonnenlicht-/AMOLED-Theme).
- `2d81600` Firestore-Kostenanalyse: 3 echte Lücken behoben (Notifications-Pruning, Offline-Queue-Idempotenz, Datenverlust-Risiko bei Server-Neustart).
- `527d470` Helfer dürfen sich trotz voller Schicht selbst eintragen; Status-Bestätigung für andere Personen auf Lagerleitung beschränkt.
- `a6877c5` Branch-Namenskonvention von "Beta" auf "beta" umgestellt (Groß-/Kleinschreibungs-Kollision auf case-insensitiven Dateisystemen behoben), CI-Workflow angepasst.
- `98cfab0` `engines.node` in package.json ergänzt (für Cloud-Run-Kompatibilität, nach Pivot zu Render beibehalten).
- `6394f65`, `5397485` **HOSTING.md angelegt**: Vercel/Cloud-Run/Cloudflare Workers/NAS/all-inkl.com recherchiert und bewertet, Render.com + Keep-Alive-Ping als Favorit festgehalten.
- `09823a4` Lokaler Datenstand-Cache: App zeigt beim Start sofort den letzten bekannten Stand aus localStorage statt Ladebildschirm und gleicht danach im Hintergrund ab (federt Render-Free-Tier-Kaltstart ab); dabei Bugfix: `lastChange`-Zeitstempel aktualisierte sich im lokalen Fallback-Modus nie.
- `77a92be` 7 neue Funde aus frischer Codebase-Bewertung in AUDIT.md aufgenommen.
- `06b9ebc` **CHANGELOG.md angelegt.**

## 2026-08-08 – Render-Deployment live, Dashboard/Navigation-Feinschliff, Berechtigungen, App-Gefühl

- Render.com-Deployment live geschaltet (Produktions-Firestore verbunden, Login verifiziert); `beta` wurde dabei zweimal durch direkte Merge-Konflikt-Edits auf der GitHub-Weboberfläche beschädigt (rohe Konfliktmarker in CLAUDE.md) und jeweils mit der bekannten guten Version repariert (`03a8d64` u. a.).
- `12f0a30` Dashboard: persönlicher Dienstplan vor das Statistik-Raster gezogen, Statistik-Kacheln kompakter (dominierten vorher mobil den Bildschirm).
- `7b4b7e2` "Mein Plan": Kartenansicht jetzt für alle Rollen Standard (vorher hatte Bereichsleitung/Lagerleitung standardmäßig die Listenansicht).
- `08df0fb` Löschen von Schichten/Diensten auf Lagerleitung beschränkt (Bereichsleitung darf weiterhin anlegen/bearbeiten); Dashboard-Kopfkachel auf Mobile verkleinert.
- `feed5eb` Beim Tab-Wechsel scrollt die App automatisch an den Seitenanfang statt an der vorherigen Scroll-Position hängenzubleiben.
- `4398e7c` Menüpunkt "App installieren" im Lager-Hub ergänzt (für alle Rollen erreichbar, falls das PWA-Setup beim ersten Start übersprungen wurde).
- `4465340` Top-Bar/Menüpunkt "Lager" zu "Pfingstfestival"/"Festival" umbenannt.
- `0843599` Lagerleitung erhält dieselben Rechte wie der Admin-Zugang: Admin-Testbenachrichtigungs-Panel hing an einem faktisch nie zutreffenden Rollenfeld-Check, jetzt korrekt an der Berechtigungsstufe (`access_role === "lagerleitung"`).
- `c34a11e` Zurück-Button/Wisch-Geste geht jetzt einen Schritt in der App zurück statt sie zu beenden (zentraler Verlaufs-Hook, `history.pushState`/`popstate`); Service Worker lädt die App-Hülle jetzt per Stale-While-Revalidate (`index.html`) und Cache-First (gehashte Assets) statt Network-First - echtes App-Gefühl ohne Netzwerk-Wartezeit.
- `c9d7b47` Top-Bar-Name hängt jetzt am tatsächlichen Git-Branch statt an gemergtem Text ("beta" → "Beta-Test", "main" → "Pfingstfestival"), automatisch korrekt nach jedem Merge, kein manuelles Zurücksetzen nötig.
- `486dd42` CHANGELOG.md nachgeholt, Pflegepflicht als neuer Abschnitt 17 in CLAUDE.md ergänzt.
- `da7a3b7` Bugfix (gemeldet: Mitteilungen "Leeren" + Tab-Wechsel ließ die Liste wieder auftauchen): das Rückgängig-Sicherheitsnetz (`useUndoableDelete.ts`) brach die geplante Server-Löschung ab, sobald die anzeigende Ansicht durch einen Tab-Wechsel unmounted wurde - betraf alle 9 Views mit Lösch-Undo (Schichten, Dienste, Personen, Gemeinden, Lager, Material, Talentshow, SoG-Stationen, Mitteilungen). commit() läuft jetzt immer zu Ende, nur die begleitenden React-State-Updates werden per isMountedRef geschützt.

## 2026-08-09 – Dropdown-Konsistenz

- `064b75c` Alle Personen-/Dienst-/Gemeinden-Dropdowns in der App alphabetisch sortiert (Helfer nach Vorname, Rest nach Titel/Name); neue gemeinsame Sortier-Helfer `sortByFirstName`/`sortAlphabetically` in `utils.ts` statt dupliziertem `.sort()` in jeder Komponente. Lagerjahre-Auswahl bewusst chronologisch statt alphabetisch belassen.

---

## Übergreifende Muster (für spätere Projekte direkt wiederverwendbar)

- **CLAUDE.md als lebende Entwicklungsrichtlinie**: erzwingt Analyse-vor-
  Umsetzung-Prozess, hält Architekturentscheidungen und feste Regeln
  (Branch-Workflow, Supply-Chain-Cooldown) fest - wird von jeder neuen
  Sitzung automatisch gelesen.
- **AUDIT.md als lebendes Audit-Protokoll**: erledigte Funde werden
  gelöscht statt nur abgehakt, damit die Datei immer nur zeigt, was noch
  offen ist; inkrementelle Folge-Audits per `git diff <letzter-Commit>..HEAD`
  statt blinder Komplett-Neuprüfung.
- **Kleine, fachlich geschnittene Dateien** statt großer Monolithen (z. B.
  `ProgramView.tsx` 1926 → mehrere <300-Zeilen-Dateien), erst NACH
  funktionierender Grundversion, in dedizierten Refactor-Phasen mit
  Lint+Playwright-Verifikation pro Phase.
- **Undo-Sicherheitsnetz statt destruktiver Sofort-Aktionen**: kritische
  Löschungen/Änderungen zeitverzögert mit Rückgängig-Option statt
  `confirm()`-Dialog.
- **Konfigurierbare Empfänger statt hartcodierter Logik**: Wer Push-Alerts
  bekommt (Einkäufer, Fehler-Monitor), wird über ein Boolean-Feld pro
  Person gesteuert, nicht im Code fixiert.
- **Kosten-/Ressourcenbewusstsein bei Managed-Backends**: In-Memory-Caching
  + lokale Datei-Backups statt zusätzlicher Firestore-Schreibzugriffe für
  Logging; Mutation-Reload-Optimierung (lokale State-Updates statt
  Komplett-Reload) spart Requests, nicht nur gefühlt schneller.
- **Empirisch verifizieren statt aus dem Gedächtnis behaupten**: z. B. die
  npm-`min-release-age`-Mindestversion per Bisektion gegen die echte
  Registry ermittelt, statt sich auf Erinnerung zu verlassen.
- **Test-Server auf eigenem Port + eigener Testdatenbank** (`db.test.json`,
  Port 3100/3200) für Live-Verifikation gegen einen echten Produktions-Build,
  ohne die echten Nutzdaten zu berühren.
- **Keine Merge-Konflikte direkt auf der GitHub-Weboberfläche auflösen**:
  führte in diesem Projekt zweimal zu rohen `<<<<<<<`-Konfliktmarkern und
  gekürztem Inhalt in CLAUDE.md auf `beta`/`main`, da GitHubs Web-Merge
  anders als ein lokaler `git merge` funktioniert. Solche Auflösungen lieber
  lokal machen.
- **Branch-abhängige Anzeige über Build-Zeit-Konstante statt gemergten
  Text**: z. B. "Beta-Test" vs. "Pfingstfestival" in der Top-Bar wird in
  `vite.config.ts` aus dem tatsächlichen Git-Branch berechnet (Vite
  `define`, analog zum Commit-Hash-Mechanismus) - dadurch ist der
  Quellcode auf allen Branches identisch und nach jedem Merge automatisch
  korrekt, ohne manuelles Zurücksetzen.
- **Verzögerte Undo-Aktionen dürfen beim Unmount nicht den eigentlichen
  Commit abbrechen**: ein `clearTimeout()` in der Cleanup-Funktion eines
  `useEffect` killt bei zeitverzögerten Lösch-Mustern nicht nur das lokale
  UI, sondern auch die geplante Server-Aktion selbst, sobald die Ansicht
  wechselt (z. B. Tab-Wechsel). Sauberer: den Timer/`commit()` unabhängig
  vom Komponenten-Lebenszyklus weiterlaufen lassen, nur begleitende
  React-State-Updates per `isMountedRef`-Flag schützen.
