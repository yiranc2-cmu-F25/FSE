import { STOP_WORDS, splitTokensForStopwords} from "../../utils/search/search.js"
import Msg from "../../entities/Msg.js";


export const publicMessagesStrategy = {
  async execute({ req }) {
    try {
      const raw = String(req.query.content ?? "").trim();
      if (!raw) return { error: "Missing query param: content" };

      const tokens = splitTokensForStopwords(raw);
      if (tokens.length === 0 || tokens.every(t => STOP_WORDS.has(t))) {
      return { count: 0, results: [], nextCursor: null };
      }

      const nonStop = tokens.filter(t => !STOP_WORDS.has(t));

      const limit  = Math.min(Number(req.query.limit ?? 10), 100);
      const cursor = String(req.query.cursor ?? "");

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