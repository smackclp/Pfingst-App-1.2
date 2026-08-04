# UX-Analyse & Redesign-Konzept: Pfingstlager Helfer-App

**Status:** Analyse-Dokument – es wurde bewusst noch kein Code verändert.
**Ziel dieses Dokuments:** Grundlage für ein späteres, freigegebenes Redesign. Alle bestehenden Funktionen, die Firebase-Anbindung, die Datenstruktur und die API bleiben unangetastet – es geht ausschließlich um Benutzerführung und visuelle Gestaltung.

---

## Bestätigte Entscheidungen (Stand: gemeinsame Abstimmung nach Erstanalyse)

| # | Thema | Entscheidung |
|---|---|---|
| 1 | Farbschema | **Helles Theme als Standard**, dunkles Theme bleibt als optionaler Dark Mode wählbar (kein Zwang zu nur einer Variante) |
| 2 | Navigation | **Bottom-Navigation** mit 4 Punkten für Helfer (Start / Mein Plan / Lager / Mitteilungen) + 5. Punkt "Verwaltung" für Bereichsleitung/Lagerleitung, ersetzt die bisherige Sidebar-Liste |
| 3 | Kalender & Druckansicht | **Werden zusammengelegt** zu einer Seite "Mein Plan"; der Export/Druck wird zu einer Funktion *innerhalb* dieser Seite statt eines eigenen Menüpunkts |
| 4 | Schichten-Standardansicht | **Rollenabhängig:** Helfer sehen standardmäßig die Kartenansicht (touch-freundlich); Bereichsleitung/Lagerleitung sehen standardmäßig die kompakte Tabellenansicht (besser für Massen-Zuteilung). Beide Ansichten bleiben für alle wählbar. |
| 5 | Farbpalette | **Smaragdgrün bleibt Akzentfarbe** (`#0F6E56` hell / `#5DCAA5` dunkel) – bereits als Marke etabliert. Hintergrund wechselt zu warmem Off-White (`#FAFAF7`) statt Slate-Blau-Grau. Statusfarben konsequent app-weit: Grün `#0F6E56`/`#EAF3DE` = angenommen, Orange `#633806`/`#FAEEDA` = offen, Rot `#791F1F`/`#FCEBEB` = abgelehnt/Konflikt, Grau `#444441`/`#F1EFE8` = inaktiv. Dark Mode übernimmt dieselbe Struktur (Hintergrund `#1C1E1B`/`#26241C`), kein zweites Farbsystem. |

Die folgenden Kapitel sind die ursprüngliche Analyse und weitere, noch offene Vorschläge – Kapitel 4 (Informationsarchitektur) und 5 (Dashboard) unten sind bereits im Sinne der obigen Entscheidungen zu lesen.

---

## Zusammenfassung

Die App hat ein solides fachliches Fundament (Rollen, Datenmodell, Firebase-Sync, PWA-Grundgerüst) und deckt bereits sehr viele Bedürfnisse eines Zeltlagers ab. Das größte UX-Problem ist nicht das, was fehlt, sondern **wie viel gleichzeitig sichtbar ist**: Eine Desktop-Sidebar mit bis zu 11 Menüpunkten, ein dunkles "Technik/Terminal"-Erscheinungsbild (`PFINGSTLAGER.SYS_2026`, monospaced Schrift, "System Aktiv") und mehrere Ansichten, die denselben Inhalt (den Dienstplan) auf unterschiedliche Weise zeigen. Für eine Zielgruppe, die die App nur wenige Tage im Jahr nutzt und größtenteils nicht technikaffin ist, ist das kognitiv anstrengend. Das Redesign-Ziel ist daher: **ein Hauptweg pro Aufgabe, große Touch-Ziele, ruhige Optik, und alles Seltene aus dem direkten Sichtfeld verbannen.**

---

## Schritt 1 – Vollständige Funktionsanalyse

### 1.1 Seiten / Tabs (aktueller Stand)

