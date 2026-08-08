/// <reference types="vite/client" />

// Zur Build-Zeit von vite.config.ts injizierte Konstanten (siehe dort):
// Datum/Uhrzeit und Kurz-Hash des letzten Git-Commits, um im Header
// anzuzeigen, wann die Programmierung zuletzt geändert wurde - NICHT
// wann zuletzt Daten in der Datenbank geändert wurden.
declare const __LAST_COMMIT_DATE__: string;
declare const __LAST_COMMIT_HASH__: string;

// App-Name in der Top-Leiste, abhängig vom Git-Branch zur Build-Zeit
// ("main" -> "Pfingstfestival", alles andere z.B. "beta" -> "Beta-Test").
declare const __APP_BRANCH_LABEL__: string;
