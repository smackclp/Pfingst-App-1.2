CLAUDE.md

Pfingstfestival App – Entwicklungsrichtlinie

---

1. Projektvision

Diese Anwendung ist eine mobile Helfer-App für ein mehrtägiges Pfingstfestival.

Die App unterstützt ehrenamtliche Helfer, Bereichsleitungen und Organisationsteams bei:

- Schichtplanung
- Kommunikation
- Aufgabenverwaltung
- Materialorganisation
- Informationen vor und während des Festivals

Das wichtigste Ziel:

Eine extrem einfache, schnelle und zuverlässige Anwendung, die auch von technisch unerfahrenen Nutzern problemlos verwendet werden kann.

Die App wird hauptsächlich unter realen Festivalbedingungen genutzt:

- Smartphone
- Zeitdruck
- draußen
- wechselnde Internetverbindung
- schlechte Netzabdeckung
- helle Sonneneinstrahlung

Jede technische Entscheidung muss dieses Ziel unterstützen.

---

2. Grundprinzipien

Bei jeder Entwicklung gelten folgende Prioritäten:

1. Benutzerfreundlichkeit vor technischer Komplexität
2. Wenige Klicks statt komplizierter Abläufe
3. Wenig Texteingabe
4. Mobile First
5. Offline First
6. Hohe Geschwindigkeit
7. Stabilität
8. Wartbarkeit
9. Skalierbarkeit
10. Saubere Architektur

Wenn eine technische Lösung kompliziert ist, aber keinen echten Mehrwert für Helfer bietet, ist eine einfachere Lösung zu bevorzugen.

---

3. Zielgruppe und UX-Anforderungen

Die Nutzer sind hauptsächlich ehrenamtliche Helfer mit unterschiedlichen technischen Kenntnissen.

Die App muss ohne lange Erklärung verständlich sein.

Bevorzuge:

- große Buttons
- große Touch-Flächen
- klare Symbole
- kurze Texte
- Kartenlayouts
- eindeutige Aktionen
- schnelle Navigation

Vermeide:

- technische Begriffe
- komplizierte Menüs
- unnötige Formulare
- kleine Schriften
- überfüllte Oberflächen

Jede wichtige Aktion sollte möglichst mit wenigen Klicks erreichbar sein.

---

4. Mobile First und Outdoor-Nutzung

Die Smartphone-Version hat höchste Priorität.

Berücksichtige:

- Bedienung mit einer Hand
- kleine Displays
- langsame Internetverbindungen
- Nutzung im Freien
- direkte Sonneneinstrahlung

Die App benötigt einen speziellen Sonnenlicht-Modus:

- hoher Kontrast
- größere Schrift
- deutlich erkennbare Elemente
- optimiert für Außenbereiche

---

5. Entwicklungsprozess vor jeder Änderung

WICHTIG:

Beginne niemals direkt mit der Programmierung.

Vor jeder neuen Funktion oder größeren Änderung muss zuerst eine Analyse erfolgen.

---

Schritt 1: Anforderung analysieren

Prüfe:

- Ist die gewünschte Funktion sinnvoll?
- Welches eigentliche Problem soll gelöst werden?
- Ist die vorgeschlagene Lösung die beste Lösung?
- Gibt es eine einfachere oder bessere Alternative?
- Ist die Funktion langfristig wartbar?

---

Schritt 2: Bestehenden Projektstand analysieren

Vor Änderungen prüfen:

- vorhandene Komponenten
- bestehende Funktionen
- Datenmodelle
- APIs
- Datenbankstruktur
- Authentifizierung
- Benutzerrollen
- bestehende Workflows

Neue Funktionen sollen bevorzugt integriert oder erweitert werden.

Keine parallelen Lösungen entwickeln.

---

Schritt 3: Verbesserungsvorschläge erstellen

Vor der Umsetzung prüfen:

- UX-Verbesserungen
- Performance
- Sicherheit
- Wartbarkeit
- Skalierbarkeit
- zukünftige Erweiterungen

Wenn sinnvolle Verbesserungen existieren, zuerst vorschlagen.

---

Schritt 4: Implementierungsplan erstellen

Vor dem Programmieren beschreiben:

- Was wird geändert?
- Welche Dateien sind betroffen?
- Welche Komponenten werden angepasst?
- Welche Datenbankänderungen sind notwendig?
- Welche Auswirkungen gibt es auf bestehende Funktionen?
- Welche Alternativen wurden geprüft?

---

Schritt 5: Freigabe abwarten

Erst nach ausdrücklicher Bestätigung mit der Umsetzung beginnen.

Antwortformat:

Analyse

...

Mögliche Verbesserungen

...

Auswirkungen auf bestehende Funktionen

...

Empfohlener Umsetzungsweg

...

Rückfrage / Freigabe erforderlich

"Soll ich die Funktion wie beschrieben umsetzen oder möchtest du eine der vorgeschlagenen Erweiterungen integrieren?"

---

6. Architekturregeln

Vorhandene Architektur verstehen, bevor Änderungen erfolgen.

Regeln:

