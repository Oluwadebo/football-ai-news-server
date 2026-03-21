const express = require("express");
const Article = require("../models/Article");
const router = express.Router();

// GET latest / home
router.get("/articles", async (req, res) => {
  try {
    const arts = await Article.find()
      .sort({ publishedAt: -1 })
      .limit(20)
      .select(
        "title summary content imageUrl publishedAt eventType tags isTrending score",
      );
    res.json(
      arts.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        summary: a.summary,
        content: a.content,
        imageUrl: a.imageUrl,
        publishedAt: a.publishedAt.toISOString(),
        eventType: a.eventType,
        tags: a.tags,
        isTrending: a.isTrending,
      })),
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
  // console.log(`Returning ${articles.length} articles from DB`);
});

// GET single
router.get("/articles/:id", async (req, res) => {
  try {
    const a = await Article.findById(req.params.id);
    if (!a) return res.status(404).json({ error: "Not found" });
    res.json({
      id: a._id.toString(),
      ...a.toObject(),
      publishedAt: a.publishedAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
