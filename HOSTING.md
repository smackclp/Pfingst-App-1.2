# Hosting-Entscheidung: Alternativen-Übersicht

Stand: 2026-08-07. Sammlung aller besprochenen Hosting-Optionen für die
Produktions-App, damit sie bei der nächsten Sitzung nicht neu recherchiert
werden müssen. Noch KEINE finale Entscheidung getroffen - dient als
Grundlage für eine spätere abschließende Bewertung durch den Nutzer.

## Ausgangslage

- App ist ein durchgehend laufender Express-Server (`server.ts`,
  `app.listen(...)`), kein Serverless-Design. Sessions, Login-Brute-Force-
  Sperre und der komplette Firestore-Datencache leben im Arbeitsspeicher
  EINES Prozesses (`server/auth.ts`, `server/firebase.ts`).
- Nutzer-Vorgabe (hart, wiederholt bestätigt): **lieber App nicht
  erreichbar als unkalkulierbares Kostenrisiko.** Eine Kreditkarte im
  Konto zu hinterlegen ist an sich schon ein Ausschlusskriterium, auch
  wenn die tatsächlich zu erwartenden Kosten gering wären.
- Firestore selbst (unabhängig vom gewählten Hosting) wurde separat
  durchgerechnet: durch den In-Memory-Cache-Mechanismus bleiben die
  Lese-/Schreibzugriffe bei der Nutzungsgröße (50 Helfer, 1 Monat/Jahr
  intensiv) weit im kostenlosen Spark-Kontingent - das war nie das
  Risiko, siehe unten "Cloud Run" für die Einordnung.

## Bereits geprüfte/verworfene Optionen

### Vercel - verworfen
App läuft dort nicht ohne größeren Umbau: Vercel erkennt das
Vite-Frontend, baut nur `dist/` als statische Seite, startet den
Node-Server (`dist/server.cjs`) gar nicht. `/api/*` läuft ins Leere
("Namensliste konnte nicht geladen werden"). Selbst mit `vercel.json` als
Express-Wrapper bliebe das Grundproblem: Vercels Serverless-Modell kann
mehrere isolierte Instanzen parallel starten bzw. bei Inaktivität neu
starten - Sessions/Login-Sperre/Cache im Arbeitsspeicher würden
unzuverlässig (zufällige Auslogger), UND jede neu gestartete Instanz lädt
den kompletten Datenbestand neu aus Firestore (Kostentreiber, den der
Cache-Mechanismus gerade vermeiden soll).

### Cloudflare Workers - verworfen (für den aktuellen Code)
Keine echte Node.js-Laufzeit (V8-Isolates statt Node). `firebase-admin`
(nutzt gRPC) läuft dort nicht ohne Ersatz durch direkte REST-Aufrufe,
Express bräuchte einen Ersatz (z.B. Hono), Sessions/Cache bräuchten
Cloudflare-eigene Primitiven (Durable Objects/KV) statt In-Memory-Map.
Das wäre ein kompletter Backend-Neubau, keine Deployment-Frage mehr -
eigenes, späteres Projekt mit echter Architektur-Analyse, falls gewünscht.
Positiv: großzügiger Gratis-Tarif, vermutlich keine Kreditkarte nötig für
die kostenlose Stufe (nicht abschließend verifiziert).

### "Kein Backend, nur Firebase + React PWA" (ChatGPT-Vorschlag) - verworfen
Firebase Hosting + Firestore direkt vom Client aus wäre zwar
kostenlos/kartenfrei (Spark-Plan), aber: PIN-Login mit
Brute-Force-Sperre, Rollen-Berechtigungen (Helfer/Bereichsleitung/
Lagerleitung) und Push-Benachrichtigungen (geheimer VAPID-Schlüssel)
hängen aktuell alle an echter Server-Logik. Ohne Server bräuchte es
entweder Cloud Functions (= wieder Blaze-Pflicht, dasselbe
Kreditkarten-Problem wie bei Cloud Run) oder einen riskanten Nachbau der
Berechtigungsprüfung rein über Firestore-Security-Rules (die keine
zeitfenster-basierte Zähllogik wie die Login-Sperre können). Echter
Sicherheits-Rückbau, kein einfacher Gewinn.

