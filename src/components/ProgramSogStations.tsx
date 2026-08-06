import React from "react";
import { Plus, Edit, Trash2, MapPin, Package, CheckSquare, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import UndoToast from "./UndoToast";
import FieldError from "./FieldError";
import { useUndoableDelete } from "../hooks/useUndoableDelete";

export interface SogStation {
  id: string;
  number: number;
  title: string;
  description: string;
  location: string;
  materialNeeded: string;
  helperIds: string[];
}

interface ProgramSogStationsProps {
  sogStations: SogStation[];
  users: User[];
  currentUserId?: string;
  onUpdateStations: (newList: SogStation[]) => void;
}

/**
 * "Stationen & Helferzuordnung"-Subtab von Spiel ohne Grenzen, inkl.
 * Anlegen-/Bearbeiten-Modal. Extrahiert aus ProgramView.tsx.
 */
export default function ProgramSogStations({ sogStations, users, currentUserId, onUpdateStations }: ProgramSogStationsProps) {
  // Station Edit Modal States
  const [isStationModalOpen, setIsStationModalOpen] = React.useState<boolean>(false);
  const [editingStation, setEditingStation] = React.useState<SogStation | null>(null);
  const [stationNumber, setStationNumber] = React.useState<number>(1);
  const [stationTitle, setStationTitle] = React.useState<string>("");
  const [stationLocation, setStationLocation] = React.useState<string>("");
  const [stationDescription, setStationDescription] = React.useState<string>("");
  const [stationMaterial, setStationMaterial] = React.useState<string>("");
  const [stationHelperIds, setStationHelperIds] = React.useState<string[]>([]);
  const [helperSearchQuery, setHelperSearchQuery] = React.useState<string>("");
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [stationTitleError, setStationTitleError] = React.useState<string | undefined>();
  const { isPending, scheduleDelete, undo, activeToast } = useUndoableDelete();

  const openAddStationModal = () => {
    const nextNum = sogStations.length > 0 ? Math.max(...sogStations.map((s) => s.number)) + 1 : 1;
    setEditingStation(null);
    setStationNumber(nextNum);
    setStationTitle("");
    setStationLocation("");
    setStationDescription("");
    setStationMaterial("");
    setStationHelperIds([]);
    setHelperSearchQuery("");
    setStationTitleError(undefined);
    setIsStationModalOpen(true);
  };

  const openEditStationModal = (st: SogStation) => {
    setEditingStation(st);
    setStationNumber(st.number);
    setStationTitle(st.title);
    setStationLocation(st.location || "");
    setStationDescription(st.description || "");
    setStationMaterial(st.materialNeeded || "");
    setStationHelperIds(st.helperIds || []);
    setHelperSearchQuery("");
    setStationTitleError(undefined);
    setIsStationModalOpen(true);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationTitle.trim()) {
      setStationTitleError("Bitte einen Stationstitel eingeben.");
      return;
    }
    setStationTitleError(undefined);

    if (editingStation) {
      const updated = sogStations.map((s) =>
        s.id === editingStation.id
          ? {
              ...s,
              number: Number(stationNumber),
              title: stationTitle.trim(),
              location: stationLocation.trim(),
              description: stationDescription.trim(),
              materialNeeded: stationMaterial.trim(),
              helperIds: stationHelperIds,
            }
          : s
      );
      onUpdateStations(updated);
    } else {
      const newSt: SogStation = {
        id: `station-${Date.now()}`,
        number: Number(stationNumber),
        title: stationTitle.trim(),
        location: stationLocation.trim(),
        description: stationDescription.trim(),
        materialNeeded: stationMaterial.trim(),
        helperIds: stationHelperIds,
      };
      onUpdateStations([...sogStations, newSt]);
    }

    setIsStationModalOpen(false);
  };

  const handleDeleteStation = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDeleteStation = () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    const station = sogStations.find((s) => s.id === id);
    setDeleteTargetId(null);
    scheduleDelete(id, station?.title || "Station", () => {
      const updated = sogStations.filter((s) => s.id !== id);
      onUpdateStations(updated);
    });
  };

  const toggleStationHelper = (userId: string) => {
    setStationHelperIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const toggleQuickSelfHelper = (stationId: string) => {
    if (!currentUserId) return;
    const updated = sogStations.map((st) => {
      if (st.id === stationId) {
        const helpers = st.helperIds || [];
        const exists = helpers.includes(currentUserId);
        const newHelpers = exists ? helpers.filter((id) => id !== currentUserId) : [...helpers, currentUserId];
        return { ...st, helperIds: newHelpers };
      }
      return st;
    });
    onUpdateStations(updated);
  };

  const visibleStations = sogStations.filter((s) => !isPending(s.id));

  return (
    <div className="space-y-6 no-print">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-850">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>🎯 Stationen & Helferzuordnung</span>
            <span className="text-xs font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/40">{visibleStations.length} Stationen</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Alle Helfer können Spiele anlegen, bearbeiten, Material eintragen oder sich eintragen.</p>
        </div>

        <button
          onClick={openAddStationModal}
          className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase font-mono tracking-wider transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20 shrink-0"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Station hinzufügen</span>
        </button>
      </div>

      {visibleStations.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/20 border border-slate-850 border-dashed rounded-2xl">
          <CheckSquare className="h-10 w-10 text-slate-500 mx-auto opacity-40 mb-3" />
          <p className="text-sm font-semibold text-slate-300">Keine Stationen angelegt</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">Klicke auf „Station hinzufügen", um die erste Spielstation anzulegen.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleStations.map((st) => {
            const isMyStation = Boolean(currentUserId && st.helperIds && st.helperIds.includes(currentUserId));
            const assignedHelpers = users.filter((u) => st.helperIds && st.helperIds.includes(u.id));

            return (
              <div
                key={st.id}
                className={`p-5 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
                  isMyStation ? "bg-slate-900/90 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10" : "bg-slate-900/40 border-slate-850 hover:border-slate-800"
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 border ${
                          isMyStation ? "bg-emerald-500 text-slate-950 border-emerald-400" : "bg-slate-800 text-emerald-400 border-slate-700"
                        }`}
                      >
                        #{st.number}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-base flex items-center gap-2">
                          <span>{st.title}</span>
                          {isMyStation && (
                            <span className="text-[10px] font-mono font-extrabold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full uppercase">⭐ DEINE STATION</span>
                          )}
                        </h4>
                        {st.location && (
                          <div className="flex items-center space-x-1 text-xs text-cyan-400 mt-0.5 font-medium">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span>{st.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button onClick={() => openEditStationModal(st)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer" title="Station & Helfer bearbeiten">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDeleteStation(st.id)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 cursor-pointer" title="Station löschen">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Spielbeschreibung */}
                  {st.description && (
                    <div className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-850/60 space-y-1">
                      <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Regeln / Ablauf:</span>
                      <p className="leading-relaxed whitespace-pre-wrap">{st.description}</p>
                    </div>
                  )}

                  {/* Benötigtes Material */}
                  {st.materialNeeded && (
                    <div className="text-xs text-amber-300/90 bg-amber-950/20 p-2.5 rounded-xl border border-amber-900/30 flex items-start space-x-2">
                      <Package className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <span className="font-mono font-bold uppercase text-[10px] text-amber-400 block">Benötigtes Material:</span>
                        <span>{st.materialNeeded}</span>
                      </div>
                    </div>
                  )}

                  {/* Zugeordnete Helfer */}
                  <div className="pt-1">
                    <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1.5">Eingeteilte Helfer ({assignedHelpers.length}):</span>
                    {assignedHelpers.length === 0 ? (
                      <span className="text-xs text-slate-500 italic font-mono">Noch keine Helfer eingeteilt</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedHelpers.map((h) => {
                          const isMe = h.id === currentUserId;
                          return (
                            <span
                              key={h.id}
                              className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center space-x-1 ${
                                isMe ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm" : "bg-slate-800 text-slate-200 border-slate-700"
                              }`}
                            >
                              <span>
                                {h.first_name} {h.last_name}
                              </span>
                              {isMe && <span className="text-[10px] font-black uppercase ml-1">(Du)</span>}
                              {h.role && !isMe && <span className="text-[10px] text-slate-400 ml-1">({h.role})</span>}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick 1-click self-helper toggle button */}
                {currentUserId && (
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => toggleQuickSelfHelper(st.id)}
                      className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer border ${
                        isMyStation
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                          : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/10"
                      }`}
                    >
                      {isMyStation ? (
                        <>
                          <X className="h-3.5 w-3.5 text-rose-400" />
                          <span>Als Helfer von dieser Station austragen</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5 stroke-[3]" />
                          <span>Als Helfer für diese Station eintragen</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* STATION EDIT MODAL */}
      <AnimatePresence>
        {isStationModalOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-emerald-400" />
                  <span>{editingStation ? "Station bearbeiten" : "Neue Station anlegen"}</span>
                </h3>
                <button onClick={() => setIsStationModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStation} className="space-y-4 text-xs font-mono">
                {/* Station Number & Title */}
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-400 font-bold uppercase block mb-1">Station #</label>
                    <input
                      type="number"
                      min={1}
                      value={stationNumber}
                      onChange={(e) => setStationNumber(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white text-center focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-slate-400 font-bold uppercase block mb-1">Stationstitel *</label>
                    <input
                      type="text"
                      placeholder="z.B. Sackhüpfen-Slalom"
                      value={stationTitle}
                      onChange={(e) => {
                        setStationTitle(e.target.value);
                        setStationTitleError(undefined);
                      }}
                      className={`w-full bg-slate-950 border rounded-xl p-2.5 text-white font-sans font-semibold focus:border-emerald-500 focus:outline-none ${
                        stationTitleError ? "border-rose-500/60" : "border-slate-800"
                      }`}
                    />
                    <FieldError message={stationTitleError} />
                  </div>
                </div>

                {/* Location (Freitext) */}
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Standort / Ort (Freitext)</label>
                  <input
                    type="text"
                    placeholder="z.B. Sportplatz hinter der Küche"
                    value={stationLocation}
                    onChange={(e) => setStationLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Spielbeschreibung & Regeln</label>
                  <textarea
                    rows={3}
                    placeholder="Erkläre das Spiel, die Regeln und den Ablauf..."
                    value={stationDescription}
                    onChange={(e) => setStationDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Material Needed (Freitext) */}
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Benötigtes Material (Freitext)</label>
                  <input
                    type="text"
                    placeholder="z.B. 6 Jutesäcke, 8 Slalom-Hütchen, 1 Stoppuhr"
                    value={stationMaterial}
                    onChange={(e) => setStationMaterial(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Helper Assignment Checklist */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-400 font-bold uppercase block">Helfer zuordnen ({stationHelperIds.length} gewählt)</label>
                    <span className="text-[10px] text-slate-500">Unbegrenzt wählbar</span>
                  </div>

                  {/* Search filter for helpers */}
                  <div className="relative mb-2">
                    <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Helfer suchen..."
                      value={helperSearchQuery}
                      onChange={(e) => setHelperSearchQuery(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-800 bg-slate-950 rounded-xl p-2 space-y-1">
                    {users.length === 0 ? (
                      <p className="text-[11px] text-slate-500 p-2 italic">Keine Nutzer geladen</p>
                    ) : (
                      users
                        .filter((u) => {
                          if (!helperSearchQuery.trim()) return true;
                          const q = helperSearchQuery.toLowerCase();
                          return `${u.first_name} ${u.last_name} ${u.role}`.toLowerCase().includes(q);
                        })
                        .map((u) => {
                          const isChecked = stationHelperIds.includes(u.id);
                          return (
                            <label
                              key={u.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none ${
                                isChecked ? "bg-emerald-950/40 border border-emerald-800/60" : "hover:bg-slate-900"
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <input type="checkbox" checked={isChecked} onChange={() => toggleStationHelper(u.id)} className="w-4 h-4 accent-emerald-500 rounded cursor-pointer" />
                                <span className="font-sans font-medium text-slate-200 text-xs">
                                  {u.first_name} {u.last_name}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">{u.role || "Mitarbeiter"}</span>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsStationModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
                  >
                    Abbrechen
                  </button>
                  <button type="submit" className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase cursor-pointer shadow-lg shadow-emerald-500/20">
                    Speichern
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Station löschen"
        message="Möchtest du diese Station wirklich löschen?"
        onConfirm={confirmDeleteStation}
        onCancel={() => setDeleteTargetId(null)}
      />
      <UndoToast toast={activeToast} onUndo={undo} />
    </div>
  );
}
