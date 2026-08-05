import React from "react";
import { Users, CheckSquare, CalendarDays, Printer } from "lucide-react";
import { Community, User } from "../types";
import { safeStorage } from "../utils";
import ProgramSogGroups from "./ProgramSogGroups";
import ProgramSogStations, { SogStation } from "./ProgramSogStations";
import ProgramSogLaufplan from "./ProgramSogLaufplan";
import ProgramSogPrintCards from "./ProgramSogPrintCards";
import ProgramSogPrintGroups from "./ProgramSogPrintGroups";

interface TeamGroup {
  id: string;
  name: string;
  communityIds: string[];
}

interface ProgramSogProps {
  communities: Community[];
  users: User[];
  currentUserId?: string;
}

const DEFAULT_SOG_STATIONS: SogStation[] = [
  {
    id: "station-1",
    number: 1,
    title: "Wasserträger-Rallye",
    location: "Große Lagerwiese (Areal A)",
    description: "Parcours-Staffel: Das Team muss mit löchrigen Bechern Wasser von der Wasserstelle zum Messzylinder befördern. Welches Team hat nach der Rundenzeit den höchsten Wasserstand?",
    materialNeeded: "2 große Baukübel mit Wasser, 4 gelochte Plastikbecher, 1 transparenter Messzylinder mit Liter-Skala, 1 Stoppuhr",
    helperIds: [],
  },
  {
    id: "station-2",
    number: 2,
    title: "Sackhüpfen-Slalom",
    location: "Sportplatz hinter der Lagerküche",
    description: "Slalom-Hindernisstrecke in Jutesäcken. 4 Läufer je Team absolvieren die Strecke nacheinander als Staffellauf. Es zählt die Gesamtzeit der Gruppe.",
    materialNeeded: "6 große Jutesäcke, 8 rote Slalomhütchen, 1 Trillerpfeife, 1 Stoppuhr",
    helperIds: [],
  },
  {
    id: "station-3",
    number: 3,
    title: "Fröbelturm & Team-Aktion",
    location: "Schattenplatz bei den Eichen",
    description: "Der gesamte Trupp muss über gemeinsame Schnüre den Kran führen und 6 Holzklötze aufeinander stapeln, ohne dass der Turm umfällt.",
    materialNeeded: "1 Fröbelturm-Set (12 Holzbauklötze, Metallkran mit Seilen), ebener Untergrund",
    helperIds: [],
  },
  {
    id: "station-4",
    number: 4,
    title: "Riesen-Memory",
    location: "Unter dem Sonnensegel Zelt 2",
    description: "24 riesige Holz- / Pappkarten liegen umgedreht am Boden. Nacheinander läuft ein Teilnehmer nach vorne und deckt 2 Karten auf. Ziel ist es, alle Paare so schnell wie möglich zu finden.",
    materialNeeded: "24 quadratische Bildkarten (12 Pärchen mit Lagermotiven), 1 Stoppuhr",
    helperIds: [],
  },
  {
    id: "station-5",
    number: 5,
    title: "Dreier-Holzski-Rennen",
    location: "Lagerfeuerplatz",
    description: "Jeweils 3 Teilnehmer schnallen sich gemeinsam die langen Holzski unter. Das Team muss sich synchron abstimmen, um die Wendemarke zu umrunden.",
    materialNeeded: "2 Paar Dreier-Holzski mit Seilschlaufen, 2 Wendehütchen",
    helperIds: [],
  },
];

/**
 * "Spiel ohne Grenzen"-Hauptreiter: hält den gemeinsamen State (Gruppen,
 * Stationen, Rotationszeiten) und rendert die 5 Subtab-Komponenten.
 * Extrahiert aus ProgramView.tsx.
 */
