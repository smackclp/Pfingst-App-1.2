// CSS für die exportierte, eigenständige Offline-Dienstplan-HTML-Seite.
// Extrahiert aus export.ts (dort war es Teil des riesigen HTML-Template-Literals).
export const EXPORT_PAGE_STYLES = `
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
  `;