| Tab-ID | Bezeichnung in der Navigation | Sichtbar für | Kernzweck |
|---|---|---|---|
| `dashboard` | Dashboard | alle | Persönlicher Einstieg: "Lager-Feeds & Leitstand", Konflikt-Center, Statistik-Kacheln, Feedback-Bereich |
| `calendar` | Gesamtplan & Filter | alle | Vollständiger Dienstplan mit Filtermöglichkeiten (Tabellen- und Kartenansicht) |
| `program` | Programm ✨ | alle | Talentshow-/Programmplanung inkl. Regie-Ablaufplan |
| `materials` | Bestellliste 📦 | alle | Materialbestellungen (Artikel, Menge, Preis, Zweck, Status) |
| `alerts` | Benachrichtigungen 🔔 | alle | Zentrale für System- und Push-Benachrichtigungen |
| `print` | Druckansicht 🖨️ | alle | Druck-/Export-freundliche Aufbereitung des Plans |
| `communities` | Gemeinden ⛪ | Bereichsleiter, Lagerleitung | Verwaltung teilnehmender Gemeinden, Import |
| `shifts` | Schichten verwalten | Bereichsleiter, Lagerleitung | Anlegen/Bearbeiten konkreter Schicht-Zeitfenster |
| `services` | Dienste / Aufgaben | Bereichsleiter, Lagerleitung | Vorlagen für Dienstarten (z. B. "Küche", "Ordnerdienst") |
| `people` | Helfer\*innen & Personen | nur Lagerleitung | Stammdatenverwaltung aller Personen, Rollenvergabe |
| `camps` | Lager verwalten | nur Lagerleitung | Lager-/Jahrgänge anlegen, aktives Lager wechseln, Reset |

Login läuft über einen eigenen, tab-losen `LoginScreen` (Namensauswahl + PIN).

### 1.2 Navigation

- **Desktop:** Feste linke Sidebar mit Textliste + Icon, oben Logo/Systemstatus, unten Export-Button.
- **Mobile:** vermutlich ausklappbares Drawer-Menü (dieselbe Liste), kein eigenständiges Bottom-Nav-Pattern.
- Rollenbasiert: Helfer sehen 6 Punkte, Bereichsleitung 9, Lagerleitung 11 – die Liste wächst additiv, es gibt keine visuelle Trennung zwischen "meine Aufgaben" und "Verwaltung".

### 1.3 Dialoge / Modals

| Modal | Zweck |
|---|---|
| `PersonFormModal` | Person anlegen/bearbeiten |
| `ServiceFormModal` | Dienstart anlegen/bearbeiten |
| `ShiftFormModal` | Schicht-Zeitfenster anlegen/bearbeiten |
| Status-Editing-Modal (in `ModalManager`) | Zusage/Absage/"Vielleicht" zu einer Schicht setzen, inkl. Ablehnungsgrund |
| `CreateCampForm` | Neues Lager/Jahrgang anlegen (optional Kopie eines Vorjahres) |
| `ResetModal` | Lagerdaten zurücksetzen |
| `PwaSetupModal` | Anleitung zur PWA-Installation |

### 1.4 Rollen (seit der letzten Iteration serverseitig durchgesetzt)

1. **Helfer** – eigene Schicht buchen/absagen, Status setzen, Material bestellen, Programm/Kalender lesen
2. **Bereichsleiter** – zusätzlich: Schichten/Dienste/Gemeinden verwalten, Programm bearbeiten, Export
3. **Lagerleitung** – zusätzlich: Personen- und Rollenverwaltung, Lagerverwaltung, Backup/Statistiken

### 1.5 Workflows (Kernabläufe)

- **Login:** Name aus Liste wählen → PIN eingeben
- **Schicht buchen/absagen:** in Kalender/Dashboard eine Schicht finden → sich eintragen oder austragen
- **Status pflegen:** Zusage/Absage/"Vielleicht" + optionaler Ablehnungsgrund über ein Modal
- **Material bestellen:** Formular mit Artikel, Zweck, Menge, Preis, URL
- **Programm/Talentshow:** Act anlegen, Reihenfolge per Drag/Reorder ändern, Ablaufplan drucken
- **Benachrichtigungen:** lesen, als gelesen markieren, Push abonnieren/testen
- **Export:** kompletten Plan als eigenständige HTML-Datei herunterladen (für WhatsApp)
- **Verwaltung (Bereichsleitung+):** Personen/Dienste/Schichten/Gemeinden/Lager pflegen

