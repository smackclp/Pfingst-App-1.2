import { Router } from "express";
import { readDB } from "../db";
import { Camp, DB } from "../types";
import { authMiddleware, requireMinRole } from "../auth";

const router = Router();

// Export enthält den kompletten Dienstplan inkl. Namen -> mind. Bereichsleiter-Rechte nötig.
router.get("/export-html", authMiddleware, requireMinRole("bereichsleiter"), (req, res) => {
  const db = readDB();
  const activeCampId = db.activeCampId || "camp-2026";
  const activeCamp = (db.camps || []).find((c) => c.id === activeCampId) || { id: "camp-2026", year: 2026, start_date: "2026-05-23", end_date: "2026-05-25", title: "Pfingstlager 2026" };

  const filteredShifts = db.shifts.filter((s) => s.camp_id === activeCampId);
  const campShiftIds = new Set(filteredShifts.map((s) => s.id));
  const filteredAssignments = db.assignments.filter((a) => campShiftIds.has(a.shift_id));

  const addDaysString = (dateStr: string, days: number): string => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  const formatDateShort = (dateStr: string): string => {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    const day = parseInt(parts[2], 10);
    const month = months[parseInt(parts[1], 10) - 1];
    return `${day}. ${month}`;
  };

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dienstplan - ${activeCamp.title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;905&family=JetBrains+Mono:wght@400;700&display=swap');
    body {
      font-family: 'Inter', sans-serif;
    }
    .mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .expander-only {
      display: none !important;
    }
    .shift-card.expanded-active .expander-only {
      display: block !important;
    }
    .shift-card .collapse-text {
      display: none;
    }
    .shift-card.expanded-active .expand-text {
      display: none;
    }
    .shift-card.expanded-active .collapse-text {
      display: inline;
    }
    .shift-card .arrow-icon {
      display: inline-block;
      transition: transform 0.2s ease;
      transform: rotate(0deg);
    }
    .shift-card.expanded-active .arrow-icon {
      transform: rotate(180deg);
    }

    /* LIGHT THEME OVERRIDES FOR OFFLINE EXPORT */
    body.light-theme {
      background-color: #f8fafc !important;
      color: #0f172a !important;
    }
    body.light-theme header,
    body.light-theme .bg-slate-900\/60,
    body.light-theme .bg-slate-900,
    body.light-theme .bg-slate-950 p-1,
    body.light-theme #statsRow > div {
      background-color: #f1f5f9 !important;
      border-color: #cbd5e1 !important;
    }
    body.light-theme h1,
    body.light-theme h2,
    body.light-theme h3,
    body.light-theme h4,
    body.light-theme h5,
    body.light-theme h6,
    body.light-theme .text-white {
      color: #0f172a !important;
    }
    body.light-theme .text-slate-350,
    body.light-theme .text-slate-300,
    body.light-theme .text-slate-400 {
      color: #475569 !important;
    }
    body.light-theme .text-slate-500 {
      color: #64748b !important;
    }
    body.light-theme .border-slate-800,
    body.light-theme .border-slate-800\/40,
    body.light-theme .border-slate-800\/60 {
      border-color: #cbd5e1 !important;
    }
    body.light-theme .border-emerald-500\/10,
    body.light-theme .border-emerald-500\/20 {
      border-color: rgba(16, 185, 129, 0.3) !important;
    }
    body.light-theme #helperSelect,
    body.light-theme #searchInput {
      background-color: #ffffff !important;
      color: #0f172a !important;
      border-color: #cbd5e1 !important;
    }
    body.light-theme #tabButtonPersonal:not(.text-emerald-400),
    body.light-theme #tabButtonList:not(.text-emerald-400),
    body.light-theme #tabButtonDays:not(.text-emerald-400) {
      color: #475569 !important;
    }
    body.light-theme .shift-card,
    body.light-theme .bg-slate-950\/70,
    body.light-theme .bg-slate-950 {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
    }
    body.light-theme .shadow-xl,
    body.light-theme .shadow-2xl {
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05) !important;
    }
    body.light-theme .bg-emerald-950\/20 {
      background-color: rgba(16, 185, 129, 0.1) !important;
    }
  </style>
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

    // State managers
    let activeTab = 'personal';
    let currentSearch = '';
    let selectedUser = '';
    let listLayout = 'table';
    let selectedDay = activeCamp.start_date;

    function toggleTheme() {
      const isLight = document.body.classList.toggle('light-theme');
      const icon = document.getElementById('themeToggleIcon');
      const text = document.getElementById('themeToggleText');
      if (icon && text) {
        icon.innerText = isLight ? '🌙' : '☀️';
        text.innerText = isLight ? 'Dunkles Design' : 'Helles Design';
      }
      localStorage.setItem('exported-theme', isLight ? 'light' : 'dark');
    }

    // On Load Restore theme
    window.addEventListener('DOMContentLoaded', () => {
      const savedTheme = localStorage.getItem('exported-theme');
      if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        const icon = document.getElementById('themeToggleIcon');
        const text = document.getElementById('themeToggleText');
        if (icon && text) {
          icon.innerText = '🌙';
          text.innerText = 'Dunkles Design';
        }
      }
    });

    // Helper functions for dates
    const addDays = (dateStr, days) => {
      if (!dateStr || dateStr === 'Haupt') return dateStr;
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
      } catch (e) {
        return dateStr;
      }
    };

    const getCampDays = () => {
      const dates = [];
      let current = new Date(activeCamp.start_date);
      const last = new Date(activeCamp.end_date);
      let safetyCounter = 0;
      while (current <= last && safetyCounter < 15) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
        safetyCounter++;
      }
      return dates;
    };

    const getDayLabel = (dateStr) => {
      if (!dateStr) return '';
      if (dateStr === 'Haupt') return 'Dauerhafte Einteilung';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
        const dayName = weekdays[d.getDay()];
        return dayName;
      } catch (e) {
        return dateStr;
      }
    };

    const getDayAbbrev = (dateStr) => {
      if (!dateStr) return '';
      if (dateStr === 'Haupt') return 'Allg.';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const abbreviations = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
        return abbreviations[d.getDay()]+'.';
      } catch (e) {
        return '';
      }
    };

    const formatDateGerman = (dateStr) => {
      if (!dateStr) return '';
      if (dateStr === 'Haupt') return 'Dauerhaft';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return \`\${parts[2]}.\${parts[1]}.\`;
        }
      } catch (e) {}
      return dateStr;
    };

    const calculateShiftHours = (start, end) => {
      if (!start || !end || start === 'Dauerhaft') return 0;
      try {
        const [startH, startM] = start.split(":").map(Number);
        let [endH, endM] = end.split(":").map(Number);
        if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return 0;
        if (endH < startH || (endH === startH && endM < startM)) {
          endH += 24;
        }
        const total = (endH * 60 + endM) - (startH * 60 + startM);
        return Math.round((total / 60) * 10) / 10;
      } catch (e) {
        return 0;
      }
    };

    // Initialize client applet
    window.addEventListener('DOMContentLoaded', () => {
      populateDropdowns();
      populateDayFilterTabs();
      switchTab('personal');
    });

    const populateDropdowns = () => {
      const select = document.getElementById('helperSelect');
      if (!select) return;
      
      const sorted = [...users].sort((a, b) => {
        const nA = a.display_name || a.first_name || '';
        const nB = b.display_name || b.first_name || '';
        return nA.localeCompare(nB);
      });

      sorted.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.display_name || \`\${u.first_name} \${u.last_name || ''}\`.trim();
        opt.className = "bg-slate-900 text-slate-100 font-semibold";
        select.appendChild(opt);
      });
    };

    const populateDayFilterTabs = () => {
      const dayFilterContainer = document.getElementById('dayFilterTabs');
      if (!dayFilterContainer) return;
      dayFilterContainer.innerHTML = '';

      const campDays = getCampDays();
      
      const allDays = [...campDays, 'Haupt'];
      allDays.forEach((day, index) => {
        const btn = document.createElement('button');
        btn.id = \`dayBtn-\${day}\`;
        btn.onclick = () => setDayFilter(day);
        
        let label = '';
        if (day === 'Haupt') {
          label = 'Allgemeine Aufgaben';
        } else {
          label = \`\${getDayAbbrev(day)} \${formatDateGerman(day)}\`;
        }
        
        btn.className = "px-3 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-white";
        btn.textContent = label;
        dayFilterContainer.appendChild(btn);
      });

      // Default selected day is first camp day
      if (campDays.length > 0) {
        selectedDay = campDays[0];
      } else {
        selectedDay = 'Haupt';
      }
    };

    const switchTab = (tab) => {
      activeTab = tab;
      
      // Toggle button highlights
      document.getElementById('tabButtonPersonal').className = (tab === 'personal')
        ? "flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all text-emerald-450 text-emerald-400 bg-slate-900 border border-emerald-500/15"
        : "flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-white";
        
      document.getElementById('tabButtonList').className = (tab === 'list')
        ? "flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all text-emerald-450 text-emerald-400 bg-slate-900 border border-emerald-500/15"
        : "flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-white";
        
      document.getElementById('tabButtonDays').className = (tab === 'days')
        ? "flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all text-emerald-450 text-emerald-400 bg-slate-900 border border-emerald-500/15"
        : "flex-1 md:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-white";

      // Hide or show visual panels
      document.getElementById('tabContentPersonal').style.display = (tab === 'personal') ? 'block' : 'none';
      document.getElementById('tabContentList').style.display = (tab === 'list') ? 'block' : 'none';
      document.getElementById('tabContentDays').style.display = (tab === 'days') ? 'block' : 'none';

      if (tab === 'list') renderCompactView();
      if (tab === 'days') setDayFilter(selectedDay);
    };

    const handleSearch = (val) => {
      currentSearch = val.trim().toLowerCase();
      if (activeTab === 'list') renderCompactView();
      if (activeTab === 'days') renderDayViewShifts();
      if (activeTab === 'personal') renderPersonalPlan(selectedUser);
    };

    const getSortedShifts = () => {
      const campDays = getCampDays();
      const order = { 'Haupt': 99 };
      campDays.forEach((day, index) => {
        order[day] = index;
      });

      return [...shifts].sort((a, b) => {
        const orderA = order[a.date] !== undefined ? order[a.date] : 999;
        const orderB = order[b.date] !== undefined ? order[b.date] : 999;
        if (orderA !== orderB) return orderA - orderB;
        
        const timeA = a.start_time || '';
        const timeB = b.start_time || '';
        return timeA.localeCompare(timeB);
      });
    };

    // Tab 1: Render Personal Plan
    const renderPersonalPlan = (userId) => {
      selectedUser = userId;
      const listDiv = document.getElementById('personalShiftsList');
      const statsPanel = document.getElementById('personalStatsPanel');
      const icsPanel = document.getElementById('personalIcsExportPanel');

      if (!userId) {
        listDiv.innerHTML = \`
          <div class="p-8 text-center text-slate-500 italic border border-dashed border-slate-800 rounded-xl text-xs">
            Noch keine Person ausgewählt. Wähle deinen Namen oben ganz einfach aus dem Dropdown aus.
          </div>
        \`;
        statsPanel.classList.add('hidden');
        icsPanel.classList.add('hidden');
        return;
      }

      statsPanel.classList.remove('hidden');
      icsPanel.classList.remove('hidden');

      const user = users.find(u => u.id === userId);
      const personalAss = assignments.filter(a => a.user_id === userId);
      
      const myShifts = [];
      let totalHours = 0;
      
      personalAss.forEach(ass => {
        const s = shifts.find(sh => sh.id === ass.shift_id);
        if (s) {
          totalHours += calculateShiftHours(s.start_time, s.end_time);
          myShifts.push(s);
        }
      });

      // Sort shifts sequentially
      const orderedCampDays = getCampDays();
      const orderMap = { 'Haupt': 99 };
      orderedCampDays.forEach((d, idx) => orderMap[d] = idx);

      myShifts.sort((a, b) => {
        const orderA = orderMap[a.date] !== undefined ? orderMap[a.date] : 999;
        const orderB = orderMap[b.date] !== undefined ? orderMap[b.date] : 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      // Update counters
      document.getElementById('personalHoursCount').textContent = \`\${totalHours} Std\`;
      document.getElementById('personalShiftsCount').textContent = \`\${myShifts.length} Schicht\${myShifts.length === 1 ? '' : 'en'}\`;

      const responsibleServices = services.filter(s => s.responsible_id === userId);
      if (responsibleServices.length > 0) {
        document.getElementById('personalResponsibleCount').textContent = \`🛡️ Ja (\${responsibleServices.length} Aufgabe\${responsibleServices.length === 1 ? '' : 'n'})\`;
      } else {
        document.getElementById('personalResponsibleCount').textContent = 'Nein';
      }

      // Filter based on search criteria
      const showShifts = myShifts.filter(s => {
        const svc = services.find(sv => sv.id === s.service_id);
        if (!svc) return false;

        const matchesQuery = !currentSearch ||
          svc.title.toLowerCase().includes(currentSearch) ||
          svc.location.toLowerCase().includes(currentSearch) ||
          svc.category.toLowerCase().includes(currentSearch) ||
          (s.notes && s.notes.toLowerCase().includes(currentSearch));
        return matchesQuery;
      });

      if (showShifts.length === 0) {
        listDiv.innerHTML = \`
          <div class="p-6 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 italic text-xs">
            \${currentSearch ? 'Keine Schichten in diesem Suchfilter gefunden.' : 'Du bist für keine Schichten eingeteilt.'}
          </div>
        \`;
        return;
      }

      // Build Personal Plan list
      let personalCardsHTML = \`<div class="grid grid-cols-1 md:grid-cols-2 gap-4">\`;
      
      showShifts.forEach(s => {
        const svc = services.find(sv => sv.id === s.service_id);
        if (!svc) return;

        const duration = calculateShiftHours(s.start_time, s.end_time);
        const hv = users.find(u => u.id === svc.responsible_id);

        // Coworkers
        const otherAss = assignments.filter(a => a.shift_id === s.id && a.user_id !== userId);
        let partnersHTML = '';
        if (otherAss.length === 0) {
          partnersHTML = '<span class="text-slate-500 italic font-mono text-[10px]">Alleinige Besetzung</span>';
        } else {
          partnersHTML = '<div class="flex flex-wrap gap-1 mt-1">';
          otherAss.forEach(as => {
            const co = users.find(u => u.id === as.user_id);
            if (co) {
              partnersHTML += \`<span class="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono font-medium">\${co.display_name}</span>\`;
            }
          });
          partnersHTML += '</div>';
        }

        const dateBadge = s.date === 'Haupt'
          ? '🎯 Dauerhaftes Team'
          : \`⏱️ <strong>\${getDayAbbrev(s.date)} \${formatDateGerman(s.date)}</strong> &bull; \${s.start_time} - \${s.end_time} Uhr\`;

        personalCardsHTML += \`
          <div class="bg-slate-950 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all duration-250 cursor-pointer shift-card shadow-xl flex flex-col justify-between" onclick="this.classList.toggle('expanded-active')">
            <div class="space-y-2">
              <div class="flex items-center justify-between pb-2 border-b border-slate-800/60">
                <span class="text-xs font-black text-emerald-400 font-mono uppercase tracking-tight">📅 \${s.date === 'Camp' || s.date === 'Haupt' ? 'Dauerhaft' : getDayAbbrev(s.date) + ' ' + formatDateGerman(s.date)}</span>
                <span class="text-xs font-bold text-slate-300 font-mono">⏱️ \${s.date === 'Camp' || s.date === 'Haupt' ? 'Dauerhafter Dienst' : s.start_time + ' - ' + s.end_time + ' Uhr'}</span>
              </div>

              <div class="flex items-start justify-between gap-1.5 py-1">
                <div class="flex items-center space-x-2">
                  <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: \${svc.color || '#10b981'}"></span>
                  <h4 class="text-sm font-bold text-white tracking-tight leading-snug">\${svc.title}</h4>
                </div>
                \${duration > 0 ? \`<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/65 border border-emerald-500/10 text-emerald-400 shrink-0">\${duration} Std</span>\` : ''}
              </div>

              <div class="expander-only space-y-3 pt-3 border-t border-slate-900">
                <div class="text-xs text-slate-400 space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-850 font-mono">
                  <p>📍 Ort: <span class="text-slate-200">\${svc.location || 'Lagerplatz'}</span></p>
                  \${s.notes ? \`<p class="text-[10px] text-amber-300 mt-1.5 italic font-sans leading-normal">📢 Notiz: \${s.notes}</p>\` : ''}
                </div>

                <div class="space-y-1.5">
                  <span class="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono block">Mitstreiter in dieser Schicht:</span>
                  \${partnersHTML}
                </div>

                <div class="text-[10px] text-slate-500 border-t border-slate-850/60 pt-2 font-mono flex items-center justify-between">
                  <span>HV-Verantwortung:</span>
                  <span class="text-slate-350 font-bold">\${hv ? hv.display_name : '-'}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between text-[10px] text-slate-500 select-none pt-3 mt-2 border-t border-slate-900/60 font-mono">
              <span class="text-xs text-slate-450">\${svc.location || 'Lagerplatz'}</span>
              <span class="text-emerald-500/90 font-bold flex items-center gap-1">
                <span class="expand-text">Mitstreiter anzeigen</span>
                <span class="collapse-text">Details ausblenden</span>
                <span class="arrow-icon">▼</span>
              </span>
            </div>
          </div>
        \`;
      });

      personalCardsHTML += \`</div>\`;
      listDiv.innerHTML = \`<h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-6 mb-3 font-mono">Dein persönlicher Einteilungsplan</h4>\` + personalCardsHTML;

      // Add Personal Notes Section
      const notesContainer = document.createElement('div');
      notesContainer.className = 'mt-8 bg-slate-900 border border-emerald-500/15 rounded-2xl p-5 md:p-6 shadow-xl space-y-4 shadow-black/50';
      
      const storageKey = 'helper_notes_' + userId;
      let existingNote = '';
      try {
        existingNote = localStorage.getItem(storageKey) || '';
      } catch (e) {
        console.warn("Storage access restricted:", e);
      }

      // Safe escape helper for initial load inside text area
      const safeNote = existingNote.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

      notesContainer.innerHTML = \`
        <div class="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
          <span class="text-lg">📝</span>
          <div>
            <h5 class="text-sm font-bold text-white font-display">Deine persönlichen Mobil-Notizen</h5>
            <p class="text-[10px] text-slate-400 leading-normal mt-0.5">Diese Notizen bleiben privat auf deinem Smartphone gespeichert – ideal für Besorgungszettel, Weckzeiten oder Packlisten.</p>
          </div>
        </div>
        <div>
          <textarea 
            id="personalNotesTextarea" 
            placeholder="Schreibe dir hier eigene Notizen, Erinnerungen oder Erinnerungszettel auf, die für das Lager wichtig sind..." 
            class="w-full h-24 text-xs p-3 border border-slate-800 rounded-xl bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/30 font-sans leading-relaxed"
            oninput="savePersonalNotes('\${userId}', this.value)"
          >\${safeNote}</textarea>
          <div class="flex justify-between items-center mt-2.5">
            <span id="saveStatus" class="text-[10px] text-slate-500 font-mono">Automatisches Speichern aktiv</span>
            <button 
              onclick="clearPersonalNotes('\${userId}')" 
              class="text-[10px] text-rose-400 hover:text-rose-300 font-bold transition font-mono border border-rose-500/10 px-2 py-0.5 rounded bg-rose-950/10 cursor-pointer"
            >Löschen</button>
          </div>
        </div>
      \`;
      listDiv.appendChild(notesContainer);
    };

    // Auto save notes
    window.savePersonalNotes = function(userId, val) {
      try {
        localStorage.setItem('helper_notes_' + userId, val);
      } catch(e) {}
      const status = document.getElementById('saveStatus');
      if (status) {
        status.textContent = '✓ Gespeichert';
        status.className = 'text-[10px] text-emerald-450 text-emerald-400 font-bold font-mono';
        setTimeout(() => {
          status.textContent = 'Automatisches Speichern aktiv';
          status.className = 'text-[10px] text-slate-500 font-mono';
        }, 1500);
      }
    };

    window.clearPersonalNotes = function(userId) {
      if (confirm('Möchtest du diese Notiz wirklich löschen?')) {
        const txt = document.getElementById('personalNotesTextarea');
        if (txt) {
          txt.value = '';
          savePersonalNotes(userId, '');
        }
      }
    };

    // Tab 2: Render Complete Plan
    const setListLayout = (layout) => {
      listLayout = layout;
      document.getElementById('listLayoutTable').className = (layout === 'table')
        ? "px-3 py-1 text-xs font-bold rounded-md transition-all bg-slate-900 border border-emerald-500/10 text-emerald-400"
        : "px-3 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-white";
      document.getElementById('listLayoutCards').className = (layout === 'cards')
        ? "px-3 py-1 text-xs font-bold rounded-md transition-all bg-slate-900 border border-emerald-500/10 text-emerald-400"
        : "px-3 py-1 text-xs font-bold rounded-md transition-all text-slate-400 hover:text-white";

      document.getElementById('listTableContainer').style.display = (layout === 'table') ? 'block' : 'none';
      document.getElementById('listCardsContainer').style.display = (layout === 'cards') ? 'grid' : 'none';

      renderCompactView();
    };

    const renderCompactView = () => {
      const tbody = document.getElementById('compactTableBody');
      const cardsGrid = document.getElementById('listCardsContainer');
      if (!tbody || !cardsGrid) return;

      tbody.innerHTML = '';
      cardsGrid.innerHTML = '';

      const sorted = getSortedShifts();
      
      const filtered = sorted.filter(s => {
        const svc = services.find(sv => sv.id === s.service_id);
        if (!svc) return false;

        const assigned = assignments.filter(a => a.shift_id === s.id);
        const helpersQueryNames = assigned.map(a => {
          const u = users.find(usr => usr.id === a.user_id);
          return u ? \`\${u.display_name} \${u.first_name} \${u.last_name || ''}\`.trim().toLowerCase() : '';
        }).join(' ');

        const matchesQuery = !currentSearch ||
          svc.title.toLowerCase().includes(currentSearch) ||
          svc.location.toLowerCase().includes(currentSearch) ||
          svc.category.toLowerCase().includes(currentSearch) ||
          (s.notes && s.notes.toLowerCase().includes(currentSearch)) ||
          helpersQueryNames.includes(currentSearch);
        return matchesQuery;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="6" class="py-12 text-center text-slate-500 italic">Keine passende Dienste gefunden.</td></tr>\`;
        cardsGrid.innerHTML = \`<div class="col-span-full py-16 bg-slate-900 border border-dashed border-slate-800 text-center text-slate-500 text-xs italic rounded-xl">Keine passenden Dienste im Suchfilter vorhanden.</div>\`;
        return;
      }

      filtered.forEach(s => {
        const svc = services.find(sv => sv.id === s.service_id);
        if (!svc) return;

        const assigned = assignments.filter(a => a.shift_id === s.id);
        const assignedCount = assigned.length;
        const isUnderstaffed = assignedCount < svc.min_persons;

        const hv = users.find(u => u.id === svc.responsible_id);

        // Build Table Row
        let crewBadges = '';
        if (assignedCount === 0) {
          crewBadges = '<span class="text-rose-400 font-bold px-2 py-0.5 rounded bg-rose-950/30 border border-rose-500/20 text-[10px]">⚠️ FREIE SCHICHT</span>';
        } else {
          crewBadges = '<div class="flex flex-wrap gap-1">';
          assigned.forEach(ass => {
            const u = users.find(usr => usr.id === ass.user_id);
            if (u) {
              const symbol = ass.accepted ? '✓' : '⏳';
              const textClass = ass.accepted 
                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                : 'bg-slate-950 border-slate-800 text-slate-200';
              crewBadges += \`<span class="\${textClass} border text-[10px] px-2 py-0.5 rounded font-mono font-medium">\${symbol} \${u.display_name}</span>\`;
            }
          });
          crewBadges += '</div>';
        }

        const statusLabel = isUnderstaffed
          ? \`<span class="px-2 py-0.5 text-[9px] bg-amber-950 text-amber-400 border border-amber-500/20 rounded font-bold font-mono">Soll:\${svc.min_persons} • Ist:\${assignedCount}</span>\`
          : \`<span class="px-2 py-0.5 text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded font-bold font-mono">VOLL(\${assignedCount})</span>\`;

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-850/20 border-b border-slate-900/80 transition-colors";
        tr.innerHTML = \`
          <td class="py-3.5 px-4 md:px-6 whitespace-nowrap">
            <div class="font-bold text-slate-200 text-xs">\${getDayLabel(s.date)}</div>
            <div class="text-[10px] text-slate-400 font-mono mt-0.5">\${s.date === 'Haupt' ? 'Standby / Permanent' : \`\${s.start_time} - \${s.end_time} Uhr\` }</div>
          </td>
          <td class="py-3.5 px-4 md:px-6">
            <div class="flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: \${svc.color || '#10b981'}"></span>
              <div>
                <span class="font-bold text-slate-100 font-display">\${svc.title}</span>
                \${s.notes ? \`<div class="text-[10px] text-amber-400 font-mono italic">📢 \${s.notes}</div>\` : ''}
              </div>
            </div>
          </td>
          <td class="py-3.5 px-4 md:px-6 select-all font-medium text-slate-350 whitespace-nowrap">\${svc.location || 'Gelände'}</td>
          <td class="py-3.5 px-4 md:px-6 text-slate-300 font-medium font-mono whitespace-nowrap">\${hv ? hv.display_name : '<span class="text-slate-650 italic">-</span>'}</td>
          <td class="py-3.5 px-4 md:px-6 whitespace-normal">\${crewBadges}</td>
          <td class="py-3.5 px-4 md:px-6 whitespace-nowrap">\${statusLabel}</td>
        \`;
        tbody.appendChild(tr);

        // Build Card View Item
        let cardCrewHTML = '';
        if (assignedCount === 0) {
          cardCrewHTML = '<p class="text-rose-450 bg-rose-950/20 border border-rose-500/10 rounded-lg p-2 text-[11px] font-medium font-mono">⚠️ KEIN HELFER EINGEPLANT</p>';
        } else {
          cardCrewHTML = '<div class="flex flex-wrap gap-1">';
          assigned.forEach(ass => {
            const u = users.find(usr => usr.id === ass.user_id);
            if (u) {
              const symbol = ass.accepted ? '✓' : '⏳';
              const textClass = ass.accepted 
                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                : 'bg-slate-950 border-slate-800 text-slate-200';
              cardCrewHTML += \`<span class="\${textClass} border text-[10px] px-2 py-0.5 rounded font-mono font-medium">\${symbol} \${u.display_name}</span>\`;
            }
          });
          cardCrewHTML += '</div>';
        }

        const duration = calculateShiftHours(s.start_time, s.end_time);

        const card = document.createElement('div');
        card.className = "bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all duration-250 cursor-pointer shift-card shadow-xl flex flex-col justify-between";
        card.setAttribute('onclick', "this.classList.toggle('expanded-active')");
        
        const dateHeader = s.date === 'Haupt' 
          ? '🎯 Dauerhaft' 
          : \`\${getDayAbbrev(s.date)} \${formatDateGerman(s.date)}\`;
          
        const timeHeader = s.date === 'Haupt'
          ? 'Rund um die Uhr'
          : \`\${s.start_time} - \${s.end_time} Uhr\`;

        card.innerHTML = \`
          <div class="space-y-2 w-full">
            <div class="flex items-center justify-between pb-2 border-b border-slate-800/60 font-mono">
              <span class="text-xs font-black text-emerald-400 uppercase tracking-tight">📅 \${dateHeader}</span>
              <span class="text-xs font-bold text-slate-300">⏱️ \${timeHeader}</span>
            </div>

            <div class="flex items-start justify-between gap-1.5 py-1">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: \${svc.color || '#10b981'}"></span>
                <h5 class="text-sm font-bold text-white tracking-tight leading-snug font-display">\${svc.title}</h5>
              </div>
              <div class="expander-only shrink-0">\${statusLabel}</div>
            </div>

            <div class="expander-only space-y-3 pt-3 border-t border-slate-950">
              <div class="text-xs text-slate-400 space-y-1 bg-slate-950/70 border border-slate-850/40 p-2.5 rounded-xl font-mono">
                \${duration > 0 ? \`<p>⏳ Dauer: \${duration} Stunden</p>\` : ''}
                <p>📍 Ort: <span class="text-slate-200">\${svc.location || 'Lagerplatz'}</span></p>
                \${s.notes ? \`<p class="text-[10px] text-amber-400 mt-1.5 italic font-sans leading-normal">📢 Notiz: \${s.notes}</p>\` : ''}
              </div>

              <div class="space-y-1.5 font-mono">
                <span class="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Eingeteilte Crew (\${assignedCount}):</span>
                \${cardCrewHTML}
              </div>

              <div class="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-850/40 pt-2 font-mono block">
                <span>HV: <strong class="text-slate-350">\${hv ? hv.display_name : 'Keiner'}</strong></span>
                <span>\${statusLabel}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between text-[10px] text-slate-500 select-none pt-3 mt-2 border-t border-slate-850/60 font-mono w-full">
            <span class="text-xs text-slate-450 truncate max-w-[150px]">\${svc.location || 'Lagerplatz'}</span>
            <span class="text-emerald-500/90 font-bold flex items-center gap-1 shrink-0">
              <span class="expand-text">Crew anzeigen</span>
              <span class="collapse-text">Details ausblenden</span>
              <span class="arrow-icon">▼</span>
            </span>
          </div>
        \`;
        cardsGrid.appendChild(card);
      });
    };

    // Tab 3: Render Day Planes
    const setDayFilter = (day) => {
      selectedDay = day;
      const campDays = getCampDays();
      
      const allDays = [...campDays, 'Haupt'];
      allDays.forEach(d => {
        const btn = document.getElementById(\`dayBtn-\${d}\`);
        if (btn) {
          btn.className = (d === day)
            ? "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all bg-slate-900 border border-emerald-500/20 text-emerald-300 text-center cursor-pointer shadow-md shadow-emerald-500/5 font-semibold"
            : "px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all text-center cursor-pointer";
        }
      });

      renderDayViewShifts();
    };

    const renderDayViewShifts = () => {
      const grid = document.getElementById('daysCardsGrid');
      if (!grid) return;
      grid.innerHTML = '';

      const dayShifts = shifts.filter(sh => {
        if (sh.date !== selectedDay) return false;

        const svc = services.find(sv => sv.id === sh.service_id);
        if (!svc) return false;

        const assigned = assignments.filter(a => a.shift_id === sh.id);
        const assignedNames = assigned.map(a => {
          const u = users.find(usr => usr.id === a.user_id);
          return u ? \`\${u.display_name} \${u.first_name} \${u.last_name || ''}\`.trim().toLowerCase() : '';
        }).join(' ');

        const matchesQuery = !currentSearch ||
          svc.title.toLowerCase().includes(currentSearch) ||
          svc.location.toLowerCase().includes(currentSearch) ||
          svc.category.toLowerCase().includes(currentSearch) ||
          assignedNames.includes(currentSearch) ||
          (sh.notes && sh.notes.toLowerCase().includes(currentSearch));
        return matchesQuery;
      }).sort((a, b) => {
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

      if (dayShifts.length === 0) {
        grid.innerHTML = \`<div class="col-span-full py-16 bg-slate-900 border border-dashed border-slate-800 text-center text-slate-500 text-xs italic rounded-xl">Keine Dienste für diesen Tag im Suchfilter gefunden.</div>\`;
        return;
      }

      dayShifts.forEach(s => {
        const svc = services.find(sv => sv.id === s.service_id);
        if (!svc) return;

        const assigned = assignments.filter(a => a.shift_id === s.id);
        const assignedCount = assigned.length;
        const isUnderstaffed = assignedCount < svc.min_persons;

        const hv = users.find(u => u.id === svc.responsible_id);

        let cardCrewHTML = '';
        if (assignedCount === 0) {
          cardCrewHTML = '<p class="text-rose-450 bg-rose-950/20 border border-rose-500/10 rounded-lg p-2 text-[11px] font-medium font-mono">⚠️ KEIN HELFER EINGEPLANT</p>';
        } else {
          cardCrewHTML = '<div class="flex flex-wrap gap-1">';
          assigned.forEach(ass => {
            const u = users.find(usr => usr.id === ass.user_id);
            if (u) {
              const symbol = ass.accepted ? '✓' : '⏳';
              const textClass = ass.accepted 
                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' 
                : 'bg-slate-950 border-slate-800 text-slate-200';
              cardCrewHTML += \`<span class="\${textClass} border text-[10px] px-2 py-0.5 rounded font-mono font-medium">\${symbol} \${u.display_name}</span>\`;
            }
          });
          cardCrewHTML += '</div>';
        }

        const duration = calculateShiftHours(s.start_time, s.end_time);
        
        const statusLabel = isUnderstaffed
          ? \`<span class="px-2 py-0.5 text-[9px] bg-amber-950 text-amber-400 border border-amber-500/20 rounded font-bold font-mono">Soll:\${svc.min_persons} &bull; Ist:\${assignedCount}</span>\`
          : \`<span class="px-2 py-0.5 text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-500/20 rounded font-bold font-mono">VOLL(\${assignedCount})</span>\`;

        const card = document.createElement('div');
        card.className = "bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all duration-250 cursor-pointer shift-card shadow-xl flex flex-col justify-between";
        card.setAttribute('onclick', "this.classList.toggle('expanded-active')");

        const dateHeader = s.date === 'Haupt' 
          ? '🎯 Dauerhaft' 
          : \`\${getDayAbbrev(s.date)} \${formatDateGerman(s.date)}\`;
          
        const timeHeader = s.date === 'Camp' || s.date === 'Haupt'
          ? 'Rund um die Uhr'
          : \`\${s.start_time} - \${s.end_time} Uhr\`;

        card.innerHTML = \`
          <div class="space-y-2 w-full">
            <div class="flex items-center justify-between pb-2 border-b border-slate-800/60 font-mono">
              <span class="text-xs font-black text-emerald-400 uppercase tracking-tight">📅 \${dateHeader}</span>
              <span class="text-xs font-bold text-slate-300 font-mono">⏱️ \${timeHeader}</span>
            </div>

            <div class="flex items-start justify-between gap-1.5 py-1">
              <div class="flex items-center space-x-2">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: \${svc.color || '#10b981'}"></span>
                <h5 class="text-sm font-bold text-white tracking-tight leading-snug font-display">\${svc.title}</h5>
              </div>
              <div class="expander-only shrink-0">\${statusLabel}</div>
            </div>

            <div class="expander-only space-y-3 pt-3 border-t border-slate-950">
              <div class="text-xs text-slate-400 space-y-1 bg-slate-950/70 border border-slate-850/40 p-2.5 rounded-xl font-mono">
                \${duration > 0 ? \`<p>⏳ Dauer: \${duration} Stunden</p>\` : ''}
                <p>📍 Ort: <span class="text-slate-200">\${svc.location || 'Lagerplatz'}</span></p>
                \${s.notes ? \`<p class="text-[10px] text-amber-400 mt-1.5 italic font-sans leading-normal">📢 Notiz: \${s.notes}</p>\` : ''}
              </div>

              <div class="space-y-1.5 font-mono">
                <span class="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Eingeteilte Crew (\${assignedCount}):</span>
                \${cardCrewHTML}
              </div>

              <div class="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-850/40 pt-2 font-mono block">
                <span>HV: <strong class="text-slate-350">\${hv ? hv.display_name : 'Keiner'}</strong></span>
                <span>\${statusLabel}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between text-[10px] text-slate-500 select-none pt-3 mt-2 border-t border-slate-850/60 font-mono w-full">
            <span class="text-xs text-slate-450 truncate max-w-[150px]">\${svc.location || 'Lagerplatz'}</span>
            <span class="text-emerald-500/90 font-bold flex items-center gap-1 shrink-0">
              <span class="expand-text">Crew anzeigen</span>
              <span class="collapse-text">Details ausblenden</span>
              <span class="arrow-icon">▼</span>
            </span>
          </div>
        \`;
        grid.appendChild(card);
      });
    };

    // Calendar Export system
    window.downloadUserICSSelected = () => {
      if (!selectedUser) return;
      downloadUserICS(selectedUser);
    };

    const downloadUserICS = (userId) => {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const userAss = assignments.filter(a => a.user_id === userId);
      const userShifts = [];
      userAss.forEach(ass => {
        const s = shifts.find(sh => sh.id === ass.shift_id);
        if (s && s.date !== 'Haupt') {
          userShifts.push(s);
        }
      });

      if (userShifts.length === 0) {
        alert('Du bist für keine zeitgebundenen Schichten eingeteilt, die in den Kalender importiert werden können.');
        return;
      }

      let icsLines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Pfingstlager Dienstplaner v3.0//DE",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH"
      ];

      userShifts.forEach(shift => {
        const svc = services.find(sv => sv.id === shift.service_id);
        if (!svc) return;

        const dateStr = shift.date.replace(/-/g, "");
        const startTimeStr = shift.start_time.replace(/:/g, "");
        const endTimeStr = shift.end_time.replace(/:/g, "");

        const dtStart = dateStr + 'T' + startTimeStr + '00';
        
        let endDayStr = dateStr;
        const [startH] = shift.start_time.split(":").map(Number);
        const [endH] = shift.end_time.split(":").map(Number);
        if (endH < startH) {
          const d = new Date(shift.date);
          d.setDate(d.getDate() + 1);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          endDayStr = '' + year + month + day;
        }
        const dtEnd = endDayStr + 'T' + endTimeStr + '00';

        const summary = svc.title;
        const location = svc.location || 'Lagerplatz';

        const otherAssignments = assignments.filter(function(a) { return a.shift_id === shift.id && a.user_id !== userId; });
        const coworkers = [];
        otherAssignments.forEach(function(a) {
          const u = users.find(function(usr) { return usr.id === a.user_id; });
          if (u) {
            coworkers.push(u.display_name);
          }
        });
        const coworkerText = coworkers.length > 0 ? '\\\\nMitstreiter: ' + coworkers.join(', ') : '';

        const description = 'Kategorie: ' + svc.category + '\\\\nOrt: ' + location + coworkerText + (shift.notes ? '\\\\nHinweis: ' + shift.notes : '');

        icsLines.push(
          "BEGIN:VEVENT",
          "UID:shift-" + shift.id + "-" + userId + "@pfingstlager2026",
          "DTSTAMP:" + dateStr + "T120000Z",
          "LAST-MODIFIED:" + dateStr + "T120000Z",
          "SEQUENCE:0",
          "DTSTART;TZID=Europe/Berlin:" + dtStart,
          "DTEND;TZID=Europe/Berlin:" + dtEnd,
          "SUMMARY:" + summary,
          "LOCATION:" + location,
          "DESCRIPTION:" + description,
          "BEGIN:VALARM",
          "TRIGGER:-PT30M",
          "ACTION:DISPLAY",
          "DESCRIPTION:Erinnerung: " + summary + " beginnt in 30 Minuten!",
          "END:VALARM",
          "END:VEVENT"
        );
      });

      icsLines.push("END:VCALENDAR");

      const blob = new Blob([icsLines.join("\\r\\n")], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "PfilaDienstplan_" + (user.display_name || user.first_name || 'helfer').toLowerCase().replace(/\\s+/g, '_') + ".ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
  </script>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html");
  res.setHeader("Content-Disposition", `attachment; filename=dienstplan_${activeCamp.title.toLowerCase().replace(/\s+/g, '_')}.html`);
  res.send(html);
});

export default router;
