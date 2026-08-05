import { DB, Camp, Shift, ShiftAssignment } from "../types";
import { EXPORT_PAGE_STYLES } from "./exportStyles";

interface BuildExportHtmlParams {
  activeCamp: Camp;
  db: DB;
  filteredShifts: Shift[];
  filteredAssignments: ShiftAssignment[];
  clientScript: string;
}

/**
 * Baut die vollständige, eigenständige Offline-Dienstplan-HTML-Seite.
 * Extrahiert aus export.ts (dort war es Teil eines einzigen riesigen
 * Template-Literals). Das clientScript-Argument ist der zur Laufzeit
 * eingelesene Inhalt von export.client.js - dadurch bleibt die exportierte
 * HTML-Datei weiterhin vollständig eigenständig (kein <script src="...">,
 * das beim Offline-Öffnen ins Leere liefe).
 */
export function buildExportHtml({ activeCamp, db, filteredShifts, filteredAssignments, clientScript }: BuildExportHtmlParams): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dienstplan - ${activeCamp.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>${EXPORT_PAGE_STYLES}</style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen selection:bg-emerald-500/20">

  <!-- Floating Header Banner -->
  <header class="bg-slate-900 border-b border-emerald-500/20 px-4 py-5 md:px-8 shadow-xl">
    <div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <span class="text-[10px] bg-emerald-950 text-emerald-450 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-md font-mono font-bold tracking-widest uppercase">
          📟 ${activeCamp.title.toUpperCase()} • OFFLINE EXPORT
        </span>
        <h1 class="text-xl md:text-2xl font-black mt-2 tracking-tight text-white">
          Dienstplan & Schichteinteilung
        </h1>
        <p class="text-xs text-slate-400 mt-1">Eigenständiges, mobiles Dashboard für Helfer und WhatsApp-Gruppen.</p>
      </div>
      
      <div class="flex items-center gap-3">
        <button onclick="toggleTheme()" class="bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition cursor-pointer shrink-0">
          <span id="themeToggleIcon">☀️</span> <span id="themeToggleText">Heller Modus</span>
        </button>
        <div class="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-col justify-center">
          <p class="text-[9px] text-slate-500 font-mono">STAND DER DATEN</p>
          <p class="text-xs font-bold text-emerald-400 tracking-tight font-mono">${new Date().toLocaleDateString("de-DE")} • ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr</p>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Container -->
  <main class="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

    <!-- Tab Selectors & Filter bar -->
    <div class="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-xl">
      
      <!-- Primary Tab Controls -->
      <div class="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center shrink-0">
        <button id="tabButtonPersonal" onclick="switchTab('personal')" class="flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all text-emerald-400 bg-slate-900 border border-emerald-500/10">
          👤 Persönlicher Plan
        </button>
        <button id="tabButtonList" onclick="switchTab('list')" class="flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-white">
          📋 Gesamt-Einteilung
        </button>
        <button id="tabButtonDays" onclick="switchTab('days')" class="flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-white">
          📅 Tagesübersichten
        </button>
      </div>

      <!-- Action Search field -->
      <div class="relative flex-1 max-w-md w-full">
        <input 
          type="text" 
          id="searchInput"
          oninput="handleSearch(this.value)" 
          placeholder="Dienst, Aufgabe, Ort oder Helfer suchen..." 
          class="w-full text-xs pl-4 pr-10 py-2.5 border border-slate-800 rounded-xl focus:outline-none focus:border-emerald-500/40 bg-slate-950 text-white placeholder-slate-500 font-medium"
        >
        <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 pointer-events-none">
          🔎
        </span>
      </div>
    </div>

    <!-- TAB CONTENT: PERSONAL FILTER (Default) -->
    <section id="tabContentPersonal" class="space-y-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
        
        <div class="max-w-md space-y-2">
          <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">👤 HELFER AUSWÄHLEN</label>
          <select 
            id="helperSelect" 
            onchange="renderPersonalPlan(this.value)"
            class="w-full text-sm px-4 py-3 border border-slate-800 rounded-xl bg-slate-950 text-emerald-300 font-bold focus:outline-none focus:border-emerald-500/40"
          >
            <option value="">-- Name im Dropdown wählen --</option>
            <!-- Generated dynamically -->
          </select>
          <p class="text-xs text-slate-400">Wähle deinen Namen aus, um sofort alle deine persönlichen Schichten, Aufgaben und deine Gesamt-Helferzeit abzurufen.</p>
        </div>

        <!-- Personal Summary Panel -->
        <div id="personalStatsPanel" class="hidden grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800 pt-6">
          <div class="bg-slate-950/80 border border-emerald-500/10 rounded-xl p-4 flex flex-col justify-center">
            <span class="text-[9px] text-slate-500 font-mono tracking-wider">GESAMT_EINSATZZEIT</span>
            <span id="personalHoursCount" class="text-2xl font-black text-emerald-400 font-mono mt-1">0 Std</span>
          </div>
          <div class="bg-slate-950/80 border border-emerald-500/10 rounded-xl p-4 flex flex-col justify-center">
            <span class="text-[9px] text-slate-500 font-mono tracking-wider">SCHICHT_ANZAHL</span>
            <span id="personalShiftsCount" class="text-2xl font-black text-emerald-400 font-mono mt-1">0 Schichten</span>
          </div>
          <div class="bg-slate-950/80 border border-emerald-500/10 rounded-xl p-4 flex flex-col justify-center">
            <span class="text-[9px] text-slate-500 font-mono tracking-wider">HAUPTVERANTWORTUNG</span>
            <span id="personalResponsibleCount" class="text-sm font-semibold text-emerald-400 mt-2 uppercase truncate font-mono">Keine</span>
          </div>
        </div>

        <!-- Personal ICS Export Panel -->
        <div id="personalIcsExportPanel" class="hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-4 rounded-xl mt-4">
          <div>
            <h5 class="text-xs font-bold text-white">📅 Kalender exportieren (Apple, Google, Outlook, iOS)</h5>
            <p class="text-[10px] text-slate-400 mt-1">Lade deine Dienste als .ics-Datei herunter, um sie direkt in deinen Smartphone-Kalender zu importieren.</p>
          </div>
          <button onclick="downloadUserICSSelected()" class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold rounded-lg text-xs tracking-tight transition shadow-md whitespace-nowrap cursor-pointer">
            📅 Kalender herunterladen (.ics)
          </button>
        </div>

        <!-- Personal Results list -->
        <div id="personalShiftsList" class="space-y-4 pt-2">
          <div class="p-8 text-center text-slate-500 italic border border-dashed border-slate-800 rounded-xl text-xs">
            Noch keine Person ausgewählt. Wähle deinen Namen oben ganz einfach aus dem Dropdown aus.
          </div>
        </div>

      </div>
    </section>

    <!-- TAB CONTENT: COMPLETE LIST -->
    <section id="tabContentList" class="space-y-4 hidden">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-850">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">📊 Ansicht:</span>
        <div class="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center shrink-0 shadow-inner">
          <button id="listLayoutTable" onclick="setListLayout('table')" class="px-3 py-1 text-xs font-bold rounded-md transition-all bg-slate-900 border border-emerald-500/10 text-emerald-400">
            📑 Tabelle
          </button>
          <button id="listLayoutCards" onclick="setListLayout('cards')" class="px-3 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-white">
            📇 Karten
          </button>
        </div>
      </div>

      <!-- Table Container -->
      <div id="listTableContainer" class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div class="overflow-x-auto">
          <table class="min-w-full text-left border-collapse">
            <thead class="bg-slate-950 border-b border-slate-800 text-emerald-400 uppercase tracking-wider text-[9px] font-bold font-mono">
              <tr>
                <th class="py-3 px-4 md:px-6">Tag • Uhrzeit</th>
                <th class="py-3 px-4 md:px-6">Dienst / Aufgabe</th>
                <th class="py-3 px-4 md:px-6">Ort</th>
                <th class="py-3 px-4 md:px-6">Verantwortlicher (HV)</th>
                <th class="py-3 px-4 md:px-6">Helfer-Crew</th>
                <th class="py-3 px-4 md:px-6">Status</th>
              </tr>
            </thead>
            <tbody id="compactTableBody" class="divide-y divide-slate-850/60 text-xs">
              <!-- Dynamically rendered -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Cards Container -->
      <div id="listCardsContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 hidden">
        <!-- Dynamically rendered -->
      </div>
    </section>

    <!-- TAB CONTENT: DAY PLANS -->
    <section id="tabContentDays" class="space-y-6 hidden">
      <!-- Dynamic day tabs selector bar -->
      <div id="dayFilterTabs" class="flex flex-wrap items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-850 max-w-xl">
        <!-- Day buttons will render dynamically here -->
      </div>

      <!-- Cards Grid of selected day -->
      <div id="daysCardsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <!-- Dynamically drawn -->
      </div>
    </section>

  </main>

  <!-- Embed JSON Databases compiled securely inside the template literal -->
  <script>
    const activeCamp = ${JSON.stringify(activeCamp)};
    const users = ${JSON.stringify(db.users.filter(u => u.active))};
    const services = ${JSON.stringify(db.services)};
    const shifts = ${JSON.stringify(filteredShifts)};
    const assignments = ${JSON.stringify(filteredAssignments)};

    ${clientScript.trimEnd()}
  </script>
</body>
</html>`;
}
