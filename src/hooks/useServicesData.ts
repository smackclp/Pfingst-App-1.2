import { Service } from "../types";

/** Mutations-Funktionen für Dienste (Services), extrahiert aus useZeltlagerData. */
export function useServicesData(loadDatabase: (silent?: boolean) => Promise<void>) {
  const handleAddService = async (servicePayload: Omit<Service, "id">) => {
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicePayload),
    });
    if (!res.ok) throw new Error("Adding service failed");
    await loadDatabase(true);
  };

  const handleUpdateService = async (id: string, servicePayload: Partial<Service>) => {
    const res = await fetch(`/api/services/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicePayload),
    });
    if (!res.ok) throw new Error("Updating service failed");
    await loadDatabase(true);
  };

  const handleDeleteService = async (id: string) => {
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Deleting service failed");
    await loadDatabase(true);
  };

  return { handleAddService, handleUpdateService, handleDeleteService };
}
