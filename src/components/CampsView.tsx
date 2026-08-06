import React from "react";
import { Compass, Calendar, CheckCircle2, Layers, AlertCircle, Database, RefreshCw, TrendingUp, RotateCcw, Download, Eraser, AlertTriangle, History } from "lucide-react";
import { Camp } from "../types";
import { formatDateGerman, addDays } from "../utils";
import { useUndoableDelete } from "../hooks/useUndoableDelete";
import CreateCampForm from "./camps/CreateCampForm";
import ResetModal from "./camps/ResetModal";
import ConfirmDialog from "./ConfirmDialog";
import UndoToast from "./UndoToast";

interface CampsViewProps {
  camps: Camp[];
  activeCampId: string;
  onSetActiveCamp: (campId: string) => Promise<void>;
  onCreateCamp: (year: number, copyFromCampId?: string) => Promise<void>;
  onResetDatabase?: (year?: number, mode?: "full" | "shifts_only" | "clear_assignments") => Promise<string>;
  onRestoreLastReset?: () => Promise<string>;
}

export default function CampsView({ camps, activeCampId, onSetActiveCamp, onCreateCamp, onResetDatabase, onRestoreLastReset }: CampsViewProps) {
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<{ date: string; reads: number; writes: number; deletes: number; apiHits: number }>({
    date: new Date().toISOString().split("T")[0],
    reads: 0,
    writes: 0,
    deletes: 0,
    apiHits: 0
  });
  const [loadingStats, setLoadingStats] = React.useState(false);

  // Datum/Uhrzeit des letzten Code-Commits (NICHT der letzten Datenänderung),
  // zur Build-Zeit von vite.config.ts injiziert.
  const lastCommitDate = new Date(__LAST_COMMIT_DATE__);
  const buildStampLabel = isNaN(lastCommitDate.getTime())
    ? "unbekannt"
    : `${lastCommitDate.toLocaleDateString("de-DE")}, ${lastCommitDate.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;

  // Reset modal state
  const [resetModalOpen, setResetModalOpen] = React.useState(false);
  const [resetMode, setResetMode] = React.useState<"full" | "shifts_only" | "clear_assignments">("shifts_only");
  const [resetYear, setResetYear] = React.useState<number>(2026);

  // Ein Lagerjahr-Reset ist die folgenreichste Aktion der App - deshalb
  // zusätzlich zum Bestätigungsmodal noch der gleiche 6-Sekunden-Rückgängig-
  // Vorlauf wie bei anderen Löschungen, PLUS eine echte serverseitige
  // Sicherung (siehe backupStatus unten), die auch dann noch hilft, wenn
  // der Fehler erst später auffällt statt in den ersten 6 Sekunden.
  const { scheduleDelete, undo, activeToast } = useUndoableDelete();
  const [backupStatus, setBackupStatus] = React.useState<{ available: boolean; timestamp: string | null }>({
    available: false,
    timestamp: null
  });
  const [restoreConfirmOpen, setRestoreConfirmOpen] = React.useState(false);
  const [restoring, setRestoring] = React.useState(false);

  const fetchBackupStatus = async () => {
    try {
      const res = await fetch("/api/seed/backup-status");
      if (res.ok) {
        setBackupStatus(await res.json());
      }
    } catch (err) {
      console.warn("Failed to fetch backup status:", err);
    }
  };

  React.useEffect(() => {
    fetchBackupStatus();
  }, []);

  const resetModeLabel: Record<"full" | "shifts_only" | "clear_assignments", string> = {
    full: "Werks-Reset",
    shifts_only: "Muster-Schichten laden",
    clear_assignments: "Einteilungen leeren"
  };

  const openResetModal = (mode: "full" | "shifts_only" | "clear_assignments") => {
    setResetMode(mode);
    setResetModalOpen(true);
  };

  const handleExecuteReset = () => {
    if (!onResetDatabase) return;
    setResetModalOpen(false);
    setError(null);
    setSuccess(null);
    scheduleDelete(`camp-reset-${resetMode}`, resetModeLabel[resetMode], async () => {
      try {
        const msg = await onResetDatabase(resetYear, resetMode);
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 5000);
        fetchBackupStatus();
      } catch (err: any) {
        setError(err?.message || "Fehler beim Zurücksetzen der Daten.");
      }
    });
  };

  const handleConfirmRestore = async () => {
    if (!onRestoreLastReset) return;
    setRestoreConfirmOpen(false);
    setRestoring(true);
    setError(null);
    setSuccess(null);
    try {
      const msg = await onRestoreLastReset();
      setSuccess(msg);
      setTimeout(() => setSuccess(null), 5000);
      fetchBackupStatus();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Wiederherstellen des vorherigen Standes.");
    } finally {
      setRestoring(false);
    }
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn("Failed to fetch stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, []);

  const activeCamp = camps.find((c) => c.id === activeCampId) || camps[0];

  const handleSetActive = async (campId: string) => {
    setError(null);
    setSuccess(null);
    try {
      await onSetActiveCamp(campId);
      setSuccess("Aktives Pfingstlager erfolgreich gewechselt!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err?.message || "Fehler beim Wechseln des Lagers.");
    }
  };

  const configuredYears = camps.map((c) => c.year);
  const availableYears = Array.from({ length: 10 }, (_, i) => 2026 + i).filter(
    (y) => !configuredYears.includes(y)
  );

  return (
    <div className="space-y-6" id="camps-view-container">
      {/* Intro header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Compass className="h-5 w-5 text-emerald-400" />
            Lager verwalten
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Bestimme das aktuelle Jahr deines Zeltlagers. Schichten und Einteilungen werden jahresspezifisch abgespeichert.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-350 p-4 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl flex items-center gap-2.5 text-xs animate-fade-in">
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Active Camp Details Card */}
        <div className="col-span-1 lg:col-span-7 space-y-6">
          <div className="bg-slate-900/60 border border-emerald-500/10 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
              Aktuelles Pfingstlager
            </h3>

            {activeCamp ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Calendar className="h-6 w-6 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white font-display">
                      {activeCamp.title}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Zeitraum: {formatDateGerman(activeCamp.start_date)} bis {formatDateGerman(activeCamp.end_date)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[9px] font-serif font-bold text-slate-500 uppercase tracking-widest">
                      Tag 1 (Sa.)
                    </p>
                    <p className="text-xs font-mono text-white mt-1">
                      {formatDateGerman(activeCamp.start_date)}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[9px] font-serif font-bold text-slate-500 uppercase tracking-widest">
                      Tag 2 (So.)
                    </p>
                    <p className="text-xs font-mono text-white mt-1">
                      {formatDateGerman(addDays(activeCamp.start_date, 1))}
                    </p>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-[9px] font-serif font-bold text-slate-500 uppercase tracking-widest">
                      Tag 3 (Mo.)
                    </p>
                    <p className="text-xs font-mono text-white mt-1">
                      {formatDateGerman(activeCamp.end_date)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Kein aktives Lager geladen.</p>
            )}
          </div>

          {/* Quick toggle camp */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                Zurückliegende Jahre einsehen
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Wähle ein anderes Jahr aus, um den Dienstplan und die Einteilungen dieses Jahres anzuzeigen.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={activeCampId}
                onChange={(e) => handleSetActive(e.target.value)}
                className="flex-1 text-xs p-2.5 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-300 bg-slate-950 font-medium"
              >
                {camps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} {c.id === activeCampId ? "(Aktiv)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Daily Query Stats */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="h-4 w-4" />
                  Ressourcennutzung & Abfragen (Heute)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  In-Memory Caching & Cloud-Synchronisierung reduzieren Lese-/Schreibzugriffe.
                </p>
              </div>
              <button
                onClick={fetchStats}
                disabled={loadingStats}
                className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg transition disabled:opacity-50 cursor-pointer"
                title="Statistiken aktualisieren"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingStats ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">API Abfragen</p>
                <p className="text-lg font-bold font-mono text-white mt-1">{stats.apiHits}</p>
                <p className="text-[8px] text-slate-500 mt-0.5">Client Requests</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <p className="text-[9px] font-mono text-emerald-500/80 uppercase tracking-wider">Firestore Reads</p>
                <p className="text-lg font-bold font-mono text-emerald-400 mt-1">{stats.reads}</p>
                <p className="text-[8px] text-slate-500 mt-0.5">Cloud-Abrufe</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <p className="text-[9px] font-mono text-amber-500/85 uppercase tracking-wider">Firestore Writes</p>
                <p className="text-lg font-bold font-mono text-amber-400 mt-1">{stats.writes}</p>
                <p className="text-[8px] text-slate-500 mt-0.5">Cloud-Schreibvorgänge</p>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                <p className="text-[9px] font-mono text-rose-500/80 uppercase tracking-wider">Firestore Deletes</p>
                <p className="text-lg font-bold font-mono text-rose-400 mt-1">{stats.deletes}</p>
                <p className="text-[8px] text-slate-500 mt-0.5">Löschungen</p>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-850 pt-2 flex justify-between items-center">
              <span>Aktuelles Datum auf dem Server: <b className="text-slate-400 font-mono">{stats.date || '-'}</b></span>
              <span className="text-emerald-500 flex items-center gap-1 font-mono">
                <TrendingUp className="h-3 w-3" />
                98% Quotenersparnis durch Cache
              </span>
            </div>

            <div className="text-[10px] text-slate-500 flex justify-between items-center" title={`Commit ${__LAST_COMMIT_HASH__}`}>
              <span>Programm-Stand (letzte Code-Änderung):</span>
              <span className="text-slate-400 font-mono">{buildStampLabel}</span>
            </div>
          </div>
        </div>

        {/* Create camp card */}
        <div className="col-span-1 lg:col-span-5">
          <CreateCampForm
            camps={camps}
            onCreateCamp={onCreateCamp}
            availableYears={availableYears}
            onSubmitSuccess={(msg) => setSuccess(msg)}
            onSubmitError={(msg) => setError(msg)}
          />
        </div>

        {/* 🔄 Voreingestellte Schichten, Testmodus & Reset */}
        <div className="col-span-1 lg:col-span-12 bg-slate-900/60 border border-emerald-500/10 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Voreingestellte Muster-Schichten & Daten-Reset (Testmodus)
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 max-w-2xl">
                Lade die voreingestellten Muster-Schichten für Pfingsten 2026 oder 2027 neu, leere nach einem Live-Testlauf alle eingetragenen Helfer oder erstelle eine Sicherungskopie.
              </p>
            </div>

            <a
              href="/api/backup"
              download="pfingsten-app-backup.json"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/30 text-slate-200 text-xs font-mono font-bold rounded-xl transition cursor-pointer shrink-0 shadow-md"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>Backup herunterladen (.json)</span>
            </a>
          </div>

          {backupStatus.available && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cyan-950/25 border border-cyan-500/25 rounded-xl px-4 py-3">
              <div className="flex items-start gap-2.5">
                <History className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-cyan-200 leading-relaxed">
                  Automatische Sicherung vom{" "}
                  <b className="font-mono">
                    {backupStatus.timestamp &&
                      new Date(backupStatus.timestamp).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
                  </b>{" "}
                  verfügbar (vor dem letzten Reset).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRestoreConfirmOpen(true)}
                disabled={restoring}
                className="shrink-0 px-3.5 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Letzten Stand wiederherstellen
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 hover:border-slate-800 transition flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold">
                  <Layers className="h-4 w-4" />
                  <span>Muster-Schichten laden</span>
                </div>
                <p className="text-xs text-slate-300 font-semibold">Standard-Dienste & Schichten einspielen</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Stellt alle voreingestellten Schichten und Dienste (Bühne, Imbiss, Nachtwache, Spiel ohne Grenzen etc.) für Pfingsten 2026 oder 2027 neu her.
                </p>
              </div>

              <button
                type="button"
                onClick={() => openResetModal("shifts_only")}
                className="w-full py-2.5 px-3 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Muster-Schichten laden...</span>
              </button>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 hover:border-slate-800 transition flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
                  <Eraser className="h-4 w-4" />
                  <span>Helfer-Zuweisungen leeren</span>
                </div>
                <p className="text-xs text-slate-300 font-semibold">Test-Einteilungen zurücksetzen</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Entfernt alle Helfer aus allen Schichten und Spielen. Der Dienstplan und alle angelegten Schichten/Aufgaben bleiben vollständig erhalten. Ideal nach dem Live-Testen!
                </p>
              </div>

              <button
                type="button"
                onClick={() => openResetModal("clear_assignments")}
                className="w-full py-2.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/5"
              >
                <Eraser className="h-3.5 w-3.5" />
                <span>Einteilungen leeren...</span>
              </button>
            </div>

            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 hover:border-slate-800 transition flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold">
                  <RefreshCw className="h-4 w-4" />
                  <span>Vollständiger Werks-Reset</span>
                </div>
                <p className="text-xs text-slate-300 font-semibold">Komplett auf Pfingst-Muster zurücksetzen</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Setzt die gesamte Datenbank (Benutzer, Dienste, Schichten, Zuweisungen) auf den originalen Werkszustand für das gewählte Pfingstjahr zurück.
                </p>
              </div>

              <button
                type="button"
                onClick={() => openResetModal("full")}
                className="w-full py-2.5 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/5"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Werks-Reset...</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ResetModal
        isOpen={resetModalOpen}
        mode={resetMode}
        year={resetYear}
        onYearChange={setResetYear}
        onConfirm={handleExecuteReset}
        onClose={() => setResetModalOpen(false)}
      />

      <ConfirmDialog
        isOpen={restoreConfirmOpen}
        variant="danger"
        title="Letzten Stand wiederherstellen?"
        message={
          backupStatus.timestamp
            ? `Der Stand von ${new Date(backupStatus.timestamp).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })} wird wiederhergestellt. Alle Änderungen seitdem gehen dabei verloren.`
            : "Der zuletzt gesicherte Stand wird wiederhergestellt."
        }
        confirmLabel="Ja, wiederherstellen"
        onConfirm={handleConfirmRestore}
        onCancel={() => setRestoreConfirmOpen(false)}
      />

      <UndoToast toast={activeToast} onUndo={undo} />
    </div>
  );
}
