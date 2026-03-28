// src/routes/articles.js
const express = require("express");
const Article = require("../models/Article");
const router = express.Router();
const axios = require("axios");
const LEAGUE_MAP = {
  "premier league": "PL",
  "la liga": "PD",
  bundesliga: "BL1",
  "serie a": "SA",
  "ligue 1": "FL1",
  "champions league": "CL",
};

// GET /api/articles?page=1&limit=12
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const [articles, total] = await Promise.all([
      Article.find()
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "title summary content imageUrl publishedAt eventType tags isTrending score",
        ),
      Article.countDocuments(),
    ]);

    const formatted = articles.map((a) => ({
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
  } catch (err) {
    console.error("Articles route error:", err);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
});

// GET single article
router.get("/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ error: "Article not found" });

    res.json({
      id: article._id.toString(),
      ...article.toObject(),
      publishedAt: article.publishedAt.toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add this route in articles.js
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Article.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Article not found" });
    res.json({ message: "Article deleted successfully", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:leagueName", async (req, res) => {
  try {
    const code = LEAGUE_MAP[req.params.leagueName.toLowerCase()] || "PL";
    const response = await axios.get(
      `https://api.football-data.org/v4/competitions/${code}/standings`,
      {
        headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY },
      },
    );

    const table = response.data.standings[0].table.map((row) => ({
      pos: row.position,
      name: row.team.shortName || row.team.name,
      logo: row.team.crest,
      p: row.playedGames,
      gd: row.goalDifference,
      pts: row.points,
    }));

    res.json({ league: response.data.competition.name, table });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch live standings" });
  }
});

module.exports = router;
