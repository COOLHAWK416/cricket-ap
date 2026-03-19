// ─────────────────────────────────────────────────────────────────────────────
// /api/matches
// Returns live and recent cricket matches from Cricbuzz.
// Query params:
//   type=live|recent|upcoming  (default: all three merged)
//   filter=ipl|international|all  (default: all)
// ─────────────────────────────────────────────────────────────────────────────
import { cbFetch, ok, err, normaliseMatch } from './_helpers.js';

const IPL_KEYWORDS = ['ipl', 'indian premier league', 'csk', ' mi ', 'rcb', 'kkr', 'srh', 'delhi capitals', 'rajasthan royals', 'lucknow', 'gujarat titans', 'punjab kings'];

function isIPL(match) {
  const txt = `${match.title} ${match.series} ${match.description}`.toLowerCase();
  return IPL_KEYWORDS.some(k => txt.includes(k));
}

async function fetchTypeMatches(type) {
  // Cricbuzz's internal API — same endpoint their website calls
  // type: 'live' | 'recent' | 'upcoming' | 'all'
  try {
    const data = await cbFetch(`/api/cricket-match/${type}`);
    const matches = [];
    for (const typeBlock of (data.typeMatches || [])) {
      for (const seriesBlock of (typeBlock.seriesMatches || [])) {
        const wrapper = seriesBlock.seriesAdWrapper || seriesBlock;
        for (const m of (wrapper.matches || [])) {
          try {
            matches.push(normaliseMatch(m));
          } catch(e) { /* skip malformed match */ }
        }
      }
    }
    return matches;
  } catch(e) {
    console.error(`fetchTypeMatches(${type}) failed:`, e.message);
    return [];
  }
}

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const { type = 'all', filter = 'all' } = req.query;

    let matches = [];

    if (type === 'live' || type === 'all') {
      const live = await fetchTypeMatches('live');
      matches.push(...live.map(m => ({ ...m, bucket: 'live' })));
    }
    if (type === 'recent' || type === 'all') {
      const recent = await fetchTypeMatches('recent');
      matches.push(...recent.map(m => ({ ...m, bucket: 'recent' })));
    }
    if (type === 'upcoming' || type === 'all') {
      const upcoming = await fetchTypeMatches('upcoming');
      matches.push(...upcoming.map(m => ({ ...m, bucket: 'upcoming' })));
    }

    // Deduplicate by id
    const seen = new Set();
    matches = matches.filter(m => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    // Filter
    if (filter === 'ipl') {
      matches = matches.filter(isIPL);
    }

    ok(res, {
      total:   matches.length,
      live:    matches.filter(m => m.bucket === 'live').length,
      recent:  matches.filter(m => m.bucket === 'recent').length,
      upcoming:matches.filter(m => m.bucket === 'upcoming').length,
      matches,
    });

  } catch(e) {
    console.error('/api/matches error:', e);
    err(res, e.message);
  }
}
