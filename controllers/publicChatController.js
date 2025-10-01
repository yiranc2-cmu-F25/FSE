import Message from "../daos/MsgDao.js";
import User from "../daos/UserDao.js"; 

export async function getPublicMessages(req, res) {
  try {
    const messages = await Message.getPublicMsg();
    const data = messages.map((msg) => {
      let isOwn =
        (msg.sender.username || "") === (req.username.toLowerCase() || "");
      return {
        sender: msg.sender.username,
        content: msg.content,
        timestamp: msg.timestamp,
        status: msg.status,
        isOwn: isOwn,
      };
    });

    return res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching public messages:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

// req body  1. sender 2.timestamp 3.status 4.content
export async function sendPublicMessage(req, res) {
  console.log("[DEBUG] sendPublicMessage called");
  try {
    console.log("Requesting Body:", req.body);
    console.log("Raw body string:", JSON.stringify(req.body));
    const { sender, content, status, timestamp } = req.body;
    if (!sender || !content || !status) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const newMessage = await Message.create({
      sender,
      receiver: "public",
      content: content.trim(),
      status,
      timestamp,
    });

    console.log("New message created:", newMessage);

    const username = await User.getUsernameById(sender);
    if (!username) {
      return res.status(404).json({ error: "Sender not found" });
    }

    const socketInstance = req.app.get("socketInstance");
    if (!socketInstance) {
      return res
        .status(500)
        .json({ status: "error", message: "Socket instance not found" });
    }
    socketInstance.emitMessageFrom(username, {
      sender: username,
      content: newMessage.content,
      timestamp: newMessage.timestamp,
      status: newMessage.status
    });

    return res.status(201).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Error sending public message:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}
