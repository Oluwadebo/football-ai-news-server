// server.js
require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
const path = require("path");

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

const helmet = require("helmet");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:", "res.cloudinary.com"],
      },
    },
  }),
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "DELETE", "PATCH"],
    credentials: true,
  }),
);
app.use(express.json());

const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP",
});

app.use("/api/", limiter);
app.use("/api/articles", articleRoutes);
app.use("/api/standings", standingsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", discoverRoutes);

// CORS
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../frontend/dist");
  app.use(express.static(distPath));

  // FIXED: Express 5.x compatible catch-all route
  // Must come AFTER API routes and AFTER static files
  app.get(/.*/, (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:5173",
//     methods: ["GET", "POST", "DELETE", "PATCH"],
//     credentials: true,
//   }),
// );

// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL,
//        methods: ["GET", "POST", "DELETE", "PATCH"],
//     credentials: true,
//   }),
// );

// app.use(express.json());

// Routes - Clean & Clear
// app.use("/api/articles", articleRoutes);
// app.use("/api/standings", standingsRoutes);
// app.use("/api/admin", adminRoutes);
// app.use("/api", discoverRoutes); // discover-news etc.

// MongoDB Connection with better options
const connectDB = async (retries = 3) => {
  while (retries) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 60000,
        connectTimeoutMS: 30000,
        family: 4,
      });
      console.log("✅ MongoDB connected successfully");
      return;
    } catch (err) {
      console.error(
        `❌ MongoDB connection failed (${retries} retries left):`,
        err.message,
      );
      retries -= 1;
      if (retries === 0) {
        console.error("Max retries reached. Exiting...");
        process.exit(1);
      }
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
};

connectDB();

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  await mongoose.connection.close();
  process.exit(0);
});

cron.schedule("*/50 * * * *", async () => {
  if (!getAutomation()) {
    console.log("⏸️ Automation disabled → skipping cycle");
    return;
  }

  console.log(`[${new Date().toISOString()}] Starting automated news cycle...`);
  try {
    await runAutomationCycle();
    console.log("✅ News cycle completed successfully");
  } catch (err) {
    console.error("❌ News cycle failed:", err.message);
  }
});

// Initial run after startup
setTimeout(async () => {
  if (getAutomation()) {
    console.log("🔄 Syncing football targets...");
    try {
      await syncFootballTargets();
    } catch (err) {
      console.error("⚠️ Target sync failed:", err.message);
    }

    console.log("🚀 Running initial news cycle...");
    try {
      await runAutomationCycle();
    } catch (err) {
      console.error("❌ Initial cycle failed:", err.message);
    }
  }
}, 8000);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Automation: ${getAutomation() ? "ENABLED" : "DISABLED"}`);
});
