import Msg from "../../entities/Msg.js";
import { parseQuery } from "../../utils/search/parseQuery.js"

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

      const me = (req.username || "").toLowerCase();
      const results = items.map(m => ({
        id: String(m._id),
        sender: m.sender?.username ?? m.sender ?? null,
        content: m.content,
        timestamp: m.timestamp,
        status: m.status,
        isOwn: ((m.sender?.username ?? m.sender ?? "").toLowerCase() === me),
      }));

      return { count, results, nextCursor };
    } catch (err) {
      return { status: "error", message: "Server error" };
    }
  }
};