import React from "react";
import { User as UserType, Service, Shift, ShiftAssignment } from "../types";
import { formatDateGerman } from "../utils";

// --- STATUS EDITING MODAL ---
interface StatusEditingModalProps {
  assignment: ShiftAssignment;
  user: UserType | null;
  shift: Shift | null;
  service: Service | null;
  onClose: () => void;
  onSave: (status: 'pending' | 'accepted' | 'declined' | 'maybe', declineReason: string) => Promise<void>;
}

function StatusEditingModal({
  assignment,
  user,
  shift,
  service,
  onClose,
  onSave,
}: StatusEditingModalProps) {
  const [selectedStatus, setSelectedStatus] = React.useState<'pending' | 'accepted' | 'declined' | 'maybe'>(() => {
    return assignment.status || (assignment.accepted ? 'accepted' : 'pending');
  });
  const [declineReason, setDeclineReason] = React.useState(() => assignment.decline_reason || '');
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selectedStatus, selectedStatus === 'declined' ? declineReason : '');
      onClose();
    } catch (err) {
      console.error("Fehler beim Speichern des Status:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in" id="status-edit-modal">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 text-white animate-scale-up">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-extrabold font-display text-white">Dienst-Rückmeldung ändern</h3>
            <p className="text-[11px] text-slate-400 mt-1 justify-normal">Stelle den aktuellen Bestätigungsstatus für diese Einteilung ein.</p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1.5 text-[11px]">
          <p className="font-sans text-slate-300">
            <span className="font-mono text-slate-500 font-bold mr-1.5">HELFER:</span> <strong className="text-white font-sans">{user?.display_name || "Unbekannt"}</strong>
          </p>
          <p className="font-sans text-slate-300">
            <span className="font-mono text-slate-500 font-bold mr-1.5">DIENST:</span> <span className="font-medium text-emerald-400">{service?.title || "Dienst"}</span> ({service?.location || "Lager"})
          </p>
          <p className="font-sans text-slate-300">
            <span className="font-mono text-slate-500 font-bold mr-1.5">ZEITPUNKT:</span> <span className="font-mono text-amber-400">{shift ? `${formatDateGerman(shift.date)}, ${shift.start_time} - ${shift.end_time} Uhr` : ""}</span>
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider font-mono">Status auswählen:</label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedStatus('accepted')}
              className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                selectedStatus === 'accepted'
                  ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold"
                  : "bg-slate-950/50 border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-slate-300"
              }`}
            >
              <span className="text-base">✓</span>
              <span className="text-xs">Bestätigt</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('maybe')}
              className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                selectedStatus === 'maybe'
                  ? "bg-amber-950/40 border-amber-500 text-amber-300 font-bold"
                  : "bg-slate-950/50 border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-slate-300"
              }`}
            >
              <span className="text-base">⏳</span>
              <span className="text-xs">Unsicher</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('declined')}
              className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                selectedStatus === 'declined'
                  ? "bg-rose-950/40 border-rose-500 text-rose-300 font-bold"
                  : "bg-slate-950/50 border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-slate-300"
              }`}
            >
              <span className="text-base">❌</span>
              <span className="text-xs">Abgelehnt</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedStatus('pending')}
              className={`p-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                selectedStatus === 'pending'
                  ? "bg-slate-800/40 border-slate-500 text-slate-200 font-bold"
                  : "bg-slate-950/50 border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-slate-300"
              }`}
            >
              <span className="text-base">💤</span>
              <span className="text-xs">Ausstehend</span>
            </button>
          </div>
        </div>

        {selectedStatus === 'declined' && (
          <div className="space-y-1.5 animate-fade-in">
            <label className="text-[11px] font-bold text-rose-300 block uppercase tracking-wider font-mono">Grund für die Absage:</label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="z.B. Keine Zeit, Krankheitsfall, anderweitig verplant..."
              className="w-full text-xs p-2.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-rose-500 hover:border-slate-700 outline-none transition text-white min-h-[70px] resize-none"
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/10 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? "Wird gespeichert..." : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- MODAL MANAGER MAIN ---
// Hinweis: Der frühere client-seitige "Admin-Passwort"-Freischalter wurde entfernt.
// Die Zugriffsrolle kommt jetzt ausschließlich aus dem serverseitig geprüften Login
// (siehe src/lib/apiAuth.ts) und kann nicht mehr durch ein im Frontend sichtbares
// Passwort umgangen werden.
interface ModalManagerProps {
  statusEditingAssignmentId: string | null;
  onCloseStatusEditingModal: () => void;
  assignments: ShiftAssignment[];
  shifts: Shift[];
  users: UserType[];
  services: Service[];
  onUpdateAssignmentStatus: (
    assignmentId: string,
    status: 'pending' | 'accepted' | 'declined' | 'maybe',
    declineReason?: string
  ) => Promise<void>;
}

export default function ModalManager({
  statusEditingAssignmentId,
  onCloseStatusEditingModal,
  assignments,
  shifts,
  users,
  services,
  onUpdateAssignmentStatus,
}: ModalManagerProps) {
  const editingAssignment = React.useMemo(() => {
    return assignments.find((a) => a.id === statusEditingAssignmentId);
  }, [assignments, statusEditingAssignmentId]);

  const editingUser = React.useMemo(() => {
    return editingAssignment ? users.find((u) => u.id === editingAssignment.user_id) : null;
  }, [users, editingAssignment]);

  const editingShift = React.useMemo(() => {
    return editingAssignment ? shifts.find((s) => s.id === editingAssignment.shift_id) : null;
  }, [shifts, editingAssignment]);

  const editingService = React.useMemo(() => {
    return editingShift ? services.find((s) => s.id === editingShift.service_id) : null;
  }, [services, editingShift]);

  return (
    <>
      {statusEditingAssignmentId && editingAssignment && (
        <StatusEditingModal
          assignment={editingAssignment}
          user={editingUser}
          shift={editingShift}
          service={editingService}
          onClose={onCloseStatusEditingModal}
          onSave={async (status, declineReason) => {
            await onUpdateAssignmentStatus(statusEditingAssignmentId, status, declineReason);
            onCloseStatusEditingModal();
          }}
        />
      )}
    </>
  );
}
