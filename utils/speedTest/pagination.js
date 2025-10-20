export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

// Return undefined if not a positive int
export function parsePositiveInt(val) {
  if (val === undefined || val === null) return undefined;
  const n = Number(String(val));
  if (!Number.isFinite(n)) return undefined;
  if (!Number.isInteger(n)) return undefined;
  if (n <= 0) return undefined;
  return n;
}
export function getPage(query, fallback = DEFAULT_PAGE) {
  const n = parsePositiveInt(query.page);
  return n ?? fallback;
}

export function getLimit(query, fallback = DEFAULT_LIMIT, max = MAX_LIMIT) {
  const n = parsePositiveInt(query.limit);
  if (n === undefined) return fallback;
  return Math.min(max, Math.max(1, n));
}
