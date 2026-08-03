import React from "react";
import { PlusCircle, CheckCircle2 } from "lucide-react";
import { Camp } from "../../types";
import { PFINGSTEN_DATES, formatDateGerman } from "../../utils";

interface CreateCampFormProps {
  camps: Camp[];
  onCreateCamp: (year: number, copyFromCampId?: string) => Promise<void>;
  availableYears: number[];
  onSubmitSuccess?: (msg: string) => void;
  onSubmitError?: (msg: string) => void;
}

export default function CreateCampForm({
  camps,
  onCreateCamp,
  availableYears,
  onSubmitSuccess,
  onSubmitError,
}: CreateCampFormProps) {
  const [selectedYear, setSelectedYear] = React.useState<number>(2027);
  const [copyFromId, setCopyFromId] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears, selectedYear]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      await onCreateCamp(selectedYear, copyFromId || undefined);
      if (onSubmitSuccess) {
        onSubmitSuccess(`Erfolgreich konfiguriert: Pfingstlager ${selectedYear} wurde erstellt und als aktiv markiert.`);
      }
      setCopyFromId("");
    } catch (err: any) {
      if (onSubmitError) {
        onSubmitError(err?.message || "Fehler beim Erstellen des Lagers.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-emerald-500/10 rounded-2xl p-6 shadow-xl space-y-4">
      <div>
        <h3 className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
          Neues Pfingstlager anlegen
        </h3>
        <p className="text-[11px] text-slate-400 mt-1">
          Lege ein neues Zeltlager an. Das System kennt die gesetzlichen Pfingsttermine bis 2035 und berechnet die Wochenenddaten automatisch.
        </p>
      </div>

      {availableYears.length > 0 ? (
        <form onSubmit={handleCreate} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">Ziel-Jahr auswählen</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full text-xs p-2.5 border border-slate-850 rounded-xl focus:outline-none bg-slate-950 text-white font-medium"
            >
              {availableYears.map((y) => {
                const dates = PFINGSTEN_DATES[y];
                return (
                  <option key={y} value={y}>
                    {y} ({formatDateGerman(dates.start_date)} - {formatDateGerman(dates.end_date)})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase">
              Dienste und Schichten kopieren aus:
            </label>
            <select
              value={copyFromId}
              onChange={(e) => setCopyFromId(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-850 rounded-xl focus:outline-none bg-slate-950 text-white font-medium"
            >
              <option value="">-- Keine Kopie (Leerer Dienstplan) --</option>
              {camps
                .sort((a, b) => b.year - a.year)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    Dienste von {c.title} übernehmen
                  </option>
                ))}
            </select>
            <p className="text-[9px] text-slate-500 mt-1">
              Kopiert die reinen Schichten chronologisch relativ auf die neuen Wochenenddaten. Helfer*innen-Zuweisungen werden nicht mitübertragen (ideal zum Neuplanen).
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white text-xs font-mono font-bold rounded-xl transition shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            <PlusCircle className="h-4 w-4" />
            <span>{submitting ? "Erstelle..." : "Lager anlegen & aktivieren"}</span>
          </button>
        </form>
      ) : (
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2 text-slate-400 text-xs font-sans">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>Alle Jahre bis 2035 sind bereits fertig konfiguriert!</span>
        </div>
      )}
    </div>
  );
}
