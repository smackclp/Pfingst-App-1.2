import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";

// Router Imports
import apiRouter from "./server/routes/api";
import exportRouter from "./server/routes/export";

// Firebase Bootstrapping Imports
import { getUnifiedDB, initFirestoreSync } from "./server/firebase";
import { setCachedDB } from "./server/db";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Content-Security-Policy: nur in Produktion aktiv. Im Dev-Modus injiziert
// Vite eigene Inline-Scripts (React-Refresh-Preamble, HMR-Client), deren
// Inhalt sich je nach Vite-Version ändert - eine strikte CSP würde dort
// unvorhersehbar brechen. Der Produktions-Build enthält dagegen nur das eine
// feste Inline-<script> aus index.html (Early-Error-Suppression), dessen
// SHA-256-Hash beim Serverstart direkt aus der gebauten dist/index.html
// berechnet wird - ändert sich das Script, ändert sich der Hash automatisch
// mit, statt die CSP still brechen zu lassen.
let cspHeader: string | null = null;

function buildCspHeader(inlineScriptHash: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'sha256-${inlineScriptHash}'`,
    // 'unsafe-inline' nur für style-src: html2canvas (PDF-Export) klont den
    // Baum in ein Offscreen-Dokument und injiziert dabei ein eigenes,
    // dynamisch berechnetes <style>-Element - dessen Inhalt ändert sich pro
    // Export, ein statischer Hash ist dafür nicht möglich. CSS-Injection ist
    // ein deutlich kleineres Risiko als Script-Injection (kein Code-Execute),
    // script-src bleibt strikt (kein unsafe-inline/unsafe-eval).
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://api.qrserver.com",
    "connect-src 'self'",
    "frame-src 'self' https://open.spotify.com",
    "frame-ancestors 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

// Grundlegende Sicherheits-Header ohne neue Abhängigkeit (kein helmet nötig
// für diese wenigen, statischen Werte).
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  if (cspHeader) {
    res.setHeader("Content-Security-Policy", cspHeader);
  }
  next();
});

// API mounting
app.use("/api", apiRouter);
app.use("/api", exportRouter); // mounts /api/export-html

// Service Worker route
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript");
  res.sendFile(path.join(process.cwd(), "sw.js"));
});

// PWA Manifest route
app.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.sendFile(path.join(process.cwd(), "manifest.json"));
});

// PWA App Icons
app.get("/logo-192.png", (req, res) => {
  res.sendFile(path.join(process.cwd(), "src/assets/images/logo_512_1782066034193.jpg"));
});

app.get("/logo-512.png", (req, res) => {
  res.sendFile(path.join(process.cwd(), "src/assets/images/logo_512_1782066034193.jpg"));
});


// Live Server/Asset Middleware fallback
async function startServer() {
  console.log("Initializing server database state...");
  try {
    const cloudDB = await getUnifiedDB(true);
    setCachedDB(cloudDB);
    initFirestoreSync();
    console.log("Database state initialized and synced successfully!");
  } catch (err) {
    console.error("Failed to initialize remote cloud database state during boot:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const indexHtml = fs.readFileSync(path.join(distPath, "index.html"), "utf8");
    const inlineScriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>/);
    if (inlineScriptMatch) {
      const hash = crypto.createHash("sha256").update(inlineScriptMatch[1], "utf8").digest("base64");
      cspHeader = buildCspHeader(hash);
    } else {
      console.warn("Konnte Inline-Script in dist/index.html nicht finden - CSP wird ohne script-src-Hash übersprungen.");
    }
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Zentrale Fehlerbehandlung (muss nach allen Routen registriert werden):
  // fängt sowohl von Route-Handlern durchgereichte Fehler (next(err)) als
  // auch von Express automatisch abgefangene synchrone throws ab. Sorgt für
  // ein einheitliches JSON-Fehlerformat ({error: "..."}, wie es der Rest der
  // API bereits nutzt) statt Express' Standard-HTML-Fehlerseite.
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`Unbehandelter Fehler bei ${req.method} ${req.path}:`, err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: "Interner Serverfehler. Bitte versuche es erneut." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running in ${process.env.NODE_ENV || "development"} mode on http://0.0.0.0:${PORT}`);
  });
}

startServer();
