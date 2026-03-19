// ─────────────────────────────────────────────────────────────────────────────
// helpers.js  —  shared Cricbuzz scraping utilities
// ─────────────────────────────────────────────────────────────────────────────

const CB = 'https://www.cricbuzz.com';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

function getHeaders() {
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  return {
    'User-Agent':         ua,
    'Accept':             'application/json, text/javascript, */*; q=0.01',
    'Accept-Language':    'en-US,en;q=0.9',
    'Referer':            'https://www.cricbuzz.com/cricket-match/live-scores',
    'X-Requested-With':   'XMLHttpRequest',
    'Cache-Control':      'no-cache',
    'Sec-Fetch-Dest':     'empty',
    'Sec-Fetch-Mode':     'cors',
    'Sec-Fetch-Site':     'same-origin',
  };
}

export async function cbFetch(path, timeoutMs = 12000) {
  const url = `${CB}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: getHeaders(), signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    const text = await res.text();
    try { return JSON.parse(text); }
    catch(e) { throw new Error(`Non-JSON (${text.length} chars): ${text.slice(0, 200)}`); }
  } finally { clearTimeout(timer); }
}

export async function cbFetchRaw(path, timeoutMs = 12000) {
  const url = `${CB}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: getHeaders(), signal: controller.signal });
    clearTimeout(timer);
    return { status: res.status, ok: res.ok, text: await res.text() };
  } finally { clearTimeout(timer); }
}

export function ok(res, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ status: 'ok', data });
}

export function err(res, message, code = 500) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(code).json({ status: 'error', message });
}

export function parseScore(str) {
  if (!str) return null;
  const m = str.match(/(\d+)(?:\/(\d+))?\s*\(?([\d.]+)\s*Ov\)?/i);
  if (!m) return { raw: str };
  return { runs: +m[1], wickets: m[2] != null ? +m[2] : 10, overs: m[3], raw: str };
}

export function normaliseMatch(raw) {
  const mi = raw.matchInfo  || raw;
  const ms = raw.matchScore || {};
  const team1 = mi.team1 || {};
  const team2 = mi.team2 || {};
  const t1Score = ms.team1Score;
  const t2Score = ms.team2Score;
  const innings = [];
  if (t1Score) {
    const i1 = t1Score.inngs1; const i2 = t1Score.inngs2;
    if (i1) innings.push({ team: team1.teamSName||team1.teamName, runs: i1.runs, wickets: i1.wickets, overs: i1.overs });
    if (i2) innings.push({ team: team1.teamSName||team1.teamName, runs: i2.runs, wickets: i2.wickets, overs: i2.overs });
  }
  if (t2Score) {
    const i1 = t2Score.inngs1; const i2 = t2Score.inngs2;
    if (i1) innings.push({ team: team2.teamSName||team2.teamName, runs: i1.runs, wickets: i1.wickets, overs: i1.overs });
    if (i2) innings.push({ team: team2.teamSName||team2.teamName, runs: i2.runs, wickets: i2.wickets, overs: i2.overs });
  }
  return {
    id:          String(mi.matchId || ''),
    title:       `${team1.teamSName||team1.teamName||'?'} vs ${team2.teamSName||team2.teamName||'?'}`,
    description: mi.matchDesc || '',
    series:      mi.seriesName || '',
    venue:       mi.venueInfo?.ground || '',
    format:      mi.matchFormat || '',
    status:      mi.state || '',
    statusText:  mi.status || '',
    isLive:      (mi.state||'').toLowerCase() === 'in progress',
    isEnded:     (mi.state||'').toLowerCase() === 'complete',
    innings,
    team1: { id: team1.teamId, name: team1.teamName, shortName: team1.teamSName },
    team2: { id: team2.teamId, name: team2.teamName, shortName: team2.teamSName },
    startTime: mi.startDate ? new Date(+mi.startDate).toISOString() : null,
  };
}
