import React from "react";
import { 
  LayoutDashboard, 
  Calendar, 
  Briefcase, 
  Users, 
  Clock, 
  Menu,
  X,
  Compass,
  Sun,
  Moon,
  Printer,
  Bell,
  Zap,
  ShoppingBag,
  Church,
  Sparkles
} from "lucide-react";
import { Tooltip } from "./Tooltip";

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  conflictCount: number;
  theme?: string;
  onToggleTheme?: () => void;
  isAdmin: boolean;
  currentUserId?: string | null;
}

export default function Navigation({ 
  currentTab, 
  setCurrentTab, 
  conflictCount,
  theme = "dark",
  onToggleTheme,
  isAdmin,
  currentUserId = null
}: NavigationProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Poll for unread notification count
  React.useEffect(() => {
    if (!currentUserId || currentUserId === "null" || currentUserId === "undefined") {
      setUnreadCount(0);
      return;
    }
    const loadCount = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${currentUserId}`);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const list = await res.json();
            setUnreadCount(list.filter((n: any) => !n.read).length);
          }
        }
      } catch (err) {
        // Quietly log transient network/fetch glitches during polling
        console.warn("Unread badge count fetch skipped:", err);
      }
    };
    
    loadCount();
    const interval = setInterval(loadCount, 15000); // fast 15s poll
    return () => clearInterval(interval);
  }, [currentUserId, currentTab]);

  const menuItems = React.useMemo(() => {
    const baseItems = [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "calendar", label: "Gesamtplan & Filter", icon: Calendar },
      { id: "program", label: "Programm ✨", icon: Sparkles },
      { id: "communities", label: "Gemeinden ⛪", icon: Church },
      { id: "materials", label: "Bestellliste 📦", icon: ShoppingBag },
      { id: "alerts", label: "Benachrichtigungen 🔔", icon: Bell },
      { id: "print", label: "Druckansicht 🖨️", icon: Printer },
    ];
    if (isAdmin) {
      return [
        ...baseItems,
        { id: "shifts", label: "Schichten verwalten", icon: Clock },
        { id: "services", label: "Dienste / Aufgaben", icon: Briefcase },
        { id: "people", label: "Helfer*innen & Personen", icon: Users },
        { id: "camps", label: "Lager verwalten", icon: Compass },
      ];
    }
    return baseItems;
  }, [isAdmin]);

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    setMobileOpen(false);
  };

  const handleExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fetch("/api/export-html");
      if (!res.ok) throw new Error("Export request failed");
      const htmlText = await res.text();
      const blob = new Blob([htmlText], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "dienstplan_pfingstlager_2026.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failure:", err);
      alert("Fehler beim Herunterladen des Dienstplans. Bitte versuchen Sie es erneut.");
    } finally {
      setExporting(false);
    }
  };

  const getMenuItemDescription = (id: string) => {
    switch (id) {
      case "dashboard":
        return "Aktuelle Auslastung, Doppelbelegungen & Statistiken auf einen Blick";
      case "calendar":
        return "Gesamtplan des Zeltlagers mit Filter- und Zuordnungsreglern";
      case "communities":
        return "Liste der teilnehmenden Gemeinden mit Teilnehmeranzahl und Import-Optionen";
      case "materials":
        return "Materialbestellungen für das Zeltlager eintragen und für den Einkäufer exportieren";
      case "alerts":
        return "Echtzeit-Mitteilungen für deine Schichten & PWA-Geräteeinstellungen (Sofort-Popups)";
      case "print":
        return "Schlaue Druckansicht zum Ausdrucken fürs schwarze Brett";
      case "shifts":
        return "Arbeitszeiten, Einsatzorte & Personenobergrenzen festlegen";
      case "services":
        return "Dienstplanaufgaben, Farben & Hauptverantwortliche einrichten";
      case "people":
        return "Helferliste mit Kontaktdaten, freien Pfingsttagen & Gruppen";
      case "camps":
        return "Lager-Instanzen kopieren, vorjährige Dienstpläne clonen & verwalten";
      default:
        return "";
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden bg-slate-900 text-white flex items-center justify-between px-4 py-3 sticky top-0 z-40 border-b border-emerald-500/10 print:hidden">
        <div className="flex items-center space-x-2">
          <Compass className="h-6 w-6 text-emerald-400 animate-pulse" />
          <span className="font-display font-bold text-lg tracking-tight text-white">DIENSTPLAN_v2.0</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {onToggleTheme && (
            <Tooltip content={theme === "dark" ? "Hellen Modus aktivieren" : "Dunklen Modus aktivieren"} position="bottom" delay={300}>
              <button
                onClick={onToggleTheme}
                className="text-emerald-400 hover:text-emerald-300 p-2 hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                {theme === "dark" ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-400" />}
              </button>
            </Tooltip>
          )}

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-emerald-400 hover:text-emerald-300 p-1 rounded-md focus:outline-none"
            id="mobile-menu-toggle"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-30 lg:hidden transition-opacity duration-300" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div className={`fixed top-0 bottom-0 left-0 w-72 bg-slate-900 border-r border-emerald-500/10 text-white z-30 lg:hidden transform transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"} flex flex-col pt-16 print:hidden`}>
        <div className="px-4 py-3 bg-slate-950 border-b border-emerald-500/10 absolute top-0 left-0 right-0 flex items-center space-x-2">
          <Compass className="h-5 w-5 text-emerald-400" />
          <span className="font-display font-semibold text-slate-200">Hauptmenü</span>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-xs transition-all duration-150 border ${
                  active 
                  ? "bg-emerald-950/60 border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)] font-bold" 
                  : "border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-100"
                }`}
                id={`mobile-nav-${item.id}`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? "text-emerald-400" : "text-slate-400"}`} />
                <span className="flex-1 text-left text-sm">{item.label}</span>
                {item.id === "dashboard" && conflictCount > 0 && (
                  <span className="bg-rose-500/20 border border-rose-500/50 text-rose-350 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {conflictCount}
                  </span>
                )}
                {item.id === "alerts" && unreadCount > 0 && (
                  <span className="bg-emerald-500 border border-emerald-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full font-mono animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="px-4 pb-4 mt-auto">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 shadow-emerald-600/15 cursor-pointer block"
          >
            <span>{exporting ? "⏳ Bereite vor..." : "📲 Für WhatsApp herunterladen (.html)"}</span>
          </button>
        </div>
        <div className="p-4 border-t border-emerald-500/10 bg-slate-950 text-slate-400 text-xs">
          <p className="font-semibold text-emerald-400">Pfingstlager Pfadfinder</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Dienstplan-Software für das Zeltlager</p>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-emerald-500/10 text-white shrink-0 sticky top-0 h-screen print:hidden">
        <div className="px-6 py-5 bg-slate-950/80 border-b border-emerald-500/10 flex items-center space-x-3">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            <Compass className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-display font-bold text-sm tracking-tight leading-none text-white">DIENSTPLAN</h1>
            <span className="text-[10px] font-semibold text-emerald-400 mt-1.5 inline-block bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-500/20 shadow-xs">
              System Aktiv
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <Tooltip key={item.id} content={getMenuItemDescription(item.id)} position="right" delay={200}>
                <button
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all border ${
                    active 
                      ? "bg-slate-950/80 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.06)] font-extrabold" 
                      : "border-transparent text-slate-400 hover:bg-slate-850/60 hover:text-slate-100 font-medium"
                  }`}
                  id={`sidebar-nav-${item.id}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-400" : "text-slate-550 group-hover:text-white"}`} />
                  <span className="flex-1 text-left text-sm">{item.label}</span>
                  {item.id === "dashboard" && conflictCount > 0 && (
                    <span className="bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                      {conflictCount}
                    </span>
                  )}
                  {item.id === "alerts" && unreadCount > 0 && (
                    <span className="bg-emerald-600 border border-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full font-mono animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </nav>

        <div className="px-4 pb-4 space-y-2">
          {onToggleTheme && (
            <Tooltip 
              content={
                theme === "dark" 
                  ? "Wechselt auf den AMOLED True-Black Modus (maximaler Akkuschutz)" 
                  : theme === "amoled"
                  ? "Wechselt auf das helle, augenfreundliche Design"
                  : "Wechselt auf das Standard-Dunkel Design"
              } 
              position="top" 
              delay={300}
            >
              <button
                onClick={onToggleTheme}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 text-slate-350 hover:text-white font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer hover:bg-slate-800"
              >
                {theme === "dark" ? (
                  <>
                    <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
                    <span>AMOLED Schwarz</span>
                  </>
                ) : theme === "amoled" ? (
                  <>
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Helles Design</span>
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 text-slate-400" />
                    <span>Dunkles Design</span>
                  </>
                )}
              </button>
            </Tooltip>
          )}

          <Tooltip content="Lädt den ganzen interaktiven Plan als eigenständige, offline-fähige HTML-Datei herunter (für WhatsApp / offline)" position="top" delay={350}>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition-all shadow-md hover:scale-[1.01] active:scale-95 shadow-emerald-600/15 cursor-pointer block"
              id="desktop-export-btn"
            >
              <span>{exporting ? "⏳ Bereite vor..." : "📲 Für WhatsApp herunterladen (.html)"}</span>
            </button>
          </Tooltip>
        </div>

        <div className="p-4 border-t border-emerald-500/10 bg-slate-950/40 text-slate-405 text-slate-500 text-xs text-center">
          <p className="text-emerald-400 font-semibold text-[11px] tracking-wide">Pﬁngstlager Dienstplaner</p>
          <p className="mt-1 text-slate-500 text-[10px]">Einfach & Zuverlässig organisiert</p>
        </div>
      </aside>
    </>
  );
}
