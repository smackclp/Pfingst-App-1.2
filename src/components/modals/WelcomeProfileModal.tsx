import React from "react";
import { Search, Check } from "lucide-react";
import { User } from "../../types";
import { safeStorage } from "../../utils";
import { STORAGE_KEYS } from "../../constants";

interface WelcomeProfileModalProps {
  users: User[];
  currentUserId: string;
  activeCampId: string;
  onSelectUser: (userId: string) => void;
  onClose: () => void;
}

export default function WelcomeProfileModal({
  users,
  currentUserId,
  activeCampId,
  onSelectUser,
  onClose,
}: WelcomeProfileModalProps) {
  const [welcomeSearchQuery, setWelcomeSearchQuery] = React.useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80 animate-fade-in" id="welcome-profile-overlay">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Banner decor */}
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 shrink-0" />
        
        <div className="p-6 md:p-8 overflow-y-auto flex-1 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] text-emerald-400 font-mono font-extrabold tracking-wider uppercase inline-block">
              CAMP ONBOARDING
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white tracking-tight">
              Moin! Wer bist du? 🏕️
            </h2>
            <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
              Wähle dein Helfer-Profil aus. Dadurch siehst du sofort deine Schichten, Tauschanfragen und kannst direkt Schichten beanspruchen oder freigeben.
            </p>
          </div>

          {/* Search filter */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Suche nach deinem Namen (z.B. Maria, Jonas)..."
              value={welcomeSearchQuery}
              onChange={(e) => setWelcomeSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 text-white rounded-xl py-3 pl-11 pr-4 text-xs font-sans placeholder-slate-500 focus:outline-none transition-all shadow-inner"
            />
            {welcomeSearchQuery && (
              <button
                onClick={() => setWelcomeSearchQuery("")}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 text-xs font-mono font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Grid of Users */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 bg-slate-950/40 rounded-2xl border border-slate-800/40">
            {users && users.length > 0 ? (
              users
                .filter((u) => {
                  if (!u.active) return false;
                  if (!welcomeSearchQuery) return true;
                  const search = welcomeSearchQuery.toLowerCase();
                  return (
                    u.display_name.toLowerCase().includes(search) ||
                    `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(search)
                  );
                })
                .map((u) => {
                  const isSelected = currentUserId === u.id;
                  return (
                    <button
                      key={`welcome-user-${u.id}`}
                      onClick={() => {
                        onSelectUser(u.id);
                        safeStorage.setItem(STORAGE_KEYS.WELCOME_CHECKED, "true");
                        onClose();
                      }}
                      className={`p-3.5 rounded-xl border text-left flex items-center space-x-3 transition-all duration-150 relative cursor-pointer group ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/40 text-white shadow-md shadow-emerald-500/5"
                          : "bg-slate-900/50 border-slate-800/80 text-slate-300 hover:border-slate-700/80 hover:bg-slate-850"
                      }`}
                    >
                      {/* Circle Avatar */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isSelected ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400 group-hover:bg-slate-750"
                      }`}>
                        {u.display_name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold tracking-tight truncate">{u.display_name}</p>
                        <span className="text-[10px] text-slate-500 font-mono capitalize">
                          {u.role === "admin" ? "Camp-Admin 👑" : "Helfer*in 🏕️"}
                        </span>
                      </div>

                      {isSelected && (
                        <div className="absolute right-3.5 top-3.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="h-3 w-3 text-slate-950 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })
            ) : (
              <div className="col-span-full py-8 text-center text-xs text-slate-500 italic">
                Keine aktiven Helferprofile im System gefunden.
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800/40">
            <button
              type="button"
              onClick={() => {
                safeStorage.setItem(STORAGE_KEYS.WELCOME_CHECKED, "true");
                onClose();
              }}
              className="text-slate-400 hover:text-white text-xs font-mono font-medium transition cursor-pointer"
            >
              Als Gast fortfahren (Nur gucken) ➔
            </button>
            
            <span className="text-[10px] text-slate-500 font-mono">
              Lager-ID: <strong className="text-emerald-500/80">{activeCampId || "MOCK"}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
