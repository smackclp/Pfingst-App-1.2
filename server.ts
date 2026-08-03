import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Router Imports
import apiRouter from "./server/routes/api";
import exportRouter from "./server/routes/export";

// Firebase Bootstrapping Imports
import { getUnifiedDB, initFirestoreSync } from "./server/firebase";
import { setCachedDB } from "./server/db";

const app = express();
const PORT = 3000;

app.use(express.json());

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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running in ${process.env.NODE_ENV || "development"} mode on http://0.0.0.0:${PORT}`);
  });
}

startServer();
