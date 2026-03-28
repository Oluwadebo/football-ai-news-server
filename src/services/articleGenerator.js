// src/services/articleGenerator.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cloudinary = require("cloudinary").v2;
const axios = require("axios");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// Better image prompt + Cloudinary upload
async function generateAndUploadImage(title, eventType) {
  const shortTitle = title
    .split(" ")
    .slice(0, 7)
    .join(" ")
    .replace(/[^a-zA-Z0-9 ]/g, "");
  const prompt = generateImagePrompt(shortTitle, eventType);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=675&nologo=true&seed=${Date.now()}&enhance=true`;

  try {
    // For now, we use a better placeholder. Later replace with real AI image gen (Flux/Grok Imagine)
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 20000, // 20 second timeout
    });

    const buffer = Buffer.from(response.data, "binary");

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "football-news",
          resource_type: "image",
          transformation: [
            { width: 1200, height: 675, crop: "fill" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result.secure_url);
        },
      );
      uploadStream.end(buffer);
    });

    console.log(`✅ Generated image for: ${title.substring(0, 50)}...`);

    // const uploadResult = await cloudinary.uploader.upload(
    //   `https://picsum.photos/seed/${encodeURIComponent(title)}/1200/675`,
    //   {
    //     folder: "football-news",
    //     transformation: [{ width: 1200, height: 675, crop: "fill" }],
    //   },
    // );

    // return uploadResult.secure_url;
  } catch (err) {
    // console.error("Cloudinary upload failed:", err);
    console.error("❌ Image generation failed:", err.message);
    // Ultimate fallback - direct Pollinations URL (no Cloudinary)
    // return `https://image.pollinations.ai/prompt/${encodeURIComponent(shortTitle)}?width=1200&height=675&nologo=true`;
    return `https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&h=675`;
    // return `https://picsum.photos/seed/${encodeURIComponent(title)}/1200/675`;
  }
}

// function generateImagePrompt(title, eventType) {
//   let base =
//     "professional football news graphic, dramatic sports photography, cinematic lighting, high quality";

//   if (eventType === "transfer")
//     base =
//       "football player signing contract, dramatic transfer news, club colors, stadium background";
//   else if (eventType === "match")
//     base =
//       "intense football match action, players competing, stadium crowd, dramatic sports moment";
//   else if (eventType === "club")
//     base =
//       "football club logo and players, modern club news graphic, team colors, professional";

//   const cleanTitle = title.split(" ").slice(0, 8).join(" "); // Only use the first 8 words
//   return `${base}, related to: ${cleanTitle}, vibrant colors, dynamic composition, sports journalism style, 16:9 aspect ratio`;
// }
function generateImagePrompt(title, eventType) {
  const themes = {
    transfer: "footballer signing contract, dramatic club colors, stadium",
    match: "intense football match action, stadium lights, players competing",
    club: "football team celebrate, modern sports graphic, club colors",
    news: "professional sports news studio, high quality photography",
  };
  const base = themes[eventType] || themes.news;
  return `${base}, ${title}, cinematic lighting, 8k`;
}

module.exports = {
  generateFullArticle,
  generateAndUploadImage,
  generateImagePrompt,
};
