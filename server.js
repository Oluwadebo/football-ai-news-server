// server.js
require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");

const Article = require("./src/models/Article");
const articleRoutes = require("./src/routes/articles");
const adminRoutes = require("./src/routes/admin");
const discoverRoutes = require("./src/routes/discover");
const { runAutomationCycle } = require("./src/jobs/automationJob");
const { getAutomation } = require("./src/config/automationState");

// console.log("runAutomationCycle type:", typeof runAutomationCycle);
// console.log("runAutomationCycle exists?", !!runAutomationCycle);

const app = express();

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true,
  }),
);

app.use(express.json());

// Routes
app.use("/api/articles", articleRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", discoverRoutes); // includes /api/discover-news

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB failed:", err.message);
    console.error("Full error:", err);process.exit(1);
  });

app.get("/api/articles", async (req, res) => {
  try {
    const articles = await Article.find().sort({ createdAt: -1 }).limit(20);
    res.status(200).json(articles);
  } catch (err) {
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// Automation schedule (runs every 12 minutes)
cron.schedule("0 * * * *", async () => {
  if (!getAutomation()) {
    console.log("Automation is disabled → skipping scheduled cycle");
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

// Optional: initial run ~8 seconds after server start
setTimeout(async () => {
  if (getAutomation()) {
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
  console.log(`Automation state: ${getAutomation() ? "ENABLED" : "DISABLED"}`);
});

console.log("runAutomationCycle type:", typeof runAutomationCycle);
console.log("runAutomationCycle exists?", !!runAutomationCycle);
