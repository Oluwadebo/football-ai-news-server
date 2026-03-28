// src/jobs/automationJob.js
const Article = require("../models/Article");
const PendingNews = require("../models/PendingNews");
const { fetchAndScoreNews } = require("../services/rssFetcher");
const {
  generateFullArticle,
  generateAndUploadImage,
} = require("../services/articleGenerator");
const { getLiveTargets } = require("../services/dynamicConfig");

async function runAutomationCycle() {
  try {
    const { players, clubs } = await getLiveTargets();
    const rawItems = await fetchAndScoreNews();
    if (!rawItems || rawItems.length === 0) return;

    for (const raw of rawItems) {
      try {
        const exists = await Article.findOne({ title: raw.title });
        if (exists) continue;

        const generated = await generateFullArticle(raw);

        const imageUrl = await generateAndUploadImage(
          generated.title || raw.title,
          generated.eventType,
        );

        const article = new Article({
          title: generated.title || raw.title,
          slug: (generated.title || raw.title)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          summary: generated.summary,
          content: generated.content,
          imageUrl,
          eventType: generated.eventType || "news",
          tags: generated.tags || ["LATEST"],
          score: raw.score || 0,
          source: raw.source || "RSS",
          isTrending: raw.score >= 10,
        });

        await article.save();
        await PendingNews.deleteOne({ title: raw.title });

        console.log(`✅ Published: ${article.title}`);
      } catch (innerErr) {
        console.error(`Skipping article "${raw.title}":`, innerErr.message);
      }
    }
  } catch (err) {
    console.error("Critical Automation Failure:", err);
  }
}

module.exports = { runAutomationCycle };
