import { getOnlineOfflineMembers } from "../entities/MemberList.js";
import { STOP_WORDS, splitTokensForStopwords} from "../utils/search/search.js"
import Msg from "../entities/Msg.js";
import Announcement from "../entities/Announcement.js";
import Status from "../entities/Status.js";
import mongoose from "mongoose";

export async function searchCitizensByUsername(req, res) {
  try {
    const q = (req.query.username ?? '').trim();
    if (!q) return res.status(400).json({ error: 'Missing query param: username' });

    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const needle = q.toLowerCase();

    const { onlineUsers, offlineUsers } = await getOnlineOfflineMembers(req.app);

    const match = u => (u.name || '').toLowerCase().includes(needle);
    const on = onlineUsers.filter(match);
    const off = offlineUsers.filter(match);

    const merged = [
      ...on.map(u => ({ u, availability: 'online' })),
      ...off.map(u => ({ u, availability: 'offline' })),
    ];

    const count = merged.length;
    const results = merged.slice(offset, offset + limit);

    return res.json({ count, results });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function searchCitizensByStatus(req, res) {
  try {
    const raw = String(req.query.status ?? req.params.status ?? '').trim();
    if (!raw) return res.status(400).json({ error: 'Missing param: status' });

    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);
    const needle = raw.toLowerCase();

    const { onlineUsers, offlineUsers } = await getOnlineOfflineMembers(req.app);

    const matches = (u) => String(u.status ?? '').toLowerCase() === needle;
    const on = onlineUsers.filter(matches);
    const off = offlineUsers.filter(matches);

    const toItem = (u, availability) => ({
      u: { id: u.id, name: u.name, status: u.status ?? null },
      availability, // 'online' | 'offline'
    });
    const merged = [...on.map(u => toItem(u, 'online')), ...off.map(u => toItem(u, 'offline'))];

    const count = merged.length;
    const results = merged.slice(offset, offset + limit);

    return res.json({ count, results });
  } catch (err) {
    console.error('searchCitizensByStatus error:', err);
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
}

export async function searchAnnouncements(req, res) {
  try {
    const raw = String(req.query.content ?? "").trim();
    if (!raw) return res.status(400).json({ error: "Missing query param: content" });

    const tokens = splitTokensForStopwords(raw);
    if (tokens.length === 0 || tokens.every(t => STOP_WORDS.has(t))) {
      return res.json({ count: 0, results: [], nextCursor: null });
    }

    const nonStop = tokens.filter(t => !STOP_WORDS.has(t));

    const limit  = Math.min(Number(req.query.limit ?? 10), 100);
    const cursor = String(req.query.cursor ?? "");

    const { count, items, nextCursor } = await Announcement.searchAnnouncement({
      terms: nonStop,
      phrase: raw,
      limit,
      cursor,
    });

    const results = items.map(m => ({
      id: String(m._id),
      sender: m.sender?.username ?? m.sender ?? null,
      content: m.content,
      timestamp: m.timestamp,
      status: m.status,
    }));

    return res.json({ count, results, nextCursor });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function searchPublicMessages(req, res) {
  try {
    const raw = String(req.query.content ?? "").trim();
    if (!raw) return res.status(400).json({ error: "Missing query param: content" });

    const tokens = splitTokensForStopwords(raw);
    if (tokens.length === 0 || tokens.every(t => STOP_WORDS.has(t))) {
      return res.json({ count: 0, results: [], nextCursor: null });
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

    return res.json({ count, results, nextCursor });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function searchPrivate(req, res) {
  try {
    const senderId = String(req.userId || "").trim();
    const peerId   = String(req.query.peerId || "").trim();
    const raw      = String(req.query.content || "").trim();

    if (!senderId) return res.status(401).json({ error: "Unauthorized" });
    if (!peerId)   return res.status(400).json({ error: "Missing query param: peerId" });
    if (!raw)      return res.status(400).json({ error: "Missing query param: content" });

    if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(peerId)) {
      return res.status(400).json({ error: "Invalid user id(s)" });
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
      return res.json({ mode: "status_history", count: total, results, nextCursor });
    }

    const { items, nextCursor, count } = await Msg.searchPrivateMsg({
      senderId, peerId, phrase: raw, limit, cursor,
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

    return res.json({ mode: "messages", count, results, nextCursor });
  } catch (err) {
    console.error("[searchPrivate] error:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}