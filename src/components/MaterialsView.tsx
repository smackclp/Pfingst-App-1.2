import React from "react";
import { User, MaterialItem } from "../types";
import { Download, ShoppingBag, Copy, Check } from "lucide-react";
import MaterialOrderForm from "./MaterialOrderForm";
import MaterialsList from "./MaterialsList";

interface MaterialsViewProps {
  materials: MaterialItem[];
  users: User[];
  currentUserId: string | null;
  isAdmin: boolean;
  onAddMaterial: (material: Omit<MaterialItem, "id" | "created_at">) => Promise<void>;
  onUpdateMaterial: (id: string, material: Partial<MaterialItem>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
}

export default function MaterialsView({
  materials,
  users,
  currentUserId,
  isAdmin,
  onAddMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
}: MaterialsViewProps) {
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [copySuccess, setCopySuccess] = React.useState<boolean>(false);

  const sortedAndFilteredMaterials = React.useMemo(() => {
    let list = [...materials];

    // Filter by status
    if (statusFilter !== "all") {
      list = list.filter((m) => (m.status || "pending") === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      list = list.filter((m) => {
        const itemMatch = m.item_name.toLowerCase().includes(query);
        const purposeMatch = m.purpose.toLowerCase().includes(query);
        const userObj = users.find((u) => u.id === m.user_id);
        const userMatch = userObj ? userObj.display_name.toLowerCase().includes(query) : false;
        return itemMatch || purposeMatch || userMatch;
      });
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [materials, statusFilter, searchQuery, users]);

  const handleCopyWhatsApp = () => {
    if (sortedAndFilteredMaterials.length === 0) {
      alert("Es gibt keine passenden Artikel zum Kopieren.");
      return;
    }

    const currentStatusLabel =
      statusFilter === "all" ? "Alle Artikel" : statusFilter === "pending" ? "Ausstehende Artikel" : statusFilter === "ordered" ? "Bestellte Artikel" : "Erhaltene Artikel";

    let text = `📦 *Material-Bestellliste Pfingstlager* (${currentStatusLabel}) 🏕️\n\n`;

    sortedAndFilteredMaterials.forEach((m, index) => {
      const requester = users.find((u) => u.id === m.user_id)?.display_name || "Unbekannt";
      const statusSymbol = m.status === "received" ? "✅ [Erhalten]" : m.status === "ordered" ? "🛒 [Bestellt]" : "⏳ [Ausstehend]";

      text += `*${index + 1}. ${m.item_name}* (Anzahl: ${m.quantity || 1})\n`;
      text += `📍 Verwendungszweck: ${m.purpose}\n`;
      text += `👤 Bestellt von: ${requester}\n`;
      if (m.price) {
        text += `💰 Preis (ca.): ${m.price}\n`;
      }
      if (m.url) {
        text += `🔗 Link: ${m.url}\n`;
      }
      text += `📋 Status: ${statusSymbol}\n\n`;
    });

    text += `📲 Pfingstlager Dienstplan-App`;

    try {
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy material list: ", err);
      alert("Kopieren fehlgeschlagen.");
    }
  };

  // Export as CSV for Buyer/Purchaser
  const handleExportCSV = () => {
    if (materials.length === 0) {
      alert("Die Bestellliste ist leer. Es gibt nichts zu exportieren!");
      return;
    }

    // Prepare CSV header and rows
    const headers = ["ID", "Bestellt Von", "Artikel", "Anzahl", "Preis (Soll)", "Website / Link", "Verwendungszweck", "Hinzugefuegt am", "Status"];

    const rows = sortedAndFilteredMaterials.map((m) => {
      const requester = users.find((u) => u.id === m.user_id)?.display_name || "Unbekannt";
      const statusLabel = m.status === "received" ? "Erhalten" : m.status === "ordered" ? "Bestellt" : "Ausstehend / Offen";
      const cleanedUrl = m.url ? m.url.replace(/"/g, '""') : "";

      return [
        m.id,
        requester,
        m.item_name.replace(/"/g, '""'),
        m.quantity || 1,
        m.price || "",
        cleanedUrl,
        m.purpose.replace(/"/g, '""'),
        new Date(m.created_at).toLocaleDateString("de-DE"),
        statusLabel,
      ];
    });

    // Generate CSV string with UTF-8 BOM representation for Excel German character compatibility
    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.map((val) => `"${val}"`).join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bestellliste_material_pfingstlager_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8" id="materials-view-root">
      {/* Upper Title Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display">Bestellliste für Material</h2>
          </div>
          <p className="text-sm text-slate-400 font-sans">
            Trage hier benötigtes Material (Amazon-Links, Bastelbedarf, Küchenhelfer) ein. Unser Einkäufer kann die vollständige Tabelle direkt exportieren.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 self-start md:self-center">
          <button
            onClick={handleCopyWhatsApp}
            type="button"
            className={`flex items-center gap-2 px-4 py-2 text-sm font-black rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-md ${
              copySuccess ? "bg-emerald-500 text-slate-950 shadow-emerald-500/10" : "bg-slate-950 border border-emerald-500/30 hover:border-emerald-500/80 hover:bg-slate-900 text-emerald-450 shadow-black/20"
            }`}
          >
            {copySuccess ? (
              <>
                <Check className="h-4 w-4" />
                Liste kopiert!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Für WhatsApp kopieren
              </>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all text-slate-950 text-sm font-black rounded-xl cursor-pointer shadow-md shadow-emerald-500/10"
          >
            <Download className="h-4 w-4" />
            Liste exportieren (CSV)
          </button>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Register Form (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <MaterialOrderForm users={users} currentUserId={currentUserId} onAddMaterial={onAddMaterial} />
        </div>

        {/* Right Column: Interactive material listings and details board (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          <MaterialsList
            materials={materials}
            sortedAndFilteredMaterials={sortedAndFilteredMaterials}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            users={users}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onUpdateMaterial={onUpdateMaterial}
            onDeleteMaterial={onDeleteMaterial}
          />
        </div>
      </div>
    </div>
  );
}
