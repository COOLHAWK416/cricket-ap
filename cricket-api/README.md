# IPL Fantasy Cricket API

Self-hosted cricket API — scrapes Cricbuzz's internal endpoints and exposes clean JSON.
No API key needed. No rate limits. Deploy once on Vercel, use forever.

## Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/matches?type=all` | Live + recent + upcoming matches |
| `GET /api/matches?type=live` | Live matches only |
| `GET /api/matches?type=recent` | Recently completed matches |
| `GET /api/matches?filter=ipl` | IPL matches only |
| `GET /api/scorecard?id=12345` | Full batting/bowling scorecard |
| `GET /api/live?id=12345` | Lightweight live score (current batsmen/bowlers) |

## Deploy to Vercel (2 minutes)

### Option A — Vercel CLI (recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy (from this folder)
vercel

# 3. Follow the prompts — say yes to defaults
# Your API will be live at https://your-project.vercel.app
```

### Option B — GitHub + Vercel Dashboard

1. Push this folder to a GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. Click Deploy — done

## Test It

Open `public/test.html` in your browser.
Enter your Vercel URL and click **Fetch Matches**.

## Response Format

### /api/matches
```json
{
  "status": "ok",
  "data": {
    "total": 12,
    "live": 2,
    "recent": 8,
    "upcoming": 2,
    "matches": [
      {
        "id": "12345",
        "title": "CSK vs MI",
        "series": "IPL 2026",
        "format": "T20",
        "status": "in progress",
        "statusText": "CSK need 45 runs in 30 balls",
        "isLive": true,
        "isEnded": false,
        "bucket": "live",
        "innings": [
          { "team": "MI", "runs": 185, "wickets": 6, "overs": "20.0" }
        ]
      }
    ]
  }
}
```

### /api/scorecard
```json
{
  "status": "ok",
  "data": {
    "matchId": "12345",
    "matchTitle": "CSK vs MI, IPL 2026",
    "status": "MI won by 18 runs",
    "toss": "CSK won the toss and chose to field",
    "playerOfMatch": "Rohit Sharma",
    "isEnded": true,
    "innings": [
      {
        "inning": "MI Inning 1",
        "teamName": "Mumbai Indians",
        "runs": 185, "wickets": 6, "overs": "20.0",
        "batting": [
          {
            "name": "Rohit Sharma",
            "runs": 78, "balls": 45, "fours": 6, "sixes": 4,
            "strikeRate": 173.3,
            "dismissal": "c Jadeja b Chahar",
            "isOut": true,
            "r": 78, "b": 45, "4s": 6, "6s": 4
          }
        ],
        "bowling": [
          {
            "name": "Deepak Chahar",
            "overs": 4, "maidens": 0, "runs": 28, "wickets": 2,
            "economy": 7.0,
            "o": 4, "m": 0, "r": 28, "w": 2
          }
        ]
      }
    ]
  }
}
```

## Wire into IPL Fantasy App

Once deployed, update your IPL Fantasy `index.html`:

```js
const CRICAPI_BASE = 'https://your-project.vercel.app';
// Remove the CRICAPI_KEY line — not needed for your own API
```

Then update the fetch calls to use:
- `/api/matches?type=all&filter=ipl` for match list
- `/api/scorecard?id={matchId}` for scorecards
