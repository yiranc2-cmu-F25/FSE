import { getOnlineOfflineMembers } from "../entities/MemberList.js";
import Msg from "../entities/Msg.js";

const STOP_WORDS = new Set(
  `a,able,about,across,after,all,almost,also,am,among,an,and,any,are,as,at,be,because,been,but,by,
   can,cannot,could,dear,did,do,does,either,else,ever,every,for,from,get,got,had,has,have,he,her,hers,
   him,his,how,however,i,if,in,into,is,it,its,just,least,let,like,likely,may,me,might,most,must,my,
   neither,no,nor,not,of,off,often,on,only,or,other,our,own,rather,said,say,says,she,should,since,so,
   some,than,that,the,their,them,then,there,these,they,this,tis,to,too,twas,us,wants,was,we,were,what,
   when,where,which,while,who,whom,why,will,with,would,yet,you,your`
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
);
const tokenize = (s='') => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu,' ').split(/\s+/).filter(Boolean);

export function filterStopWords(tokens) {
  return tokens.filter(t => !STOP_WORDS.has(t));
}

export function isAllStopWords(text = '') {
  const toks = tokenize(text);
  if (toks.length === 0) return true;
  return toks.every(t => STOP_WORDS.has(t));
}

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
    // TODO: implement controller
    throw new Error("not implemented!");
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function searchPublicMessages(req, res) {
  try {
    const raw = String(req.query.content ?? "").trim();
    if (!raw) return res.status(400).json({ error: "Missing query param: content" });
    if (isAllStopWords(raw)) return res.json({ count: 0, results: [], nextCursor: null });

    const keywords = filterStopWords(tokenize(raw));
    const limit = Math.min(Number(req.query.limit ?? 10), 100);
    const cursor = String(req.query.cursor ?? "");

    const { count, items, nextCursor } = await Msg.searchPublicMsg({ keywords, limit, cursor });

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

export async function searchPrivateMessages(req, res) {
  try {
    // TODO: implement controller
    throw new Error("not implemented!");
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function searchStatusChange(req, res) {
  try {
    // TODO: implement controller
    throw new Error("not implemented!");
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}