## Kandidaten mit echtem Potenzial

### Render.com (Gratis-Tarif) - aktuell favorisiert
- Keine Kreditkarte für den kostenlosen Web-Service-Tarif nötig (Stand
  Recherche in dieser Sitzung, bei Anmeldung selbst nochmal prüfen).
- Läuft als EIN durchgehender Prozess pro Instanz - passt exakt zur
  bestehenden Architektur, keine Code-Änderung nötig.
- Nachteil: schläft nach ~15 Min. Inaktivität ein, Aufwecken danach
  20-50 Sek. Verzögerung beim ersten Request.
- Abschwächung: externer kostenloser Keep-Alive-Ping (z.B. UptimeRobot,
  cron-job.org - beide ohne Kreditkarte, Gratis-Tarif reicht), pingt die
  App alle ~10 Min. an, damit sie nie einschläft. Vorher prüfen, ob
  Render mittlerweile ein monatliches Gesamt-Laufzeit-Kontingent für den
  Gratis-Tarif hat (unabhängig vom Einschlafen) - falls ja, könnte
  Dauer-Wachhalten das Kontingent schneller aufbrauchen.

### Google Cloud Run - technisch am zuverlässigsten, aber Kreditkarten-Pflicht
- Kein Code-Umbau nötig (Buildpacks erkennen `npm run build`/`npm start`
  automatisch), `server.ts` liest bereits `process.env.PORT` und bindet
  an `0.0.0.0`.
- `--min-instances=1 --max-instances=1` hält genau einen Prozess
  dauerhaft am Laufen (kein Sessions-Problem), ODER `--min-instances=0`
  für echtes Scale-to-Zero (Kaltstart aber nur 1-3 Sek. statt Renders
  20-50 Sek. - deutlich schneller).
- Blockiert aktuell an: Cloud Run, Secret Manager UND Cloud Build
  verlangen zwingend den Blaze-Plan (Kreditkarte hinterlegt), unabhängig
  von echter Nutzung - das ist eine administrative Zugangssperre, keine
  Kostenaussage.
- Geschätzte tatsächliche Kosten bei dieser Nutzungsgröße: mit
  `min-instances=1` durchgehend niedriger einstelliger bis knapp
  zweistelliger Euro-Betrag/Monat; mit `min-instances=0` vermutlich
  meist 0 € (bleibt im Cloud-Run-eigenen Gratiskontingent), nur im
  intensiven Festival-Monat spürbar. Einschätzung, keine Garantie -
  offizieller Rechner: cloud.google.com/products/calculator.
- Weitere automatisch mitlaufende Dienste bei Blaze: Artifact Registry
  (Container-Images sammeln sich bei jedem Deploy an - Aufräumregel
  einrichten!), Cloud Logging/Monitoring (bei dieser Nutzungsgröße
  gratis-tauglich).
- Mögliche Absicherung, falls Blaze doch akzeptiert würde: Budget-Alarm
  MIT automatischer Abrechnungs-Deaktivierung bei Grenzwert (offizielles
  Google-Muster: Budget-Alarm -> Pub/Sub -> Cloud Function -> Billing
  API deaktiviert Abrechnung fürs ganze Projekt). Kein alleiniger
  Budget-Alarm (der benachrichtigt nur per E-Mail, stoppt aber nichts
  automatisch - erfüllt die "lieber offline als Kosten"-Vorgabe NICHT
  für sich allein). Kleine Restverzögerung zwischen Grenzwert-
  Überschreitung und tatsächlicher Deaktivierung bleibt bestehen.
- Zusätzlich möglich: saisonales Umschalten (`min-instances=0` von
  Juli-Februar, `=1` in den intensiven Monaten) - manuell mit 2
  Erinnerungen im Jahr, oder automatisiert per Cloud Scheduler (auch
  Blaze-pflichtig, aber bei dieser Nutzung im Gratiskontingent).

