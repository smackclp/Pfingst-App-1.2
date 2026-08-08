import React from "react";
import { LayoutDashboard, Calendar, Compass, Bell, ShieldCheck } from "lucide-react";

type AccessRole = "helfer" | "bereichsleiter" | "lagerleitung";

interface BottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  accessRole: AccessRole;
  currentUserId?: string | null;
}

// Tabs, die inhaltlich zu jedem Bottom-Nav-Punkt gehören - damit der jeweilige
// Punkt auch dann als "aktiv" markiert bleibt, wenn man von dort auf eine
// Unterseite wechselt (z.B. von "Lager" auf "Programm").
const TAB_GROUPS: Record<string, string[]> = {
  dashboard: ["dashboard"],
  calendar: ["calendar"],
  lager: ["lager", "program", "materials", "communities", "print"],
  alerts: ["alerts"],
  verwaltung: ["verwaltung", "shifts", "services", "people", "camps"],
};

export default function BottomNav({ currentTab, setCurrentTab, accessRole, currentUserId = null }: BottomNavProps) {
  const [unreadCount, setUnreadCount] = React.useState(0);

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
        console.warn("Unread badge count fetch skipped:", err);
      }
    };
    loadCount();
    const interval = setInterval(loadCount, 15000);
    return () => clearInterval(interval);
  }, [currentUserId, currentTab]);

  const items = [
    { id: "dashboard", label: "Start", icon: LayoutDashboard },
    { id: "calendar", label: "Mein Plan", icon: Calendar },
    { id: "lager", label: "Festival", icon: Compass },
    { id: "alerts", label: "Mitteilungen", icon: Bell },
  ];

  if (accessRole !== "helfer") {
    items.push({ id: "verwaltung", label: "Verwaltung", icon: ShieldCheck });
  }

  const isActive = (id: string) => (TAB_GROUPS[id] || [id]).includes(currentTab);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-emerald-500/10 print:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      id="bottom-nav"
    >
      <div className={`grid`} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.id);
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors cursor-pointer ${
                active ? "text-emerald-400" : "text-slate-400"
              }`}
              id={`bottom-nav-${item.id}`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${active ? "text-emerald-400" : "text-slate-400"}`} strokeWidth={active ? 2.4 : 2} />
                {item.id === "alerts" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono min-w-[16px] text-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] leading-none ${active ? "font-bold" : "font-medium"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
