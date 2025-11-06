import Msg from "../../entities/Msg.js";
import { parseQuery } from "../../utils/search/parseQuery.js";
import { mapSearchResults } from "./resultMappers.js";

export const publicMessagesStrategy = {
  async execute({ req }) {
    try {
      const parsed = parseQuery(req, { qKey: "content" });
      if (parsed.early) return parsed.early;

      const limit  = Math.min(Math.max(1, Number(req.query.limit) || 10), 100);
      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : "";

      const { raw, nonStop } = parsed;
      const { count, items, nextCursor } = await Msg.searchPublicMsg({
        terms: nonStop,
        phrase: raw,
        limit,
        cursor,
      });

      const results = mapSearchResults(items, req.username, true);

      return { code: 200, count, results, nextCursor };
    } catch (err) {
      return { code: 500, status: "error", message: "Server error" };
    }
  }
};