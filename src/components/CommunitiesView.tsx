import React from "react";
import { Church, Upload, Trash2, Edit2, Check, X, Plus, FileSpreadsheet, AlertCircle, Info, Search, Download } from "lucide-react";
import { Community } from "../types";
import { useCommunityImport } from "../hooks/useCommunityImport";
import ConfirmDialog from "./ConfirmDialog";

interface CommunitiesViewProps {
  communities: Community[];
  isAdmin: boolean;
  onAddCommunity: (community: Omit<Community, "id">) => Promise<void>;
  onUpdateCommunity: (id: string, community: Partial<Community>) => Promise<void>;
  onDeleteCommunity: (id: string) => Promise<void>;
  onImportCommunities: (items: Omit<Community, "id" | "camp_id">[]) => Promise<void>;
  onClearCommunities: () => Promise<void>;
}

export default function CommunitiesView({
  communities,
  isAdmin,
  onAddCommunity,
  onUpdateCommunity,
  onDeleteCommunity,
  onImportCommunities,
  onClearCommunities,
}: CommunitiesViewProps) {
  // Tabs: "overview" or "import"
  const [subTab, setSubTab] = React.useState<"overview" | "add">("overview");

  // Filtering states
  const [searchTerm, setSearchTerm] = React.useState("");

  const { dragActive, parsedData, setParsedData, importFeedback, setImportFeedback, handleDrag, handleDrop, handleFileChange, handleConfirmImport, downloadSampleExcel } =
    useCommunityImport(onImportCommunities, () => setSubTab("overview"));

  // Form states for manual adding / editing
  const [manualName, setManualName] = React.useState("");
  const [manualLocation, setManualLocation] = React.useState("");
  const [manualParticipants, setManualParticipants] = React.useState<number | "">("");

  // Editing individual community row ID
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editLocation, setEditLocation] = React.useState("");
  const [editParticipants, setEditParticipants] = React.useState<number>(0);

  // Dialog states
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [clearConfirm, setClearConfirm] = React.useState(false);

  // Submit manual adding
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    try {
      await onAddCommunity({
        name: manualName.trim(),
        location: manualLocation.trim(),
        participants: Number(manualParticipants) || 0,
        camp_id: "camp-2026",
      });
      setManualName("");
      setManualLocation("");
      setManualParticipants("");
      setImportFeedback({ success: true, message: "Gemeinde erfolgreich hinzugefügt!" });
      setSubTab("overview");
    } catch (err) {
      console.error(err);
      setImportFeedback({ success: false, message: "Eintrag konnte nicht gespeichert werden." });
    }
  };

  // Confirm inline updates
  const startEditing = (com: Community) => {
    setEditingId(com.id);
    setEditName(com.name);
    setEditLocation(com.location);
    setEditParticipants(com.participants);
  };

  const saveEdit = async (comId: string) => {
    if (!editName.trim()) return;
    try {
      await onUpdateCommunity(comId, {
        name: editName.trim(),
        location: editLocation.trim(),
        participants: editParticipants,
      });
      setEditingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteCommunity(id);
      setDeleteConfirmId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    try {
      await onClearCommunities();
      setClearConfirm(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate totals
  const totalParticipants = React.useMemo(() => {
    return communities.reduce((acc, c) => acc + (c.participants || 0), 0);
  }, [communities]);

  const filteredCommunities = React.useMemo(() => {
    return communities
      .filter((c) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return c.name.toLowerCase().includes(term) || c.location.toLowerCase().includes(term);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [communities, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Upper header statistics card */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/10 shadow-xl shadow-black/35 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-950/50 rounded-xl border border-emerald-500/15">
              <Church className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-white leading-tight">Teilnehmende Gemeinden & Gruppen</h3>
              <p className="text-xs text-slate-400 mt-0.5">Übersicht und Importliste aller registrierten Gemeinden des Pfingstlagers.</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isAdmin && (
              <button
                onClick={() => setSubTab(subTab === "overview" ? "add" : "overview")}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-550 border border-emerald-500/20 text-white font-semibold rounded-xl text-xs flex items-center space-x-2 transition cursor-pointer font-mono"
              >
                {subTab === "overview" ? (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Importieren / Hinzufügen</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Zur Übersicht</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Dashboard statistics panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-800/60 font-mono">
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gemeinden insgesamt</div>
            <div className="text-2xl font-bold text-white mt-1 flex items-baseline space-x-1.5">
              <span>{communities.length}</span>
              <span className="text-xs text-slate-500 font-normal">Gemeinden</span>
            </div>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gesamte Teilnehmeranzahl</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1 flex items-baseline space-x-1.5">
              <span>{totalParticipants}</span>
              <span className="text-xs text-slate-500 font-normal">Personen</span>
            </div>
          </div>

          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 sm:col-span-2 lg:col-span-1 flex flex-col justify-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ø Teilnehmer pro Gemeinde</div>
            <div className="text-lg font-bold text-slate-200 mt-1">
              {communities.length > 0 ? (totalParticipants / communities.length).toFixed(1) : 0} <span className="text-xs font-normal text-slate-500">Pers.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main feedback Alerts */}
      {importFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 text-xs ${
            importFeedback.success ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-300" : "bg-rose-950/30 border-rose-500/20 text-rose-300"
          }`}
        >
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <p className="font-semibold">{importFeedback.message}</p>
        </div>
      )}

      {subTab === "overview" ? (
        <div className="space-y-4">
          {/* Filtering bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/40">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-emerald-500/70" />
              </span>
              <input
                type="text"
                placeholder="Gemeinde oder Ort suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 border border-slate-800 focus:border-cyan-500 focus:ring-0 rounded-xl bg-slate-950/65 text-slate-100 placeholder-slate-500"
              />
            </div>

            {isAdmin && communities.length > 0 && (
              <button
                onClick={() => setClearConfirm(true)}
                className="px-4 py-2 hover:bg-rose-950/20 border border-slate-800 hover:border-rose-900/30 text-rose-400 font-mono text-xs font-semibold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Gesamte Liste leeren</span>
              </button>
            )}
          </div>

          {/* Communities List */}
          {filteredCommunities.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xs">
              <Church className="h-8 w-8 text-slate-500 mx-auto opacity-40 mb-3" />
              <p className="text-white font-semibold text-sm">Keine Gemeinden eingetragen</p>
              <p className="text-xs text-slate-400 mt-1">
                {isAdmin
                  ? "Verwenden Sie die Schaltfläche rechts oben, um die teilnehmenden Gemeinden hinzuzufügen oder zu importieren."
                  : "Es sind für dieses Zeltlager noch keine Gemeinden angelegt worden."}
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl shadow-black/15">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                      <th className="py-3.5 px-4 font-bold">#</th>
                      <th className="py-3.5 px-4 font-bold">Gemeinde (Spalte 1)</th>
                      <th className="py-3.5 px-4 font-bold">Ort (Spalte 2)</th>
                      <th className="py-3.5 px-4 font-bold text-right">Anzahl Teilnehmer (Spalte 3)</th>
                      {isAdmin && <th className="py-3.5 px-4 text-center font-bold">Aktionen</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {filteredCommunities.map((com, index) => {
                      const isEditing = editingId === com.id;

                      return (
                        <tr key={com.id} className="hover:bg-slate-850/40 transition group">
                          <td className="py-3 px-4 font-mono text-slate-500 w-10">{index + 1}</td>
                          <td className="py-3 px-4 font-semibold text-white">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                              />
                            ) : (
                              com.name
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editLocation}
                                onChange={(e) => setEditLocation(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                              />
                            ) : (
                              com.location || <span className="text-slate-600 italic">Keine Angabe</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400 font-bold">
                            {isEditing ? (
                              <input
                                type="number"
                                value={editParticipants}
                                onChange={(e) => setEditParticipants(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-20 ml-auto bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-right text-emerald-400 focus:outline-none focus:border-cyan-500"
                              />
                            ) : (
                              com.participants
                            )}
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-4 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    onClick={() => saveEdit(com.id)}
                                    className="p-1 px-2 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-900/30 hover:bg-emerald-900/30 transition shadow-inner font-mono text-[10px]"
                                    title="Speichern"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1 px-2 bg-slate-950 text-slate-400 rounded-lg border border-slate-800 hover:bg-slate-800 transition shadow-inner font-mono text-[10px]"
                                    title="Abbrechen"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center space-x-1 opacity-80 group-hover:opacity-100 transition">
                                  <button
                                    onClick={() => startEditing(com)}
                                    className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 rounded-lg transition"
                                    title="Eintrag bearbeiten"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(com.id)}
                                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition"
                                    title="Eintrag löschen"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left block - File Upload import */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-805">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                    <FileSpreadsheet className="h-4.5 w-4.5" /> Excel- & CSV-Datei hochladen
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">Ziehen Sie Ihre Excel- (.xlsx, .xls) oder CSV-Datei hierhin oder wählen Sie sie manuell aus.</p>
                </div>

                <button
                  type="button"
                  onClick={downloadSampleExcel}
                  className="px-3 py-1.5 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-mono text-[10px] rounded-lg transition flex items-center space-x-1.5"
                >
                  <Download className="h-3 w-3" />
                  <span>Muster-Vorlage</span>
                </button>
              </div>

              {/* Drag zone */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition ${
                  dragActive ? "border-emerald-500 bg-emerald-950/10" : "border-slate-800 hover:border-slate-700 bg-slate-950/30"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input type="file" id="excel-file-selector" className="hidden" onChange={handleFileChange} accept=".csv, .xlsx, .xls" />
                <Upload className="h-8 w-8 text-emerald-500/60 mb-2 animate-bounce" />
                <p className="text-xs font-bold text-slate-200">Datei per Drag & Drop hier ablegen</p>
                <p className="text-[10px] text-slate-400 mt-1 mb-4">oder auf Ihrem Computer suchen (.xlsx, .xls, .csv)</p>

                <label
                  htmlFor="excel-file-selector"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white rounded-xl text-xs font-bold cursor-pointer border border-slate-700 hover:border-slate-600 transition"
                >
                  Datei auswählen
                </label>
              </div>

              {/* Excel rules help box */}
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-850 flex items-start space-x-3 text-[11px]">
                <Info className="h-4 w-4 text-emerald-450 shrink-0 mt-0.5" />
                <div className="space-y-1 text-slate-400 leading-relaxed">
                  <p className="font-bold text-slate-200 uppercase tracking-wide text-[9px] font-mono">Spaltenerkennung:</p>
                  <p>Unser System liest die Datei automatisch und ordnet die Spalten richtig zu. Optimale Spaltenbezeichnungen sind:</p>
                  <ul className="list-disc pl-4 space-y-0.5 font-mono text-[10px] text-emerald-400/90">
                    <li>
                      <strong>Spalte 1:</strong> Gemeindename (oder "Gemeinde", "Pfarrei", "Name")
                    </li>
                    <li>
                      <strong>Spalte 2:</strong> Ort (oder "Stadt", "Adresse", "Location")
                    </li>
                    <li>
                      <strong>Spalte 3:</strong> Anzahl Teilnehmer*innen (oder "Teilnehmer", "Anzahl", "Pax", "TN")
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Preview table of parsed data */}
            {parsedData && parsedData.length > 0 && (
              <div className="bg-slate-900/85 p-5 rounded-2xl border border-emerald-500/20 shadow-xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                      Vorschau vor dem Importieren ({parsedData.length} Gemeinde(n))
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Bitte überprüfen Sie die zugeordneten Spalten. Wenn alles korrekt ist, klicken Sie unten auf Importieren.</p>
                  </div>

                  <button
                    onClick={() => setParsedData(null)}
                    className="p-1 px-2.5 text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200 rounded-lg transition"
                  >
                    Verwerfen
                  </button>
                </div>

                <div className="overflow-x-auto max-h-72 border border-slate-800/80 rounded-xl bg-slate-950/40">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Spalte 1 (Gemeindename)</th>
                        <th className="py-2.5 px-3">Spalte 2 (Ort)</th>
                        <th className="py-2.5 px-3 text-right">Spalte 3 (Anzahl)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300">
                      {parsedData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-850/20">
                          <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-white">{row.name}</td>
                          <td className="py-2 px-3 font-mono">{row.location || "-"}</td>
                          <td className="py-2 px-3 text-right font-mono text-emerald-400 font-semibold">{row.participants}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleConfirmImport}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-555 text-white font-mono text-xs font-bold rounded-xl flex items-center space-x-2 border border-emerald-500 shadow-md shadow-emerald-950/30 transition cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>Gemeinden importieren ({parsedData.length} Stück)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right block - Manual add community */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                  <Plus className="h-4.5 w-4.5" /> Gemeinde manuell eintragen
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Wenn Sie keine Tabelle hochladen möchten, können Sie einzelne Einträge hier erzeugen.</p>
              </div>

              <form onSubmit={handleManualAdd} className="space-y-4 pt-1 font-mono">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Gemeindename*</label>
                  <input
                    type="text"
                    required
                    placeholder="Heilig Geist Gemeinde"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-800 rounded-xl bg-slate-950/65 text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Ort</label>
                  <input
                    type="text"
                    placeholder="Ludwigsburg"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-800 rounded-xl bg-slate-950/65 text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-0"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Anzahl Teilnehmer*innen</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="z.B. 24"
                    value={manualParticipants}
                    onChange={(e) => setManualParticipants(e.target.value === "" ? "" : Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-xs px-3 py-2 border border-slate-800 rounded-xl bg-slate-950/65 text-slate-100 placeholder-slate-600 focus:border-cyan-500 focus:ring-0"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-550 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 border border-emerald-500/20 transition cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Gemeinde anlegen</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmId !== null}
        title="Gemeinde löschen?"
        message="Möchten Sie den ausgewählten Gemeinde-Eintrag wirklich dauerhaft aus der Auswertung entfernen? Dieser Vorgang kann nicht rückgängig gemacht werden."
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
      />

      <ConfirmDialog
        isOpen={clearConfirm}
        title="Ganze Liste leeren?"
        message={
          <>
            Möchten Sie wirklich <strong className="text-white">ALLE Gemeinden</strong> auf einmal ausrichten? Ihre gesamte Auswertung wird auf Null zurückgesetzt, damit Sie bei
            Bedarf komplett neu importieren können.
          </>
        }
        confirmLabel="Liste leeren"
        onConfirm={handleClearAll}
        onCancel={() => setClearConfirm(false)}
      />
    </div>
  );
}
