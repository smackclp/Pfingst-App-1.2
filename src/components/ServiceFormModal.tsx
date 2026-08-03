import React from "react";
import { X } from "lucide-react";
import { Service, User } from "../types";

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingService: Service | null;
  onAddService: (service: Omit<Service, "id">) => Promise<void>;
  onUpdateService: (id: string, service: Partial<Service>) => Promise<void>;
  users: User[];
  onShowAlert: (title: string, message: string) => void;
}

const CONSTANT_COLORS = [
  { hex: "#ef4444", label: "Rot (Imbiss / Essen)" },
  { hex: "#f97316", label: "Orange (Küche)" },
  { hex: "#f59e0b", label: "Gelb (Morgenlob)" },
  { hex: "#10b981", label: "Grün (Platzdienst)" },
  { hex: "#06b6d4", label: "Türkis (Sport / Spiel)" },
  { hex: "#3b82f6", label: "Blau (Technik)" },
  { hex: "#6366f1", label: "Indigo (Kirche)" },
  { hex: "#8b5cf6", label: "Violett (Wache)" },
  { hex: "#ec4899", label: "Pink (Entertainment)" },
  { hex: "#6b7280", label: "Grau (Toiletten)" },
  { hex: "#0f172a", label: "Dunkelgrau" },
];

export default function ServiceFormModal({
  isOpen,
  onClose,
  editingService,
  onAddService,
  onUpdateService,
  users,
  onShowAlert,
}: ServiceFormModalProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [color, setColor] = React.useState("#3b82f6");
  const [category, setCategory] = React.useState("Programm");
  const [defaultDuration, setDefaultDuration] = React.useState(120);
  const [minPersons, setMinPersons] = React.useState(1);
  const [maxPersons, setMaxPersons] = React.useState(3);
  const [responsibleId, setResponsibleId] = React.useState("");

  // Populate form states when editingService or open state changes
  React.useEffect(() => {
    if (editingService) {
      setTitle(editingService.title);
      setDescription(editingService.description || "");
      setLocation(editingService.location || "");
      setColor(editingService.color || "#3b82f6");
      setCategory(editingService.category || "Programm");
      setDefaultDuration(editingService.default_duration || 120);
      setMinPersons(editingService.min_persons || 1);
      setMaxPersons(editingService.max_persons || 3);
      setResponsibleId(editingService.responsible_id || "");
    } else {
      setTitle("");
      setDescription("");
      setLocation("");
      setColor("#3b82f6");
      setCategory("Programm");
      setDefaultDuration(120);
      setMinPersons(1);
      setMaxPersons(3);
      setResponsibleId("");
    }
  }, [editingService, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      onShowAlert("Eingabe erforderlich", "Ein Diensttitel ist erforderlich.");
      return;
    }

    const payload = {
      title,
      description,
      location,
      color,
      category,
      default_duration: Number(defaultDuration),
      min_persons: Number(minPersons),
      max_persons: Number(maxPersons),
      responsible_id: responsibleId || undefined
    };

    try {
      if (editingService) {
        await onUpdateService(editingService.id, payload);
      } else {
        await onAddService(payload);
      }
      onClose();
    } catch (err) {
      console.error(err);
      onShowAlert("Fehler beim Speichern", "Fehler beim Sichern des Dienstes.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in" id="services-modal">
      <div className="backdrop-blur-md bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-800 overflow-hidden my-8 animate-fade-in">
        <div className="bg-slate-950 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <h3 className="font-bold text-sm tracking-tight text-white font-mono">
            {editingService ? "📟 DIENSTTYP_KONFIGURATION_EDIT" : "📟 NEUEN_DIENSTTYP_ANLEGEN"}
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Diensttitel *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-medium"
              placeholder="z. B. Nachtwache, Imbiss, Kaffeezelt"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Beschreibung / Instruktion</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-medium"
              placeholder="Aufgabenbeschreibung, Verhaltensregeln..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Ort der Durchführung</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-medium"
                placeholder="z. B. Kiosk, Zeltwiese"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Bereich / Kategorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-medium font-mono"
              >
                <option value="Programm" className="bg-slate-950 text-white">Programm / Event</option>
                <option value="Wache" className="bg-slate-950 text-white">Wache / Security</option>
                <option value="Küche" className="bg-slate-950 text-white">Küche / Bar</option>
                <option value="Logistik" className="bg-slate-950 text-white">Logistik / Büro</option>
                <option value="Hygiene" className="bg-slate-950 text-white">Hygiene / Toiletten</option>
                <option value="Technik" className="bg-slate-950 text-white">Technik / Bühne</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1 col-span-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Standarddauer (Min)</label>
              <input
                type="number"
                min={15}
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(Number(e.target.value))}
                className="w-full text-xs p-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 font-mono text-white font-medium"
              />
            </div>

            <div className="space-y-1 col-span-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Min. Helfer*innen</label>
              <input
                type="number"
                min={1}
                value={minPersons}
                onChange={(e) => setMinPersons(Number(e.target.value))}
                className="w-full text-xs p-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 font-mono text-white font-medium"
              />
            </div>

            <div className="space-y-1 col-span-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Max. Helfer*innen</label>
              <input
                type="number"
                min={1}
                value={maxPersons}
                onChange={(e) => setMaxPersons(Number(e.target.value))}
                className="w-full text-xs p-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 font-mono text-white font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Hauptverantwortliche Person (HV)</label>
            <select
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-500/40 text-white font-medium font-mono"
            >
              <option value="" className="bg-slate-950 text-slate-300">-- Keiner festgelegt (Offen) --</option>
              {users
                .filter(u => u.active)
                .sort((a, b) => a.display_name.localeCompare(b.display_name))
                .map(u => (
                  <option key={u.id} value={u.id} className="bg-slate-950 text-white">{u.display_name}</option>
                ))}
            </select>
          </div>

          {/* Color picker representation */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Farbe des Dienstes</label>
            <div className="flex flex-wrap gap-1.5">
              {CONSTANT_COLORS.map(c => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-6 h-6 rounded-full shrink-0 border transition-transform flex items-center justify-center cursor-pointer ${
                    color === c.hex ? "scale-110 border-white ring-2 ring-emerald-500/60" : "border-slate-800/80 hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {color === c.hex && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 shadow-xs" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer font-mono"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white font-mono font-bold rounded-xl text-xs transition cursor-pointer"
            >
              {editingService ? "DIENST_SICHERN" : "DIENSTTYP_SPEICHERN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
