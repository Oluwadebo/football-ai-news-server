// src/routes/admin.js
const express = require("express");
const router = express.Router();
const Article = require("../models/Article");
const PendingNews = require("../models/PendingNews");
const { runAutomationCycle } = require("../jobs/automationJob");
const { setAutomation, getAutomation } = require("../config/automationState");

const ADMIN_PASSWORD = "footyai2025"; // Change this in production

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

// List pending items
router.get("/pending", async (req, res) => {
  try {
    const pending = await PendingNews.find({ status: "discovered" })
      .sort({ discoveredAt: -1 })
      .limit(30);

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

// Publish pending item
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
      summary: pending.content?.slice(0, 150) + "..." || "No summary",
      content:
        pending.content +
        "\n\n[PROCESSED BY PITCHPULSE AGENT]: Deep tactical analysis currently being updated based on real-time data feeds.",
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
      message: "Article published",
      articleId: article._id.toString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle automation
router.post("/toggle-automation", (req, res) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ error: "'enabled' must be boolean" });
  }
  setAutomation(enabled);
  res.json({ success: true, automationEnabled: enabled });
});

// Get automation status
router.get("/automation-status", (req, res) => {
  res.json({
    automationEnabled: getAutomation(),
    serverTime: new Date().toISOString(),
  });
});

// Manual trigger
router.post("/run-now", async (req, res) => {
  try {
    await runAutomationCycle();
    res.json({ message: "Manual automation cycle executed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
