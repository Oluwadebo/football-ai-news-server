// src/routes/standings.js
const express = require("express");
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

router.get("/:leagueName", async (req, res) => {
  try {
    const searchTerm = req.params.leagueName.toLowerCase();
    let code = LEAGUE_MAP[searchTerm];
    console.log(searchTerm);
    console.log(code);

    if (!code) {
      const compsResponse = await axios.get(
        `https://api.football-data.org/v4/competitions`,
        {
          headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY },
        },
      );

      // Try to find a competition where the name matches the search
      const matchedLeague = compsResponse.data.competitions.find(
        (c) =>
          c.name.toLowerCase().includes(searchTerm) ||
          c.code.toLowerCase() === searchTerm,
      );

      code = matchedLeague ? matchedLeague.code : "PL";
    }

    console.log(`Fetching Standings for Code: ${code}`);

    const response = await axios.get(
      `https://api.football-data.org/v4/competitions/${code}/standings`,
      { headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY } },
    );

    const table = response.data.standings[0].table.map((row) => ({
      pos: row.position,
      name: row.team.shortName || row.team.name,
      logo: row.team.crest,
      p: row.playedGames,
      gd: row.goalDifference,
      pts: row.points,
      w: row.won,
      d: row.draw,
      l: row.lost,
      gf: row.goalsFor,
      ga: row.goalsAgainst,
    }));
    // console.log(table);

    res.json({ league: response.data.competition.name, table });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch live standings" });
  }
});

module.exports = router;