### 1.6 Datenflüsse / Firebase

- Firestore-Collections: `users`, `services`, `shifts`, `assignments`, `camps`, `materials`, `functionalRoles`, `communities`, `talentActs`, `notifications`, `settings/global`
- Server hält eine In-Memory-Kopie, synchronisiert inkrementell zu Firestore, lokale `db.json` als Fallback/Backup
- Client lädt nach jeder Änderung die komplette Datenbank neu (kein granulares Live-Update im Frontend)

### 1.7 API-Endpunkte (Auswahl, vollständig rollenbasiert abgesichert)

`/api/auth/*` (Login, Logout, eigenes Profil, PIN ändern) · `/api/users` · `/api/roles` · `/api/communities` · `/api/services` · `/api/shifts` · `/api/assignments` · `/api/camps` · `/api/materials` · `/api/talent-acts` · `/api/notifications/*` · `/api/stats` · `/api/backup` · `/api/seed` · `/api/export-html`

### 1.8 Formulare

Personendaten, Dienstart, Schicht-Zeitfenster, Materialbestellung (5 Felder), Status-Änderung mit Freitext-Ablehnungsgrund, Lager-Neuanlage (mit Kopieroption).

### 1.9 Häufigkeit & Auffindbarkeit – Einordnung

| Einordnung | Funktionen |
|---|---|
| **Vermutlich häufig genutzt** | Dashboard/eigene nächste Schicht, Schicht buchen/absagen, Benachrichtigungen, Kalenderfilter |
| **Vermutlich selten genutzt** | Backup/Seed/Statistiken, Export als HTML, Lager anlegen/zurücksetzen, Gemeinden-Import |
| **Doppelt / überlappend** | Dashboard ("Lager-Feeds"), Gesamtplan (Kalender) und Druckansicht zeigen im Kern alle denselben Dienstplan in drei verschiedenen Darstellungen – unklar, welche die "richtige" Ansicht für eine Aufgabe ist |
| **Schwer auffindbar** | Eigene PIN ändern (aktuell nur als API vorhanden, kein sichtbarer UI-Einstieg); Unterschied zwischen "Dienste" und "Schichten" ist für Neulinge nicht selbsterklärend |
| **Unnötig komplex** | `ShiftRow` (~28.000 Zeichen Code) bündelt vermutlich Status, Zuweisung, Konfliktanzeige und Aktionen in einer einzigen dichten Zeile – auf einem Telefon-Bildschirm schwer bedienbar |

---

## Schritt 2 – UX-Analyse mit Priorisierung

### Kritisch
1. **Zu viele gleichrangige Menüpunkte ohne Hierarchie.** Auch nach der Rollenreduzierung sehen Bereichsleitung/Lagerleitung 9–11 Punkte in einer flachen Liste. Kein "Was ist heute wichtig?"-Fokus.
2. **Kein Onboarding.** Nach dem Login landet jede Person sofort in der vollen App-Oberfläche, ohne Erklärung, was wo zu finden ist – kritisch bei einer Zielgruppe, die die App nur 3–4 Tage im Jahr nutzt.
3. **Desktop-Sidebar statt mobiler Navigation.** Die Zielgruppe ist praktisch ausschließlich mobil unterwegs (Zeltplatz!), die App ist aber sichtbar von einem Desktop-Layout aus gedacht (linke Sidebar + Export-Button unten).
4. **Technische, kühle Optik.** Begriffe wie `PFINGSTLAGER.SYS_2026`, "System Aktiv", monospaced Schrift und dunkles Terminal-Theme wirken auf eine gemischte Altersgruppe (16–75) eher einschüchternd als "modern, ruhig, vertrauenswürdig".

