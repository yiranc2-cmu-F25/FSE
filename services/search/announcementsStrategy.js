import Announcement from "../../entities/Announcement.js";
import { parseQuery } from "../../utils/search/parseQuery.js";

export const announcementsStrategy = {
  async execute({ req }) {
    try {
      const parsed = parseQuery(req, { qKey: "content" });
      if (parsed.early) return parsed.early;

      const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 100);
      const cursor =
        typeof req.query.cursor === "string" ? req.query.cursor : "";

      const { raw, nonStop } = parsed;
      const { count, items, nextCursor } =
        await Announcement.searchAnnouncement({
          terms: nonStop,
          phrase: raw,
          limit,
          cursor,
        });
      const results = items.map((m) => ({
        id: String(m._id),
        sender: m.sender?.username ?? m.sender ?? null,
        content: m.content,
        timestamp: m.timestamp,
        status: m.status,
      }));

      return { code: 200, count, results, nextCursor };
    } catch (err) {
      return { code: 500, status: "error", message: "Server error" };
    }
  },
};
