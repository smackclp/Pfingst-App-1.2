import React from "react";
import { Camp } from "../types";

// Eigenständiges, "sauberes" Stylesheet nur für den PDF-Export-Canvas.
// Enthält bewusst KEINE oklch/oklab-Farbfunktionen, da diese html2canvas
// zum Absturz bringen. Ersetzt/überschreibt alle relevanten Tailwind-Klassen
// des #print-sheet-canvas-element mit einfachen Hex-Farben.
const PDF_RENDER_STYLES = `
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

/**
 * PDF-Export von #print-sheet-canvas-element via html2canvas + jsPDF.
 * Extrahiert aus PrintView.tsx (downloadPdf).
 */
export function usePdfExport(activeCamp?: Camp, onError?: (msg: string) => void) {
  const [pdfGenerating, setPdfGenerating] = React.useState(false);

  const downloadPdf = async () => {
    const targetElement = document.getElementById("print-sheet-canvas-element");
    if (!targetElement) return;

    setPdfGenerating(true);

    // 1. Create a clean standalone style element dedicated only to rendering our high contrast table.
    // This sheet will NOT contain any oklch, oklab, or other advanced CSS functions that crash html2canvas.
    const tempStyle = document.createElement("style");
    tempStyle.id = "temp-pdf-render-styles";
    tempStyle.textContent = PDF_RENDER_STYLES;
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
        configurable: true,
      });
    } catch (e) {
      console.warn("Failed to redefine document.styleSheets directly, trying fallback descriptor override.", e);
    }

    try {
      // Dynamically load html2canvas and jspdf/jsPDF on demand
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

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
        format: "a4",
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
      onError?.("PDF-Generierung fehlgeschlagen. Bitte nutzen Sie stattdessen die Druckfunktion oder 'Excel/Word Form'.");
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

  return { pdfGenerating, downloadPdf };
}
