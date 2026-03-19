// /api/debug — shows exactly what Cricbuzz returns so we can diagnose issues
import { cbFetchRaw } from './_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const results = {};

  // Test the live matches endpoint
  try {
    const r = await cbFetchRaw('/api/cricket-match/live');
    results.live = {
      httpStatus: r.status,
      ok: r.ok,
      responseLength: r.text.length,
      preview: r.text.slice(0, 500),
      isJSON: r.text.trim().startsWith('{') || r.text.trim().startsWith('['),
    };
  } catch(e) {
    results.live = { error: e.message };
  }

  // Test the recent matches endpoint
  try {
    const r = await cbFetchRaw('/api/cricket-match/recent');
    results.recent = {
      httpStatus: r.status,
      ok: r.ok,
      responseLength: r.text.length,
      preview: r.text.slice(0, 500),
      isJSON: r.text.trim().startsWith('{') || r.text.trim().startsWith('['),
    };
  } catch(e) {
    results.recent = { error: e.message };
  }

  res.status(200).json({ status: 'debug', results });
}
