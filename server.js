// server.js
require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");

const articleRoutes = require("./src/routes/articles");
const adminRoutes = require("./src/routes/admin");
const discoverRoutes = require("./src/routes/discover");
const { runAutomationCycle } = require("./src/jobs/automationJob");
const { getAutomation } = require("./src/config/automationState");
const {
  syncFootballTargets,
  getLiveTargets,
} = require("./src/services/dynamicConfig");
const standingsRoutes = require("./src/routes/standings");

const app = express();

// CORS
if (process.env.NODE_ENV === "production") {
  const path = require("path");
  // Serve static files from the React app
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  app.get("(.*)", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist", "index.html"));
  });
}

// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:5173",
//     methods: ["GET", "POST", "DELETE", "PATCH"],
//     credentials: true,
//   }),
// );

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Set this to https://your-site.com in Render env vars
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true,
  }),
);

app.use(express.json());

// Routes - Clean & Clear
app.use("/api/articles", articleRoutes); // ← Best practice: specific mount
app.use("/api/standings", standingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", discoverRoutes); // discover-news etc.

// MongoDB Connection with better options
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    family: 4, // Prefer IPv4
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// Automation Schedule (every 12 minutes)
cron.schedule("*/12 * * * *", async () => {
  if (!getAutomation()) {
    console.log("Automation is disabled → skipping cycle");
    return;
  }

  console.log(`[${new Date().toISOString()}] Starting automated news cycle...`);
  try {
    await runAutomationCycle();
    console.log("News cycle completed successfully");
  } catch (err) {
    console.error("News cycle failed:", err.message);
  }
});

// Initial run after startup
setTimeout(async () => {
  if (getAutomation()) {
    console.log("Syncing football targets...");
    await syncFootballTargets();
    console.log("Running initial news cycle on server startup...");
    try {
      await runAutomationCycle();
    } catch (err) {
      console.error("Initial cycle failed:", err.message);
    }
  }
}, 8000);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Automation: ${getAutomation() ? "ENABLED" : "DISABLED"}`);
});
