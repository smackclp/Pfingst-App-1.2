import React from "react";
import { Compass, ShieldCheck, ChevronDown } from "lucide-react";
import { fetchLoginDirectory } from "../lib/apiAuth";

interface LoginScreenProps {
  onLogin: (userId: string, pin: string) => Promise<void>;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [directory, setDirectory] = React.useState<{ id: string; display_name: string }[]>([]);
  const [loadingDirectory, setLoadingDirectory] = React.useState(true);
  const [userId, setUserId] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetchLoginDirectory()
      .then(setDirectory)
      .catch(() => setError("Namensliste konnte nicht geladen werden. Prüfe deine Internetverbindung."))
      .finally(() => setLoadingDirectory(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !pin) {
      setError("Bitte wähle deinen Namen und gib deine PIN ein.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onLogin(userId, pin);
    } catch (err: any) {
      setError(err.message || "Anmeldung fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-slate-900 border border-emerald-500/20 rounded-2xl shadow-2xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/25">
            <Compass className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-base font-bold font-display text-white">Pfingstlager Dienstplan</h1>
            <p className="text-[11px] text-slate-400">Bitte melde dich an</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">
              Dein Name
            </label>
            <div className="relative">
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loadingDirectory}
                className="w-full text-sm p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 hover:border-slate-700 outline-none transition text-white appearance-none pr-9"
              >
                <option value="">{loadingDirectory ? "Lade Namen…" : "Bitte wählen…"}</option>
                {directory.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.display_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider font-mono">
              PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="4-stellige PIN"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError("");
              }}
              className="w-full text-sm p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-emerald-500 hover:border-slate-700 outline-none transition text-white font-mono tracking-widest"
            />
            <p className="text-[10px] text-slate-500">
              Erstanmeldung? Deine Bereichsleitung hat dir die Start-PIN mitgeteilt.
            </p>
          </div>

          {error && (
            <p className="text-[11px] text-rose-400 font-semibold bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || loadingDirectory}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/15 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            {submitting ? "Melde an…" : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
