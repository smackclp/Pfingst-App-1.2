import React from "react";
import { Search, ExternalLink, ClipboardList, Trash2 } from "lucide-react";
import { User, MaterialItem } from "../types";
import MaterialStatusBadge from "./MaterialStatusBadge";
import ConfirmDialog from "./ConfirmDialog";

interface MaterialsListProps {
  materials: MaterialItem[];
  sortedAndFilteredMaterials: MaterialItem[];
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  users: User[];
  currentUserId: string | null;
  isAdmin: boolean;
  onUpdateMaterial: (id: string, material: Partial<MaterialItem>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  showToast: (msg: string) => void;
}

/** Such-/Filterleiste und Bestelllisten-Ansicht. Extrahiert aus MaterialsView.tsx. */
export default function MaterialsList({
  materials,
  sortedAndFilteredMaterials,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  users,
  currentUserId,
  isAdmin,
  onUpdateMaterial,
  onDeleteMaterial,
  showToast,
}: MaterialsListProps) {
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  // Helper: toggle status ('pending' -> 'ordered' -> 'received' -> 'pending')
  const handleToggleStatus = async (item: MaterialItem) => {
    const currentStatus = item.status || "pending";
    let nextStatus: "pending" | "ordered" | "received" = "ordered";

    if (currentStatus === "pending") {
      nextStatus = "ordered";
    } else if (currentStatus === "ordered") {
      nextStatus = "received";
    } else {
      nextStatus = "pending";
    }

    try {
      await onUpdateMaterial(item.id, { status: nextStatus });
    } catch (err) {
      console.error(err);
      showToast("Fehler beim Aktualisieren des Bestellstatus.");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await onDeleteMaterial(id);
    } catch (err) {
      console.error(err);
      showToast("Fehler beim Löschen des Artikels.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Utilities (Search & Tab Counters) */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search items bar */}
        <div className="relative w-full md:w-64">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Artikel, Besteller, Zweck..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-lg py-1.5 pl-9 pr-4 text-xs text-white outline-none focus:border-emerald-500/50 transition duration-150"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1.5 self-stretch md:self-auto justify-end">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
              statusFilter === "all" ? "bg-slate-850 border border-slate-700 text-white" : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            Alle ({materials.length})
          </button>
          <button
            onClick={() => setStatusFilter("pending")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
              statusFilter === "pending" ? "bg-amber-500/20 border border-amber-500/30 text-amber-400" : "bg-transparent text-slate-400 hover:text-amber-400 hover:bg-slate-900"
            }`}
          >
            Ausstehend ({materials.filter((m) => (m.status || "pending") === "pending").length})
          </button>
          <button
            onClick={() => setStatusFilter("ordered")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
              statusFilter === "ordered" ? "bg-blue-500/20 border border-blue-500/30 text-blue-400" : "bg-transparent text-slate-400 hover:text-blue-400 hover:bg-slate-900"
            }`}
          >
            Bestellt ({materials.filter((m) => m.status === "ordered").length})
          </button>
          <button
            onClick={() => setStatusFilter("received")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
              statusFilter === "received" ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" : "bg-transparent text-slate-400 hover:text-emerald-400 hover:bg-slate-900"
            }`}
          >
            Erhalten ({materials.filter((m) => m.status === "received").length})
          </button>
        </div>
      </div>

      {/* Table/List view of orders */}
      <div className="space-y-3.5">
        {sortedAndFilteredMaterials.length === 0 ? (
          <div className="text-center p-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-3">
            <ClipboardList className="h-10 w-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">Keine Bestellungen gefunden.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Entweder liegt für diesen Filter noch keine Anfrage vor, oder deine Suchanfrage gab keine Treffer zurück. Trage links dein erstes Material ein!
            </p>
          </div>
        ) : (
          sortedAndFilteredMaterials.map((item) => {
            const creator = users.find((u) => u.id === item.user_id);
            const isItemOwner = item.user_id === currentUserId;
            const currentUser = users.find((u) => u.id === currentUserId);
            // Bestellliste bearbeiten dürfen: die eigene Bestellung, die von der
            // Lagerleitung benannte(n) Einkäufer*in(nen) (is_buyer), oder Bereichsleitung+.
            const canModify = isAdmin || isItemOwner || !!currentUser?.is_buyer;

            return (
              <div
                key={`mat-item-${item.id}`}
                className={`bg-slate-900/85 hover:bg-slate-900 border transition rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row justify-between gap-4 ${
                  item.status === "received" ? "border-emerald-500/10" : item.status === "ordered" ? "border-blue-500/10" : "border-slate-850"
                }`}
              >
                {/* Left: Article Details */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <MaterialStatusBadge status={item.status} />

                    {item.quantity && item.quantity > 1 && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-300 rounded border border-slate-700">{item.quantity} Stück</span>
                    )}

                    {item.price && (
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-855 text-emerald-400 bg-slate-950/40 rounded border border-slate-800">{item.price}</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="font-extrabold text-base text-slate-100 font-sans leading-relaxed">{item.item_name}</h4>

                    <p className="text-xs text-slate-350 text-slate-300 leading-relaxed bg-slate-950/35 p-3 rounded-xl border border-slate-850 max-w-xl font-sans">{item.purpose}</p>
                  </div>

                  {/* URL external link */}
                  {item.url && (
                    <div className="inline-flex">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold text-xs hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Website aufrufen (z.B. Amazon-Shop)
                      </a>
                    </div>
                  )}

                  {/* Creator Identity & Meta */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50 text-[10px] text-slate-500 font-mono">
                    <span className="font-bold text-slate-400 capitalize">Besteller: {creator ? creator.display_name : "Unbekannter Helfer"}</span>
                    <span>•</span>
                    <span>Eingetragen am: {new Date(item.created_at).toLocaleDateString("de-DE")}</span>
                  </div>
                </div>

                {/* Right: Actions / Updates */}
                <div className="flex sm:flex-col justify-between items-end gap-3 shrink-0 pt-3 sm:pt-0 sm:border-l sm:border-slate-800/50 sm:pl-5">
                  {/* State manipulation button - allow logged in helpers to toggle status to help purchaser, or admins */}
                  <div className="flex flex-col gap-1.5 w-full">
                    <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Status anpassen:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item)}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-[11px] font-bold text-slate-300 hover:text-white rounded-lg transition-all tracking-wide cursor-pointer w-full text-center flex items-center justify-center gap-1.5"
                    >
                      Status umschalten 🔄
                    </button>
                  </div>

                  {/* Modify privileges indicator and delete button */}
                  <div className="flex items-center gap-2 self-end">
                    {canModify && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="bg-rose-950 hover:bg-rose-900 hover:text-white transition-all text-rose-455 text-rose-400 p-2 rounded-lg border border-rose-500/10 cursor-pointer text-xs flex items-center gap-1"
                        title="Löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Löschen</span>
                      </button>
                    )}
                    {!canModify && (
                      <span className="text-[10px] text-slate-600 font-sans italic" title="Nur für Admins oder Ersteller editierbar">
                        Gesperrt 🔒
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Artikel löschen"
        message="Möchtest du diesen Artikel wirklich aus der Bestellliste löschen?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
