Module.register("MMM-AFL", {
  defaults: {
    updateInterval: 10 * 60 * 1000,
    animationSpeed: 1000,
    showNextMatches: true,
    showRecentResults: true,
    showLadder: true,
    ladderSize: 8,
    maxItems: 5,
    highlightTeam: "",
    seasonYear: null
  },

  start: function () {
    this.loaded = false;
    this.error = null;
    this.dataPayload = { nextMatches: [], recentResults: [], ladder: [], updatedAt: null };

    this.sendSocketNotification("MMM_AFL_CONFIG", this.config);
    this.sendSocketNotification("MMM_AFL_FETCH", this.config);

    const self = this;
    setInterval(function () {
      self.sendSocketNotification("MMM_AFL_FETCH", self.config);
    }, this.config.updateInterval);
  },

  getStyles: function () {
    return ["MMM-AFL.css"];
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-afl";

    if (this.error) {
      wrapper.innerHTML = `<div class="dimmed light small">AFL data unavailable: ${this.error}</div>`;
      return wrapper;
    }

    if (!this.loaded) {
      wrapper.innerHTML = '<div class="dimmed light small">Loading AFL…</div>';
      return wrapper;
    }

    if (this.config.showNextMatches) {
      wrapper.appendChild(this.renderMatchesSection("Next Matches", this.dataPayload.nextMatches, false));
    }

    if (this.config.showRecentResults) {
      wrapper.appendChild(this.renderMatchesSection("Recent Results", this.dataPayload.recentResults, true));
    }

    if (this.config.showLadder) {
      wrapper.appendChild(this.renderLadderSection(this.dataPayload.ladder));
    }

    if (this.dataPayload.updatedAt) {
      const stamp = document.createElement("div");
      stamp.className = "mmm-afl-updated xsmall dimmed";
      stamp.textContent = `Updated ${new Date(this.dataPayload.updatedAt).toLocaleTimeString()}`;
      wrapper.appendChild(stamp);
    }

    return wrapper;
  },

  renderMatchesSection: function (title, matches, showScore) {
    const section = document.createElement("div");
    section.className = "mmm-afl-section";

    const header = document.createElement("div");
    header.className = "mmm-afl-title bright small";
    header.textContent = title;
    section.appendChild(header);

    if (!matches || matches.length === 0) {
      const empty = document.createElement("div");
      empty.className = "dimmed xsmall";
      empty.textContent = "No games";
      section.appendChild(empty);
      return section;
    }

    const table = document.createElement("table");
    table.className = "small mmm-afl-table";

    matches.forEach((match) => {
      const row = document.createElement("tr");

      const when = document.createElement("td");
      when.className = "mmm-afl-when dimmed";
      when.textContent = this.formatMatchTime(match.date);

      const game = document.createElement("td");
      game.className = "mmm-afl-game";
      game.innerHTML = `${this.formatTeam(match.hteam, true)} vs ${this.formatTeam(match.ateam, true)}`;

      const info = document.createElement("td");
      info.className = "mmm-afl-info align-right";
      info.textContent = showScore
        ? `${match.hscore || 0}–${match.ascore || 0}`
        : this.formatVenue(match.venue || "");

      row.appendChild(when);
      row.appendChild(game);
      row.appendChild(info);
      table.appendChild(row);
    });

    section.appendChild(table);
    return section;
  },

  renderLadderSection: function (ladder) {
    const section = document.createElement("div");
    section.className = "mmm-afl-section";

    const header = document.createElement("div");
    header.className = "mmm-afl-title bright small";
    header.textContent = "Ladder";
    section.appendChild(header);

    const table = document.createElement("table");
    table.className = "small mmm-afl-table mmm-afl-ladder";

    ladder.forEach((team) => {
      const row = document.createElement("tr");
      const isHighlight = this.isHighlighted(team.name);
      if (isHighlight) row.className = "mmm-afl-highlight";

      row.innerHTML = `
        <td>${this.formatTeam(team.name)}</td>
        <td class="align-right">${team.pts}</td>
        <td class="align-right dimmed">${Number(team.percentage || 0).toFixed(1)}</td>
      `;
      table.appendChild(row);
    });

    section.appendChild(table);
    return section;
  },

  isHighlighted: function (name) {
    if (!this.config.highlightTeam) return false;
    return (name || "").toLowerCase().includes(this.config.highlightTeam.toLowerCase());
  },

  formatTeam: function (name, shortName = false) {
    if (!name) return "?";
    if (!shortName) return name;

    const map = {
      "Adelaide": "ADE",
      "Brisbane": "BL",
      "Carlton": "CAR",
      "Collingwood": "COL",
      "Essendon": "ESS",
      "Fremantle": "FRE",
      "Geelong": "GEE",
      "Gold Coast": "GC",
      "GWS": "GWS",
      "Hawthorn": "HAW",
      "Melbourne": "MEL",
      "North Melbourne": "NM",
      "Port Adelaide": "PA",
      "Richmond": "RIC",
      "St Kilda": "STK",
      "Sydney": "SYD",
      "West Coast": "WCE",
      "Western Bulldogs": "WB"
    };

    const abbr = map[name] || name.split(" ").map((w) => w[0]).join("").toUpperCase();
    return abbr.slice(0, 3).padEnd(3, " ");
  },

  formatVenue: function (venue) {
    if (!venue) return "";
    const map = {
      "Adelaide Oval": "AO",
      "M.C.G.": "MCG",
      "Marvel Stadium": "Marvel",
      "Gabba": "Gabba",
      "S.C.G.": "SCG",
      "Optus Stadium": "Optus",
      "Kardinia Park": "KP",
      "Adelaide Hills": "AH",
      "TIO Stadium": "TIO",
      "Traeger Park": "TP",
      "Sydney Showgrounds": "SS",
      "Sydney Showground": "SS"
    };
    return map[venue] || venue.replace(/\bStadium\b/gi, "Std").replace(/\bOval\b/gi, "Ovl").replace(/\./g, "");
  },

  formatMatchTime: function (rawDate) {
    if (!rawDate) return "TBD";
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return rawDate;
    const month = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${month} ${time}`;
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "MMM_AFL_DATA") {
      this.loaded = true;
      this.error = null;
      this.dataPayload = payload;
      this.updateDom(this.config.animationSpeed);
    }

    if (notification === "MMM_AFL_ERROR") {
      this.loaded = true;
      this.error = payload || "Unknown error";
      this.updateDom(this.config.animationSpeed);
    }
  }
});
