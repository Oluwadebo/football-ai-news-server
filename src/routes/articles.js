const express = require("express");
const Article = require("../models/Article");
const router = express.Router();

// GET latest / home
router.get("/articles", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const arts = await Article.find()
      .sort({ publishedAt: -1 }) // or createdAt if you prefer
      .limit(limit)
      .skip(skip)
      .select(
        "title summary content imageUrl publishedAt eventType tags isTrending score",
      );

      const total = await Article.countDocuments();

      const formatted = arts.map((a) => ({
        id: a._id.toString(),
        title: a.title,
        summary: a.summary,
        content: a.content,
        imageUrl: a.imageUrl,
        publishedAt: a.publishedAt.toISOString(),
        eventType: a.eventType || "news",
        tags: a.tags || [],
        isTrending: !!a.isTrending,
        score: a.score || 0,
      }));

      res.json({
        articles: formatted,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalArticles: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      });

    // res.json(
    //   arts.map((a) => ({
    //     id: a._id.toString(),
    //     title: a.title,
    //     summary: a.summary,
    //     content: a.content,
    //     imageUrl: a.imageUrl,
    //     publishedAt: a.publishedAt.toISOString(),
    //     eventType: a.eventType || "news",
    //     tags: a.tags,
    //     isTrending: a.isTrending,
    //   })),
    // );
  } catch (err) {
    console.error("Pagination error:", err);
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
