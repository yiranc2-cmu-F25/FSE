import { parseCursor, buildCursorClause } from "./cursor.js";

export function paginateResults(merged, limit, offset, hasLimit) {
  const count = merged.length;
  const results = hasLimit ? 
    merged.slice(offset, offset + limit) :
    merged.slice(offset);
  
  return { code: 200, count, results };
}

export async function searchByModel({
  Model,
  baseFilter,
  regex,
  limit,
  cursor,
  select = "sender content timestamp status",
  populate = { path: "sender", select: "username" },
}) {
  const sort = { timestamp: -1, _id: -1 };
  const safeLimit = Math.min(Math.max(1, +limit || 10), 100);

  const query = { ...baseFilter, content: { $regex: regex } };

  const parsed = parseCursor(cursor);
  if (parsed) {
    query.$or = buildCursorClause(parsed);
  }

  const itemsPlusOne = await Model.find(query)
    .sort(sort)
    .limit(safeLimit + 1)
    .select(select)
    .populate(populate)
    .lean();

  const hasMore = itemsPlusOne.length > safeLimit;
  const pageItems = hasMore ? itemsPlusOne.slice(0, safeLimit) : itemsPlusOne;

  let nextCursor = null;
  if (hasMore && pageItems.length > 0) {
    const last = pageItems[pageItems.length - 1];
    nextCursor = `${new Date(last.timestamp).toISOString()}|${String(last._id)}`;
  }

  const count = await Model.countDocuments({ ...baseFilter, content: { $regex: regex } });

  return { code: 200, count, items: pageItems, nextCursor };
}