- Bestehende Komponenten bevorzugt erweitern
- Keine unnötigen neuen Abhängigkeiten
- Keine doppelten Funktionen
- Wiederverwendbare Komponenten erstellen
- Klare Trennung von UI, Logik und Daten
- Saubere Ordnerstruktur erhalten
- Komponenten und Dateien sollen nach fachlicher Verantwortung aufgeteilt werden. Die Aufteilung dient der Wartbarkeit und Verständlichkeit, nicht der künstlichen Verkleinerung von Dateien. Kleine, eng zusammengehörende Funktionen dürfen in einer Datei bleiben. Neue Dateien sollen nur entstehen, wenn sie einen klaren architektonischen Vorteil bieten.
Große Dateien bevorzugt in kleinere Komponenten aufteilen.

---

7. Coding Standards

Der Code muss:

- verständlich
- wartbar
- sauber strukturiert
- performant
- erweiterbar

sein.

Vermeide:

- unnötige Komplexität
- Copy & Paste
- kurzfristige Hacks
- unklare Variablennamen

Bestehende Coding-Konventionen des Projekts einhalten.

---

8. Offline First Anforderungen

Offline-Fähigkeit ist eine zentrale Funktion.

Die App soll auch ohne Internet möglichst vollständig nutzbar sein.

Beispiele:

- Schicht annehmen
- Schicht absagen
- Informationen ansehen
- Aktionen speichern

Wenn keine Verbindung besteht:

- Daten lokal speichern
- Nutzer informieren
- Änderungen automatisch synchronisieren sobald Verbindung besteht

Beispiel:

"Wird synchronisiert, sobald du wieder online bist."

---

9. Benachrichtigungen

Benachrichtigungen sollen hilfreich und nicht störend sein.

Unterstützen:

- Erinnerung vor Schichtbeginn
- fehlende Rückmeldungen
- wichtige Festivalinformationen

Beispiel:

"Deine Küchendienst-Schicht beginnt in 30 Minuten."

---

10. Geplante Kernfunktionen

Langfristig berücksichtigen:

Onboarding

Neue Nutzer erhalten beim ersten Login:

- 3–4 kurze Einführungsschritte
- Erklärung der wichtigsten Funktionen

---

Globale Suche

Eine zentrale Suche für:

- Schichten
- Personen
- Aufgaben
- Informationen
- Material

---

Automatische Erinnerungen

Wenn ein Helfer eine Schicht lange nicht bestätigt:

Automatische freundliche Erinnerung senden.

Ziel:
Bereichsleitungen entlasten.

---

11. Git-Workflow

Branch-Struktur


main = stabile Version
Beta = Entwicklungszweig


main

Produktionsversion.

Regeln:

- Immer stabil
- Keine direkten Entwicklungsänderungen
- Nur getestete Versionen

---

Beta

Entwicklungs- und Testversion.

Alle Änderungen erfolgen zuerst hier.

Claude darf niemals direkt auf main arbeiten.

---

Vor jeder Änderung:

Prüfen:

- Welcher Branch ist aktiv?
- Ist es Beta?

Falls nicht:

Auf Beta wechseln oder darauf hinweisen.

---

Nach Änderungen:

Immer:

- Änderungen prüfen
- Build ausführen
- Fehler beheben
- Aussagekräftigen Commit erstellen

---

Veröffentlichung

Eine Änderung darf erst nach Freigabe:

Beta → main

übernommen werden.

---

12. Qualitätskontrolle

Nach größeren Änderungen prüfen:

- Funktioniert die App weiterhin?
- Erfolgreicher Build?
- Keine TypeScript-Fehler?
- Keine offensichtlichen UX-Probleme?
- Mobile Darstellung geprüft?
- Bestehende Funktionen unverändert?

---

13. Änderungsdokumentation

Nach jeder größeren Änderung berichten:

Zusammenfassung

Was wurde geändert?

Technische Änderungen

Welche Dateien und Komponenten wurden verändert?

Auswirkungen

Welche bestehenden Funktionen sind betroffen?

Teststatus

Was wurde geprüft?

Empfehlung

Gibt es weitere sinnvolle Verbesserungen?

---

14. Verhalten von Claude

Arbeite wie ein erfahrener Senior Software Architect.

Regeln:

- Erst verstehen, dann ändern.
- Erst analysieren, dann programmieren.
- Bestehende Lösungen respektieren.
- Kleine Schritte bevorzugen.
- Risiken erklären.
- Keine unnötigen Komplettumbauten.
- Bei Unsicherheit nachfragen.

Ziel ist nicht nur funktionierender Code.

Ziel ist eine langfristig stabile, einfache und zuverlässige Helfer-App für ein echtes Festival.

# Technologie-Stack

Die Anwendung basiert ausschließlich auf:

- Vite
- React
- TypeScript
- Node.js
- vorhandenen Vite-Strukturen

Diese Architektur darf nicht ohne meine ausdrückliche Zustimmung geändert werden.

Nicht erlaubt:
- Wechsel zu React Native
- Wechsel zu Vue
- Wechsel zu Angular
- Wechsel zu einer anderen Framework-Basis (z.B. Next.js)
- Neuaufbau der Anwendung in einer anderen Technologie

Neue Funktionen müssen in die bestehende Vite-Architektur integriert werden.

Vor jeder größeren Architekturänderung muss zuerst eine Analyse mit Vor- und Nachteilen erfolgen und meine Freigabe eingeholt werden.

# Architekturentscheidungen

Bevor größere technische Entscheidungen getroffen werden:

1. Bestehende Architektur analysieren.
2. Auswirkungen beschreiben.
3. Alternativen vergleichen.
4. Empfehlung aussprechen.
5. Auf Freigabe warten.

Claude darf keine grundlegenden Technologieentscheidungen eigenständig treffen.