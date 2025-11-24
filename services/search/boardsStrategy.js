import CoachingBoard from "../../entities/CoachingBoard.js";
import { parseQuery } from "../../utils/search/parseQuery.js";
import { SearchStrategy } from "./SearchStrategy.js";

export class BoardsStrategy extends SearchStrategy {
  async execute({ req }) {
    try {
      const parsed = parseQuery(req, { qKey: "content" });
      if (parsed.early) return parsed.early;
      const { raw, nonStop } = parsed;

      const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 100);
      const cursor =
        typeof req.query.cursor === "string" ? req.query.cursor : "";

      const { count, items, nextCursor } = await CoachingBoard.searchBoards({
        terms: nonStop,
        phrase: raw,
        limit,
        cursor,
      });

      const results = items.map((b) => ({
        id: String(b._id),
        name: b.title,
        content: b.category,
        timestamp: b.updatedAt,
        status: null,
      }));

      return { code: 200, count, results, nextCursor };
    } catch (err) {
      return { code: 500, status: "error", message: "Server error" };
    }
  }
}

export const boardsStrategy = new BoardsStrategy();


