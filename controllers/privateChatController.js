import User from "../entities/User.js";
import Msg from "../entities/Msg.js";
const normId = (idLike) => {
  if (idLike == null) return "";
  if (typeof idLike === "string") return idLike;
  if (typeof idLike === "object") {
    return String(idLike._id ?? idLike.id ?? "");
  }
  return idLike.toString ? idLike.toString() : String(idLike);
};
// export async function getPrivateMessages(req, res) {
//   try {
//     console.log("[getPrivateMessages] method=%s url=%s", req.method, req.originalUrl);
//     console.log("[getPrivateMessages] params=%o query=%o body=%o", req.params, req.query, req.body);

//     console.log("[getPrivateMessages] auth user=%o userId=%s username=%s", req.user, req.userId, req.username);
//     if (!req.user?.id || !req.userId || !req.params.peerId) {
//       return res.status(400).json({ status: "error", message: "meId/peerId required" });
//     }
//     const meId   = String(req.user?.id ?? req.userId);
//     const peerId = String(req.params.peerId);

//     const messages = await Msg.getPrivateMsg(meId, peerId);

//     console.log("[getPrivateMessages] total=", Array.isArray(messages) ? messages.length : -1);

//     const _s = (v) => (v && typeof v.toString === "function" ? v.toString() : String(v ?? ""));

//     console.table(
//     (messages || []).map((m, i) => ({
//         "#": i,
//         id: _s(m._id ?? m.id),
//         sender: _s(m.senderId ?? m.sender),
//         receiver: _s(m.receiverId ?? m.receiver),
//         ts: _s(m.timestamp ?? m.createdAt),
//         status: m.status ?? null,
//         content: m.content,
//     }))
//     );

//     (messages || []).forEach((m, i) => {
//     console.log(
//         "[getPrivateMessages][%d] id=%s sender=%s receiver=%s ts=%s status=%s content=%s",
//         i,
//         _s(m._id ?? m.id),
//         _s(m.senderId ?? m.sender),
//         _s(m.receiverId ?? m.receiver),
//         _s(m.timestamp ?? m.createdAt),
//         String(m.status ?? ""),
//         m.content
//     );
//     });

//     const data = messages.map(m => ({
//       id:        String(m._id ?? m.id),
//       senderId:  String(m.senderId ?? m.sender),
//       receiverId:String(m.receiverId ?? m.receiver),
//       content:   m.content,
//       timestamp: m.timestamp ?? m.createdAt,
//       status:    m.status ?? null,
//       isOwn:     String(m.senderId ?? m.sender) === meId,
//     }));


//     return res.status(200).json({ messages: data });
//   } catch (err) {
//     console.error("Error fetching private messages:", err);
//     return res.status(500).json({ status: "error", message: "Server error" });
//   }
// }

export async function getPrivateMessages(req, res) {
  try {
    const meIdRaw   = req.user?.id ?? req.userId;
    const peerIdRaw = req.params.peerId;
    if (!meIdRaw || !peerIdRaw) {
        console.warn("[getPrivateMessages] missing ids", { meIdRaw, peerIdRaw });
        return res.status(400).json({ status: "error", message: "meId/peerId required" });
    }
    const meId   = normId(meIdRaw);
    const peerId = normId(peerIdRaw);

    console.time("[getPrivateMessages] fetchBoth");
    const [outgoing, incoming] = await Promise.all([
        Msg.getPrivateMsg(meId,  peerId),
        Msg.getPrivateMsg(peerId, meId),
    ]);
    console.timeEnd("[getPrivateMessages] fetchBoth");

    const all = [...(outgoing || []), ...(incoming || [])];

    const seen = new Set();
    const dedup = all.filter(m => {
        const id = String(m._id ?? m.id ?? "");
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
    });

    const ts = (m) => {
        const v = m.timestamp ?? m.createdAt ?? (m._id?.getTimestamp?.() ?? null);
        return new Date(v).getTime();
    };
    dedup.sort((a, b) => ts(a) - ts(b));

    const data = dedup.map(m => {
        const msgId = normId(m._id ?? m.id);
        const sid = normId(m.senderId ?? m.sender);
        const rid = normId(m.receiverId ?? m.receiver);
        const own = sid === meId;
        const payload = {
            id:         msgId,
            senderId:   sid,
            receiverId: rid,
            content:    m.content,
            timestamp:  m.timestamp ?? m.createdAt,
            status:     m.status ?? null,
            isOwn:      own,
        };
        console.log("playload: ",payload);
        return payload;
    });

    return res.status(200).json({ messages: data });
  } catch (err) {
    console.error("[getPrivateMessages] ERROR:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function sendPrivateMessage(req, res) {
    // Req parameters:
    // Sender, Receiver (UID)
    // Message Text, Timestamp
    // Sender Status (retrieved from user)
    // Res:
    // void with Status code
    // 201: "Message sent successfully"
    // 500: "Internal server error: Unable to create new private message to channel."
    try {
        const { receiver, content, status, timestamp } = req.body;
        const sender = String(req.user?.id ?? req.userId);

        if (!receiver || !content) {
            return res.status(400).json({ status: "error", message: "receiver/content required" });
        }

        const msg = new Msg({
            sender,
            receiver,
            content: content.trim(),
            status,
            timestamp,
        });
        await msg.create();

        const senderUsername = await User.getUsernameById(sender);
        const receiverUsername = await User.getUsernameById(receiver);
        if (!senderUsername || !receiverUsername) {
            return res
                .status(500)
                .json({
                    status: "error",
                    message: "Sender or receiver not found",
                });
        }

        const socketInstance = req.app.get("socketInstance");
        if (!socketInstance) {
            return res.status(500).json({
                status: "error",
                message: "Socket instance not found",
            });
        }
        socketInstance.emitMessageFromAndTo(senderUsername, receiverUsername, {
            sender: senderUsername,
            receiver: receiverUsername,
            content: content,
            timestamp: timestamp,
            status: status,
        });

        return res.status(201).json({ message: "Message sent successfully" });
    } catch (err) {
        console.error("Error sending private message:", err);
        return res
            .status(500)
            .json({ status: "error", message: "Server error" });
    }
}
