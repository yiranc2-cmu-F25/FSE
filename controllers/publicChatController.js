import Message from "../models/Msg.js";
import Socket from "../Middleware/Socket.js";
import User from "../models/User.js";
import { populate } from "dotenv";

//use user to find all active users -> username , sharedstatus // getAllUsers
//listen to socket events to get allonlineusers
//use Message to get all public messages //getPublicMessages
//send message by socket and save to public messages // sendPublicMessage

export async function getAllActiveUsers(req, res) {
  try {
    const users = await User.getAllUsers();
    return res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching active users:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function getPublicMessages(req, res) {
  try {
    const messages = await Message.getPublicMsg()
      .populate("sender", "username")
      .lean();
    const data = messages.map((msg) => {
      console.log("Message sender:", msg.sender.username);
      console.log("Request username:", req.username);
      let isOwn =
        (msg.sender.username || "") === (req.username.toLowerCase() || "");
      //   if (isOwn) {
      //     console.log("Found own message:", msg);
      //   }
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
  try {
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
    // console.log("Broadcasting message from:", username);
    // console.log("request username:", req.username);
    socketInstance.broadcastMessage({
      sender: username,
      content: newMessage.content,
      timestamp: newMessage.timestamp,
      status: newMessage.status,
      isOwn: username === (req.username.toLowerCase() || ""),
    });

    return res.status(201).json({ message: "Message sent successfully" });
  } catch (err) {
    console.error("Error sending public message:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}