## Neu vorgeschlagen, noch nicht tief geprüft

### Eigene Synology NAS (DS212j) - vermutlich technisch nicht machbar
- DS212j ist ein sehr altes (~2012), leistungsschwaches Einsteigermodell:
  Single-Core-ARM-CPU, typischerweise nur 128 MB RAM, nicht erweiterbar.
- "j"-Serie unterstützt nach Kenntnisstand KEIN Docker/Container Manager
  (Hardware-Voraussetzungen dafür fehlen bei diesem Modell) - Deployment
  über das sonst übliche Docker-Image wäre nicht möglich.
- Auch ohne Docker (z.B. Node.js über SynoCommunity-Pakete direkt
  installiert) fraglich, ob Express + firebase-admin (gRPC-Abhängigkeit)
  in 128 MB RAM überhaupt zuverlässig läuft.
- DSM-Update-Support für ein Gerät dieses Alters ist mit hoher
  Wahrscheinlichkeit bereits ausgelaufen (Sicherheitsrisiko bei
  öffentlicher Erreichbarkeit).
- Öffentliche Erreichbarkeit vom Zuhause aus (Portfreigabe/DynDNS) bringt
  eigene Zuverlässigkeits-/Sicherheitsfragen mit (Heimnetz-Uptime,
  Bandbreite, Angriffsfläche) - passt schlecht zu CLAUDE.mds
  Stabilitäts-Anspruch für echte Festivalbedingungen.
- Kosten: 0 € (Hardware vorhanden), aber technische Machbarkeit sehr
  fraglich. Müsste vor Ort am Gerät geprüft werden (RAM-Ausbau nicht
  möglich, Docker-Fähigkeit im DSM-Paketzentrum prüfen), bevor das als
  ernsthafte Option gilt.

### all-inkl.com - technisch prüfenswert, aber kostenpflichtig
- Deutscher Hoster, Kerngeschäft klassisches Shared-Hosting
  (PHP/MySQL/Apache) - klassische Tarife unterstützen normalerweise
  KEINEN durchgehend laufenden Node.js-Prozess.
- Manche Tarife bieten mittlerweile Node.js-Unterstützung (z.B. über
  Passenger-artige Prozess-Verwaltung) - müsste direkt bei all-inkl
  erfragt werden: welcher Tarif, welche Node-Version, ob native
  npm-Abhängigkeiten wie `firebase-admin` dort installierbar sind,
  welche Speicher-/CPU-Grenzen gelten.
- WICHTIGER Unterschied zum Kostenrisiko bei Cloud Run: all-inkl-Tarife
  sind FESTE, im Voraus bekannte monatliche/jährliche Preise - kein
  nutzungsabhängiges "könnte theoretisch mehr werden"-Risiko wie bei
  Cloud-Diensten. Das trifft die eigentliche Sorge des Nutzers
  (unkalkulierbare Kosten) anders als eine harte "0€"-Vorgabe - ggf. wert,
  das nochmal explizit abzufragen, ob ein kleiner, aber PLANBARER
  Fixpreis akzeptabel wäre.
- Noch offen: aktuelle Tarife/Preise bei all-inkl direkt nachsehen
  (nicht recherchiert in dieser Sitzung).

## Offene Fragen für die finale Bewertung

1. Ist ein kleiner, aber garantiert FESTER monatlicher Betrag (z.B.
   all-inkl) grundsätzlich akzeptabel, oder muss es wirklich 0€ sein?
   (Ändert die Bewertung von all-inkl stark.)
2. Falls NAS: technische Prüfung vor Ort nötig (Docker-Fähigkeit,
   RAM-Grenzen, DSM-Support-Status).
3. Falls doch Cloud Run: soll das komplette Absicherungspaket
   (Budget-Alarm + Auto-Abschaltung + Artifact-Registry-Aufräumregel +
   saisonales Umschalten) mit aufgesetzt werden?
