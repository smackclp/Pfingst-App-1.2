import React from "react";
import { User, MaterialItem } from "../types";
import { 
  Plus, 
  Trash2, 
  Download, 
  ExternalLink, 
  ShoppingBag, 
  Search, 
  Tag, 
  CheckCircle2, 
  Hourglass, 
  ClipboardList,
  AlertCircle,
  Copy,
  Check
} from "lucide-react";

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
  // Form states
  const [selectedUser, setSelectedUser] = React.useState<string>(currentUserId || "");
  const [itemName, setItemName] = React.useState<string>("");
  const [websiteUrl, setWebsiteUrl] = React.useState<string>("");
  const [purpose, setPurpose] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [price, setPrice] = React.useState<string>("");
  
  // UI states
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [copySuccess, setCopySuccess] = React.useState<boolean>(false);

  const handleCopyWhatsApp = () => {
    if (sortedAndFilteredMaterials.length === 0) {
      alert("Es gibt keine passenden Artikel zum Kopieren.");
      return;
    }

    const currentStatusLabel = 
      statusFilter === "all" ? "Alle Artikel" : 
      statusFilter === "pending" ? "Ausstehende Artikel" : 
      statusFilter === "ordered" ? "Bestellte Artikel" : 
      "Erhaltene Artikel";

    let text = `📦 *Material-Bestellliste Pfingstlager* (${currentStatusLabel}) 🏕️\n\n`;

    sortedAndFilteredMaterials.forEach((m, index) => {
      const requester = users.find((u) => u.id === m.user_id)?.display_name || "Unbekannt";
      const statusSymbol = 
        m.status === "received" ? "✅ [Erhalten]" : 
        m.status === "ordered" ? "🛒 [Bestellt]" : 
        "⏳ [Ausstehend]";
      
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

  // Auto-sync selected user when currentUserId changes
  React.useEffect(() => {
    if (currentUserId && !selectedUser) {
      setSelectedUser(currentUserId);
    }
  }, [currentUserId]);

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
        const userMatch = userObj 
          ? userObj.display_name.toLowerCase().includes(query) 
          : false;
        return itemMatch || purposeMatch || userMatch;
      });
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [materials, statusFilter, searchQuery, users]);

  // Handle addition
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !itemName.trim() || !purpose.trim()) {
      alert("Bitte fülle alle Pflichtfelder aus (Besteller, Artikel, Verwendungszweck).");
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg(null);
    try {
      await onAddMaterial({
        user_id: selectedUser,
        item_name: itemName.trim(),
        url: websiteUrl.trim(),
        purpose: purpose.trim(),
        quantity,
        price: price.trim(),
        status: "pending",
      });

      // Reset form (except user_id to keep preference)
      setItemName("");
      setWebsiteUrl("");
      setPurpose("");
      setQuantity(1);
      setPrice("");

      setSuccessMsg("Material wurde erfolgreich zur Bestellliste hinzugefügt! 📦");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err) {
      console.error(err);
      alert("Fehler beim Speichern der Materialbestellung.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
      alert("Fehler beim Aktualisieren des Bestellstatus.");
    }
  };

  // Delete article
  const handleDelete = async (id: string) => {
    if (!window.confirm("Möchtest du diesen Artikel wirklich aus der Bestellliste löschen?")) {
      return;
    }
    try {
      await onDeleteMaterial(id);
    } catch (err) {
      console.error(err);
      alert("Fehler beim Löschen des Artikels.");
    }
  };

  // Export as CSV for Buyer/Purchaser
  const handleExportCSV = () => {
    if (materials.length === 0) {
      alert("Die Bestellliste ist leer. Es gibt nichts zu exportieren!");
      return;
    }

    // Prepare CSV header and rows
    const headers = [
      "ID",
      "Bestellt Von",
      "Artikel",
      "Anzahl",
      "Preis (Soll)",
      "Website / Link",
      "Verwendungszweck",
      "Hinzugefuegt am",
      "Status"
    ];

    const rows = sortedAndFilteredMaterials.map((m) => {
      const requester = users.find((u) => u.id === m.user_id)?.display_name || "Unbekannt";
      const statusLabel = 
        m.status === "received" ? "Erhalten" : 
        m.status === "ordered" ? "Bestellt" : 
        "Ausstehend / Offen";
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
        statusLabel
      ];
    });

    // Generate CSV string with UTF-8 BOM representation for Excel German character compatibility
    const csvContent = 
      "\uFEFF" + 
      [headers.join(";"), ...rows.map((r) => r.map((val) => `"${val}"`).join(";"))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `bestellliste_material_pfingstlager_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Component
  const StatusBadge = ({ status }: { status?: string }) => {
    switch (status) {
      case "received":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Erhalten
          </span>
        );
      case "ordered":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShoppingBag className="h-3.5 w-3.5" /> Bestellt
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Hourglass className="h-3.5 w-3.5" /> Ausstehend
          </span>
        );
    }
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
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white font-display">
              Bestellliste für Material
            </h2>
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
              copySuccess 
                ? "bg-emerald-500 text-slate-950 shadow-emerald-500/10" 
                : "bg-slate-950 border border-emerald-500/30 hover:border-emerald-500/80 hover:bg-slate-900 text-emerald-450 shadow-black/20"
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
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-emerald-500/10 p-6 shadow-xl shadow-black/40 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
              <Plus className="h-5 w-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-emerald-400 font-mono uppercase tracking-wider">
                Materialbedarf anmelden
              </h3>
            </div>

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-medium flex items-center gap-2.5 animate-pulse">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
              
              {/* Field 1: Von wem bestellt (mit default selection / log-in check) */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">
                  Bestellt von (aktuell ausgewählte Person) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-slate-200 p-3 outline-none focus:border-emerald-500/50 transition duration-150"
                  required
                >
                  <option value="">-- Wer bestellt das Material? --</option>
                  {users.map((u) => (
                    <option key={`opt-usr-${u.id}`} value={u.id}>
                      {u.display_name} ({u.role || "Helfer"})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">
                  Standardmäßig ist deine aktuell am Kopfende ausgewählte Person voreingestellt.
                </p>
              </div>

              {/* Field 2: Artikel */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">
                  Artikel / Materialbezeichnung <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="z.B. Packung Buntstifte, 50 Stk"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-slate-200 p-3 outline-none focus:border-emerald-500/50 transition duration-150"
                  required
                />
              </div>

              {/* Grid: Quantity & Estimated Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-block block">Anzahl</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl text-slate-200 p-3 outline-none focus:border-emerald-500/50 transition duration-150"
                  />
                </div>

                {/* Price Estimate */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-block block">Ungefährer Preis</label>
                  <input
                    type="text"
                    placeholder="z.B. 12,99 €"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl text-slate-200 p-3 outline-none focus:border-emerald-500/50 transition duration-150"
                  />
                </div>
              </div>

              {/* Field 3: Link/URL */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">
                  Website URL (z.B. Amazon / Obi Partnerlink)
                </label>
                <input
                  type="url"
                  placeholder="https://www.amazon.de/..."
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-slate-200 p-3 outline-none focus:border-emerald-500/50 transition duration-150 text-slate-400"
                />
              </div>

              {/* Field 4: Purpose */}
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold block">
                  Wofür wird es benötigt? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  placeholder="z.B. Für die Kreativ-Workshops am Sonntag Nachmittag im Bastelzelt."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl text-slate-200 p-3 outline-none focus:border-emerald-500/50 h-24 resize-none transition duration-150"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black rounded-xl tracking-wide uppercase cursor-pointer transition shadow-md active:scale-[0.99]"
              >
                {isSubmitting ? "Wird gespeichert..." : "In die Bestellliste eintragen 📝"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Interactive material listings and details board (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          
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
                  statusFilter === "all" 
                    ? "bg-slate-850 border border-slate-700 text-white" 
                    : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                Alle ({materials.length})
              </button>
              <button
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  statusFilter === "pending"
                    ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                    : "bg-transparent text-slate-400 hover:text-amber-400 hover:bg-slate-900"
                }`}
              >
                Ausstehend ({materials.filter((m) => (m.status || "pending") === "pending").length})
              </button>
              <button
                onClick={() => setStatusFilter("ordered")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  statusFilter === "ordered"
                    ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
                    : "bg-transparent text-slate-400 hover:text-blue-400 hover:bg-slate-900"
                }`}
              >
                Bestellt ({materials.filter((m) => m.status === "ordered").length})
              </button>
              <button
                onClick={() => setStatusFilter("received")}
                className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition ${
                  statusFilter === "received"
                    ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                    : "bg-transparent text-slate-400 hover:text-emerald-400 hover:bg-slate-900"
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
                      item.status === "received" 
                        ? "border-emerald-500/10" 
                        : item.status === "ordered"
                        ? "border-blue-500/10"
                        : "border-slate-850"
                    }`}
                  >
                    {/* Left: Article Details */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={item.status} />
                        
                        {item.quantity && item.quantity > 1 && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-300 rounded border border-slate-700">
                            {item.quantity} Stück
                          </span>
                        )}

                        {item.price && (
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-855 text-emerald-400 bg-slate-950/40 rounded border border-slate-800">
                            {item.price}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-extrabold text-base text-slate-100 font-sans leading-relaxed">
                          {item.item_name}
                        </h4>
                        
                        <p className="text-xs text-slate-350 text-slate-300 leading-relaxed bg-slate-950/35 p-3 rounded-xl border border-slate-850 max-w-xl font-sans">
                          {item.purpose}
                        </p>
                      </div>

                      {/* URL external link */}
                      {item.url && (
                        <div className="inline-flex">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-semibold text-xs hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Website aufrufen (z.B. Amazon-Shop)
                          </a>
                        </div>
                      )}

                      {/* Creator Identity & Meta */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/50 text-[10px] text-slate-500 font-mono">
                        <span className="font-bold text-slate-400 capitalize">
                          Besteller: {creator ? creator.display_name : "Unbekannter Helfer"}
                        </span>
                        <span>•</span>
                        <span>Eingetragen am: {new Date(item.created_at).toLocaleDateString("de-DE")}</span>
                      </div>
                    </div>

                    {/* Right: Actions / Updates */}
                    <div className="flex sm:flex-col justify-between items-end gap-3 shrink-0 pt-3 sm:pt-0 sm:border-l sm:border-slate-800/50 sm:pl-5">
                      
                      {/* State manipulation button - allow logged in helpers to toggle status to help purchaser, or admins */}
                      <div className="flex flex-col gap-1.5 w-full">
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                          Status anpassen:
                        </span>
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
        </div>

      </div>
    </div>
  );
}
