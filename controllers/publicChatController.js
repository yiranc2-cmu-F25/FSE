import User from "../entities/User.js";
import Msg from "../entities/Msg.js";

class PublicMessageError extends Error {
  constructor(statusCode, body) {
    super(body?.message || body?.error || "Public message error");
    this.statusCode = statusCode;
    this.body = body;
  }
}

export async function getPublicMessages(req, res) {
  try {
    const messages = await Msg.getPublicMsg();
    const data = buildPublicMessagesResponse(messages, req.username);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching public messages:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function sendPublicMessage(req, res) {
  try {
    const payload = sanitizePublicMessagePayload(req.body);
    await persistPublicMessage(payload);
    const username = await resolveSenderUsername(payload.sender);
    const socket = getSocketInstance(req.app);
    emitPublicMessage(socket, username, payload);
    return res.status(201).json({ message: "Message sent successfully" });
  } catch (err) {
    return handlePublicMessageError(err, res);
  }
}

function buildPublicMessagesResponse(messages, requesterUsername) {
  const normalizedRequester = normalizeUsername(requesterUsername);
  return messages.map((msg) => formatPublicMessage(msg, normalizedRequester));
}

function formatPublicMessage(msg, requesterUsername) {
  const senderName = msg.sender?.username || "";
  return {
    sender: senderName,
    content: msg.content,
    timestamp: msg.timestamp,
    status: msg.status,
    isOwn: normalizeUsername(senderName) === requesterUsername,
  };
}

function normalizeUsername(username) {
  return (username || "").toLowerCase();
}

function sanitizePublicMessagePayload(body) {
  const { sender, content, status, timestamp } = body || {};
  if (!sender || !content || !status) {
    throw new PublicMessageError(400, { error: "Missing required fields" });
  }
  return { sender, content: content.trim(), status, timestamp };
}

async function persistPublicMessage(payload) {
  const message = new Msg({
    sender: payload.sender,
    receiver: null,
    content: payload.content,
    status: payload.status,
    timestamp: payload.timestamp,
  });
  await message.create();
  return message;
}

async function resolveSenderUsername(senderId) {
  const username = await User.getUsernameById(senderId);
  if (!username) {
    throw new PublicMessageError(404, { error: "Sender not found" });
  }
  return username;
}

function getSocketInstance(app) {
  const socketInstance = app.get("socketInstance");
  if (!socketInstance) {
    throw new PublicMessageError(500, {
      status: "error",
      message: "Socket instance not found",
    });
  }
  return socketInstance;
}

function emitPublicMessage(socket, username, payload) {
  socket.emitMessageFrom(username, {
    sender: username,
    content: payload.content,
    timestamp: payload.timestamp,
    status: payload.status,
  });
}

function handlePublicMessageError(err, res) {
  if (err instanceof PublicMessageError) {
    return res.status(err.statusCode).json(err.body);
  }
  console.error("Error sending public message:", err);
  return res.status(500).json({ status: "error", message: "Server error" });
}
