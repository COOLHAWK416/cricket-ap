// ─────────────────────────────────────────────────────────────────────────────
// helpers.js  —  shared Cricbuzz scraping utilities
// Cricbuzz exposes internal JSON endpoints used by their own website.
// These are not officially documented but are stable and used by many scrapers.
// ─────────────────────────────────────────────────────────────────────────────

// Cricbuzz internal API base — used by their website frontend
const CB = 'https://www.cricbuzz.com';

// Headers that make us look like a browser visiting Cricbuzz normally
const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/html, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer':         'https://www.cricbuzz.com/',
  'Origin':          'https://www.cricbuzz.com',
};

/**
 * Fetch JSON from a Cricbuzz internal endpoint.
 * Throws on network error or non-200 status.
 */
export async function cbFetch(path, timeoutMs = 10000) {
  const url = `${CB}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch HTML from a Cricbuzz page.
 */
export async function cbFetchHTML(path, timeoutMs = 10000) {
  const url = `${CB}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { ...HEADERS, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Standard JSON success response
 */
export function ok(res, data) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ status: 'ok', data });
}

/**
 * Standard JSON error response
 */
export function err(res, message, code = 500) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(code).json({ status: 'error', message });
}

/**
 * Parse a Cricbuzz score string like "204/3 (32.1 Ov)" into parts
 */
export function parseScore(str) {
  if (!str) return null;
  const m = str.match(/(\d+)(?:\/(\d+))?\s*\(?([\d.]+)\s*Ov\)?/i);
  if (!m) return { raw: str };
  return { runs: +m[1], wickets: m[2] != null ? +m[2] : 10, overs: m[3], raw: str };
}

/**
 * Normalise a match object from the typeMatches API into our clean shape
 */
export function normaliseMatch(raw) {
  const mi = raw.matchInfo  || raw;
  const ms = raw.matchScore || {};

  const team1 = mi.team1 || {};
  const team2 = mi.team2 || {};

  // Score strings
  const t1Score = ms.team1Score;
  const t2Score = ms.team2Score;

  const innings = [];
  if (t1Score) {
    const i1 = t1Score.inngs1;
    const i2 = t1Score.inngs2;
    if (i1) innings.push({ team: team1.teamSName || team1.teamName, runs: i1.runs, wickets: i1.wickets, overs: i1.overs, inningsId: 1 });
    if (i2) innings.push({ team: team1.teamSName || team1.teamName, runs: i2.runs, wickets: i2.wickets, overs: i2.overs, inningsId: 2 });
  }
  if (t2Score) {
    const i1 = t2Score.inngs1;
    const i2 = t2Score.inngs2;
    if (i1) innings.push({ team: team2.teamSName || team2.teamName, runs: i1.runs, wickets: i1.wickets, overs: i1.overs, inningsId: 1 });
    if (i2) innings.push({ team: team2.teamSName || team2.teamName, runs: i2.runs, wickets: i2.wickets, overs: i2.overs, inningsId: 2 });
  }

  return {
    id:          String(mi.matchId || mi.matchDesc || ''),
    title:       `${team1.teamSName || team1.teamName || '?'} vs ${team2.teamSName || team2.teamName || '?'}`,
    description: mi.matchDesc || '',
    series:      mi.seriesName || '',
    venue:       mi.venueInfo?.ground || '',
    format:      mi.matchFormat || '',
    status:      mi.state || '',
    statusText:  mi.status || '',
    isLive:      (mi.state || '').toLowerCase() === 'in progress',
    isEnded:     (mi.state || '').toLowerCase() === 'complete',
    innings,
    team1: { id: team1.teamId, name: team1.teamName, shortName: team1.teamSName },
    team2: { id: team2.teamId, name: team2.teamName, shortName: team2.teamSName },
    startTime: mi.startDate ? new Date(+mi.startDate).toISOString() : null,
  };
}
