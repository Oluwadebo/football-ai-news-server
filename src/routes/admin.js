// src/routes/admin.js
const express = require("express");
const router = express.Router();
const Article = require("../models/Article");
const PendingNews = require("../models/PendingNews");
const { runAutomationCycle } = require("../jobs/automationJob");
const { setAutomation, getAutomation } = require("../config/automationState");

// Simple Basic Auth (for local development only – replace with JWT in production)
const ADMIN_PASSWORD = "footyai2025"; // ← CHANGE THIS!

const checkAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (
    !auth ||
    auth !==
      `Basic ${Buffer.from(`admin:${ADMIN_PASSWORD}`).toString("base64")}`
  ) {
    return res
      .status(401)
      .json({ error: "Unauthorized – invalid credentials" });
  }
  next();
};

router.use(checkAdmin);

// List published articles
router.get("/articles", async (req, res) => {
  try {
    const articles = await Article.find()
      .sort({ publishedAt: -1 })
      .limit(50)
      .select("title publishedAt eventType score");

    res.json(
      articles.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        publishedAt: a.publishedAt.toISOString(),
        eventType: a.eventType,
        score: a.score || 0,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete article
router.delete("/articles/:id", async (req, res) => {
  try {
    const deleted = await Article.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Article not found" });
    res.json({ message: "Article deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List pending news items
router.get("/pending", async (req, res) => {
  try {
    const pending = await PendingNews.find({ status: "discovered" })
      .sort({ discoveredAt: -1 })
      .limit(20);

    res.json(
      pending.map((p) => ({
        id: p._id.toString(),
        title: p.title,
        source: p.source,
        score: p.score,
        discoveredAt: p.discoveredAt.toISOString(),
        status: p.status,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Publish one pending item (still placeholder content)
router.post("/publish-pending/:id", async (req, res) => {
  try {
    const pending = await PendingNews.findById(req.params.id);
    if (!pending)
      return res.status(404).json({ error: "Pending item not found" });

    const article = new Article({
      title: pending.title,
      slug: pending.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      summary: pending.content.slice(0, 150) + "...",
      content:
        pending.content +
        "\n\n(Generated content placeholder – integrate Gemini here)",
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(pending.title)}/1200/675`,
      eventType: pending.score >= 8 ? "transfer" : "club",
      tags: ["football", pending.source?.toLowerCase() || "news"],
      publishedAt: new Date(),
      score: pending.score,
      source: pending.source,
    });

    await article.save();
    pending.status = "processed";
    await pending.save();

    res.json({
      message: "Article published from pending queue",
      articleId: article._id.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle automation (now working properly)
router.post("/toggle-automation", (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== "boolean") {
    return res.status(400).json({
      error: "Invalid input – 'enabled' must be a boolean (true/false)",
    });
  }

  setAutomation(enabled);

  res.json({
    success: true,
    automationEnabled: enabled,
    message: `Automation is now ${enabled ? "ENABLED" : "DISABLED"}`,
  });
});

// Get current automation status (useful for frontend)
router.get("/automation-status", (req, res) => {
  res.json({
    automationEnabled: getAutomation(),
    serverTime: new Date().toISOString(),
  });
});

// Manual trigger of automation cycle
router.post("/run-now", async (req, res) => {
  try {
    await runAutomationCycle();
    res.json({ message: "Manual automation cycle executed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
