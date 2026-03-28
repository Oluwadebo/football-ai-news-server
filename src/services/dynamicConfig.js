// src/services/dynamicConfig.js
const axios = require("axios");
const mongoose = require("mongoose");

// Schema to store our auto-updated lists
const ConfigSchema = new mongoose.Schema({
  key: { type: String, unique: true }, // "STAR_PLAYERS" or "MAJOR_CLUBS"
  values: [String],
  lastUpdated: Date,
});
const DynamicConfig = mongoose.model("DynamicConfig", ConfigSchema);

async function syncFootballTargets() {
  try {
    // Note: Using a free-tier compatible API like football-data.org
    // You just need one API Key to keep this running forever.
    const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

    // 1. Get Top Scorers from major leagues (PL, La Liga, UCL)
    const playersResponse = await axios.get(
      "https://api.football-data.org/v4/competitions/PL/scorers",
      {
        headers: { "X-Auth-Token": API_KEY },
      },
    );
    const freshPlayers = playersResponse.data.scorers.map((s) => s.player.name);

    // 2. Get Top 5 Teams from major leagues
    const teamsResponse = await axios.get(
      "https://api.football-data.org/v4/competitions/PL/standings",
      {
        headers: { "X-Auth-Token": API_KEY },
      },
    );
    const freshTeams = teamsResponse.data.standings[0].table
      .slice(0, 8)
      .map((t) => t.team.name);

    // Save to DB
    await DynamicConfig.findOneAndUpdate(
      { key: "STAR_PLAYERS" },
      { values: freshPlayers, lastUpdated: new Date() },
      { upsert: true },
    );
    await DynamicConfig.findOneAndUpdate(
      { key: "MAJOR_CLUBS" },
      { values: freshTeams, lastUpdated: new Date() },
      { upsert: true },
    );

    console.log("🔄 Dynamic Football Targets Synced Successfully");
  } catch (err) {
    console.error("❌ Failed to sync dynamic targets:", err.message);
  }
}

async function getLiveTargets() {
  const players = await DynamicConfig.findOne({ key: "STAR_PLAYERS" });
  const clubs = await DynamicConfig.findOne({ key: "MAJOR_CLUBS" });
  return {
    players: players?.values || [],
    clubs: clubs?.values || [],
  };
}

module.exports = { syncFootballTargets, getLiveTargets };