### Hoch
5. **Redundante Ansichten** (Dashboard/Kalender/Druckansicht) erhöhen die Entscheidungslast: "Wo schaue ich nach meiner Schicht?"
6. **Rollenunterschiede sind unerklärt.** Ein Helfer sieht weniger Menüpunkte als eine Bereichsleitung, ohne dass dies im UI eingeordnet wird ("Warum sehe ich das nicht?").
7. **Viele Pflichtfelder in der Materialbestellung** (Artikel, Zweck, Menge, Preis, URL) – für spontane, seltene Nutzung zu viel Reibung.
8. **Modal-in-Modal-Gefahr** bei Formularen (z. B. Status ändern mit Freitextgrund) ohne erkennbaren "Zurück"-Pfad.

### Mittel
9. **Uneinheitliche Emoji-Nutzung** in Labels (🔔📦⛪✨) – kein konsistentes Icon-System, wirkt an Stellen kindlich, an anderen technisch.
10. **Keine globale Suche** ("Wo ist meine Schicht am Samstag?" erfordert Navigieren statt Tippen).
11. Status-Änderungen laufen vermutlich über ein Modal statt über direkte Ein-Klick-Buttons in der Liste.

### Niedrig
12. Doppel-Bezeichnungen wie "Dienste / Aufgaben" sind für Erstnutzer nicht eindeutig unterscheidbar von "Schichten".

---

## Schritt 3 – Zielgruppenanalyse

| Zielgruppe | Braucht wirklich | Ist überflüssig | Muss sofort erreichbar sein | Sollte in den Hintergrund |
|---|---|---|---|---|
| **Neuer Helfer** | Klare erste Orientierung, "was ist meine erste Aufgabe" | Statistiken, Verwaltungsfunktionen | Eigene nächste Schicht, Notfallkontakt | Alles Rollenbasierte, Export, Backup |
| **Erfahrener Helfer** | Schnellzugriff auf eigenen Plan, Tausch-/Absage-Optionen | Erklärtexte/Onboarding | Schicht buchen/tauschen, Benachrichtigungen | Erstnutzer-Hinweise |
| **Bereichsleiter** | Übersicht über den eigenen Bereich, offene Zuteilungen, Konflikte | Lagerweite Verwaltung (Personen, Lageranlage) | Schichtplanung des eigenen Bereichs, Statusübersicht seiner Helfer | Globale Systemfunktionen (Backup, Lageranlage) |
| **Organisator (Lagerleitung)** | Vollständige Übersicht, Personen-/Rollenverwaltung, Statistiken | – (braucht grundsätzlich alles) | Notfall-Übersicht, offene Konflikte, Personenverwaltung | nichts – aber gebündelt in einem klar abgegrenzten "Verwaltung"-Bereich statt vermischt mit Alltagsfunktionen |
| **Ältere Helfer** | Große Schrift, hoher Kontrast, wenige Schritte, keine Fachbegriffe/Jargon | Dichte Informationsdarstellung, kleine Touch-Ziele | Große, eindeutig beschriftete Buttons | Verschachtelte Menüs, Gesten-Bedienung |
| **Jüngere Helfer** | Schnelligkeit, evtl. Gamification-Elemente (geleistete Stunden) | – | Schnelle Interaktion (Swipe/1-Klick) | Ausführliche Erklärtexte |

---

## Schritt 4 – Neues Nutzungskonzept (Informationsarchitektur)

### Vorschlag: 4 Hauptbereiche statt 11 gleichrangige Punkte

