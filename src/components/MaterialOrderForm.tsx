import React from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { User, MaterialItem } from "../types";
import FieldError from "./FieldError";

interface MaterialOrderFormProps {
  users: User[];
  currentUserId: string | null;
  onAddMaterial: (material: Omit<MaterialItem, "id" | "created_at">) => Promise<void>;
  showToast: (msg: string) => void;
}

/** "Materialbedarf anmelden"-Formular. Extrahiert aus MaterialsView.tsx. */
export default function MaterialOrderForm({ users, currentUserId, onAddMaterial, showToast }: MaterialOrderFormProps) {
  const [selectedUser, setSelectedUser] = React.useState<string>(currentUserId || "");
  const [itemName, setItemName] = React.useState<string>("");
  const [websiteUrl, setWebsiteUrl] = React.useState<string>("");
  const [purpose, setPurpose] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [price, setPrice] = React.useState<string>("");

  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{ selectedUser?: string; itemName?: string; purpose?: string }>({});

  // Auto-sync selected user when currentUserId changes
  React.useEffect(() => {
    if (currentUserId && !selectedUser) {
      setSelectedUser(currentUserId);
    }
  }, [currentUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};
    if (!selectedUser) newErrors.selectedUser = "Bitte wähle eine bestellende Person aus.";
    if (!itemName.trim()) newErrors.itemName = "Bitte gib einen Artikel ein.";
    if (!purpose.trim()) newErrors.purpose = "Bitte gib den Verwendungszweck an.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

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
      showToast("Fehler beim Speichern der Materialbestellung.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-emerald-500/10 p-6 shadow-xl shadow-black/40 space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <Plus className="h-5 w-5 text-emerald-400" />
        <h3 className="font-bold text-sm text-emerald-400 font-mono uppercase tracking-wider">Materialbedarf anmelden</h3>
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
            onChange={(e) => {
              setSelectedUser(e.target.value);
              setErrors((prev) => ({ ...prev, selectedUser: undefined }));
            }}
            className={`w-full bg-slate-950 border rounded-xl text-slate-200 p-3 outline-none focus:border-emerald-500/50 transition duration-150 ${
              errors.selectedUser ? "border-rose-500/60" : "border-slate-800"
            }`}
          >
            <option value="">-- Wer bestellt das Material? --</option>
            {users.map((u) => (
              <option key={`opt-usr-${u.id}`} value={u.id}>
                {u.display_name} ({u.role || "Helfer"})
              </option>
            ))}
          </select>
          <FieldError message={errors.selectedUser} />
          <p className="text-[10px] text-slate-500">Standardmäßig ist deine aktuell am Kopfende ausgewählte Person voreingestellt.</p>
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
            onChange={(e) => {
              setItemName(e.target.value);
              setErrors((prev) => ({ ...prev, itemName: undefined }));
            }}
            className={`w-full bg-slate-950 border rounded-xl text-slate-200 p-3 outline-none focus:border-emerald-500/50 transition duration-150 ${
              errors.itemName ? "border-rose-500/60" : "border-slate-800"
            }`}
          />
          <FieldError message={errors.itemName} />
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
          <label className="text-slate-300 font-bold block">Website URL (z.B. Amazon / Obi Partnerlink)</label>
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
            onChange={(e) => {
              setPurpose(e.target.value);
              setErrors((prev) => ({ ...prev, purpose: undefined }));
            }}
            className={`w-full bg-slate-950 border rounded-xl text-slate-200 p-3 outline-none focus:border-emerald-500/50 h-24 resize-none transition duration-150 ${
              errors.purpose ? "border-rose-500/60" : "border-slate-800"
            }`}
          />
          <FieldError message={errors.purpose} />
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
  );
}
