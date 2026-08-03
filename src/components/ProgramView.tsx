import React from "react";
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit, 
  ChevronUp, 
  ChevronDown, 
  Printer, 
  Music, 
  Check, 
  AlertCircle, 
  ListRestart, 
  Save, 
  X, 
  ExternalLink,
  Mic,
  Lightbulb,
  Music3,
  Copy,
  HelpCircle,
  Award,
  CalendarDays,
  CornerDownRight,
  MapPin,
  Package,
  User as UserIcon,
  Users,
  Clock,
  Star,
  FileText,
  CheckSquare,
  Search,
  Filter,
  Calendar
} from "lucide-react";
import { TalentAct, Community, User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { safeStorage } from "../utils";

export interface SogStation {
  id: string;
  number: number;
  title: string;
  description: string;
  location: string;
  materialNeeded: string;
  helperIds: string[];
}

interface ProgramViewProps {
  talentActs: TalentAct[];
  communities: Community[];
  users?: User[];
  currentUserId?: string;
  isAdmin: boolean;
  onAddTalentAct: (act: Omit<TalentAct, "id">) => Promise<void>;
  onUpdateTalentAct: (id: string, act: Partial<TalentAct>) => Promise<void>;
  onDeleteTalentAct: (id: string) => Promise<void>;
  onReorderTalentActs: (orders: { [id: string]: number }) => Promise<void>;
  onClearTalentActs: () => Promise<void>;
}

// Extract ages and calculate average helper
function extractAgesAndAverage(talentsNames: string): { ages: number[], average: number | null } {
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

// Helper time formatter
function formatTimePlusMinutes(baseTime: string, addMinutes: number): string {
  const [h, m] = baseTime.split(":").map(Number);
  const totalMin = (h || 0) * 60 + (m || 0) + addMinutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

// Act Categories
const ACT_TYPES = [
  "Sologesang",
  "Tanz",
  "Kunststücke",
  "Comedy/Sketch",
  "Gruppe, Band oder Chor",
  "Sonstiges"
];

const LIGHT_MOODS = [
  "Warmes Bühnenlicht",
  "Bunte Disko-Effekte",
  "Spotlight auf Talent",
  "Dunkel & Mystery-Stimmung",
  "Sanftes Farbspiel (Blau/Lila)",
  "Klassisches Hell"
];

const DEFAULT_SOG_STATIONS: SogStation[] = [
  {
    id: "station-1",
    number: 1,
    title: "Wasserträger-Rallye",
    location: "Große Lagerwiese (Areal A)",
    description: "Parcours-Staffel: Das Team muss mit löchrigen Bechern Wasser von der Wasserstelle zum Messzylinder befördern. Welches Team hat nach der Rundenzeit den höchsten Wasserstand?",
    materialNeeded: "2 große Baukübel mit Wasser, 4 gelochte Plastikbecher, 1 transparenter Messzylinder mit Liter-Skala, 1 Stoppuhr",
    helperIds: []
  },
  {
    id: "station-2",
    number: 2,
    title: "Sackhüpfen-Slalom",
    location: "Sportplatz hinter der Lagerküche",
    description: "Slalom-Hindernisstrecke in Jutesäcken. 4 Läufer je Team absolvieren die Strecke nacheinander als Staffellauf. Es zählt die Gesamtzeit der Gruppe.",
    materialNeeded: "6 große Jutesäcke, 8 rote Slalomhütchen, 1 Trillerpfeife, 1 Stoppuhr",
    helperIds: []
  },
  {
    id: "station-3",
    number: 3,
    title: "Fröbelturm & Team-Aktion",
    location: "Schattenplatz bei den Eichen",
    description: "Der gesamte Trupp muss über gemeinsame Schnüre den Kran führen und 6 Holzklötze aufeinander stapeln, ohne dass der Turm umfällt.",
    materialNeeded: "1 Fröbelturm-Set (12 Holzbauklötze, Metallkran mit Seilen), ebener Untergrund",
    helperIds: []
  },
  {
    id: "station-4",
    number: 4,
    title: "Riesen-Memory",
    location: "Unter dem Sonnensegel Zelt 2",
    description: "24 riesige Holz- / Pappkarten liegen umgedreht am Boden. Nacheinander läuft ein Teilnehmer nach vorne und deckt 2 Karten auf. Ziel ist es, alle Paare so schnell wie möglich zu finden.",
    materialNeeded: "24 quadratische Bildkarten (12 Pärchen mit Lagermotiven), 1 Stoppuhr",
    helperIds: []
  },
  {
    id: "station-5",
    number: 5,
    title: "Dreier-Holzski-Rennen",
    location: "Lagerfeuerplatz",
    description: "Jeweils 3 Teilnehmer schnallen sich gemeinsam die langen Holzski unter. Das Team muss sich synchron abstimmen, um die Wendemarke zu umrunden.",
    materialNeeded: "2 Paar Dreier-Holzski mit Seilschlaufen, 2 Wendehütchen",
    helperIds: []
  }
];

export default function ProgramView({
  talentActs = [],
  communities = [],
  users = [],
  currentUserId,
  isAdmin,
  onAddTalentAct,
  onUpdateTalentAct,
  onDeleteTalentAct,
  onReorderTalentActs,
  onClearTalentActs
}: ProgramViewProps) {
  interface TeamGroup {
    id: string;
    name: string;
    communityIds: string[];
  }

  const [activeMainTab, setActiveMainTab] = React.useState<"talentshow" | "spiel_ohne_grenzen">("talentshow");
  const [activeSubTab, setActiveSubTab] = React.useState<"list" | "print">("list");
  
  // Spiel ohne Grenzen state
  const [sogNumTeams, setSogNumTeams] = React.useState<number>(4);
  const [sogActiveSubTab, setSogActiveSubTab] = React.useState<"groups" | "stations" | "laufplan" | "print_cards" | "print_groups">("groups");
  
  // Teams State
  const [sogGroups, setSogGroups] = React.useState<TeamGroup[]>(() => {
    const saved = safeStorage.getItem("zeltlager_sog_groups_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse SOG groups", e);
      }
    }
    return [];
  });

  // Stations State
  const [sogStations, setSogStations] = React.useState<SogStation[]>(() => {
    const saved = safeStorage.getItem("zeltlager_sog_stations_v1");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error("Failed to parse SOG stations", e);
      }
    }
    return DEFAULT_SOG_STATIONS;
  });

  // Laufplan Rotation Settings
  const [sogStartTime, setSogStartTime] = React.useState<string>("10:00");
  const [sogRoundDuration, setSogRoundDuration] = React.useState<number>(15);
  const [sogBreakDuration, setSogBreakDuration] = React.useState<number>(5);

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

  const [sogCopySuccess, setSogCopySuccess] = React.useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingAct, setEditingAct] = React.useState<TalentAct | null>(null);
  
  // Spotify Integration States
  const [isSpotifyExpanded, setIsSpotifyExpanded] = React.useState(false);
  const [spotifyToken, setSpotifyToken] = React.useState("");
  const [spotifyStep, setSpotifyStep] = React.useState<"idle" | "creating" | "success" | "error">("idle");
  const [createdPlaylistUrl, setCreatedPlaylistUrl] = React.useState("");
  const [spotifyError, setSpotifyError] = React.useState("");
  const [tempPosition, setTempPosition] = React.useState<{[id: string]: string}>({});
  
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

  // Parse details in real-time
  const parsedAges = React.useMemo(() => {
    return extractAgesAndAverage(talentsNames);
  }, [talentsNames]);

  // Current logged in user object
  const currentUser = React.useMemo(() => {
    if (!currentUserId || !users) return null;
    return users.find(u => u.id === currentUserId) || null;
  }, [currentUserId, users]);

  // Personal stations assigned to current user
  const myAssignedStations = React.useMemo(() => {
    if (!currentUserId) return [];
    return sogStations.filter(st => st.helperIds && st.helperIds.includes(currentUserId));
  }, [sogStations, currentUserId]);

  // Save SOG Stations to LocalStorage
  const updateSogStations = (newList: SogStation[]) => {
    const sorted = [...newList].sort((a, b) => a.number - b.number);
    setSogStations(sorted);
    safeStorage.setItem("zeltlager_sog_stations_v1", JSON.stringify(sorted));
  };

  // Open Station Modal
  const openAddStationModal = () => {
    const nextNum = sogStations.length > 0 ? Math.max(...sogStations.map(s => s.number)) + 1 : 1;
    setEditingStation(null);
    setStationNumber(nextNum);
    setStationTitle("");
    setStationLocation("");
    setStationDescription("");
    setStationMaterial("");
    setStationHelperIds([]);
    setHelperSearchQuery("");
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
    setIsStationModalOpen(true);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationTitle.trim()) return;

    if (editingStation) {
      const updated = sogStations.map(s => s.id === editingStation.id ? {
        ...s,
        number: Number(stationNumber),
        title: stationTitle.trim(),
        location: stationLocation.trim(),
        description: stationDescription.trim(),
        materialNeeded: stationMaterial.trim(),
        helperIds: stationHelperIds
      } : s);
      updateSogStations(updated);
    } else {
      const newSt: SogStation = {
        id: `station-${Date.now()}`,
        number: Number(stationNumber),
        title: stationTitle.trim(),
        location: stationLocation.trim(),
        description: stationDescription.trim(),
        materialNeeded: stationMaterial.trim(),
        helperIds: stationHelperIds
      };
      updateSogStations([...sogStations, newSt]);
    }

    setIsStationModalOpen(false);
  };

  const handleDeleteStation = (id: string) => {
    if (confirm("Möchtest du diese Station wirklich löschen?")) {
      const updated = sogStations.filter(s => s.id !== id);
      updateSogStations(updated);
    }
  };

  const toggleStationHelper = (userId: string) => {
    setStationHelperIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleQuickSelfHelper = (stationId: string) => {
    if (!currentUserId) return;
    const updated = sogStations.map(st => {
      if (st.id === stationId) {
        const helpers = st.helperIds || [];
        const exists = helpers.includes(currentUserId);
        const newHelpers = exists
          ? helpers.filter(id => id !== currentUserId)
          : [...helpers, currentUserId];
        return { ...st, helperIds: newHelpers };
      }
      return st;
    });
    updateSogStations(updated);
  };

  // Reconcile SOG groups with communities list
  const reconciledSogGroups = React.useMemo(() => {
    if (sogGroups.length === 0) return [];
    
    const communityMap = new Map(communities.map(c => [c.id, c]));
    let updated = sogGroups.map(g => ({
      ...g,
      communityIds: g.communityIds.filter(id => communityMap.has(id))
    }));
    
    const assignedIds = new Set(updated.flatMap(g => g.communityIds));
    const unassigned = communities.filter(c => !assignedIds.has(c.id));
    
    if (unassigned.length > 0) {
      unassigned.forEach(comm => {
        let minIdx = 0;
        let minSize = updated[0].communityIds.reduce((sum, cid) => sum + (communityMap.get(cid)?.participants || 0), 0);
        
        for (let i = 1; i < updated.length; i++) {
          const size = updated[i].communityIds.reduce((sum, cid) => sum + (communityMap.get(cid)?.participants || 0), 0);
          if (size < minSize) {
            minSize = size;
            minIdx = i;
          }
        }
        updated[minIdx].communityIds.push(comm.id);
      });
      
      setTimeout(() => {
        setSogGroups(updated);
        safeStorage.setItem("zeltlager_sog_groups_v1", JSON.stringify(updated));
      }, 0);
    }
    
    return updated;
  }, [sogGroups, communities]);

  // Generate balanced teams
  const handleGenerateSogGroups = (count: number) => {
    if (!communities || communities.length === 0) {
      alert("Keine Gemeinden vorhanden, um Gruppen zu erstellen.");
      return;
    }
    
    const sortedComms = [...communities].sort((a, b) => b.participants - a.participants);
    const groups: TeamGroup[] = Array.from({ length: count }, (_, i) => ({
      id: `sog-group-${i + 1}`,
      name: `Gruppe ${i + 1}`,
      communityIds: []
    }));
    
    sortedComms.forEach(comm => {
      let minGroupIdx = 0;
      let minSize = groups[0].communityIds.reduce((sum, cid) => {
        const c = communities.find(co => co.id === cid);
        return sum + (c ? c.participants : 0);
      }, 0);
      
      for (let i = 1; i < groups.length; i++) {
        const size = groups[i].communityIds.reduce((sum, cid) => {
          const c = communities.find(co => co.id === cid);
          return sum + (c ? c.participants : 0);
        }, 0);
        if (size < minSize) {
          minSize = size;
          minGroupIdx = i;
        }
      }
      
      groups[minGroupIdx].communityIds.push(comm.id);
    });
    
    setSogGroups(groups);
    safeStorage.setItem("zeltlager_sog_groups_v1", JSON.stringify(groups));
  };

  const handleMoveSogCommunity = (communityId: string, targetGroupId: string) => {
    const updated = reconciledSogGroups.map(g => {
      const filtered = g.communityIds.filter(id => id !== communityId);
      if (g.id === targetGroupId) {
        return {
          ...g,
          communityIds: [...filtered, communityId]
        };
      }
      return {
        ...g,
        communityIds: filtered
      };
    });
    
    setSogGroups(updated);
    safeStorage.setItem("zeltlager_sog_groups_v1", JSON.stringify(updated));
  };

  const sogStats = React.useMemo(() => {
    if (reconciledSogGroups.length === 0) return null;
    
    const communityMap = new Map(communities.map(c => [c.id, c]));
    const sizes = reconciledSogGroups.map(g => 
      g.communityIds.reduce((sum, id) => sum + (communityMap.get(id)?.participants || 0), 0)
    );
    
    const totalParticipants = sizes.reduce((a, b) => a + b, 0);
    const avgSize = Number((totalParticipants / reconciledSogGroups.length).toFixed(1));
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const maxDiff = maxSize - minSize;
    
    return {
      totalParticipants,
      avgSize,
      minSize,
      maxSize,
      maxDiff
    };
  }, [reconciledSogGroups, communities]);

  const handleCopySogWhatsApp = () => {
    if (reconciledSogGroups.length === 0) return;
    
    let text = `🏆 *Gruppeneinteilung Spiel ohne Grenzen* 🏆\n\n`;
    
    reconciledSogGroups.forEach(g => {
      const commMap = new Map(communities.map(c => [c.id, c]));
      const gSize = g.communityIds.reduce((sum, cid) => sum + (commMap.get(cid)?.participants || 0), 0);
      
      text += `*${g.name}* (Gesamtstärke: ${gSize} TN):\n`;
      g.communityIds.forEach(cid => {
        const c = commMap.get(cid);
        if (c) {
          text += `• ${c.name} (${c.participants} TN)\n`;
        }
      });
      text += `\n`;
    });
    
    text += `📲 Pfingstlager Dienstplan-App`;
    
    try {
      navigator.clipboard.writeText(text);
      setSogCopySuccess(true);
      setTimeout(() => setSogCopySuccess(false), 2000);
    } catch (err) {
      console.error(err);
      alert("Fehler beim Kopieren.");
    }
  };

  // Talent Show Logic
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
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!talentsNames.trim()) return;

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
      order_index: editingAct ? editingAct.order_index : talentActs.length + 1
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
      [prev.id]: current.order_index
    });
  };

  const handleMoveDown = async (index: number) => {
    if (index >= talentActs.length - 1) return;
    const current = talentActs[index];
    const next = talentActs[index + 1];

    await onReorderTalentActs({
      [current.id]: next.order_index,
      [next.id]: current.order_index
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Main Tab Navigation */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 no-print" id="program-maintabs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveMainTab("talentshow")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase font-mono tracking-wider transition cursor-pointer flex items-center space-x-2 ${
              activeMainTab === "talentshow"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>🎤 Bunter Abend / Talent-Show</span>
          </button>

          <button
            onClick={() => setActiveMainTab("spiel_ohne_grenzen")}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase font-mono tracking-wider transition cursor-pointer flex items-center space-x-2 ${
              activeMainTab === "spiel_ohne_grenzen"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Award className="h-4 w-4" />
            <span>⚔️ Spiel ohne Grenzen</span>
          </button>
        </div>
      </div>

      {activeMainTab === "talentshow" ? (
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
              <p className="text-xs text-slate-400">
                Ablaufsteuerung, Mikrofone, Licht & Musik-Regie für den Zeltlager-Abend
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                <button
                  onClick={() => setActiveSubTab("list")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition ${
                    activeSubTab === "list"
                      ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Regie-Liste
                </button>
                <button
                  onClick={() => setActiveSubTab("print")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition flex items-center space-x-1 ${
                    activeSubTab === "print"
                      ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Drucken</span>
                </button>
              </div>

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
                    Klicke oben auf „Beitrag eintragen“, um Auftritte, Mikrofone und Lichtstimmungen für die Talent-Show zu erfassen.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {talentActs.map((act, idx) => {
                    const { average } = extractAgesAndAverage(act.talents_names);
                    return (
                      <div 
                        key={act.id} 
                        className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 p-4 rounded-2xl transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-xs text-emerald-400 shrink-0 mt-0.5">
                            #{idx + 1}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-white text-base">{act.talents_names}</span>
                              <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                                {act.community_name}
                              </span>
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
                            <button
                              onClick={() => openEditForm(act)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer"
                              title="Bearbeiten"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => onDeleteTalentAct(act.id)}
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
        </div>
      ) : (
        /* SPIEL OHNE GRENZEN SECTION */
        <div className="space-y-6">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 1.2cm;
              }
              body {
                background-color: #ffffff !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              nav, header, footer, aside, button, select,
              #navigation-sidebar, #header-bar,
              #program-tab-header, #program-maintabs, #sog-subtab-nav,
              .no-print, .print\\:hidden {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              #zeltlager-app-container, #zeltlager-app-container > div, main {
                display: block !important;
                padding: 0 !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                border: none !important;
              }
              .sog-print-card {
                page-break-after: always;
                break-after: page;
                border: 2px solid #000000 !important;
                padding: 20px !important;
                margin-bottom: 20px !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              .sog-print-table {
                width: 100% !important;
                border-collapse: collapse !important;
                border: 2px solid #000000 !important;
              }
              .sog-print-table th {
                background-color: #f3f4f6 !important;
                border: 1px solid #000000 !important;
                padding: 6px 8px !important;
                font-weight: bold !important;
                font-size: 11px !important;
                color: #000000 !important;
              }
              .sog-print-table td {
                border: 1px solid #000000 !important;
                padding: 6px 8px !important;
                font-size: 10px !important;
                color: #000000 !important;
              }
            }
          ` }} />

          {/* Personal Highlight Banner if current user is assigned to a station */}
          {myAssignedStations.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border-2 border-emerald-500 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-2xl shrink-0">
                  ⭐
                </div>
                <div>
                  <div className="text-xs font-extrabold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span>Deine persönliche Station</span>
                    {currentUser && <span>({currentUser.first_name} {currentUser.last_name})</span>}
                  </div>
                  <div className="text-base font-extrabold text-white mt-0.5">
                    {myAssignedStations.map(st => `Station ${st.number}: ${st.title} — Ort: ${st.location || 'tbd'}`).join(" | ")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSogActiveSubTab("stations")}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold rounded-xl uppercase tracking-wider font-mono shrink-0 cursor-pointer shadow-md"
              >
                Zu deiner Station
              </button>
            </div>
          )}

          {/* SOG Sub-tabs Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4 no-print" id="sog-subtab-nav">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white font-sans flex items-center gap-2">
                <span>⚔️ Spiel ohne Grenzen</span>
              </h2>
              <p className="text-xs text-slate-400">Stationen, Helferzuordnung, Rotationsplan & faire Gruppeneinteilung</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
              <button
                onClick={() => setSogActiveSubTab("groups")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition cursor-pointer ${
                  sogActiveSubTab === "groups"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Gruppen</span>
              </button>

              <button
                onClick={() => setSogActiveSubTab("stations")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition cursor-pointer ${
                  sogActiveSubTab === "stations"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Stationen ({sogStations.length})</span>
              </button>

              <button
                onClick={() => setSogActiveSubTab("laufplan")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition cursor-pointer ${
                  sogActiveSubTab === "laufplan"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>Rotationsplan</span>
              </button>

              <button
                onClick={() => setSogActiveSubTab("print_cards")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition cursor-pointer ${
                  sogActiveSubTab === "print_cards"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Stationskarten (A4)</span>
              </button>

              <button
                onClick={() => setSogActiveSubTab("print_groups")}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition cursor-pointer ${
                  sogActiveSubTab === "print_groups"
                    ? "bg-slate-800 text-white border border-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Gruppen-Druck</span>
              </button>
            </div>
          </div>

          {/* SUBTAB 1: GRUPPENEINTEILUNG */}
          {sogActiveSubTab === "groups" && (
            <div className="space-y-6 no-print">
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider font-mono text-slate-400">Anzahl Teams / Gruppen:</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <button
                        onClick={() => setSogNumTeams(prev => Math.max(2, prev - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-200 cursor-pointer text-sm font-bold active:scale-95 transition"
                      >
                        -
                      </button>
                      <span className="w-10 text-center font-mono font-bold text-white text-lg">{sogNumTeams}</span>
                      <button
                        onClick={() => setSogNumTeams(prev => Math.min(12, prev + 1))}
                        className="w-8 h-8 rounded-lg bg-slate-950 hover:bg-slate-850 border border-slate-800 flex items-center justify-center text-slate-200 cursor-pointer text-sm font-bold active:scale-95 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopySogWhatsApp}
                    disabled={reconciledSogGroups.length === 0}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold uppercase font-mono tracking-wider transition active:scale-95 cursor-pointer border ${
                      sogCopySuccess
                        ? "bg-emerald-500 text-slate-950 border-emerald-500/10"
                        : "bg-slate-950 text-emerald-400 hover:bg-slate-900 border-emerald-500/30 hover:border-emerald-500/80 disabled:opacity-40 disabled:pointer-events-none"
                    }`}
                  >
                    {sogCopySuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Kopiert!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Für WhatsApp kopieren</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleGenerateSogGroups(sogNumTeams)}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-extrabold uppercase font-mono tracking-wider transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <span>Gruppen automatisch einteilen</span>
                  </button>
                </div>
              </div>

              {sogStats && (
                <div className="bg-slate-900/20 border border-slate-850/60 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center md:text-left">
                    <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Gemeinden Gesamt</p>
                    <p className="text-lg font-bold text-white mt-0.5">{communities.length}</p>
                  </div>
                  <div className="text-center md:text-left border-l border-slate-800/60 pl-4">
                    <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Teilnehmer*innen Gesamt</p>
                    <p className="text-lg font-bold text-white mt-0.5">{sogStats.totalParticipants} Personen</p>
                  </div>
                  <div className="text-center md:text-left border-l border-slate-800/60 pl-4">
                    <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Ø Gruppengröße</p>
                    <p className="text-lg font-bold text-emerald-400 mt-0.5">{sogStats.avgSize} TN</p>
                  </div>
                  <div className="text-center md:text-left border-l border-slate-800/60 pl-4">
                    <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-slate-400">Größte Differenz</p>
                    <p className="text-lg font-bold text-amber-400 mt-0.5">
                      {sogStats.maxDiff} TN <span className="text-[10px] font-normal text-slate-500">(Min: {sogStats.minSize} / Max: {sogStats.maxSize})</span>
                    </p>
                  </div>
                </div>
              )}

              {reconciledSogGroups.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/20 border border-slate-850 border-dashed rounded-2xl">
                  <Award className="h-10 w-10 text-slate-500 mx-auto opacity-40 mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Noch keine Teams eingeteilt</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Klicke oben auf „Gruppen automatisch einteilen“, um das Lager fair nach Teilnehmerzahl zu spalten.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reconciledSogGroups.map(g => {
                    const commMap = new Map(communities.map(c => [c.id, c]));
                    const gSize = g.communityIds.reduce((sum, id) => sum + (commMap.get(id)?.participants || 0), 0);
                    
                    return (
                      <div key={g.id} className="bg-slate-900/30 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2 mb-3">
                            <span className="font-sans font-bold text-white">{g.name}</span>
                            <span className="font-mono text-xs text-slate-400 px-2 py-0.5 rounded-full bg-slate-800 font-bold border border-slate-700/50">
                              {gSize} TN
                            </span>
                          </div>

                          <div className="space-y-2">
                            {g.communityIds.length === 0 ? (
                              <p className="text-[11px] text-slate-600 font-mono italic py-2">Leer (Keine Gemeinden)</p>
                            ) : (
                              g.communityIds.map(cid => {
                                const c = commMap.get(cid);
                                if (!c) return null;
                                return (
                                  <div key={c.id} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-xl border border-slate-850/40">
                                    <div className="text-xs font-semibold text-slate-200">
                                      <span>{c.name}</span>
                                      <span className="text-[10px] text-slate-500 font-normal block mt-0.5">{c.participants} Teilnehmer*innen</span>
                                    </div>

                                    <select
                                      value={g.id}
                                      onChange={(e) => handleMoveSogCommunity(c.id, e.target.value)}
                                      className="text-[10px] font-bold font-mono bg-slate-900 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
                                    >
                                      {reconciledSogGroups.map(grp => (
                                        <option key={grp.id} value={grp.id}>
                                          {grp.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 2: STATIONEN & HELFER */}
          {sogActiveSubTab === "stations" && (
            <div className="space-y-6 no-print">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-850">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🎯 Stationen & Helferzuordnung</span>
                    <span className="text-xs font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800/40">
                      {sogStations.length} Stationen
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Alle Helfer können Spiele anlegen, bearbeiten, Material eintragen oder sich eintragen.
                  </p>
                </div>

                <button
                  onClick={openAddStationModal}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase font-mono tracking-wider transition active:scale-95 cursor-pointer shadow-lg shadow-emerald-500/20 shrink-0"
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                  <span>Station hinzufügen</span>
                </button>
              </div>

              {sogStations.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/20 border border-slate-850 border-dashed rounded-2xl">
                  <CheckSquare className="h-10 w-10 text-slate-500 mx-auto opacity-40 mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Keine Stationen angelegt</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Klicke auf „Station hinzufügen“, um die erste Spielstation anzulegen.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sogStations.map(st => {
                    const isMyStation = Boolean(currentUserId && st.helperIds && st.helperIds.includes(currentUserId));
                    const assignedHelpers = users.filter(u => st.helperIds && st.helperIds.includes(u.id));

                    return (
                      <div 
                        key={st.id} 
                        className={`p-5 rounded-2xl border transition flex flex-col justify-between space-y-4 ${
                          isMyStation 
                            ? "bg-slate-900/90 border-2 border-emerald-500 shadow-lg shadow-emerald-500/10" 
                            : "bg-slate-900/40 border-slate-850 hover:border-slate-800"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3">
                            <div className="flex items-center space-x-3">
                              <span className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 border ${
                                isMyStation 
                                  ? "bg-emerald-500 text-slate-950 border-emerald-400" 
                                  : "bg-slate-800 text-emerald-400 border-slate-700"
                              }`}>
                                #{st.number}
                              </span>
                              <div>
                                <h4 className="font-bold text-white text-base flex items-center gap-2">
                                  <span>{st.title}</span>
                                  {isMyStation && (
                                    <span className="text-[10px] font-mono font-extrabold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full uppercase">
                                      ⭐ DEINE STATION
                                    </span>
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
                              <button
                                onClick={() => openEditStationModal(st)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 cursor-pointer"
                                title="Station & Helfer bearbeiten"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteStation(st.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 cursor-pointer"
                                title="Station löschen"
                              >
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
                            <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                              Eingeteilte Helfer ({assignedHelpers.length}):
                            </span>
                            {assignedHelpers.length === 0 ? (
                              <span className="text-xs text-slate-500 italic font-mono">Noch keine Helfer eingeteilt</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {assignedHelpers.map(h => {
                                  const isMe = h.id === currentUserId;
                                  return (
                                    <span 
                                      key={h.id} 
                                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium flex items-center space-x-1 ${
                                        isMe 
                                          ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-sm" 
                                          : "bg-slate-800 text-slate-200 border-slate-700"
                                      }`}
                                    >
                                      <span>{h.first_name} {h.last_name}</span>
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
            </div>
          )}

          {/* SUBTAB 3: STATION SLAUFPLAN (ROTATIONSMATRIX) */}
          {sogActiveSubTab === "laufplan" && (
            <div className="space-y-6 no-print">
              <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🗓️ Stationslaufplan (Rotationsmatrix)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kollisionsfreier Ablaufplan. Zeigt runde für runde, welche Gruppe an welcher Station spielt.
                  </p>
                </div>

                {/* Times Settings */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-slate-400">Start:</span>
                    <input
                      type="time"
                      value={sogStartTime}
                      onChange={(e) => setSogStartTime(e.target.value)}
                      className="bg-transparent font-bold text-white focus:outline-none w-16"
                    />
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Dauer:</span>
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={sogRoundDuration}
                      onChange={(e) => setSogRoundDuration(Number(e.target.value))}
                      className="bg-transparent font-bold text-white focus:outline-none w-12 text-center"
                    />
                    <span className="text-slate-400">Min</span>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Pause:</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={sogBreakDuration}
                      onChange={(e) => setSogBreakDuration(Number(e.target.value))}
                      className="bg-transparent font-bold text-white focus:outline-none w-12 text-center"
                    />
                    <span className="text-slate-400">Min</span>
                  </div>
                </div>
              </div>

              {sogStations.length === 0 || reconciledSogGroups.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/20 border border-slate-850 border-dashed rounded-2xl">
                  <CalendarDays className="h-10 w-10 text-slate-500 mx-auto opacity-40 mb-3" />
                  <p className="text-sm font-semibold text-slate-300">Stationen und Gruppen erforderlich</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Bitte erstelle mindestens 1 Gruppe und 1 Station, um den Rotationsplan anzuzeigen.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900/30 border border-slate-850 rounded-2xl p-4 overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                        <th className="p-3 font-bold w-28 uppercase text-slate-300">Runde & Zeit</th>
                        {sogStations.map(st => {
                          const isMyStation = currentUserId && st.helperIds && st.helperIds.includes(currentUserId);
                          return (
                            <th 
                              key={st.id} 
                              className={`p-3 font-bold text-center border-l border-slate-800/60 min-w-[140px] ${
                                isMyStation ? "bg-emerald-950/60 text-emerald-300" : "text-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-center space-x-1">
                                <span>St. #{st.number}</span>
                                {isMyStation && <span className="text-[10px]">⭐</span>}
                              </div>
                              <div className="text-[10px] font-normal text-slate-400 truncate max-w-[130px] mx-auto mt-0.5">
                                {st.title}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: Math.max(sogStations.length, reconciledSogGroups.length) }).map((_, rIdx) => {
                        const roundNum = rIdx + 1;
                        const start = formatTimePlusMinutes(sogStartTime, rIdx * (sogRoundDuration + sogBreakDuration));
                        const end = formatTimePlusMinutes(sogStartTime, rIdx * (sogRoundDuration + sogBreakDuration) + sogRoundDuration);

                        return (
                          <tr key={roundNum} className="border-b border-slate-850 hover:bg-slate-900/40">
                            <td className="p-3 font-bold text-emerald-400 bg-slate-950/40">
                              <div>Runde {roundNum}</div>
                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">{start} - {end}</div>
                            </td>

                            {sogStations.map((st, sIdx) => {
                              const groupIdx = (sIdx + rIdx) % reconciledSogGroups.length;
                              const grp = reconciledSogGroups[groupIdx];
                              const isMyStation = currentUserId && st.helperIds && st.helperIds.includes(currentUserId);

                              return (
                                <td 
                                  key={st.id} 
                                  className={`p-3 text-center border-l border-slate-800/60 font-bold ${
                                    isMyStation ? "bg-emerald-950/20" : ""
                                  }`}
                                >
                                  {grp ? (
                                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white inline-block">
                                      {grp.name}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600">—</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 4: DRUCKBARE STATIONSKARTEN (A4) */}
          {sogActiveSubTab === "print_cards" && (
            <div className="space-y-6">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Printer className="h-4 w-4 text-cyan-400" />
                    <span>🖨️ DIN A4 Stationskarten mit Punktezettel</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ausdruckbare Blätter für jede Station. Enthält Spielregeln, benötigtes Material, Helfer und einen handschriftlichen Wertungsbogen.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  disabled={sogStations.length === 0}
                  className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold uppercase font-mono tracking-wider text-xs rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 disabled:opacity-40 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  <Printer className="h-4 w-4 stroke-[3]" />
                  <span>Karten drucken / PDF exportieren</span>
                </button>
              </div>

              {/* Print Cards List */}
              {sogStations.map(st => {
                const assignedHelpers = users.filter(u => st.helperIds && st.helperIds.includes(u.id));

                return (
                  <div key={st.id} className="sog-print-card bg-white text-black p-6 rounded-2xl border-2 border-slate-800 shadow-md">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
                      <div>
                        <span className="text-xs font-mono font-bold bg-black text-white px-3 py-1 rounded uppercase tracking-wider">
                          STATION #{st.number}
                        </span>
                        <h1 className="text-2xl font-black font-sans uppercase tracking-tight mt-2 text-black">
                          {st.title}
                        </h1>
                        {st.location && (
                          <p className="text-sm font-bold text-slate-700 mt-1">
                            📍 Standort: {st.location}
                          </p>
                        )}
                      </div>
                      <div className="text-right font-mono text-xs text-slate-600">
                        <p className="font-extrabold text-black uppercase">SPIEL OHNE GRENZEN</p>
                        <p>Pfingstlager {new Date().getFullYear()}</p>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-xs font-mono">
                      <div className="p-3 bg-slate-100 rounded border border-slate-300">
                        <span className="font-bold uppercase text-black block mb-1">👥 Betreuer / Stationsteam:</span>
                        {assignedHelpers.length === 0 ? (
                          <span className="italic text-slate-500">Vor Ort eingeteilt</span>
                        ) : (
                          <p className="font-semibold text-slate-900">
                            {assignedHelpers.map(h => `${h.first_name} ${h.last_name}`).join(", ")}
                          </p>
                        )}
                      </div>

                      <div className="p-3 bg-slate-100 rounded border border-slate-300">
                        <span className="font-bold uppercase text-black block mb-1">📦 Benötigtes Material:</span>
                        <p className="text-slate-900">{st.materialNeeded || "Keine besonderen Materialien"}</p>
                      </div>
                    </div>

                    {/* Description */}
                    {st.description && (
                      <div className="p-3 bg-slate-50 rounded border border-slate-300 mb-5 text-xs font-sans">
                        <span className="font-mono font-bold uppercase text-black block mb-1">📜 Spielbeschreibung & Regeln:</span>
                        <p className="leading-relaxed text-slate-800 whitespace-pre-wrap">{st.description}</p>
                      </div>
                    )}

                    {/* Printable Scoring Sheet */}
                    <div>
                      <h3 className="text-xs font-mono font-bold uppercase mb-2 text-black">
                        📝 Wertungsblatt / Punktezettel (Station #{st.number})
                      </h3>
                      <table className="sog-print-table w-full text-left font-mono text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-200">
                            <th className="p-2 w-16">Runde</th>
                            <th className="p-2 w-24">Zeit</th>
                            <th className="p-2">Team / Gruppe</th>
                            <th className="p-2 w-32">Erreichte Punkte / Zeit</th>
                            <th className="p-2 w-28">Handzeichen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: Math.max(reconciledSogGroups.length, 6) }).map((_, rIdx) => {
                            const roundNum = rIdx + 1;
                            const start = formatTimePlusMinutes(sogStartTime, rIdx * (sogRoundDuration + sogBreakDuration));
                            const end = formatTimePlusMinutes(sogStartTime, rIdx * (sogRoundDuration + sogBreakDuration) + sogRoundDuration);
                            const grpIdx = (st.number - 1 + rIdx) % (reconciledSogGroups.length || 1);
                            const grp = reconciledSogGroups[grpIdx];

                            return (
                              <tr key={roundNum} className="border-b border-slate-300">
                                <td className="p-2.5 font-bold">Runde {roundNum}</td>
                                <td className="p-2.5 text-slate-600">{start}</td>
                                <td className="p-2.5 font-bold">{grp ? grp.name : `Gruppe ${roundNum}`}</td>
                                <td className="p-2.5 text-slate-400 font-normal">________________</td>
                                <td className="p-2.5 text-slate-400 font-normal">_______</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* SUBTAB 5: DRUCKBARE GRUPPENÜBERSICHT (A4) */}
          {sogActiveSubTab === "print_groups" && (
            <div className="space-y-6" id="sog-print-container">
              <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-200">🖨️ DIN A4 Gruppenübersicht</h3>
                  <p className="text-xs text-slate-400">
                    Aushang für den Lagerplatz. Zeigt die Zuteilung der Gemeinden auf die Teams.
                  </p>
                </div>
                <button
                  onClick={() => window.print()}
                  disabled={reconciledSogGroups.length === 0}
                  className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold uppercase font-mono tracking-wider text-xs rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Printer className="h-4 w-4 stroke-[3]" />
                  <span>Drucken</span>
                </button>
              </div>

              <div className="bg-white text-black p-6 rounded-2xl border-2 border-black" id="sog-printable-paper">
                <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight font-sans uppercase">
                      ⚔️ Spiel ohne Grenzen – Gruppeneinteilung
                    </h1>
                    <p className="text-xs font-mono text-slate-600 mt-1">
                      Stand: {new Date().toLocaleDateString("de-DE")}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <p className="font-extrabold">PFINGSTLAGER</p>
                    <p>DIN A4 Aushang</p>
                  </div>
                </div>

                <table className="sog-print-table w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className="p-2.5 w-1/4 font-bold">Gruppe</th>
                      <th className="p-2.5 w-1/2 font-bold">Zugeordnete Gemeinden</th>
                      <th className="p-2.5 w-1/4 font-bold text-center">Teilnehmerzahl</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciledSogGroups.map(g => {
                      const commMap = new Map(communities.map(c => [c.id, c]));
                      const gSize = g.communityIds.reduce((sum, id) => sum + (commMap.get(id)?.participants || 0), 0);
                      const commNames = g.communityIds
                        .map(id => {
                          const c = commMap.get(id);
                          return c ? `${c.name} (${c.participants} TN)` : null;
                        })
                        .filter(Boolean)
                        .join(", ");

                      return (
                        <tr key={g.id} className="border-b border-slate-300">
                          <td className="p-3 font-bold uppercase">{g.name}</td>
                          <td className="p-3">{commNames || "Keine Gemeinden"}</td>
                          <td className="p-3 text-center font-bold">{gSize} TN</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                <button
                  onClick={() => setIsStationModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
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
                      required
                      value={stationNumber}
                      onChange={(e) => setStationNumber(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-bold text-white text-center focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="text-slate-400 font-bold uppercase block mb-1">Stationstitel *</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. Sackhüpfen-Slalom"
                      value={stationTitle}
                      onChange={(e) => setStationTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans font-semibold focus:border-emerald-500 focus:outline-none"
                    />
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
                    <label className="text-slate-400 font-bold uppercase block">
                      Helfer zuordnen ({stationHelperIds.length} gewählt)
                    </label>
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
                        .filter(u => {
                          if (!helperSearchQuery.trim()) return true;
                          const q = helperSearchQuery.toLowerCase();
                          return `${u.first_name} ${u.last_name} ${u.role}`.toLowerCase().includes(q);
                        })
                        .map(u => {
                          const isChecked = stationHelperIds.includes(u.id);
                          return (
                            <label 
                              key={u.id}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition select-none ${
                                isChecked ? "bg-emerald-950/40 border border-emerald-800/60" : "hover:bg-slate-900"
                              }`}
                            >
                              <div className="flex items-center space-x-2.5">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleStationHelper(u.id)}
                                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                                />
                                <span className="font-sans font-medium text-slate-200 text-xs">
                                  {u.first_name} {u.last_name}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {u.role || "Mitarbeiter"}
                              </span>
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
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TALENT SHOW FORM MODAL */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <span>{editingAct ? "Beitrag bearbeiten" : "Neuen Beitrag eintragen"}</span>
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
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
                    {communities.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    <option value="Gast / Sonstige">Gast / Sonstige</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Teilnehmer & Alter *</label>
                  <input
                    type="text"
                    required
                    placeholder="z.B. Max (14), Anna (15)"
                    value={talentsNames}
                    onChange={(e) => setTalentsNames(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 font-bold uppercase block mb-1">Kategorie</label>
                  <select
                    value={actType}
                    onChange={(e) => setActType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  >
                    {ACT_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
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
                  <label className="text-slate-400 font-bold uppercase block mb-1">Lichtstimmung</label>
                  <select
                    value={lightingMood}
                    onChange={(e) => setLightingMood(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-sans focus:border-emerald-500 focus:outline-none"
                  >
                    {LIGHT_MOODS.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center space-x-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={withoutRating}
                    onChange={(e) => setWithoutRating(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
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
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
