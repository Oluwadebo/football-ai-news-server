// src/routes/discover.js
const express = require("express");
const router = express.Router();
const { fetchAndScoreNews } = require("../services/rssFetcher");
const PendingNews = require("../models/PendingNews");

router.post("/discover-news", async (req, res) => {
  try {
    const rawItems = await fetchAndScoreNews();

    const saved = [];
    for (const item of rawItems) {
      const exists = await PendingNews.findOne({ title: item.title });
      if (exists) continue;

      const pending = new PendingNews({
        title: item.title,
        content: item.content,
        source: item.source,
        score: item.score,
        discoveredAt: item.pubDate || new Date(),
        status: "discovered",
      });

      await pending.save();
      saved.push(pending);
    }

    const currentQueue = await PendingNews.find({ status: "discovered" })
      .sort({ discoveredAt: -1 })
      .limit(30);

    res.json(
      currentQueue.map((p) => ({
        id: p._id.toString(),
        title: p.title,
        content: p.content?.slice(0, 300) || "",
        source: p.source,
        score: p.score,
        discoveredAt: p.discoveredAt.toISOString(),
        status: p.status,
      })),
    );
  } catch (err) {
    console.error("Discover error:", err);
    res.status(500).json({ error: "Discovery failed" });
  }
});

module.exports = router;
