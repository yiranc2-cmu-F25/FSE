export function parseCursor(cursor) {
  if (!cursor) return null;
  const [tsStr, idStr] = String(cursor).split("|");
  const ts = new Date(tsStr);
  if (Number.isNaN(ts.getTime()) || !idStr) return null;
  return { ts, idStr };
}

export function buildCursorClause({ ts, idStr }) {
  return [
    { timestamp: { $lt: ts } },
    { timestamp: ts, _id: { $lt: idStr } },
  ];
}
