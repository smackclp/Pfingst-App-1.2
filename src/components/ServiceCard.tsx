import React from "react";
import { 
  MapPin, 
  Clock, 
  Users, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Layers, 
  ArrowRight,
  Calendar
} from "lucide-react";
import { Service, User, Shift } from "../types";
import { Tooltip } from "./Tooltip";
import { AnimatePresence, motion } from "motion/react";

interface ServiceCardProps {
  key?: React.Key;
  svc: Service;
  users: User[];
  shifts: Shift[];
  isAdmin: boolean;
  startDate: string;
  sunDate: string;
  endDate: string;
  onAddShift: (shift: Omit<Shift, "id">) => Promise<void>;
  onDeleteShiftClick: (shiftId: string, label: string) => void;
  onEditServiceClick: (svc: Service) => void;
  onDeleteServiceClick: (id: string, title: string) => void;
  onShowAlert: (title: string, message: string) => void;
}

export default function ServiceCard({
  svc,
  users,
  shifts,
  isAdmin,
  startDate,
  sunDate,
  endDate,
  onAddShift,
  onDeleteShiftClick,
  onEditServiceClick,
  onDeleteServiceClick,
  onShowAlert,
}: ServiceCardProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [quickDays, setQuickDays] = React.useState<string[]>([]);
  const [quickStart, setQuickStart] = React.useState("10:00");
  const [quickEnd, setQuickEnd] = React.useState("12:00");
  const [quickNotes, setQuickNotes] = React.useState("");
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);

  const responsiblePerson = users.find(u => u.id === svc.responsible_id);
  const cardColor = svc.color || "#3b82f6";
  const matchingShifts = shifts.filter(s => s.service_id === svc.id);

  const handleCreateSeries = async () => {
    if (quickDays.length === 0) {
      onShowAlert("Eingabe unvollständig", "Bitte wählen Sie mindestens einen Tag aus.");
      return;
    }
    if (!quickStart || !quickEnd) {
      onShowAlert("Eingabe unvollständig", "Bitte geben Sie Start- und Endzeit an.");
      return;
    }

    try {
      for (const day of quickDays) {
        await onAddShift({
          service_id: svc.id,
          date: day,
          start_time: quickStart,
          end_time: quickEnd,
          notes: quickNotes || ""
        });
      }
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3050);
      setQuickDays([]);
      setQuickNotes("");
    } catch (err) {
      onShowAlert("Fehler beim Erstellen", "Fehler beim Erstellen der Schichtserie.");
    }
  };

  return (
    <div 
      id={`service-card-${svc.id}`}
      className="bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex flex-col justify-between hover:border-emerald-500/20 transition-all relative overflow-hidden shadow-lg shadow-black/25"
    >
      {/* Decorative Side color banner */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1.5" 
        style={{ backgroundColor: cardColor }}
      />

      <div className="space-y-3.5 pl-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-extrabold text-white leading-tight mt-0.5 font-display">
              {svc.title}
            </h4>
          </div>

          <span 
            className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-950 shadow-xs" 
            style={{ backgroundColor: cardColor }}
          />
        </div>

        {svc.description && (
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
            {svc.description}
          </p>
        )}

        {/* Badges specifications */}
        <div className="space-y-1.5 text-slate-300 text-xs">
          <div className="flex items-center space-x-2">
            <MapPin className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
            <span>Ort: <span className="font-semibold text-white">{svc.location || "Lagerplatz"}</span></span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5">
            <p className="flex items-center space-x-1 border border-slate-800 bg-slate-950/60 py-1 px-2 rounded-lg">
              <Clock className="h-3 w-3 text-emerald-500/70 shrink-0" />
              <span>Soll: <span className="font-bold text-white font-mono">{svc.default_duration} Min</span></span>
            </p>
            <p className="flex items-center space-x-1 border border-slate-800 bg-slate-950/60 py-1 px-2 rounded-lg">
              <Users className="h-3 w-3 text-emerald-500/70 shrink-0" />
              <span>Kader: <span className="font-bold text-white font-mono">{svc.min_persons}-{svc.max_persons} Pls.</span></span>
            </p>
          </div>
        </div>

        {/* Responsible Person / HV */}
        <div className="pt-2.5 border-t border-slate-800/80 text-xs">
          <span className="text-[10px] text-slate-400 font-extrabold uppercase font-mono block">Dienst-Verantwortliche(r)</span>
          {responsiblePerson ? (
            <p className="font-bold text-emerald-450 flex items-center space-x-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{responsiblePerson.display_name}</span>
            </p>
          ) : (
            <p className="text-rose-500 font-bold italic mt-0.5 flex items-center space-x-1">
              <span>⚠ Nicht zugeteilt!</span>
            </p>
          )}
        </div>
      </div>

      {/* Collapsible Shift quick manager */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="mt-4 pt-4 border-t border-slate-800/80 space-y-4 text-xs overflow-hidden"
          >
            <div>
              <h5 className="font-extrabold text-slate-400 uppercase text-[9px] font-mono tracking-wider mb-2 flex justify-between items-center">
                <span>Schichten in diesem Lager ({matchingShifts.length}):</span>
                {showSuccessToast && (
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/20 animate-fade-in flex items-center gap-1 font-sans">
                    <Check className="h-3 w-3" />
                    <span>Angelegt!</span>
                  </span>
                )}
              </h5>
              {matchingShifts.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">Noch keine Schichten für diesen Dienst geplant.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {matchingShifts.map(sh => {
                    let dayLabel = "Allg.";
                    if (sh.date === startDate) dayLabel = "Sa.";
                    if (sh.date === sunDate) dayLabel = "So.";
                    if (sh.date === endDate) dayLabel = "Mo.";

                    return (
                      <span 
                        key={sh.id}
                        className="inline-flex items-center space-x-1 pl-2 pr-1.5 py-1 bg-slate-950 border border-slate-850 text-slate-100 rounded-lg font-mono text-[11px] font-bold"
                      >
                        <span>{dayLabel} {sh.start_time}-{sh.end_time}</span>
                        {isAdmin && (
                          <Tooltip content={`Arbeitsschicht ${sh.start_time}-${sh.end_time} unwiderruflich löschen`} position="top" delay={155}>
                            <button
                              onClick={() => onDeleteShiftClick(sh.id, `${svc.title} (${dayLabel} ${sh.start_time}-${sh.end_time})`)}
                              className="p-0.5 hover:bg-rose-950/50 text-slate-500 hover:text-rose-500 rounded-md cursor-pointer transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Tooltip>
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {isAdmin && (
              <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 space-y-3">
                <span className="font-extrabold text-slate-350 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Schichten-Schnellerstellung</span>
                </span>

                <div className="space-y-2.5">
                  <div>
                    <span className="text-[9px] text-slate-400 block font-bold mb-1 uppercase font-mono">Tage wählen:</span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: startDate, label: "Sa" },
                        { id: sunDate, label: "So" },
                        { id: endDate, label: "Mo" },
                        { id: "Haupt", label: "Allg" }
                      ].map(day => {
                        const checked = quickDays.includes(day.id);
                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => {
                              setQuickDays(prev => 
                                prev.includes(day.id) 
                                  ? prev.filter(d => d !== day.id) 
                                  : [...prev, day.id]
                              );
                            }}
                            className={`px-2 py-0.5 border text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              checked
                                ? "bg-emerald-600 border-emerald-500/30 text-white shadow-xs"
                                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800"
                            }`}
                          >
                            {day.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-slate-400 block font-bold mb-0.5 uppercase font-mono">Von:</label>
                      <input 
                        type="text"
                        placeholder="10:00"
                        value={quickStart}
                        onChange={(e) => setQuickStart(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 font-bold font-mono text-center text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-slate-400 block font-bold mb-0.5 uppercase font-mono">Bis:</label>
                      <input 
                        type="text"
                        placeholder="12:00"
                        value={quickEnd}
                        onChange={(e) => setQuickEnd(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 font-bold font-mono text-center text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] text-slate-400 block font-bold mb-0.5 uppercase font-mono">Notizen / Info (optional):</label>
                    <input 
                      type="text"
                      placeholder="z.B. Besondere Details..."
                      value={quickNotes}
                      onChange={(e) => setQuickNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-200 text-[11px] font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateSeries}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 transition-all text-white font-bold rounded-lg text-xs shadow-sm shadow-emerald-500/15 flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <span>Serie anlegen</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Controls */}
      <div className="pt-4 border-t border-slate-800/70 mt-4 flex items-center justify-between text-xs">
        <Tooltip content="Schichtenliste ausklappen und schnelle Erstellung öffnen" position="top" delay={200}>
          <button
            onClick={() => {
              setIsOpen(!isOpen);
              setQuickDays([]);
              setQuickNotes("");
            }}
            className="px-2.5 py-1.5 bg-slate-950/60 hover:bg-emerald-950/40 hover:text-emerald-400 border border-slate-800 text-slate-300 font-bold rounded-xl transition text-[11px] flex items-center space-x-1 cursor-pointer"
          >
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>Schichten ({matchingShifts.length})</span>
          </button>
        </Tooltip>

        {isAdmin && (
          <div className="flex items-center space-x-1">
            <Tooltip content="Dienst-Metadaten wie Name, Ort, Dauer & Personenanzahl bearbeiten" position="top" delay={150}>
              <button
                onClick={() => onEditServiceClick(svc)}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </Tooltip>
            <Tooltip content="Dienst und alle verknüpften Schichten endgültig löschen" position="top" delay={150}>
              <button
                onClick={() => onDeleteServiceClick(svc.id, svc.title)}
                className="p-1.5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Tooltip>
          </div>
        )}
      </div>
    </div>
  );
}
