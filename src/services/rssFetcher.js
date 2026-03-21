const Parser = require("rss-parser");
const parser = new Parser();
const { isAfter, subHours } = require("date-fns");

const RSS_SOURCES = [
  "https://feeds.bbci.co.uk/sport/football/rss.xml",
  "https://www.theguardian.com/football/rss",
  "https://www.espn.com/espn/rss/soccer/news",
  // "https://www.skysports.com/rss/0,205,football",
  "https://talksport.com/football/feed/",
  // "https://www.goal.com/en-gb/rss/news.xml",
  // "https://www.football.london/all-about/rss.xml",
  "https://www.eyefootball.com/rss_news_transfers.xml", // transfers focused
  // add more from search results if you like
];

const STAR_PLAYERS = [
  "Mbappé",
  "Haaland",
  "Salah",
  "Vinicius",
  "Bellingham",
  "Messi",
  "Ronaldo",
  "Kane",
  "Osimhen",
  "Musiala",
];
const MAJOR_CLUBS = [
  "Real Madrid",
  "Man City",
  "Liverpool",
  "Arsenal",
  "Chelsea",
  "Barcelona",
  "PSG",
  "Bayern",
  "Juventus",
];

async function fetchAndScoreNews() {
  let items = [];

  for (const url of RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(url);
      for (const entry of feed.items) {
        const pubDate = entry.pubDate ? new Date(entry.pubDate) : new Date();
        if (!isAfter(pubDate, subHours(new Date(), 24))) continue;

        let score = 0;
        const text = (
          entry.title +
          " " +
          (entry.contentSnippet || "")
        ).toLowerCase();

        if (/transfer|sign|done deal|here we go|clause|bid/i.test(text))
          score += 5;
        if (STAR_PLAYERS.some((p) => text.includes(p.toLowerCase())))
          score += 4;
        if (MAJOR_CLUBS.some((c) => text.includes(c.toLowerCase()))) score += 4;
        if (
          /premier league|la liga|serie a|bundesliga|champions league/i.test(
            text,
          )
        )
          score += 3;
        if (/goal|win|lose|draw|result|injury/i.test(text)) score += 2;

        if (score >= 4) {
          items.push({
            title: entry.title,
            content: entry.contentSnippet || entry.content || "",
            source: feed.title || new URL(url).hostname,
            score,
            pubDate,
          });
        }
      }
    } catch (e) {
      console.error(`RSS error ${url}:`, e.message);
    }
  }

  // Very naive deduplication
  const seen = new Set();
  items = items.filter((item) => {
    const key = item.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return items;
}

module.exports = { fetchAndScoreNews };
