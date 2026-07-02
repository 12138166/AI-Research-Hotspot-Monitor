import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { getMonitorData, askMonitorAssistant } from "./src/server/monitorService";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Log requests in dev
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });

  // --- API ENDPOINTS ---

  // Endpoint to retrieve AI hotspots and Hacker News categorizations
  app.get("/api/monitor-data", async (req, res) => {
    try {
      const forceRefresh = req.query.refresh === "true";
      const dateStr = typeof req.query.date === "string" ? req.query.date : undefined;
      const data = await getMonitorData(forceRefresh, dateStr);
      res.json(data);
    } catch (error) {
      console.error("Error at GET /api/monitor-data:", error);
      res.status(500).json({
        error: "Failed to retrieve hotspot intelligence data.",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to interact with the AI Hotspot Analyst chatbot
  app.post("/api/monitor-chat", async (req, res) => {
    try {
      const { query, date } = req.body;
      if (!query || typeof query !== "string") {
        res.status(400).json({ error: "A valid 'query' string parameter is required." });
        return;
      }

      // Fetch the state of monitor data (selected date or today) to feed as context
      const dateStr = typeof date === "string" ? date : undefined;
      const monitorData = await getMonitorData(false, dateStr);
      const answer = await askMonitorAssistant(query, monitorData);
      
      res.json({ answer });
    } catch (error) {
      console.error("Error at POST /api/monitor-chat:", error);
      res.status(500).json({
        error: "AI analysis endpoint encountered an error.",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Ping health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // --- VITE MIDDLEWARE INTERACTION ---

  if (process.env.NODE_ENV !== "production") {
    console.log("Vite is booting in dev mode with custom Express middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting Express server in production mode, serving static dist...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files
    app.use(express.static(distPath));
    
    // Fallback index.html for React router / SPA
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Hotspot Monitor full-stack app running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
});
