// ─────────────────────────────────────────────────────────────────────────────
// /api/scorecard?id=MATCH_ID
// Returns full batting + bowling scorecard for a match.
// The Cricbuzz scorecard API returns innings with batsmen and bowlers arrays.
// ─────────────────────────────────────────────────────────────────────────────
import { cbFetch, ok, err } from './_helpers.js';

function normaliseBatter(b) {
  return {
    name:      b.batName     || b.batId   || '?',
    runs:      +b.runs       || 0,
    balls:     +b.balls      || 0,
    fours:     +b.fours      || 0,
    sixes:     +b.sixes      || 0,
    strikeRate:+b.strikeRate || 0,
    dismissal: b.outDesc     || b.wicketCode || '',
    isOut:     b.outDesc     ? !/not out/i.test(b.outDesc) : false,
    // Map to the field names our fantasy engine expects
    r:    +b.runs  || 0,
    b:    +b.balls || 0,
    '4s': +b.fours || 0,
    '6s': +b.sixes || 0,
  };
}

function normaliseBowler(b) {
  return {
    name:      b.bowlName    || b.bowlId  || '?',
    overs:     +b.overs      || 0,
    maidens:   +b.maidens    || 0,
    runs:      +b.runs       || 0,
    wickets:   +b.wickets    || 0,
    economy:   +b.economy    || 0,
    wides:     +b.wides      || 0,
    noBalls:   +b.no_balls   || 0,
    // Map to fantasy engine field names
    o: +b.overs   || 0,
    m: +b.maidens || 0,
    r: +b.runs    || 0,
    w: +b.wickets || 0,
  };
}

function normaliseInnings(inn) {
  const batters = (inn.batTeamDetails?.batsmanData
    ? Object.values(inn.batTeamDetails.batsmanData)
    : inn.batsmen || []).map(normaliseBatter);

  const bowlers = (inn.bowlTeamDetails?.bowlerData
    ? Object.values(inn.bowlTeamDetails.bowlerData)
    : inn.bowlers || []).map(normaliseBowler);

  // Extras
  const extras = inn.extrasData || {};
  const score  = inn.scoreDetails || {};

  return {
    inning:     inn.inningsId ? `${inn.batTeamDetails?.batTeamName || 'Team'} Inning ${inn.inningsId}` : (inn.inning || 'Innings'),
    teamName:   inn.batTeamDetails?.batTeamName || '',
    teamId:     inn.batTeamDetails?.batTeamId   || '',
    runs:       score.runs       || 0,
    wickets:    score.wickets    || 0,
    overs:      score.overs      || 0,
    isDeclared: score.isDeclared || false,
    isFollowOn: score.isFollowOn || false,
    extras: {
      total:   extras.extrasTotal || 0,
      byes:    extras.byes   || 0,
      legByes: extras.legByes|| 0,
      wides:   extras.wides  || 0,
      noBalls: extras.noBalls|| 0,
      penalty: extras.penalty|| 0,
    },
    batting: batters,
    bowling: bowlers,
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { id } = req.query;
  if (!id) { err(res, 'Missing ?id= parameter', 400); return; }

  try {
    // Cricbuzz scorecard endpoint — same one their website calls for the scorecard tab
    const data = await cbFetch(`/api/html/cricket-scorecard/${id}`);

    if (!data) { err(res, 'No scorecard data returned', 404); return; }

    // The scorecard API returns an object keyed by innings number: "1", "2", etc.
    // plus matchHeader at the top level
    const matchHeader = data.matchHeader || {};
    const innings = [];

    // Extract innings in order
    for (let i = 1; i <= 4; i++) {
      const inn = data[String(i)];
      if (inn) {
        try { innings.push(normaliseInnings(inn)); }
        catch(e) { console.error(`innings ${i} parse error:`, e.message); }
      }
    }

    // Also try scorecard array format (different endpoint shape)
    if (!innings.length && data.scorecard) {
      for (const inn of data.scorecard) {
        try { innings.push(normaliseInnings(inn)); }
        catch(e) { /* skip */ }
      }
    }

    ok(res, {
      matchId:     String(id),
      matchTitle:  matchHeader.matchDescription || matchHeader.seriesDesc || '',
      status:      matchHeader.status || '',
      toss:        matchHeader.tossResults?.tossWinnerName
                   ? `${matchHeader.tossResults.tossWinnerName} won the toss and chose to ${matchHeader.tossResults.decision}`
                   : '',
      playerOfMatch: matchHeader.playersOfTheMatch?.[0]?.name || '',
      isEnded:     matchHeader.state === 'complete',
      innings,
      raw: innings.length === 0 ? data : undefined, // include raw if parse failed
    });

  } catch(e) {
    console.error(`/api/scorecard?id=${id} error:`, e);
    err(res, e.message);
  }
}