export default function ProgramSog({ communities, users, currentUserId }: ProgramSogProps) {
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

  const [sogCopySuccess, setSogCopySuccess] = React.useState<boolean>(false);

  // Current logged in user object
  const currentUser = React.useMemo(() => {
    if (!currentUserId || !users) return null;
    return users.find((u) => u.id === currentUserId) || null;
  }, [currentUserId, users]);

  // Personal stations assigned to current user
  const myAssignedStations = React.useMemo(() => {
    if (!currentUserId) return [];
    return sogStations.filter((st) => st.helperIds && st.helperIds.includes(currentUserId));
  }, [sogStations, currentUserId]);

  // Save SOG Stations to LocalStorage
  const updateSogStations = (newList: SogStation[]) => {
    const sorted = [...newList].sort((a, b) => a.number - b.number);
    setSogStations(sorted);
    safeStorage.setItem("zeltlager_sog_stations_v1", JSON.stringify(sorted));
  };

  // Reconcile SOG groups with communities list
  const reconciledSogGroups = React.useMemo(() => {
    if (sogGroups.length === 0) return [];

    const communityMap = new Map(communities.map((c) => [c.id, c]));
    const updated = sogGroups.map((g) => ({
      ...g,
      communityIds: g.communityIds.filter((id) => communityMap.has(id)),
    }));

    const assignedIds = new Set(updated.flatMap((g) => g.communityIds));
    const unassigned = communities.filter((c) => !assignedIds.has(c.id));

    if (unassigned.length > 0) {
      unassigned.forEach((comm) => {
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
      communityIds: [],
    }));

    sortedComms.forEach((comm) => {
      let minGroupIdx = 0;
      let minSize = groups[0].communityIds.reduce((sum, cid) => {
        const c = communities.find((co) => co.id === cid);
        return sum + (c ? c.participants : 0);
      }, 0);

      for (let i = 1; i < groups.length; i++) {
        const size = groups[i].communityIds.reduce((sum, cid) => {
          const c = communities.find((co) => co.id === cid);
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
    const updated = reconciledSogGroups.map((g) => {
      const filtered = g.communityIds.filter((id) => id !== communityId);
      if (g.id === targetGroupId) {
        return {
          ...g,
          communityIds: [...filtered, communityId],
        };
      }
      return {
        ...g,
        communityIds: filtered,
      };
    });

    setSogGroups(updated);
    safeStorage.setItem("zeltlager_sog_groups_v1", JSON.stringify(updated));
  };

  const sogStats = React.useMemo(() => {
    if (reconciledSogGroups.length === 0) return null;

    const communityMap = new Map(communities.map((c) => [c.id, c]));
    const sizes = reconciledSogGroups.map((g) => g.communityIds.reduce((sum, id) => sum + (communityMap.get(id)?.participants || 0), 0));

    const totalParticipants = sizes.reduce((a, b) => a + b, 0);
    const avgSize = Number((totalParticipants / reconciledSogGroups.length).toFixed(1));
    const minSize = Math.min(...sizes);
    const maxSize = Math.max(...sizes);
    const maxDiff = maxSize - minSize;

    return { totalParticipants, avgSize, minSize, maxSize, maxDiff };
  }, [reconciledSogGroups, communities]);

  const handleCopySogWhatsApp = () => {
    if (reconciledSogGroups.length === 0) return;

    let text = `🏆 *Gruppeneinteilung Spiel ohne Grenzen* 🏆\n\n`;

    reconciledSogGroups.forEach((g) => {
      const commMap = new Map(communities.map((c) => [c.id, c]));
      const gSize = g.communityIds.reduce((sum, cid) => sum + (commMap.get(cid)?.participants || 0), 0);

      text += `*${g.name}* (Gesamtstärke: ${gSize} TN):\n`;
      g.communityIds.forEach((cid) => {
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

  return (
    <div className="space-y-6">
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
          `,
        }}
      />

      {/* Personal Highlight Banner if current user is assigned to a station */}
      {myAssignedStations.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border-2 border-emerald-500 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold text-2xl shrink-0">⭐</div>
            <div>
              <div className="text-xs font-extrabold font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>Deine persönliche Station</span>
                {currentUser && (
                  <span>
                    ({currentUser.first_name} {currentUser.last_name})
                  </span>
                )}
              </div>
              <div className="text-base font-extrabold text-white mt-0.5">
                {myAssignedStations.map((st) => `Station ${st.number}: ${st.title} — Ort: ${st.location || "tbd"}`).join(" | ")}
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
              sogActiveSubTab === "groups" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Gruppen</span>
          </button>

          <button
            onClick={() => setSogActiveSubTab("stations")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition cursor-pointer ${
              sogActiveSubTab === "stations" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Stationen ({sogStations.length})</span>
          </button>

          <button
            onClick={() => setSogActiveSubTab("laufplan")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition cursor-pointer ${
              sogActiveSubTab === "laufplan" ? "bg-emerald-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Rotationsplan</span>
          </button>

          <button
            onClick={() => setSogActiveSubTab("print_cards")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition cursor-pointer ${
              sogActiveSubTab === "print_cards" ? "bg-cyan-500 text-slate-950 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Stationskarten (A4)</span>
          </button>

          <button
            onClick={() => setSogActiveSubTab("print_groups")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider font-mono rounded-lg transition cursor-pointer ${
              sogActiveSubTab === "print_groups" ? "bg-slate-800 text-white border border-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Gruppen-Druck</span>
          </button>
        </div>
      </div>

      {sogActiveSubTab === "groups" && (
        <ProgramSogGroups
          sogNumTeams={sogNumTeams}
          setSogNumTeams={setSogNumTeams}
          reconciledSogGroups={reconciledSogGroups}
          communities={communities}
          sogStats={sogStats}
          sogCopySuccess={sogCopySuccess}
          onCopyWhatsApp={handleCopySogWhatsApp}
          onGenerateGroups={handleGenerateSogGroups}
          onMoveCommunity={handleMoveSogCommunity}
        />
      )}

      {sogActiveSubTab === "stations" && <ProgramSogStations sogStations={sogStations} users={users} currentUserId={currentUserId} onUpdateStations={updateSogStations} />}

      {sogActiveSubTab === "laufplan" && (
        <ProgramSogLaufplan
          sogStations={sogStations}
          reconciledSogGroups={reconciledSogGroups}
          currentUserId={currentUserId}
          sogStartTime={sogStartTime}
          setSogStartTime={setSogStartTime}
          sogRoundDuration={sogRoundDuration}
          setSogRoundDuration={setSogRoundDuration}
          sogBreakDuration={sogBreakDuration}
          setSogBreakDuration={setSogBreakDuration}
        />
      )}

      {sogActiveSubTab === "print_cards" && (
        <ProgramSogPrintCards
          sogStations={sogStations}
          users={users}
          reconciledSogGroups={reconciledSogGroups}
          sogStartTime={sogStartTime}
          sogRoundDuration={sogRoundDuration}
          sogBreakDuration={sogBreakDuration}
        />
      )}

      {sogActiveSubTab === "print_groups" && <ProgramSogPrintGroups reconciledSogGroups={reconciledSogGroups} communities={communities} />}
    </div>
  );
}
