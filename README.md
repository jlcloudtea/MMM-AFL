# MMM-AFL

A [MagicMirror²](https://magicmirror.builders/) module for AFL fixtures, results, and ladder standings using the [Squiggle API](https://api.squiggle.com.au/).

## Features
- Upcoming AFL matches
- Recent completed results
- Ladder / standings view
- Optional team highlight in the ladder
- Lightweight server-side caching in `node_helper.js`
- No external runtime dependencies beyond Node core

## Screens / sections
The module can show:
- **Next Matches**
- **Recent Results**
- **Ladder**

You can enable or disable each section independently.

## Installation
From your MagicMirror `modules` directory:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/<your-username>/MMM-AFL.git
cd MMM-AFL
npm install
```

> `npm install` is included for standard MagicMirror module workflow. This module does not currently require extra third-party runtime packages.

## MagicMirror config
Add this to your `config/config.js`:

```js
{
  module: "MMM-AFL",
  position: "top_left",
  config: {
    updateInterval: 10 * 60 * 1000,
    showNextMatches: true,
    showRecentResults: true,
    showLadder: true,
    ladderSize: 8,
    maxItems: 5,
    highlightTeam: "Adelaide"
  }
}
```

## Configuration options

| Option | Type | Default | Description |
|---|---|---:|---|
| `updateInterval` | number | `600000` | Refresh interval in milliseconds |
| `animationSpeed` | number | `1000` | MagicMirror DOM update animation speed |
| `showNextMatches` | boolean | `true` | Show upcoming AFL matches |
| `showRecentResults` | boolean | `true` | Show recently completed games |
| `showLadder` | boolean | `true` | Show ladder standings |
| `ladderSize` | number | `8` | Number of ladder rows to display |
| `maxItems` | number | `5` | Number of fixture/result rows to display |
| `highlightTeam` | string | `""` | Partial team name to highlight in the ladder |
| `seasonYear` | number/null | `null` | Override season year; defaults to current year |

## Data source
This module uses the public Squiggle AFL API:
- Games: `https://api.squiggle.com.au/?q=games;year=YYYY`
- Standings: `https://api.squiggle.com.au/?q=standings;year=YYYY`

## Notes
- Times are rendered using the MagicMirror device locale and timezone.
- If standings are not available yet, the module can build a basic pre-season ladder from fixture teams.
- If the API is temporarily unavailable, the module shows an error message instead of crashing the mirror.

## Files
- `MMM-AFL.js` — front-end module rendering
- `MMM-AFL.css` — styling
- `node_helper.js` — server-side fetch + caching
- `README.md` — setup and usage

## License
MIT
