import React from "react";
import { Search, X, Calendar as CalendarIcon, MapPin, ChevronRight } from "lucide-react";
import { Camp, User, Service, Shift, ShiftAssignment } from "../types";
import { AnimatePresence, motion } from "motion/react";
import { formatDateGerman, getDayName, getDayNameShort, formatDateWithDayPrefix } from "../utils";

interface HeaderGlobalSearchProps {
  users: User[];
  services: Service[];
  shifts: Shift[];
  assignments: ShiftAssignment[];
  activeCamp?: Camp;
  onSelectShift: (shiftId: string) => void;
  setCurrentTab: (tab: string) => void;
}

/** Globale Suchleiste im Header (Helfer*innen/Dienste/Schichten). Extrahiert aus Header.tsx. */
export default function HeaderGlobalSearch({ users, services, shifts, assignments, activeCamp, onSelectShift, setCurrentTab }: HeaderGlobalSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Close search on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const query = searchQuery.trim().toLowerCase();

  // Search through Helfer*innen (Users)
  const filteredUsers = React.useMemo(() => {
    if (!query) return [];
    return users
      .filter(
        (u) =>
          u.display_name.toLowerCase().includes(query) ||
          u.first_name.toLowerCase().includes(query) ||
          u.last_name.toLowerCase().includes(query) ||
          u.role.toLowerCase().includes(query) ||
          (u.email && u.email.toLowerCase().includes(query)) ||
          (u.phone && u.phone.toLowerCase().includes(query)) ||
          (u.notes && u.notes.toLowerCase().includes(query))
      )
      .slice(0, 5);
  }, [users, query]);

  // Search through Diensttypen (Services)
  const filteredServices = React.useMemo(() => {
    if (!query) return [];
    return services.filter((s) => s.title.toLowerCase().includes(query) || s.description.toLowerCase().includes(query) || s.category.toLowerCase().includes(query) || s.location.toLowerCase().includes(query)).slice(0, 5);
  }, [services, query]);

  // Search through Schichten (Shifts) by date, weekday, service title or notes
  const filteredShifts = React.useMemo(() => {
    if (!query) return [];
    return shifts
      .filter((sh) => {
        const service = services.find((srv) => srv.id === sh.service_id);
        const serviceTitle = service ? service.title : "";
        const dateGerman = formatDateGerman(sh.date);
        const dayName = getDayName(sh.date);
        const dayNameShort = getDayNameShort(sh.date);
        const dateStrNormalized = sh.date.toLowerCase();

        return (
          serviceTitle.toLowerCase().includes(query) ||
          dateStrNormalized.includes(query) ||
          dateGerman.toLowerCase().includes(query) ||
          dayName.toLowerCase().includes(query) ||
          dayNameShort.toLowerCase().includes(query) ||
          (sh.notes && sh.notes.toLowerCase().includes(query))
        );
      })
      .slice(0, 6);
  }, [shifts, services, query]);

  const hasResults = filteredUsers.length > 0 || filteredServices.length > 0 || filteredShifts.length > 0;

  // Jump to specific User Card
  const handleSelectUser = (user: User) => {
    setCurrentTab("people");
    setSearchQuery("");
    setIsOpen(false);

    setTimeout(() => {
      const element = document.getElementById(`person-card-${user.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-ok");
        element.style.outline = "2px solid #10b981";
        element.style.outlineOffset = "4px";

        setTimeout(() => {
          element.style.outline = "none";
        }, 3000);
      }
    }, 300);
  };

  // Jump to specific Service Card
  const handleSelectService = (service: Service) => {
    setCurrentTab("services");
    setSearchQuery("");
    setIsOpen(false);

    setTimeout(() => {
      const element = document.getElementById(`service-card-${service.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.style.outline = "2px solid #10b981";
        element.style.outlineOffset = "4px";

        setTimeout(() => {
          element.style.outline = "none";
        }, 3000);
      }
    }, 300);
  };

  // Jump to specific Shift in calendar
  const handleSelectShiftItem = (shift: Shift) => {
    onSelectShift(shift.id);
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={searchContainerRef} className="relative flex-1 max-w-lg w-full" id="global-search-container">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Nach Helfern, Diensten, Tagen (z.B. Sa./Sonntag) suchen..."
          className="w-full pl-10 pr-9 py-2 bg-slate-950/80 hover:bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all text-xs font-semibold font-mono shadow-inner shadow-black/40"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 hover:bg-slate-800 rounded transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Floating results panel */}
      <AnimatePresence>
        {isOpen && searchQuery.trim() && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 mt-2 bg-slate-900/98 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/95 rounded-2xl p-4 max-h-[480px] overflow-y-auto z-50 divide-y divide-slate-800/60 font-sans cursor-default scrollbar-thin"
          >
            {/* No results placeholder */}
            {!hasResults && (
              <div className="py-8 text-center">
                <p className="text-slate-450 text-xs font-mono">Keine passenden Einträge gefunden</p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">Suche nach Begriffen, Namen oder Wochentagen</p>
              </div>
            )}

            {/* 👥 Helpers (Users) Section */}
            {filteredUsers.length > 0 && (
              <div className="py-2.5 first:pt-0">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center justify-between mb-2">
                  <span>👥 Helfer*innen ({filteredUsers.length})</span>
                  <span className="text-[9px] text-slate-600 font-normal">Kanal: Personen</span>
                </h5>
                <div className="space-y-1">
                  {filteredUsers.map((u) => (
                    <button key={u.id} onClick={() => handleSelectUser(u)} className="w-full text-left p-2 hover:bg-slate-800/60 rounded-xl flex items-center justify-between transition-all group font-mono">
                      <div className="truncate pr-3">
                        <p className="text-slate-200 text-xs font-bold leading-tight group-hover:text-emerald-400 transition-colors">{u.display_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          Rolle: <span className="text-slate-300 font-semibold">{u.role || "Mitarbeiter"}</span>
                          {u.phone && ` • 📞 ${u.phone}`}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 💼 Services (Dienste) Section */}
            {filteredServices.length > 0 && (
              <div className="py-2.5">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center justify-between mb-2">
                  <span>💼 Dienste/Aufgaben ({filteredServices.length})</span>
                  <span className="text-[9px] text-slate-600 font-normal">Kanal: Diensttypen</span>
                </h5>
                <div className="space-y-1">
                  {filteredServices.map((s) => (
                    <button key={s.id} onClick={() => handleSelectService(s)} className="w-full text-left p-2 hover:bg-slate-800/60 rounded-xl flex items-center justify-between transition-all group font-mono">
                      <div className="truncate pr-3">
                        <p className="text-slate-200 text-xs font-bold leading-tight group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: s.color || "#047857" }} />
                          {s.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 text-slate-550 shrink-0" />
                          <span>{s.location || "Lagerplatz"}</span>
                          <span>• Kat: {s.category || "Allgemein"}</span>
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 📅 Schichten (Shifts) Section */}
            {filteredShifts.length > 0 && (
              <div className="py-2.5 last:pb-0">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center justify-between mb-2">
                  <span>📅 Arbeits-Schichten ({filteredShifts.length})</span>
                  <span className="text-[9px] text-slate-600 font-normal">Direkteinwahl</span>
                </h5>
                <div className="space-y-1">
                  {filteredShifts.map((sh) => {
                    const service = services.find((srv) => srv.id === sh.service_id);
                    const serviceTitle = service ? service.title : "Unbekannter Dienst";
                    const categoryColor = service ? service.color : "#047857";
                    const assignedCount = assignments.filter((a) => a.shift_id === sh.id).length;
                    const maxPersons = service?.max_persons || 1;

                    return (
                      <button key={sh.id} onClick={() => handleSelectShiftItem(sh)} className="w-full text-left p-2 hover:bg-slate-800/60 rounded-xl flex items-center justify-between transition-all group font-mono">
                        <div className="truncate pr-3">
                          <p className="text-slate-200 text-xs font-semibold leading-tight group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ backgroundColor: categoryColor || "#047857" }} />
                            {serviceTitle}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate flex items-center gap-2">
                            <CalendarIcon className="h-3 w-3 text-slate-500" />
                            <span className="font-bold text-slate-350">
                              {formatDateWithDayPrefix(sh.date, activeCamp)} {sh.start_time}-{sh.end_time}
                            </span>
                            <span className="text-[9px] px-1.5 bg-slate-950 text-emerald-400 border border-slate-800 rounded font-mono">
                              Ist: {assignedCount}/{maxPersons}
                            </span>
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-emerald-400 transition-colors shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
