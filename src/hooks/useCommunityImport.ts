import React from "react";
import { Community } from "../types";

type ParsedCommunityRow = { name: string; location: string; participants: number };

// Parsing CSV with support for comma or semicolon
function parseCSVText(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const commas = (firstLine.match(/,/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;
  const separator = semicolons > commas ? ";" : ",";

  const headers = firstLine.split(separator).map((h) => h.trim().replace(/^["']|["']$/g, ""));
  return lines.slice(1).map((line) => {
    const columns = line.split(separator).map((c) => c.trim().replace(/^["']|["']$/g, ""));
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = columns[index] || "";
    });
    return obj;
  });
}

// Mapping parsed sheet/csv structure into standard columns
function mapDataToCommunities(rawData: Record<string, unknown>[]): ParsedCommunityRow[] {
  return rawData
    .map((row) => {
      let name = "";
      let location = "";
      let participants = 0;

      for (const key of Object.keys(row)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("gemeinde") || lowerKey.includes("pfarrei") || lowerKey.includes("name") || lowerKey.includes("parish") || lowerKey.includes("church")) {
          name = String(row[key]);
        } else if (lowerKey.includes("ort") || lowerKey.includes("stadt") || lowerKey.includes("location") || lowerKey.includes("city") || lowerKey.includes("adresse")) {
          location = String(row[key]);
        } else if (
          lowerKey.includes("teilnehmer") ||
          lowerKey.includes("anzahl") ||
          lowerKey.includes("members") ||
          lowerKey.includes("count") ||
          lowerKey.includes("gäste") ||
          lowerKey.includes("participants") ||
          lowerKey === "tn" ||
          lowerKey === "pax"
        ) {
          participants = parseInt(String(row[key]), 10) || 0;
        }
      }

      if (!name) {
        const vals = Object.values(row);
        if (vals.length > 0) name = String(vals[0]);
        if (vals.length > 1) location = String(vals[1]);
        if (vals.length > 2) participants = parseInt(String(vals[2]), 10) || 0;
      }

      return {
        name: name || "Unbenannte Gemeinde",
        location: location || "",
        participants: isNaN(participants) ? 0 : participants,
      };
    })
    .filter((item) => item.name && item.name !== "Unbenannte Gemeinde");
}

/**
 * CSV/XLSX-Import-Pipeline für Gemeinden (Drag & Drop, Datei-Auswahl, Parsing,
 * Vorschau, Bestätigung). Extrahiert aus CommunitiesView.tsx.
 */
export function useCommunityImport(
  onImportCommunities: (items: Omit<Community, "id" | "camp_id">[]) => Promise<void>,
  onImportSuccess: () => void
) {
  const [dragActive, setDragActive] = React.useState(false);
  const [parsedData, setParsedData] = React.useState<ParsedCommunityRow[] | null>(null);
  const [importFeedback, setImportFeedback] = React.useState<{ success: boolean; message: string } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    setImportFeedback(null);
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    const reader = new FileReader();

    if (fileExtension === "csv") {
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const raw = parseCSVText(text);
          const mapped = mapDataToCommunities(raw);
          setParsedData(mapped);
          if (mapped.length === 0) {
            setImportFeedback({
              success: false,
              message: "Keine gültigen Daten gefunden. Bitte Spaltennamen überprüfen (Gemeindename, Ort, Teilnehmer).",
            });
          }
        } catch (err) {
          console.error(err);
          setImportFeedback({ success: false, message: "Konnte die CSV-Datei nicht parsen." });
        }
      };
      reader.readAsText(file, "UTF-8");
    } else if (fileExtension === "xlsx" || fileExtension === "xls") {
      reader.onload = async (e) => {
        try {
          // xlsx (~430 KB) nur laden, wenn wirklich eine Excel-Datei importiert
          // wird - sonst würde jede*r Helfer*in es beim ersten App-Start
          // mitladen, obwohl nur die Gemeinden-Verwaltung (Bereichsleitung+)
          // es je nutzt.
          const XLSX = await import("xlsx");
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const raw = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];
          const mapped = mapDataToCommunities(raw);
          setParsedData(mapped);
          if (mapped.length === 0) {
            setImportFeedback({
              success: false,
              message: "Keine gültigen Daten in Excel gefunden. Bitte Spalten 'Gemeindename', 'Ort', 'Teilnehmer' prüfen.",
            });
          }
        } catch (err) {
          console.error(err);
          setImportFeedback({ success: false, message: "Fehler beim Lesen der Excel-Datei." });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportFeedback({ success: false, message: "Dateiformat wird nicht unterstützt. Bitte .csv, .xlsx oder .xls verwenden." });
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.length === 0) return;
    try {
      await onImportCommunities(parsedData);
      setImportFeedback({ success: true, message: `${parsedData.length} Gemeinde(n) erfolgreich importiert!` });
      setParsedData(null);
      onImportSuccess();
    } catch (err) {
      console.error(err);
      setImportFeedback({ success: false, message: "Fehler beim Eintragen der importierten Daten in die Datenbank." });
    }
  };

  const downloadSampleExcel = async () => {
    const XLSX = await import("xlsx");
    const data = [
      { Gemeindename: "Sankt Elisabeth", Ort: "Heidelberg", "Anzahl Teilnehmer*innen": 18 },
      { Gemeindename: "Heilig Geist", Ort: "Mannheim", "Anzahl Teilnehmer*innen": 25 },
      { Gemeindename: "Sankt Bonifatius", Ort: "Karlsruhe", "Anzahl Teilnehmer*innen": 12 },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Gemeinden");
    XLSX.writeFile(workbook, "gemeinden_import_vorlage.xlsx");
  };

  return {
    dragActive,
    parsedData,
    setParsedData,
    importFeedback,
    setImportFeedback,
    handleDrag,
    handleDrop,
    handleFileChange,
    handleConfirmImport,
    downloadSampleExcel,
  };
}
