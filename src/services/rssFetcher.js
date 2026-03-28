// src/services/rssFetcher.js
const Parser = require("rss-parser");
const axios = require("axios");
const parser = new Parser();
const { isAfter, subHours } = require("date-fns");

// const parser = new Parser({
//   headers: {
//     "User-Agent":
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
//     Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
//   },
//   timeout: 10000, // 10 seconds is plenty for RSS; 60s is why your app feels stuck
// });

const RSS_SOURCES = [
  "https://feeds.bbci.co.uk/sport/football/rss.xml",
  "https://www.theguardian.com/football/rss",
  "https://www.espn.com/espn/rss/soccer/news",
  "https://talksport.com/football/feed/",
  "https://www.eyefootball.com/rss_news_transfers.xml",
];

const STAR_PLAYERS = [
  "Mbappé",
  "Haaland",
  "Salah",
  "Vinicius",
  "Bellingham",
  "Messi",
  "Ronaldo",
  "Jude",
  "Kane",
  "Osimhen",
  "Musiala",
  "Lamine Yamal",
  "Rodri",
  "Wirtz",
  "Palmer",
  "Saka",
  "Arda",
  "Güler",
  "Michael",
  "Mohamed",
  "Olise",
];
const MAJOR_CLUBS = [
  "Real Madrid",
  "Man City",
  "Liverpool",
  "Arsenal",
  "Chelsea",
  "Barcelona",
  "Borussia Dortmund",
  "AC Milan",
  "PSG",
  "Bayern",
  "Juventus",
  "Bayer Leverkusen",
  "Atletico Madrid",
  "Napoli, Benfica",
  "Inter Milan",
  "Man Utd",
  "Spurs",
  "Aston Villa",
];

async function fetchAndScoreNews(dynamicPlayers = [], dynamicClubs = []) {
  let items = [];
  const seenTitles = new Set();

  for (const url of RSS_SOURCES) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      // Clean the XML: removes common broken characters that crash the parser
      const cleanedXml = response.data.replace(
        /&(?!(amp|lt|gt|quot|apos);)/g,
        "&amp;",
      );
      
      const feed = await parser.parseURL(url);

      for (const entry of feed.items || []) {
        if (seenTitles.has(entry.title)) continue;

        const pubDate = entry.pubDate ? new Date(entry.pubDate) : new Date();
        if (!isAfter(pubDate, subHours(new Date(), 24))) continue;

        const text = (
          entry.title +
          " " +
          (entry.contentSnippet || "")
        ).toLowerCase();
        let score = 0;

        if (/transfer|sign|done deal|here we go|medical|clause|bid/i.test(text))
          score += 5;
        if (dynamicPlayers.some((p) => text.includes(p.toLowerCase())))
          score += 4;
        if (dynamicClubs.some((c) => text.includes(c.toLowerCase())))
          score += 3;
        if (
          /premier league|la liga|serie a|bundesliga|champions league/i.test(
            text,
          )
        )
          score += 2;
        if (/goal|win|lose|draw|result|injury|sacked|contract/i.test(text))
          score += 2;
        if (/football|soccer|league|manager|stadium|coach/i.test(text))
          score += 2;

        if (score >= 3) {
          items.push({
            title: entry.title,
            content: entry.contentSnippet || entry.content || "",
            source: feed.title || new URL(url).hostname,
            score,
            pubDate,
          });
          seenTitles.add(entry.title);
        }
      }
    } catch (e) {
      console.error(`RSS error ${url}:`, e.message);
    }
  }
  return items.sort((a, b) => b.score - a.score);
  // Deduplication
  // const seen = new Set();

  // items = items.filter((item) => {
  //   const key = item.title.toLowerCase();
  //   if (seen.has(key)) return false;
  //   seen.add(key);
  //   return true;
  // });

  // return items;
}

module.exports = { fetchAndScoreNews };
