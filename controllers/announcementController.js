import User from "../entities/User.js";
import Announcement from "../entities/Announcement.js";


export async function getAnnouncements(req, res) {
    try {
        const announcements = await Announcement.getAnnouncement();
        const data = announcements.map((msg) => {
            return {
                sender: msg.sender.username,
                content: msg.content,
                timestamp: msg.timestamp,
                status: msg.status,
            };
        });

        return res.status(200).json(data);

    } catch (err) {
        console.error("Error fetching announcements:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
}

export async function postAnnouncement(req, res) {

    try {
        const { sender, content, status, timestamp } = req.body;
        const announcement = new Announcement({ sender, content: content.trim(), status, timestamp });

        await announcement.create();
        const username = await User.getUsernameById(sender);
        
        const socketInstance = req.app.get("socketInstance");
        if (!socketInstance) {
            return res
                .status(500)
                .json({ status: "error", message: "Socket instance not found" });
        }
        
        socketInstance.emitMessageFrom(username, {
            sender: username,
            content: content,
            timestamp: timestamp,
            status: status
        });

        return res.status(201).json({ message: "Announcement posted" });

    } catch (err) {
        console.error("Error posting announcement:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
}
