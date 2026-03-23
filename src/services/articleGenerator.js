// Rename or move your geminiService.jsx logic here (server version)

const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

console.log("API Key loaded:", !!process.env.GEMINI_API_KEY);

async function generateFullArticle(rawItem) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are a professional football journalist writing in an engaging, slightly dramatic style similar to Fabrizio Romano reports or Sky Sports.

RAW TITLE: ${rawItem.title}
RAW CONTENT: ${rawItem.content}
SOURCE: ${rawItem.source}
SCORE: ${rawItem.score}

Write JSON:
{
  "title": "Punchy uppercase headline",
  "summary": "2-sentence hook",
  "content": "Full article 600-900 words, human style, varied sentences, hooks, background, impact, conclusion",
  "tags": ["tag1", "tag2", "tag3"],
  "eventType": "transfer|match|club|rumors"
}
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    console.log(`Gemini generated content for "${raw.title}"`);
    return json;
  } catch (err) {
    console.error("Gemini error:", err.message);
    let eventType = "club";
    const textToScan = (
      rawItem.title +
      " " +
      (rawItem.content || "")
    ).toLowerCase();

    if (
      rawItem.score > 8 ||
      textToScan.includes("transfer") ||
      textToScan.includes("deal")
    ) {
      eventType = "transfer";
    } else if (
      textToScan.match(/goal|win|draw|score|vs|match|fixture|result/i)
    ) {
      eventType = "match"; // This fixes the empty Match category!
    }
    // fallback
    return {
      title: rawItem.title,
      summary: rawItem.content
        ? rawItem.content.slice(0, 150) + "..."
        : "Strategic analysis in progress.",
      content:
        (rawItem.content || "") +
        "\n\n[PROCESSED BY PITCHPULSE AGENT]: Deep tactical analysis currently being updated based on real-time data feeds.",
      tags: ["LATEST", "TACTICAL", "PITCHPULSE"],
      // eventType: rawItem.score > 7 ? "transfer" : "club",
      eventType: eventType,
    };
  }
}

function generateImagePlaceholder(title) {
  // Later → call Flux / DALL-E / Unsplash API
  // encodeURIComponent(title.slice(0, 10));
  const seed = encodeURIComponent(
    title.replace(/\s+/g, "-").toLowerCase().slice(0, 40),
  );
  return `https://picsum.photos/seed/${seed}/1200/675`;
}

module.exports = { generateFullArticle, generateImagePlaceholder };
