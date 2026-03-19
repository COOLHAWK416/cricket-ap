// ─────────────────────────────────────────────────────────────────────────────
// /api/live?id=MATCH_ID
// Returns lightweight live score for a match — current batsmen/bowlers,
// score, run rate, required rate. Much cheaper to poll than the full scorecard.
// ─────────────────────────────────────────────────────────────────────────────
import { cbFetch, ok, err } from './_helpers.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { id } = req.query;
  if (!id) { err(res, 'Missing ?id= parameter', 400); return; }

  try {
    // Cricbuzz mini-scorecard endpoint — very fast, powers the match ticker
    const data = await cbFetch(`/api/cricket-match/${id}/live-score`);

    const ms = data.matchScore || data;
    const mi = data.matchHeader || {};

    // Current batting team innings
    const batting = ms.inningsScoreList || [];
    const lastInn = batting[batting.length - 1] || {};

    // Live batsmen
    const batsmen = (data.batsmen || []).map(b => ({
      name:  b.batName || '?',
      runs:  +b.batRuns  || 0,
      balls: +b.batBalls || 0,
      fours: +b.batFours || 0,
      sixes: +b.batSixes || 0,
      sr:    +b.batStrikeRate || 0,
      isOnStrike: b.isStriker || false,
    }));

    // Live bowlers
    const bowlers = (data.bowlers || []).map(b => ({
      name:    b.bowlName || '?',
      overs:   +b.bowlOvs  || 0,
      maidens: +b.bowlMaidens || 0,
      runs:    +b.bowlRuns || 0,
      wickets: +b.bowlWkts || 0,
      economy: +b.bowlEcon || 0,
      isBowling: b.isBowling || false,
    }));

    ok(res, {
      matchId:      String(id),
      title:        mi.seriesDesc || data.matchHeader?.matchDescription || '',
      status:       mi.status || data.customStatus || '',
      isLive:       mi.state === 'in progress',
      isEnded:      mi.state === 'complete',
      score: {
        runs:     lastInn.runs    || 0,
        wickets:  lastInn.wickets || 0,
        overs:    lastInn.overs   || 0,
        target:   lastInn.target  || 0,
        runRate:  ms.recentOvsStats?.runRate   || 0,
        reqRate:  ms.recentOvsStats?.reqRunRate|| 0,
        lastSixBalls: ms.recentOvsStats?.recentOvs || '',
      },
      batsmen,
      bowlers,
      innings: batting.map(inn => ({
        teamName: inn.batTeamName || '',
        runs:     inn.runs    || 0,
        wickets:  inn.wickets || 0,
        overs:    inn.overs   || 0,
        inningsId:inn.inningsId || 1,
      })),
    });

  } catch(e) {
    console.error(`/api/live?id=${id} error:`, e);
    err(res, e.message);
  }
}
