import React from "react";
import { Music, X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { TalentAct } from "../types";
import { extractSpotifyTrackId } from "../utils";
import { motion } from "motion/react";

interface ProgramTalentShowPlaylistProps {
  acts: TalentAct[];
  onClose: () => void;
}

/**
 * Login-freie Wiedergabeliste für die Talentshow: zeigt die Songs aller
 * Beiträge in Show-Reihenfolge nacheinander per eingebettetem Spotify-
 * Player (keine Spotify-API/Client-ID nötig). Wer die Songs dauerhaft
 * speichern will, tut das selbst über "In Spotify öffnen".
 */
export default function ProgramTalentShowPlaylist({ acts, onClose }: ProgramTalentShowPlaylistProps) {
  const playableActs = React.useMemo(
    () => acts.map((act) => ({ act, trackId: extractSpotifyTrackId(act.spotify_link || "") })).filter((entry) => entry.trackId),
    [acts]
  );
  const skippedCount = acts.length - playableActs.length;

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const current = playableActs[currentIndex];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Music className="h-5 w-5 text-emerald-400" />
            <span>Wiedergabeliste</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {playableActs.length === 0 ? (
          <div className="p-8 text-center">
            <Music className="h-8 w-8 text-slate-500 mx-auto opacity-40 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Noch keine Spotify-Links hinterlegt</p>
            <p className="text-xs text-slate-500 mt-1">Trage bei den Beiträgen einen Spotify-Song-Link ein, um sie hier abzuspielen.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <span className="text-xs font-mono text-slate-400">
                Song {currentIndex + 1} / {playableActs.length}
              </span>
              <p className="text-sm font-bold text-white mt-0.5">{current.act.talents_names}</p>
              <p className="text-xs text-slate-400">{current.act.community_name}</p>
            </div>

            <iframe
              key={current.trackId}
              title={`Spotify-Player: ${current.act.talents_names}`}
              src={`https://open.spotify.com/embed/track/${current.trackId}?utm_source=generator`}
              width="100%"
              height="152"
              style={{ borderRadius: "12px", border: "none" }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />

            <a
              href={`https://open.spotify.com/track/${current.trackId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <span>In Spotify öffnen (dort selbst speicherbar)</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 font-bold rounded-xl text-xs uppercase cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Vorheriger</span>
              </button>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(playableActs.length - 1, i + 1))}
                disabled={currentIndex === playableActs.length - 1}
                className="flex items-center gap-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 disabled:opacity-30 font-bold rounded-xl text-xs uppercase cursor-pointer"
              >
                <span>Nächster</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {skippedCount > 0 && (
              <p className="text-[10px] text-slate-500 text-center">
                {skippedCount} von {acts.length} Beiträgen {skippedCount === 1 ? "hat" : "haben"} keinen Spotify-Link hinterlegt und {skippedCount === 1 ? "wird" : "werden"} übersprungen.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
