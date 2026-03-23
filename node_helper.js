const NodeHelper = require("node_helper");
const https = require("https");

module.exports = NodeHelper.create({
  start: function () {
    this.config = {};
    this.cache = null;
    this.cacheTime = 0;
    this.fetchInProgress = false;
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "MMM_AFL_CONFIG") {
      this.config = payload || {};
      return;
    }

    if (notification === "MMM_AFL_FETCH") {
      this.fetchData(payload || this.config || {});
    }
  },

  fetchData: function (config) {
    const now = Date.now();
    const updateInterval = Number(config.updateInterval) || (10 * 60 * 1000);

    if (this.cache && (now - this.cacheTime < updateInterval)) {
      this.sendSocketNotification("MMM_AFL_DATA", this.cache);
      return;
    }

    if (this.fetchInProgress) return;
    this.fetchInProgress = true;

    const year = Number(config.seasonYear) || new Date().getFullYear();
    const gamesUrl = `https://api.squiggle.com.au/?q=games;year=${year}`;
    const standingsUrl = `https://api.squiggle.com.au/?q=standings;year=${year}`;

    Promise.all([this.fetchJson(gamesUrl), this.fetchJson(standingsUrl)])
      .then(([gamesRes, ladderRes]) => {
        const prepared = this.preparePayload(gamesRes.games || [], ladderRes.standings || [], config);
        this.cache = prepared;
        this.cacheTime = Date.now();
        this.sendSocketNotification("MMM_AFL_DATA", prepared);
      })
      .catch((err) => {
        this.sendSocketNotification("MMM_AFL_ERROR", err.message || String(err));
      })
      .finally(() => {
        this.fetchInProgress = false;
      });
  },

  preparePayload: function (games, standings, config) {
    const maxItems = Number(config.maxItems) || 5;
    const ladderSize = Number(config.ladderSize) || 8;
    const now = Date.now();

    const normalizedGames = games
      .map((g) => ({
        hteam: g.hteam,
        ateam: g.ateam,
        hscore: Number(g.hscore || 0),
        ascore: Number(g.ascore || 0),
        venue: g.venue || "",
        date: g.date || g.localtime,
        complete: Number(g.complete || 0)
      }))
      .filter((g) => g.hteam && g.ateam && g.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const nextMatches = normalizedGames
      .filter((g) => !g.complete && new Date(g.date).getTime() >= now - 2 * 60 * 60 * 1000)
      .slice(0, maxItems);

    const recentResults = normalizedGames
      .filter((g) => g.complete)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, maxItems);

    let ladder = standings
      .map((t) => ({
        rank: Number(t.rank || 0),
        name: t.name || "",
        pts: Number(t.pts || 0),
        percentage: Number(t.percentage || 0)
      }))
      .sort((a, b) => a.rank - b.rank);

    // Pre-season fallback: if standings are not available yet, build team list from fixtures.
    if (!ladder.length) {
      const names = [...new Set(normalizedGames.flatMap((g) => [g.hteam, g.ateam]).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b));
      ladder = names.map((name, i) => ({
        rank: i + 1,
        name,
        pts: 0,
        percentage: 0
      }));
    }

    ladder = ladder.slice(0, ladderSize);

    return {
      nextMatches,
      recentResults,
      ladder,
      updatedAt: new Date().toISOString()
    };
  },

  fetchJson: function (url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: {
          "User-Agent": "MMM-AFL/0.1 (+MagicMirror)"
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          res.resume();
          return;
        }

        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON from ${url}`));
          }
        });
      });

      req.on("error", (err) => reject(err));
      req.setTimeout(10000, () => {
        req.destroy(new Error(`Timeout fetching ${url}`));
      });
    });
  }
});
