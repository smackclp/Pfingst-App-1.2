import React from "react";
import { Sparkles, Plus, Trash2, Edit, ChevronUp, ChevronDown, Printer, Music, X } from "lucide-react";
import { TalentAct, Community } from "../types";
import { motion, AnimatePresence } from "motion/react";
import ProgramTalentShowPlaylist from "./ProgramTalentShowPlaylist";
import UndoToast from "./UndoToast";
import FieldError from "./FieldError";
import { useUndoableDelete } from "../hooks/useUndoableDelete";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface ProgramTalentShowProps {
  talentActs: TalentAct[];
  communities: Community[];
  isAdmin: boolean;
  onAddTalentAct: (act: Omit<TalentAct, "id">) => Promise<void>;
  onUpdateTalentAct: (id: string, act: Partial<TalentAct>) => Promise<void>;
  onDeleteTalentAct: (id: string) => Promise<void>;
  onReorderTalentActs: (orders: { [id: string]: number }) => Promise<void>;
}

// Act Categories
const ACT_TYPES = ["Sologesang", "Tanz", "Kunststücke", "Comedy/Sketch", "Gruppe, Band oder Chor", "Sonstiges"];

const LIGHT_MOODS = [
  "Warmes Bühnenlicht",
  "Bunte Disko-Effekte",
  "Spotlight auf Talent",
  "Dunkel & Mystery-Stimmung",
  "Sanftes Farbspiel (Blau/Lila)",
  "Klassisches Hell",
];

// Extract ages and calculate average helper
function extractAgesAndAverage(talentsNames: string): { ages: number[]; average: number | null } {
  const regex = /\((\d+)\)/g;
  const ages: number[] = [];
  let match;
  while ((match = regex.exec(talentsNames)) !== null) {
    ages.push(parseInt(match[1], 10));
  }
  if (ages.length === 0) {
    return { ages, average: null };
  }
  const sum = ages.reduce((a, b) => a + b, 0);
  return { ages, average: Number((sum / ages.length).toFixed(1)) };
}

/**
 * "Bunter Abend / Talent-Show"-Tab (Regie-Liste, Druckansicht, Beitrags-Modal).
 * Extrahiert aus ProgramView.tsx.
 */
