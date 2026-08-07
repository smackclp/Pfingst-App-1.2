import React from "react";
import { QrCode } from "lucide-react";
import { motion } from "motion/react";
import { User } from "../types";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface DashboardQrSheetProps {
  users: User[];
  activeCampYear?: number;
  onClose: () => void;
}

/**
 * Druckbares QR-Anmeldekarten-Overlay (Admin). Extrahiert aus
 * DashboardView.tsx (Zeilen ~1541-1660). Wird nur gerendert, solange das
 * Overlay offen ist - die AnimatePresence dafür bleibt in der
 * Eltern-Shell (DashboardView.tsx), damit die exit-Animation greift.
 */
export default function DashboardQrSheet({ users, activeCampYear, onClose }: DashboardQrSheetProps) {
  const titleId = React.useId();
  const focusTrapRef = useFocusTrap<HTMLDivElement>(true);
  useEscapeKey(true, onClose);

  return (
    <motion.div
      ref={focusTrapRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-md overflow-y-auto p-4 sm:p-8 flex items-start justify-center"
      id="printable-qr-sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl shadow-black/90 p-6 md:p-8 space-y-6 relative" id="printable-qr-sheet-container">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <h3 id={titleId} className="text-lg font-black text-white font-display">PWA-Quickaccess & QR-Ausweis Generierung</h3>
              <p className="text-xs text-slate-400 mt-0.5">Druckfertige Helfer-Anmeldekarten mit vorkonfigurierten Deep-Links</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.print();
                }
              }}
              className="px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center gap-2 transition"
            >
              <span>🖨️ Jetzt drucken</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-xl border border-slate-800 active:scale-95 cursor-pointer text-xs font-bold leading-none font-mono"
            >
              Schließen ✕
            </button>
          </div>
        </div>

        {/* Printable Note Header */}
        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-950/5 p-4 text-xs leading-relaxed text-slate-300 space-y-2 no-print">
          <p className="font-bold text-white uppercase flex items-center gap-1.5 text-[11px] tracking-wider font-mono">💡 Tipp für den perfekten Ausdruck:</p>
          <ul className="list-disc list-inside space-y-1 font-sans text-slate-350">
            <li>Öffne dieses Druckcenter am Laptop/Desktop.</li>
            <li>
              Klicke auf den Button <b>"Jetzt drucken"</b> oben rechts.
            </li>
            <li>
              Wähle in den Druckereinstellungen das <b>Layout Hochformat</b> oder <b>Querformat</b>.
            </li>
            <li>
              Setze die Ränder auf <b>"Keine"</b> oder <b>"Minimal"</b>.
            </li>
            <li>
              <b>Wichtig:</b> Aktiviere die Option <b>"Hintergrundgrafiken drucken"</b>, damit die Trennungslinien und Rahmen schön sichtbar gezeichnet werden!
            </li>
          </ul>
        </div>

        {/* Printable Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 font-mono">
          {users
            .filter((u) => u.active)
            .map((u) => {
              const quickUrl = `${window.location.origin}/?helper=${u.id}`;
              const qrSrcUrl = `https://api.qrserver.com/v1/create-qr-code/?size=165x165&data=${encodeURIComponent(quickUrl)}`;

              return (
                <div
                  key={`card-print-${u.id}`}
                  className="border border-dashed border-slate-700 bg-slate-950 p-5 rounded-2xl flex flex-row items-center gap-4 relative overflow-hidden break-inside-avoid print:bg-white print:text-black print:border-slate-400 print:shadow-none shadow-md shadow-black/25"
                  style={{ minHeight: "190px" }}
                >
                  {/* Left: Metadata */}
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <span className="text-[8px] tracking-widest font-bold uppercase bg-emerald-500/10 print:bg-slate-100 border border-emerald-500/20 print:border-slate-300 text-emerald-450 text-emerald-400 print:text-slate-800 px-2 py-0.5 rounded-full inline-block">
                        CAMP HELFERAUSWEIS ⛺
                      </span>
                      <h4 className="text-sm font-black text-white print:text-black leading-tight truncate">{u.display_name}</h4>
                      <p className="text-[10px] text-slate-400 print:text-slate-600">
                        Rolle: <span className="font-bold uppercase text-emerald-400 print:text-emerald-700">{u.role}</span>
                      </p>
                    </div>

                    <div className="space-y-1 pr-1 border-t border-slate-900 print:border-slate-200 pt-2 text-[8px] text-slate-450 print:text-slate-600 leading-normal font-sans">
                      <p className="font-bold text-slate-300 print:text-slate-700 uppercase tracking-wide">PWA App-Installation & Schichten:</p>
                      <p>1. QR-Code scannen mit Kamera</p>
                      <p>2. Im Safari/Chrome "Optionen" &rarr; "Zum Startbildschirm" antippen</p>
                      <p>3. App im Fullscreen öffnen und Schichten direkt zusagen!</p>
                    </div>
                  </div>

                  {/* Right: QR Code Visual wrapper */}
                  <div className="flex flex-col items-center shrink-0 space-y-1.5 p-2 bg-white rounded-xl border border-slate-800 print:border-slate-300">
                    <img src={qrSrcUrl} alt={`QR-Code für ${u.display_name}`} className="w-[120px] h-[120px] object-contain block" referrerPolicy="no-referrer" />
                    <span className="text-[8px] font-bold text-slate-500 print:text-slate-750 select-none uppercase">SCANN & LOGIN</span>
                  </div>

                  {/* Shearing guideline helper */}
                  <div className="absolute right-0 top-0 bottom-0 w-1.5 border-r border-dashed border-slate-800 print:border-slate-300 pointer-events-none no-print" />
                </div>
              );
            })}
        </div>

        {/* Printable footer note */}
        <div className="pt-6 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono no-print">
          Saison Pfingstlager {activeCampYear || 2026} • Generiert mit System-Administrations-Rechten
        </div>
      </div>
    </motion.div>
  );
}
