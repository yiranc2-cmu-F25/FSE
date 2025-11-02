import { STOP_WORDS, splitTokensForStopwords } from "./search.js";

export function parseQuery(req, { qKey = "content", requireContent = true, toLower = true } = {}) {
  const raw = String(req.query[qKey] ?? "").trim();

  if (requireContent && !raw) {
    return { early: { error: `Missing query param: ${qKey}` } };
  }
  if (!raw) return { raw: "", nonStop: [] };

  let tokens = splitTokensForStopwords(raw);
  if (toLower) tokens = tokens.map(t => t.toLowerCase()).filter(Boolean);

  if (tokens.length === 0 || tokens.every(t => STOP_WORDS.has(t))) {
    return { early: { count: 0, results: [], nextCursor: null } };
  }
  const nonStop = tokens.filter(t => !STOP_WORDS.has(t));
  return { raw, nonStop };
}
