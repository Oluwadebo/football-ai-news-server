// src/services/articleGenerator.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function generateFullArticle(rawItem) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are a professional football journalist. Write in an engaging, dramatic style like Fabrizio Romano or Sky Sports.

RAW TITLE: ${rawItem.title}
RAW CONTENT: ${rawItem.content}
SOURCE: ${rawItem.source}
SCORE: ${rawItem.score}

Return valid JSON only:
{
  "title": "Punchy headline",
  "summary": "2-sentence engaging hook",
  "content": "Full 600-900 word article with varied sentence length",
  "tags": ["tag1", "tag2", "tag3"],
  "eventType": "transfer|match|club|rumors"
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    return json;
  } catch (err) {
    console.error("Gemini generation failed:", err.message);

    // Smart fallback
    const text = (rawItem.title + " " + (rawItem.content || "")).toLowerCase();
    let eventType = "club";

    if (
      text.includes("transfer") ||
      text.includes("sign") ||
      text.includes("deal")
    )
      eventType = "transfer";
    else if (
      text.includes("goal") ||
      text.includes("win") ||
      text.includes("match") ||
      text.includes("vs")
    )
      eventType = "match";

    return {
      title: rawItem.title,
      summary:
        rawItem.content?.slice(0, 150) + "..." ||
        "Strategic analysis in progress.",
      content:
        (rawItem.content || "") +
        "\n\n[PROCESSED BY PITCHPULSE AGENT]: Deep tactical analysis currently being updated based on real-time data feeds.",
      tags: ["LATEST", "TACTICAL", "PITCHPULSE"],
      eventType,
    };
  }
}

function generateImagePlaceholder(title) {
  const seed = encodeURIComponent(
    title.replace(/\s+/g, "-").toLowerCase().slice(0, 40),
  );
  return `https://picsum.photos/seed/${seed}/1200/675`;
}

module.exports = { generateFullArticle, generateImagePlaceholder };
