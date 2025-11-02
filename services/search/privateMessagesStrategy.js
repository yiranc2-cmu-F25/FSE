import Msg from "../../entities/Msg.js";
import Status from "../../entities/Status.js";
import mongoose from "mongoose";
import { parseQuery } from "../../utils/search/parseQuery.js"

export const privateMessagesStrategy = {
  async tryStatus({ raw, peerId, limit, cursor }) {
    if (!raw || raw.toLowerCase() !== "status") return null;

    const { total, items, nextCursor } = await Status.getHistory({
      userId: peerId,
      limit,
      cursor,
    });

    const results = items.map(it => ({
      id: String(it._id),
      status: it.status,
      changedAt: it.timestamp,
    }));

    return { mode: "status_history", count: total, results, nextCursor };
  },

  async execute({ req }) {
    try {
        const senderId = String(req.userId || "").trim();
        const peerId   = String(req.query.peerId || "").trim();

        if (!senderId) return { error: "Unauthorized" };
        if (!peerId)   return { error: "Missing query param: peerId" };

        if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(peerId)) {
        return { error: "Invalid user id(s)" };
        }

        const parsed = parseQuery(req, { qKey: "content" });
        if (parsed.early) return parsed.early;
        const { raw, nonStop } = parsed;

        const limit  = Math.min(Number(req.query.limit ?? 10), 100);
        const cursor = String(req.query.cursor ?? "");

        const maybeStatus = await this.tryStatus({ raw, peerId, limit, cursor });
        if (maybeStatus) return maybeStatus;
        
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