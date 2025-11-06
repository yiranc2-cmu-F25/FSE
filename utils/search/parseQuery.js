import { STOP_WORDS, splitTokensForStopwords } from "./search.js";

export function parseQuery(
  req,
  { qKey = "content", requireContent = true, toLower = true } = {},
) {
  const raw = String(req.query[qKey] ?? "").trim();

  const earlyReturn = earlyReturnOnMissingInput(requireContent, raw, qKey);
  if (earlyReturn) return earlyReturn;

  const emptyReturn = earlyReturnOnEmptyInput(raw);
  if (emptyReturn) return emptyReturn;

  const tokens = getTokens(raw, toLower);

  if (tokens.length === 0 || tokens.every((t) => STOP_WORDS.has(t))) {
    return { early: { code: 200, count: 0, results: [], nextCursor: null } };
  }
  const nonStop = tokens.filter((t) => !STOP_WORDS.has(t));
  return { raw, nonStop };
}

function earlyReturnOnMissingInput(requireContent, raw, qKey) {
  if (requireContent && !raw) {
    return { early: { code: 400, error: `Missing query param: ${qKey}` } };
  }
}
function earlyReturnOnEmptyInput(raw) {
  if (!raw) return { raw: "", nonStop: [] };
}

function getTokens(raw, toLower) {
  let tokens = splitTokensForStopwords(raw);
  if (toLower) tokens = tokens.map((t) => t.toLowerCase()).filter(Boolean);
  return tokens;
}
