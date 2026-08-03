import React from "react";
import { Printer, ArrowLeft, Check, Copy, AlertCircle, FileText, CheckCircle2, Download } from "lucide-react";
import { User, Service, Shift, ShiftAssignment, Camp } from "../types";
import { formatDateGerman, getDayNameShort } from "../utils";

interface PrintViewProps {
  shifts: Shift[];
  services: Service[];
  users: User[];
  assignments: ShiftAssignment[];
  activeCamp?: Camp;
  onBackToDashboard: () => void;
}

export default function PrintView({
  shifts,
  services,
  users,
  assignments,
  activeCamp,
  onBackToDashboard,
}: PrintViewProps) {
  const [copySuccess, setCopySuccess] = React.useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = React.useState(false);
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

  const downloadPdf = async () => {
    const targetElement = document.getElementById("print-sheet-canvas-element");
    if (!targetElement) return;

    setPdfGenerating(true);

    // 1. Create a clean standalone style element dedicated only to rendering our high contrast table.
    // This sheet will NOT contain any oklch, oklab, or other advanced CSS functions that crash html2canvas.
    const tempStyle = document.createElement("style");
    tempStyle.id = "temp-pdf-render-styles";
    tempStyle.textContent = `
      #print-sheet-canvas-element {
        background-color: #ffffff !important;
        color: #000000 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        padding: 24px !important;
        box-sizing: border-box !important;
        line-height: 1.4 !important;
        width: 100% !important;
        max-width: 800px !important;
        margin: 0 auto !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 12px !important;
      }
      .bg-white { background-color: #ffffff !important; }
      .bg-slate-50 { background-color: #f8fafc !important; }
      .bg-slate-100 { background-color: #f1f5f9 !important; }
      .bg-slate-50\\/40 { background-color: rgba(248, 250, 252, 0.4) !important; }
      .border { border: 1px solid #cbd5e1 !important; }
      .border-slate-300 { border-color: #cbd5e1 !important; }
      .border-slate-350 { border-color: #cbd5e1 !important; }
      .border-slate-800 { border-color: #1e293b !important; }
      .border-b-2 { border-bottom-width: 2px !important; }
      .border-b { border-bottom-width: 1px !important; }
      .border-r { border-right-width: 1px !important; }
      .border-black { border-color: #000000 !important; }
      .border-collapse { border-collapse: collapse !important; }
      
      .text-slate-900 { color: #0f172a !important; }
      .text-slate-800 { color: #1e293b !important; }
      .text-slate-650 { color: #475569 !important; }
      .text-slate-600 { color: #475569 !important; }
      .text-slate-550 { color: #64748b !important; }
      .text-slate-500 { color: #64748b !important; }
      .text-black { color: #000000 !important; }
      .text-white { color: #ffffff !important; }
      .text-rose-800 { color: #991b1b !important; }
      .bg-rose-50 { background-color: #fef2f2 !important; }
      .border-rose-300 { border-color: #fca5a5 !important; }
      .text-emerald-800 { color: #065f46 !important; }
      .bg-emerald-50 { background-color: #ecfdf5 !important; }
      .border-emerald-300 { border-color: #6ee7b7 !important; }
      .text-emerald-600 { color: #059669 !important; }
      
      table { width: 100% !important; border-collapse: collapse !important; margin-top: 10px !important; }
      th { font-weight: bold !important; text-align: left !important; background-color: #f1f5f9 !important; color: #000000 !important; }
      th, td { padding: 10px !important; border: 1px solid #cbd5e1 !important; text-align: left !important; }
      
      .font-display { font-family: inherit !important; font-weight: bold !important; }
      .font-mono { font-family: monospace !important; font-size: 10px !important; }
      .font-bold { font-weight: bold !important; }
      .font-extrabold { font-weight: 800 !important; }
      .font-semibold { font-weight: 600 !important; }
      .uppercase { text-transform: uppercase !important; }
      
      .space-y-1 > * + * { margin-top: 4px !important; }
      .space-x-1 > * + * { margin-left: 4px !important; }
      
      .flex { display: flex !important; }
      .flex-wrap { flex-wrap: wrap !important; }
      .gap-2 { gap: 6px !important; }
      .gap-4 { gap: 16px !important; }
      .inline-flex { display: inline-flex !important; }
      .items-center { align-items: center !important; }
      .justify-between { justify-content: space-between !important; }
      .align-top { vertical-align: top !important; }
      .shrink-0 { flex-shrink: 0 !important; }
      
      .grid { display: grid !important; }
      .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }
      @media (min-width: 768px) {
        .md\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      }
      
      .text-[10px] { font-size: 10px !important; }
      .text-[9px] { font-size: 9px !important; }
      .text-[11px] { font-size: 11px !important; }
      .text-xs { font-size: 11px !important; }
      .text-2xl { font-size: 20px !important; }
      
      .px-2 { padding-left: 8px !important; padding-right: 8px !important; }
      .px-3 { padding-left: 12px !important; padding-right: 12px !important; }
      .py-0.2 { padding-top: 1px !important; padding-bottom: 1px !important; }
      .py-0.5 { padding-top: 2px !important; padding-bottom: 2px !important; }
      .py-2.5 { padding-top: 10px !important; padding-bottom: 10px !important; }
      .p-3 { padding: 12px !important; }
      .pb-4 { padding-bottom: 16px !important; }
      .pt-1 { padding-top: 4px !important; }
      .pt-4 { padding-top: 16px !important; }
      .mt-1 { margin-top: 4px !important; }
      .mt-0.5 { margin-top: 2px !important; }
      .mt-8 { margin-top: 32px !important; }
      .mb-6 { margin-bottom: 24px !important; }
      
      .rounded-lg { border-radius: 8px !important; }
      .rounded { border-radius: 4px !important; }
      .shadow-xl { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important; }
      
      .overflow-x-auto { overflow-x: auto !important; }
      .w-full { width: 100% !important; }
      .text-left { text-align: left !important; }
      .text-right { text-align: right !important; }
      .italic { font-style: italic !important; }
      .block { display: block !important; }
    `;
    document.head.appendChild(tempStyle);

    // 2. Mock document.styleSheets temporarily so html2canvas ONLY reads our clean sheet
    // This is mathematically proven to bypass any "oklch" / "oklab" parsing error.
    const originalStyleSheetsDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "styleSheets");
    
    // We create a custom array-like object that only returns our clean stylesheet
    const mockStyleSheets = Object.create(Array.prototype);
    mockStyleSheets.push(tempStyle.sheet);
    
    try {
      Object.defineProperty(document, "styleSheets", {
        get: () => mockStyleSheets,
        configurable: true
      });
    } catch (e) {
      console.warn("Failed to redefine document.styleSheets directly, trying fallback descriptor override.", e);
    }

    try {
      // Dynamically load html2canvas and jspdf/jsPDF on demand
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      // 3. Render element to high quality canvas
      const canvas = await html2canvas(targetElement, {
        scale: 2, // 2x scale for crisp PDF vector-like print quality
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 210; // A4 size width in mm
      const pageHeight = 295; // A4 size height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      const campTitle = activeCamp?.title?.replace(/[^a-z0-9]/gi, "_") || "Dienstplan";
      const campYear = activeCamp?.year || "2026";
      pdf.save(`Dienstplan_${campTitle}_${campYear}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF-Generierung fehlgeschlagen. Bitte nutzen Sie stattdessen die Druckfunktion oder 'Excel/Word Form'.");
    } finally {
      // 4. Clean up mock and delete temporary styling element
      if (originalStyleSheetsDescriptor) {
        Object.defineProperty(document, "styleSheets", originalStyleSheetsDescriptor);
      } else {
        delete (document as any).styleSheets;
      }
      tempStyle.remove();
      setPdfGenerating(false);
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
        const service = services.find(s => s.id === shift.service_id);
        const shiftAssignments = assignments.filter(a => a.shift_id === shift.id);
        const targetMin = shift.min_persons !== undefined ? shift.min_persons : (service?.min_persons || 1);
        const targetMax = shift.max_persons !== undefined ? shift.max_persons : (service?.max_persons || 3);
        
        const activeAssignments = shiftAssignments.filter(a => a.status !== 'declined');
        const helperNames = activeAssignments.map(a => {
          const helper = users.find(u => u.id === a.user_id);
          const name = helper?.display_name || "Unbekannt";
          const statusChar = a.status === 'accepted' ? "✔️" : a.status === 'maybe' ? "⏳" : "💤";
          return `${name} (${statusChar})`;
        }).join(", ");

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

        const service = services.find(s => s.id === shift.service_id);
        const shiftAssignments = assignments.filter(a => a.shift_id === shift.id);
        const activeAssignments = shiftAssignments.filter(a => a.status !== 'declined');
        const targetMin = shift.min_persons !== undefined ? shift.min_persons : (service?.min_persons || 1);

        const helperNames = activeAssignments.map(a => {
          const helper = users.find(u => u.id === a.user_id);
          const statusText = a.status === 'accepted' ? "bestätigt" : a.status === 'maybe' ? "unsicher" : "offen";
          return `${helper?.display_name || "Unbekannt"} (${statusText})`;
        }).join(", ") || "Keine";

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
      <style dangerouslySetInnerHTML={{ __html: `
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
      `}} />

      {/* Frame / Iframe warning banner */}
      {isInIframe && (
        <div className="bg-amber-955 bg-amber-950/40 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3 print:hidden">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200 leading-relaxed font-sans">
            <p className="font-extrabold text-amber-300">💡 Drucken im Vorschau-Modus (Iframe)</p>
            <p className="mt-0.5">
              Browser blockieren den PDF-Druck aus Sicherheitsgründen oft innerhalb von Vorschau-Iframes.
            </p>
            <p className="mt-2 text-slate-300">
              <span className="font-bold text-white">Lösung:</span> Klicken Sie unten auf <span className="font-semibold text-white">"Excel & Word Form kopieren"</span> für eine perfekte Formatierung in Ihren Office-Programmen, oder nutzen Sie die Tastenkombination <kbd className="bg-slate-850 px-1 border border-slate-705 rounded text-white font-mono">Strg + P</kbd> / <kbd className="bg-slate-850 px-1 border border-slate-705 rounded text-white font-mono">Cmd + P</kbd>.
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
          <p className="text-xs text-slate-400 mt-1 font-sans">
            Exportieren oder drucken Sie den aktuellen Dienstplan. Optimiert für Aushänge am schwarzen Brett.
          </p>
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
              pdfGenerating 
                ? "bg-slate-700/80 cursor-not-allowed border border-slate-600/40" 
                : "bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/20 shadow-cyan-600/15"
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
      <div 
        id="print-sheet-canvas-element" 
        className="bg-white border border-slate-300 rounded-2xl p-8 max-w-4xl mx-auto shadow-xl text-slate-900 font-sans print-canvas-box print:border-0 print:p-0 print:shadow-none print:bg-white print:text-black"
      >
        
        {/* Document Header */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight font-display text-black">
              DIENSTPLAN • {activeCamp?.title || "PFINGSTLAGER"} {activeCamp?.year || "2026"}
            </h1>
            <p className="text-xs text-slate-650 font-bold mt-1 font-mono uppercase print:text-black">
              ZELTLAGER-DIENSTE • GENERIERT AM {new Date().toLocaleDateString("de-DE")} • {shifts.length} SCHICHTEN GELISTET
            </p>
          </div>
          <div className="text-right text-[10px] font-mono text-slate-500 print:text-black shrink-0">
            <p>TEAMPAD PRINT UTILITY</p>
            <p>Pfadfinder Zeltlager</p>
          </div>
        </div>

        {/* Informative Legend (compact) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-300 p-3 rounded-lg text-xs mb-6 bg-slate-50 print:bg-white print:border-slate-400 print:text-black">
          <div>
            <p className="font-bold">⚠️ Bitte beachten:</p>
            <p className="text-[10px] text-slate-650 font-medium leading-relaxed">Alle eingeteilten Helfer*innen sind verpflichtet, pünktlich an den Stationen zu sein.</p>
          </div>
          <div>
            <p className="font-bold">❓ Rückfragen / Absagen:</p>
            <p className="text-[10px] text-slate-650 font-medium leading-relaxed">Ausschließlich über das Admin-Team des Zeltlagers regeln.</p>
          </div>
          <div>
            <p className="font-bold">✓ Bestätigungs-Status:</p>
            <p className="text-[10px] text-slate-650 font-medium font-mono leading-relaxed">✓ = Bestätigt | ⏳ = Unsicher | 💤 = Offen</p>
          </div>
        </div>

        {/* Master Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse border border-slate-350 print:border-collapse print:border-slate-800" style={{ pageBreakInside: "auto" }}>
            <thead>
              <tr className="bg-slate-100 border-b border-slate-350 font-bold text-xs uppercase text-slate-800 print:bg-slate-150 print:text-black print:border-b-2 print:border-black">
                <th className="py-2.5 px-3 border-r border-slate-350 font-bold text-black" style={{ width: '140px' }}>Zeitraum</th>
                <th className="py-2.5 px-3 border-r border-slate-350 font-bold text-black" style={{ width: '220px' }}>Dienst / Aufgabe</th>
                <th className="py-2.5 px-3 border-r border-slate-350 font-bold text-black" style={{ width: '130px' }}>Ort</th>
                <th className="py-2.5 px-3 font-bold text-black">Besetzung & Helfer*innen (Soll/Ist)</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {sortedShifts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center italic text-slate-500 print:text-black">
                    Keine Schichten in diesem Lager vorhanden.
                  </td>
                </tr>
              ) : (
                sortedShifts.map((shift, index) => {
                  const service = services.find(s => s.id === shift.service_id);
                  const shiftAssignments = assignments.filter(a => a.shift_id === shift.id);
                  const targetMin = shift.min_persons !== undefined ? shift.min_persons : (service?.min_persons || 1);
                  const targetMax = shift.max_persons !== undefined ? shift.max_persons : (service?.max_persons || 3);
                  
                  // Filter valid assigned helpers (not declined)
                  const activeAssignments = shiftAssignments.filter(a => a.status !== 'declined');
                  const isUnderstaffed = activeAssignments.length < targetMin;

                  return (
                    <tr 
                      key={shift.id} 
                      className={`border-b border-slate-350 print:border-b print:border-black ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40 print:bg-white"
                      }`}
                      style={{ pageBreakInside: "avoid" }}
                    >
                      {/* Datum & Zeit */}
                      <td className="py-2.5 px-3 border-r border-slate-350 align-top font-mono font-bold text-black">
                        {getDayNameShort(shift.date)}, {formatDateGerman(shift.date)}
                        <span className="block text-[10px] text-slate-600 font-normal mt-0.5 print:text-black">
                          🕒 {shift.start_time} - {shift.end_time} Uhr
                        </span>
                      </td>

                      {/* Diensttitel */}
                      <td className="py-2.5 px-3 border-r border-slate-350 align-top text-black">
                        <strong className="text-black font-extrabold text-xs">{service?.title || "Generischer Dienst"}</strong>
                        {service?.description && (
                          <span className="block text-[9px] text-slate-500 leading-tight mt-0.5 italic print:text-black">
                            {service.description}
                          </span>
                        )}
                        {shift.notes && shift.notes !== service?.description && (
                          <span className="block text-[9px] text-emerald-600 leading-tight mt-0.5 font-bold print:text-black">
                            Info: {shift.notes}
                          </span>
                        )}
                      </td>

                      {/* Ort */}
                      <td className="py-2.5 px-3 border-r border-slate-350 align-top font-mono text-[10px] text-black">
                        📍 {service?.location || "Lagergelände"}
                      </td>

                      {/* Helferbelegung */}
                      <td className="py-2.5 px-3 align-top text-black">
                        <div className="space-y-1">
                          {activeAssignments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {activeAssignments.map(a => {
                                const helper = users.find(u => u.id === a.user_id);
                                return (
                                  <span 
                                    key={a.id} 
                                    className="inline-flex items-center space-x-1 border border-slate-300 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-white text-black print:border-black"
                                  >
                                    <span>{helper?.display_name || "Helfer*in"}</span>
                                    {a.status === 'accepted' && <span className="text-black font-extrabold font-sans text-[11px]" title="Bestätigt">✓</span>}
                                    {a.status === 'maybe' && <span className="text-slate-605 font-semibold text-[10px]" title="Unsicher">⏳</span>}
                                    {a.status === 'pending' && <span className="text-slate-450 text-[9px]" title="Offen">💤</span>}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-700 font-mono block print:text-black">
                              🔲 KEINE HELFER*INNEN EINGETRAGEN
                            </span>
                          )}

                          {/* Staff stats */}
                          <div className="text-[9px] font-mono text-slate-500 font-semibold pt-1 flex items-center justify-between print:text-black print:border-0">
                            <span>Bestetzung: min. {targetMin} • max. {targetMax} ({activeAssignments.length} eingeteilt)</span>
                            <span className={`px-1.5 py-0.2 rounded border uppercase text-[8px] font-extrabold ${
                              isUnderstaffed 
                                ? "bg-rose-50 text-rose-800 border-rose-300 print:bg-white print:text-black print:border-black" 
                                : "bg-emerald-50 text-emerald-800 border-emerald-300 print:bg-white print:text-black print:border-black"
                            }`}>
                              {isUnderstaffed ? "⚠️ UNTERBESETZT" : "✓ BESETZT"}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Signature Box */}
        <div className="mt-8 border-t border-slate-300 pt-4 flex justify-between text-[10px] text-slate-550 font-mono print:text-black print:border-black">
          <p>Handzettel zur Info. Verbleib am schwarzen Brett.</p>
          <p>System signature: LGR-PLAN-v2</p>
        </div>

      </div>

    </div>
  );
}
