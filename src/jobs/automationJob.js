const { fetchAndScoreNews } = require("../services/rssFetcher"); // ← add this line
const Article = require("../models/Article");
const PendingNews = require("../models/PendingNews");   // or Pending if that's your model name
const {
  generateFullArticle,
  generateImagePlaceholder,
} = require("../services/articleGenerator");

async function runAutomationCycle() {
  try {
    const rawItems = await fetchAndScoreNews();
    if (!rawItems || rawItems.length === 0) return;
// console.log(`Processing ${rawItems.length} raw items from RSS`);
    for (const raw of rawItems) {
      try {
        // console.log(`Checking article: "${raw.title}" (score: ${raw.score})`);
        // Inner try/catch: If ONE article fails, the rest continue
        const exists = await Article.findOne({ title: raw.title });
        // console.log(`Exists? ${!!exists}`);
        if (exists) continue;

        const generated = await generateFullArticle(raw);

        const article = new Article({
          title: generated.title || raw.title,
          slug: (generated.title || raw.title)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
          summary: generated.summary,
          content: generated.content,
          imageUrl: generateImagePlaceholder(generated.title || raw.title),
          eventType: generated.eventType || "news",
          tags: generated.tags || [],
          score: raw.score || 0,
          source: raw.source || "RSS",
          isTrending: raw.score >= 10,
        });

        await article.save();
        await PendingNews.deleteOne({ title: raw.title });
        console.log(`Published: ${article.title}`);
      } catch (innerErr) {
        console.error(
          `Skipping article "${raw.title}" due to error:`,
          innerErr.message,
        );
      }
    }
  } catch (err) {
    console.error("Critical Automation Failure:", err);
  }
}

// at the bottom of automationJob.js
module.exports = { runAutomationCycle };