export default function ProgramTalentShow({
  talentActs,
  communities,
  isAdmin,
  onAddTalentAct,
  onUpdateTalentAct,
  onDeleteTalentAct,
  onReorderTalentActs,
}: ProgramTalentShowProps) {
  const [activeSubTab, setActiveSubTab] = React.useState<"list" | "print">("list");

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAct, setEditingAct] = React.useState<TalentAct | null>(null);
  const [isPlaylistOpen, setIsPlaylistOpen] = React.useState(false);
  const { isPending, scheduleDelete, undo, activeToast } = useUndoableDelete();
  const formModalTitleId = React.useId();
  const formModalFocusTrapRef = useFocusTrap<HTMLDivElement>(isFormOpen);
  useEscapeKey(isFormOpen, () => setIsFormOpen(false));

  // Talent Show Form States
  const [communityName, setCommunityName] = React.useState("");
  const [talentsNames, setTalentsNames] = React.useState("");
  const [actType, setActType] = React.useState(ACT_TYPES[0]);
  const [songTitle, setSongTitle] = React.useState("");
  const [playUntil, setPlayUntil] = React.useState("");
  const [fadeOut, setFadeOut] = React.useState(false);
  const [fadeOutDesc, setFadeOutDesc] = React.useState("langsam ausfaden");
  const [microphonesCount, setMicrophonesCount] = React.useState(0);
  const [instruments, setInstruments] = React.useState("");
  const [lightingMood, setLightingMood] = React.useState(LIGHT_MOODS[0]);
  const [spotifyLink, setSpotifyLink] = React.useState("");
  const [withoutRating, setWithoutRating] = React.useState(false);
  const [talentsNamesError, setTalentsNamesError] = React.useState<string | undefined>();

  const openAddForm = () => {
    setEditingAct(null);
    setCommunityName(communities[0]?.name || "");
    setTalentsNames("");
    setActType(ACT_TYPES[0]);
    setSongTitle("");
    setPlayUntil("");
    setFadeOut(false);
    setFadeOutDesc("langsam ausfaden");
    setMicrophonesCount(0);
    setInstruments("");
    setLightingMood(LIGHT_MOODS[0]);
    setSpotifyLink("");
    setWithoutRating(false);
    setTalentsNamesError(undefined);
    setIsFormOpen(true);
  };

  const openEditForm = (act: TalentAct) => {
    setEditingAct(act);
    setCommunityName(act.community_name);
    setTalentsNames(act.talents_names);
    setActType(act.act_type);
    setSongTitle(act.song_title || "");
    setPlayUntil(act.play_until || "");
    setFadeOut(act.fade_out);
    setFadeOutDesc(act.fade_out_desc || "langsam ausfaden");
    setMicrophonesCount(act.microphones_count);
    setInstruments(act.instruments || "");
    setLightingMood(act.lighting_mood || LIGHT_MOODS[0]);
    setSpotifyLink(act.spotify_link || "");
    setWithoutRating(act.without_rating);
    setTalentsNamesError(undefined);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!talentsNames.trim()) {
      setTalentsNamesError("Bitte Teilnehmer und Alter eingeben.");
      return;
    }
    setTalentsNamesError(undefined);

    const payload = {
      camp_id: "camp-2026",
      community_name: communityName || "Unbekannte Gemeinde",
      talents_names: talentsNames.trim(),
      act_type: actType,
      song_title: songTitle.trim(),
      play_until: playUntil.trim(),
      fade_out: fadeOut,
      fade_out_desc: fadeOutDesc.trim(),
      microphones_count: Number(microphonesCount),
      instruments: instruments.trim(),
      lighting_mood: lightingMood,
      spotify_link: spotifyLink.trim(),
      without_rating: withoutRating,
      order_index: editingAct ? editingAct.order_index : talentActs.length + 1,
    };

    if (editingAct) {
      await onUpdateTalentAct(editingAct.id, payload);
    } else {
      await onAddTalentAct(payload);
    }

    setIsFormOpen(false);
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    const current = talentActs[index];
    const prev = talentActs[index - 1];

    await onReorderTalentActs({
      [current.id]: prev.order_index,
      [prev.id]: current.order_index,
    });
  };

  const handleMoveDown = async (index: number) => {
    if (index >= talentActs.length - 1) return;
    const current = talentActs[index];
    const next = talentActs[index + 1];

    await onReorderTalentActs({
      [current.id]: next.order_index,
      [next.id]: current.order_index,
    });
  };

  return (
    <div className="space-y-6">
      {/* Talent Show Content */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print" id="program-tab-header">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white font-sans flex items-center gap-2">
            <span>Bunter Abend / Talent-Show Programmlaufplan</span>
            <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
              {talentActs.length} Beiträge
            </span>
          </h2>
          <p className="text-xs text-slate-400">Ablaufsteuerung, Mikrofone, Licht & Musik-Regie für den Zeltlager-Abend</p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveSubTab("list")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition ${
                activeSubTab === "list" ? "bg-slate-800 text-white border border-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Regie-Liste
            </button>
            <button
              onClick={() => setActiveSubTab("print")}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition flex items-center space-x-1 ${
                activeSubTab === "print" ? "bg-slate-800 text-white border border-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Drucken</span>
            </button>
          </div>

          <button
            onClick={() => setIsPlaylistOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-bold rounded-xl text-xs uppercase font-mono tracking-wider transition active:scale-95 cursor-pointer"
          >
            <Music className="h-4 w-4" />
            <span>Wiedergabeliste</span>
          </button>

          {isAdmin && (
            <button
              onClick={openAddForm}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase font-mono tracking-wider transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Beitrag eintragen</span>
            </button>
          )}
        </div>
      </div>

      {/* Regie List or Print View */}
      {activeSubTab === "list" ? (
        <div className="space-y-4">
          {talentActs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/20 border border-slate-850 border-dashed rounded-2xl">
              <Music className="h-10 w-10 text-slate-500 mx-auto opacity-40 mb-3" />
              <p className="text-sm font-semibold text-slate-300">Noch keine Beiträge eingetragen</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Klicke oben auf „Beitrag eintragen", um Auftritte, Mikrofone und Lichtstimmungen für die Talent-Show zu erfassen.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {talentActs.map((act, idx) => {
                if (isPending(act.id)) return null;
                const { average } = extractAgesAndAverage(act.talents_names);
                return (
                  <div key={act.id} className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 p-4 rounded-2xl transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-emerald-400 shrink-0 mt-0.5">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-base">{act.talents_names}</span>
                          <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">{act.community_name}</span>
                          {act.without_rating && (
                            <span className="text-[10px] font-bold text-purple-400 bg-purple-950/40 border border-purple-900/40 px-2 py-0.5 rounded-md uppercase">
                              Show-Act (Ohne Wertung)
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                          <span className="text-pink-400 font-bold">🎭 {act.act_type}</span>
                          {act.song_title && <span>🎵 {act.song_title}</span>}
                          {act.microphones_count > 0 && <span className="text-cyan-400">🎙️ {act.microphones_count}x Mics</span>}
                          {act.lighting_mood && <span>💡 {act.lighting_mood}</span>}
                          {average && <span className="text-amber-400">👥 Ø {average} Jahre</span>}
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center space-x-1 shrink-0 self-end md:self-center">
                        <button
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                          title="Nach oben verschieben"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === talentActs.length - 1}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 cursor-pointer"
                          title="Nach unten verschieben"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button onClick={() => openEditForm(act)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer" title="Bearbeiten">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => scheduleDelete(act.id, act.talents_names || "Beitrag", () => onDeleteTalentAct(act.id))}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 cursor-pointer"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Talent Show Print View */
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-xl font-bold text-white uppercase font-sans">Regie-Ablaufplan Talent-Show</h1>
              <p className="text-xs text-slate-400 font-mono">Pfingstlager {new Date().getFullYear()}</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-slate-950 font-bold rounded-xl text-xs uppercase font-mono tracking-wider flex items-center space-x-2 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Drucken</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900">
                  <th className="p-2">#</th>
                  <th className="p-2">Gemeinde & Namen</th>
                  <th className="p-2">Kategorie</th>
                  <th className="p-2">Musik / Titel</th>
                  <th className="p-2">Mics</th>
                  <th className="p-2">Licht</th>
                </tr>
              </thead>
              <tbody>
                {talentActs.map((act, i) => (
                  <tr key={act.id} className="border-b border-slate-900 hover:bg-slate-900/50">
                    <td className="p-2 font-bold text-emerald-400">#{i + 1}</td>
                    <td className="p-2">
                      <div className="font-bold text-white">{act.talents_names}</div>
                      <div className="text-[10px] text-slate-500">{act.community_name}</div>
                    </td>
                    <td className="p-2">{act.act_type}</td>
                    <td className="p-2">{act.song_title || "—"}</td>
                    <td className="p-2 text-cyan-400 font-bold">{act.microphones_count}x</td>
                    <td className="p-2">{act.lighting_mood}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TALENT SHOW FORM MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div
            ref={formModalFocusTrapRef}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print"
            role="dialog"
            aria-modal="true"
            aria-labelledby={formModalTitleId}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 id={formModalTitleId} className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <span>{editingAct ? "Beitrag bearbeiten" : "Neuen Beitrag eintragen"}</span>
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Schließen">
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Gemeinde</label>
                  <select
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  >
                    {communities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    <option value="Gast / Sonstige">Gast / Sonstige</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Teilnehmer & Alter *</label>
                  <input
                    type="text"
                    placeholder="z.B. Max (14), Anna (15)"
                    value={talentsNames}
                    onChange={(e) => {
                      setTalentsNames(e.target.value);
                      setTalentsNamesError(undefined);
                    }}
                    className={`w-full bg-slate-950 border rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none ${
                      talentsNamesError ? "border-rose-500/60" : "border-slate-800"
                    }`}
                  />
                  <FieldError message={talentsNamesError} />
                </div>

                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Kategorie</label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  >
                    {ACT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-bold uppercase block mb-1">Song / Titel</label>
                    <input
                      type="text"
                      placeholder="z.B. Beat It"
                      value={songTitle}
                      onChange={(e) => setSongTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold uppercase block mb-1">Anzahl Mikrofone</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={microphonesCount}
                      onChange={(e) => setMicrophonesCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Spotify-Song-Link (optional)</label>
                  <input
                    type="url"
                    placeholder="z.B. https://open.spotify.com/track/..."
                    value={spotifyLink}
                    onChange={(e) => setSpotifyLink(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1 font-sans">Für die Wiedergabeliste zur Songreihenfolge während der Show.</p>
                </div>

                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Lichtstimmung</label>
                  <select
                    value={lightingMood}
                    onChange={(e) => setLightingMood(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  >
                    {LIGHT_MOODS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer pt-2">
                  <input type="checkbox" checked={withoutRating} onChange={(e) => setWithoutRating(e.target.checked)} className="w-4 h-4 accent-emerald-500 rounded" />
                  <span className="text-slate-300 font-sans">Show-Act ohne Wertung</span>
                </label>

                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
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

      {isPlaylistOpen && <ProgramTalentShowPlaylist acts={talentActs} onClose={() => setIsPlaylistOpen(false)} />}

      <UndoToast toast={activeToast} onUndo={undo} />
    </div>
  );
}
