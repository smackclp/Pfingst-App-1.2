import React from "react";
import { Printer, ArrowLeft, Copy, AlertCircle, FileText, CheckCircle2, Download } from "lucide-react";
import { User, Service, Shift, ShiftAssignment, Camp } from "../types";
import { formatDateGerman, getDayNameShort } from "../utils";
import { usePdfExport } from "../hooks/usePdfExport";
import PrintScheduleTable from "./PrintScheduleTable";

interface PrintViewProps {
  shifts: Shift[];
  services: Service[];
  users: User[];
  assignments: ShiftAssignment[];
  activeCamp?: Camp;
  onBackToDashboard: () => void;
}

export default function PrintView({ shifts, services, users, assignments, activeCamp, onBackToDashboard }: PrintViewProps) {
  const [copySuccess, setCopySuccess] = React.useState<string | null>(null);
  const { pdfGenerating, downloadPdf } = usePdfExport(activeCamp);
  const isInIframe = React.useMemo(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  const handlePrint = () => {
    try {
      window.focus();
      window.print();
    } catch (e) {
      console.error("Print execution failed:", e);
      alert("Der Druck konnte nicht automatisch gestartet werden. Nutzen Sie Strg+P (Cmd+P) oder kopieren Sie die Tabelle.");
    }
  };

  // Group and sort shifts chronologically
  const sortedShifts = React.useMemo(() => {
    return [...shifts].sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.start_time.localeCompare(b.start_time);
    });
  }, [shifts]);

  // Copy structured list to Excel / Word (Tab Separated Values)
  const copyExcelFormat = () => {
    try {
      let content = "Datum & Zeit\tDienst / Aufgabe\tOrt\tBenötigte Personen\tEingeteilte Helfer*innen\tStatus\n";

      sortedShifts.forEach((shift) => {
        const service = services.find((s) => s.id === shift.service_id);
        const shiftAssignments = assignments.filter((a) => a.shift_id === shift.id);
        const targetMin = shift.min_persons !== undefined ? shift.min_persons : service?.min_persons || 1;
        const targetMax = shift.max_persons !== undefined ? shift.max_persons : service?.max_persons || 3;

        const activeAssignments = shiftAssignments.filter((a) => a.status !== "declined");
        const helperNames = activeAssignments
          .map((a) => {
            const helper = users.find((u) => u.id === a.user_id);
            const name = helper?.display_name || "Unbekannt";
            const statusChar = a.status === "accepted" ? "✔️" : a.status === "maybe" ? "⏳" : "💤";
            return `${name} (${statusChar})`;
          })
          .join(", ");

        const dateStr = `${getDayNameShort(shift.date)}, ${formatDateGerman(shift.date)} (${shift.start_time} - ${shift.end_time} Uhr)`;
        const serviceTitle = service?.title || "Generischer Dienst";
        const location = service?.location || "Lagergelände";
        const minMaxStr = `Min: ${targetMin} / Max: ${targetMax}`;
        const staffedStatus = activeAssignments.length >= targetMin ? "Besetzt" : "Unterbesetzt";

        content += `${dateStr}\t${serviceTitle}\t${location}\t${minMaxStr}\t${helperNames}\t${staffedStatus}\n`;
      });

      navigator.clipboard.writeText(content);
      setCopySuccess("excel");
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  // Copy plain text summary for WhatsApp or Email
  const copyPlainSummary = () => {
    try {
      let content = `📅 DIENSTPLAN • ${activeCamp?.title || "PFINGSTLAGER"} ${activeCamp?.year || "2026"}\n`;
      content += `Erstellt am ${new Date().toLocaleDateString("de-DE")}\n`;
      content += `==============================================\n\n`;

      let lastDate = "";
      sortedShifts.forEach((shift) => {
        if (shift.date !== lastDate) {
          content += `\n📅 ${getDayNameShort(shift.date)}, ${formatDateGerman(shift.date)}:\n`;
          lastDate = shift.date;
        }

        const service = services.find((s) => s.id === shift.service_id);
        const shiftAssignments = assignments.filter((a) => a.shift_id === shift.id);
        const activeAssignments = shiftAssignments.filter((a) => a.status !== "declined");
        const targetMin = shift.min_persons !== undefined ? shift.min_persons : service?.min_persons || 1;

        const helperNames =
          activeAssignments
            .map((a) => {
              const helper = users.find((u) => u.id === a.user_id);
              const statusText = a.status === "accepted" ? "bestätigt" : a.status === "maybe" ? "unsicher" : "offen";
              return `${helper?.display_name || "Unbekannt"} (${statusText})`;
            })
            .join(", ") || "Keine";

        content += `  • ${shift.start_time} - ${shift.end_time} Uhr: ${service?.title} (${service?.location}) [Soll: ${targetMin}]\n`;
        content += `    Helfer*innen: ${helperNames}\n`;
      });

      navigator.clipboard.writeText(content);
      setCopySuccess("plain");
      setTimeout(() => setCopySuccess(null), 3000);
    } catch (err) {
      console.error("Plain copy failed:", err);
    }
  };

  return (
    <div className="space-y-6 pb-20 print:p-0 print:space-y-2" id="print-view-container">
      {/* Complete print overrides targeting layout colors and contrast */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          /* Hide EVERYTHING inside standard frame layout */
          body, html, #root, .min-h-screen {
            background-color: white !important;
            background: white !important;
            color: black !important;
          }
          /* Hide navigation panels and any sibling elements */
          header, nav, footer, aside, button, .print\\:hidden, #override-confirm-dialog {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
          }
          /* Setup master print layout container */
          #print-view-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
          .print-canvas-box {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
          }
          /* Strip dark tailwind classes on print */
          .bg-slate-900, .bg-slate-950, .bg-slate-900\\/85, .bg-slate-950\\/40, .bg-slate-950\\/50, .bg-slate-50 {
            background-color: white !important;
            background: white !important;
            color: black !important;
          }
          .border, .border-slate-300, .border-slate-800 {
            border-color: #333333 !important;
          }
          td, th {
            border-color: #333333 !important;
            color: black !important;
          }
          span, p, h1, h2, h3, h4, strong {
            color: black !important;
          }
          @page {
            margin: 1.0cm !important;
            size: portrait;
          }
        }
      `,
        }}
      />

      {/* Frame / Iframe warning banner */}
      {isInIframe && (
        <div className="bg-amber-955 bg-amber-950/40 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 print:hidden">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed font-sans">
            <p className="font-extrabold text-amber-300">💡 Drucken im Vorschau-Modus (Iframe)</p>
            <p className="mt-0.5">Browser blockieren den PDF-Druck aus Sicherheitsgründen oft innerhalb von Vorschau-Iframes.</p>
            <p className="mt-2 text-slate-300">
              <span className="font-bold text-white">Lösung:</span> Klicken Sie unten auf <span className="font-semibold text-white">"Excel & Word Form kopieren"</span> für eine perfekte
              Formatierung in Ihren Office-Programmen, oder nutzen Sie die Tastenkombination{" "}
              <kbd className="bg-slate-850 px-1 border border-slate-705 rounded text-white font-mono">Strg + P</kbd> /{" "}
              <kbd className="bg-slate-850 px-1 border border-slate-705 rounded text-white font-mono">Cmd + P</kbd>.
            </p>
          </div>
        </div>
      )}

      {/* On-Screen Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-6 rounded-2xl border border-emerald-500/15 shadow-xl shadow-black/30 print:hidden">
        <div>
          <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center space-x-2">
            <span>📋</span>
            <span>Dienstplan-Export & Druckcenter</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-sans">Exportieren oder drucken Sie den aktuellen Dienstplan. Optimiert für Aushänge am schwarzen Brett.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={onBackToDashboard}
            className="px-3 py-2 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Zurück</span>
          </button>

          <button
            onClick={copyExcelFormat}
            className="px-3 py-2 bg-slate-950/80 hover:bg-slate-800 border border-emerald-500/20 text-emerald-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer font-mono"
            title="Kopiert Tabelle für Excel oder Word"
          >
            {copySuccess === "excel" ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copySuccess === "excel" ? "Tabelle Kopiert!" : "Excel/Word Form"}</span>
          </button>

          <button
            onClick={copyPlainSummary}
            className="px-3 py-2 bg-slate-950/80 hover:bg-slate-800 border border-cyan-500/20 text-cyan-400 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer font-mono"
            title="Kopiert unformatierten Text z.B. für WhatsApp"
          >
            {copySuccess === "plain" ? <CheckCircle2 className="h-4 w-4 text-cyan-400" /> : <FileText className="h-4 w-4" />}
            <span>{copySuccess === "plain" ? "Text Kopiert!" : "Text (WhatsApp/Email)"}</span>
          </button>

          <button
            onClick={downloadPdf}
            disabled={pdfGenerating}
            className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg cursor-pointer ${
              pdfGenerating ? "bg-slate-700/80 cursor-not-allowed border border-slate-600/40" : "bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/20 shadow-cyan-600/15"
            }`}
            title="Dienstplan direkt als PDF-Datei herunterladen"
          >
            <Download className={`h-4 w-4 ${pdfGenerating ? "animate-bounce" : ""}`} />
            <span>{pdfGenerating ? "PDF wird generiert..." : "PDF Herunterladen"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/15 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Jetzt Drucken</span>
          </button>
        </div>
      </div>

      {/* Toner-Saving Print Sheet Canvas */}
      <PrintScheduleTable sortedShifts={sortedShifts} services={services} users={users} assignments={assignments} activeCamp={activeCamp} />
    </div>
  );
}