1. **Start** (bisher „Dashboard") – persönlicher Einstieg
2. **Mein Plan** – bündelt bisherigen „Gesamtplan" + „Druckansicht" als *eine* Ansicht mit umschaltbaren Filtern/Darstellungen (Liste/Kalender/Druckexport als Funktion *innerhalb* dieser Seite, nicht als eigener Menüpunkt)
3. **Lager** – Sammelbereich mit Kacheln für Programm, Bestellliste, Gemeinden, (künftig: Schwarzes Brett, Notfallbereich, Lagerkarte, Essensplan, Fahrzeuge)
4. **Mitteilungen** – Benachrichtigungen (künftig inkl. Schwarzes Brett-Feed)

Ein fünfter, klar abgegrenzter Bereich **„Verwaltung"** erscheint nur für Bereichsleitung/Lagerleitung und bündelt Schichten, Dienste, Personen, Gemeinden-Pflege, Lagerverwaltung, Statistiken – **getrennt** von den Alltagsfunktionen, damit Helfer-Ansicht und Leitungs-Ansicht sich nicht wie „dieselbe App mit ein paar mehr Knöpfen" anfühlen, sondern wie zwei klar getrennte Modi.

### Was gehört zusammen / getrennt

- **Zusammen:** Kalenderplan + Druckansicht (identischer Inhalt, nur andere Darstellung)
- **Zusammen:** Programm + Talentshow-Ablaufplan (bereits in einer View)
- **Getrennt:** Persönliche Aufgaben (Schicht buchen, Status setzen) von Verwaltungsaufgaben (Schichten anlegen) – aktuell in der Navigation nicht getrennt, obwohl es serverseitig längst getrennte Berechtigungen sind

### Schnellzugriffe

- „Nächste Schicht" direkt vom Start-Bildschirm aus buchen/bestätigen, ohne in „Mein Plan" wechseln zu müssen
- Materialbestellung als Ein-Feld-Schnelleingabe („Was brauchst du?") mit optionalen Zusatzfeldern statt fünf Pflichtfeldern

---

## Schritt 5 – Dashboard-Konzept

**Sofort sichtbar (ohne Scrollen, auf einem Telefon):**

1. Begrüßung mit Namen + Rolle, unaufdringlich
2. **Große Karte „Deine nächste Schicht"**: Uhrzeit, Ort, Status (angenommen/offen), ein großer Ein-Klick-Bestätigungs-Button
3. **Karte „Offene Aktionen"**: unbeantwortete Zuteilungen, erkannte Konflikte – nur falls vorhanden (sonst ausgeblendet, kein leerer Kasten)
4. **Kurzer Ankündigungs-Feed** (Vorstufe des künftigen Schwarzen Bretts): die 1–2 wichtigsten aktuellen Mitteilungen

**Weiter unten / bei Bedarf:**
- Schnellzugriffs-Kacheln (Material bestellen, Programm ansehen)
- Für Bereichsleitung: kompakte Bereichs-Übersicht (offene Schichten im eigenen Bereich)

**Darf niemals auf dem Dashboard erscheinen:**
- Interne Statistiken über *alle* Helfer (Stunden, Auslastung) – gehört in den Verwaltungsbereich
- Technische Sync-/Debug-Zustände
- Rollen-/Rechteverwaltung
- Lagerweite Massenaktionen (Backup, Reset)

---

## Schritt 6 – Designsystem

- **Farbkonzept:** Weg vom dunklen „Terminal"-Look als Standard. Empfehlung: helles, ruhiges Grundthema (warmes Weiß/Sand) mit einem einzigen kräftigen Akzentton (z. B. das bestehende Smaragdgrün beibehalten, da es bereits als Marke etabliert ist) – Dark Mode bleibt als Option, aber nicht als Vorgabe.
- **Typografie:** Größere Basisschrift (mind. 16px auf Mobilgeräten), klare, wenige Schriftschnitte, kein durchgängiges `font-mono` für Alltagstexte (Monospace nur noch für wirklich technische/Statuswerte, wenn überhaupt).
- **Abstände:** Großzügiger Weißraum zwischen Elementen, damit Touch-Ziele nicht versehentlich getroffen werden.
- **Karten:** Abgerundete Ecken, weiche Schatten statt harter Neon-Rahmen, klare Kartenränder als einziges Trennmittel (statt Rahmen + Schatten + Farbverlauf gleichzeitig, wie aktuell teils vorhanden).
- **Buttons:** Ein primärer Aktionsstil pro Bildschirm (nicht mehrere gleich betonte Buttons nebeneinander), Mindestgröße 44×44px.
- **Icons:** Einheitlich `lucide-react` (bereits im Einsatz) – Emojis nur noch dort, wo sie wirklich Zusatznutzen bringen (z. B. Statusgefühl), nicht als Ersatz für fehlende Icon-Konsistenz.
- **Statusfarben:** Grün = angenommen/erledigt, Gelb/Orange = offen/wartet auf Antwort, Rot = abgelehnt/Konflikt, Grau = inaktiv/vergangen – konsequent über die ganze App.
- **Fehler-/Erfolgsmeldungen/Warnungen:** Einheitliche Toast-Komponente statt (vermutlich aktuell uneinheitlicher) Inline-Texte.
- **Ladeanimationen:** Skeleton-Screens für Listen (Dashboard-Karten, Kalender) statt reiner Spinner – reduziert gefühlte Wartezeit deutlich.

---

## Schritt 7 – Mobile UX

- **Bottom Navigation** mit 4–5 großen Icons statt der aktuellen Sidebar-Liste – die Daumenzone ist bei fast ausschließlicher Handynutzung entscheidend.
- **Große Touch-Flächen** (mind. 44px), besonders für „Schicht annehmen/ablehnen"-Aktionen.
- **Wenig Tipparbeit:** Vorbelegte Werte, Ein-Klick-Aktionen direkt in Listen statt Modal-Umwege wo möglich.
- **Wenig Scrollen:** Wichtigstes zuerst, sekundäre Infos hinter „mehr anzeigen".
- **Kontrastreiches Theme für Außenlicht:** Der Zeltplatz ist ein Outdoor-Kontext – ein zu dunkles Theme mit niedrigem Kontrast ist in praller Sonne schwer lesbar. Ein helles Standard-Theme mit hohem Kontrast ist hier auch funktional, nicht nur ästhetisch, im Vorteil.
- **Große, eindeutige Schrift**, keine dichten Tabellen auf kleinen Screens (die aktuelle `CalendarTableView` sollte auf Mobile automatisch in eine Kartenansicht wechseln, falls das nicht schon geschieht).

---

## Schritt 8 – Benchmark (Bedienphilosophie, nicht Design-Kopie)

| Vorbild | Übertragbares Prinzip |
|---|---|
| **Apple Home** | Kachel-Dashboard mit „ein Blick genügt", Ein-Klick-Aktionen für Alltägliches |
| **Airbnb** | Klare Bottom-Nav mit wenigen Punkten, konsequente Kartenmetapher |
| **Nuki** | Reduktion auf den einen wichtigsten Status/Button pro Bildschirm |
| **Duolingo** | Positives, motivierendes Feedback bei erledigten Aufgaben (passend für „geleistete Stunden") |
| **Google Maps** | Muster für die geplante Lagerkarte-Funktion: Standort + Kategorie-Filter |
| **WhatsApp** | Einfache, chronologische Feed-Metapher – Vorbild für das künftige Schwarze Brett |
| **Notion / MS To Do** | Aufgabenlisten mit Checkbox-Logik – Vorbild für die geplante Aufgabenverwaltung |

---

## Schritt 9 – Redesign-Plan je Seite

| Seite | Ist-Zustand | Hauptprobleme | Verbesserung | Priorität | Aufwand |
|---|---|---|---|---|---|
| Navigation gesamt | Sidebar-Liste, additiv nach Rolle | Kein Fokus, kein Mobile-Pattern | Bottom-Nav + getrennter „Verwaltung"-Bereich | **Kritisch** | Hoch |
| Dashboard | „Lager-Feeds & Leitstand", technisch betitelt | Zu viele gleichwertige Blöcke, kein klarer Fokus | Karten-Hierarchie mit „nächste Schicht" im Zentrum | **Kritisch** | Mittel |
| Kalender + Druckansicht | Zwei getrennte Tabs mit gleichem Kerninhalt | Redundanz, Verwirrung | Zusammenlegen zu „Mein Plan" mit Ansichts-Umschalter | Hoch | Mittel |
| Materialbestellung | 5 Pflichtfelder in einem Formular | Reibung bei spontaner Nutzung | Ein-Feld-Schnelleingabe, Rest optional/später | Hoch | Niedrig |
| Status-Änderung | Vermutlich Modal-basiert | Umständlich für einfache Ja/Nein-Antwort | Direkte Buttons in der Listenzeile, Modal nur für Ablehnungsgrund | Hoch | Mittel |
| Rollenanzeige | Badge ohne Erklärung | Unklar, warum Menü variiert | Kurzer Erklärtext/Tooltip beim ersten Login je Rolle | Mittel | Niedrig |
| Login | Bereits neu (Name + PIN) | Kein Onboarding danach | Kurze, überspringbare Erstlogin-Tour (3 Screens) | Mittel | Mittel |
| Programm/Talentshow | Sehr umfangreiche Einzelkomponente | Hohe Komplexität für Bereichsleitung | Aufteilen in „Anmelden" (Helfer) vs. „Regie" (Bereichsleitung), heute vermischt | Mittel | Hoch |
| Farb-/Schriftsystem gesamt | Dunkles Terminal-Theme als Standard | Wirkt kühl/technisch für breite Zielgruppe | Neues helles Standard-Theme, Dark Mode optional | Hoch | Hoch |

---

## Schritt 10 – Abschlussbericht

### Zusammenfassung
Die App ist fachlich bereits sehr vollständig und durch die kürzlich eingeführte Rollentrennung auch strukturell gut vorbereitet. Das größte Potenzial liegt nicht im Nachrüsten neuer Funktionen, sondern im **Aufräumen der Informationsarchitektur** und einer **wärmeren, mobil-first gedachten Optik**, die zur ehrenamtlichen, altersgemischten Zielgruppe passt.

### Vollständige Funktionsübersicht
Siehe Schritt 1 – 11 Tabs, 7 Modaltypen, 3 Rollen, vollständig rollenabgesicherte REST-API.

### UX-Analyse
4 kritische, 4 hohe, 3 mittlere und 1 niedrige Problemstelle identifiziert (Schritt 2) – Schwerpunkt: fehlende Hierarchie, fehlendes Onboarding, Desktop-first-Navigation, technische Optik.

### Zielgruppenanalyse
6 Nutzergruppen mit sehr unterschiedlichen Bedürfnissen (Schritt 3) – gemeinsamer Nenner: möglichst wenige Schritte bis zur eigenen nächsten Aufgabe.

### Informationsarchitektur
Reduktion auf 4 Hauptbereiche + 1 abgegrenzten Verwaltungsbereich statt 11 gleichrangiger Punkte (Schritt 4).

### Dashboard-Konzept
„Nächste Schicht" als zentrales Element, alles Administrative konsequent draußen (Schritt 5).

### Designsystem
Helles, ruhiges Grundthema mit einem Akzentton, große Schrift, konsistente Statusfarben, Skeleton-Loading (Schritt 6).

### Mobile-Konzept
Bottom-Navigation, große Touch-Ziele, kontrastreich für Outdoor-Nutzung (Schritt 7).

### Priorisierte Maßnahmenliste
1. Navigation/Informationsarchitektur neu ordnen (kritisch)
2. Dashboard fokussieren (kritisch)
3. Farb-/Schriftsystem modernisieren (hoch, aufwändig)
4. Kalender/Druckansicht zusammenlegen (hoch)
5. Materialbestellung vereinfachen (hoch, günstig)
6. Status-Änderung direkter gestalten (hoch)
7. Onboarding/Rollen-Erklärung ergänzen (mittel)
8. Programm/Talentshow für Helfer vs. Bereichsleitung entflechten (mittel, aufwändig)

### Roadmap-Vorschlag für die Umsetzung (nach Freigabe)
- **Phase 1 (schnelle Wirkung, geringes Risiko):** Materialbestellung vereinfachen, Status-Buttons direkter, Rollen-Tooltip
- **Phase 2 (strukturell):** Neue Navigation (Bottom-Nav + Verwaltungsbereich), Dashboard-Neuaufbau
- **Phase 3 (visuell):** Neues Designsystem (Farben/Typografie/Karten) konsequent über alle Seiten
- **Phase 4 (inhaltlich):** Kalender/Druckansicht zusammenlegen, Programm/Talentshow entflechten, Onboarding-Tour

### Empfehlungen für die spätere Umsetzung
- Iterativ vorgehen (wie bisher), nach jedem Schritt lauffähig bleiben
- Bestehende Komponentenstruktur wo möglich wiederverwenden, nicht neu schreiben (Logik/Firebase/API bleiben unverändert, wie gefordert)
- Vor der visuellen Umsetzung: kurze Abstimmung mit 2–3 echten Helfern unterschiedlichen Alters, um die Priorisierung zu validieren
