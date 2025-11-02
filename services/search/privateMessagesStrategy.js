import Msg from "../../entities/Msg.js";
import Status from "../../entities/Status.js";
import mongoose from "mongoose";
import { STOP_WORDS, splitTokensForStopwords} from "../../utils/search/search.js"

export const privateMessagesStrategy = {
  async execute({ req }) {
    try {
        const senderId = String(req.userId || "").trim();
        const peerId   = String(req.query.peerId || "").trim();
        const raw      = String(req.query.content || "").trim();

        if (!senderId) return { error: "Unauthorized" };
        if (!peerId)   return { error: "Missing query param: peerId" };
        if (!raw)      return { error: "Missing query param: content" };

        if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(peerId)) {
        return { error: "Invalid user id(s)" };
        }

        const limit  = Math.min(Number(req.query.limit ?? 10), 100);
        const cursor = String(req.query.cursor ?? "");

        if (raw.toLowerCase() === "status") {
          const { total, items, nextCursor } = await Status.getHistory({ userId: peerId, limit, cursor });
          const results = items.map(it => ({
            id: String(it._id),
            status: it.status,
            changedAt: it.timestamp,
          }));
          return { mode: "status_history", count: total, results, nextCursor };
        }

        const tokens = splitTokensForStopwords(raw).map(t => t.toLowerCase()).filter(Boolean);
          if (tokens.length === 0 || tokens.every(t => STOP_WORDS.has(t))) {
            return { mode: "messages", count: 0, results: [], nextCursor: null };
        }
        const nonStop = tokens.filter(t => !STOP_WORDS.has(t));

        const { items, nextCursor, count } = await Msg.searchPrivateMsg({
          senderId,
          peerId,
          terms: nonStop,
          phrase: raw,
          limit,
          cursor,
        });

        const senderName = (req.username || "").toLowerCase();
        const results = items.map(m => ({
        id: String(m._id),
        sender: m.sender?.username ?? m.sender ?? null,
        content: m.content,
        timestamp: m.timestamp,
        status: m.status,
        isOwn: ((m.sender?.username ?? m.sender ?? "").toLowerCase() === senderName),
        }));

        return { mode: "messages", count, results, nextCursor };
    } catch (err) {
        console.error("[searchPrivate] error:", err);
        return { status: "error", message: "Server error" };
    }
  }
};