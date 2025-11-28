import User from "../entities/User.js";
import Announcement from "../entities/Announcement.js";
import { USER_ROLE } from "../constants/userRole.js";


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
        
        // Get role from JWT token (set by auth middleware) instead of querying database
        const role = req.user?.role || req.role;
        
        if (!role) {
            return res.status(401).json({ status: "error", message: "User role not found" });
        }
        
        if(role === USER_ROLE.CITIZEN) {
            return res.status(403).json({ status: "error", message: "You are not authorized to post announcements" });
        }
        
        // Verify sender matches current user (security check)
        if (sender !== req.user.id) {
            return res.status(403).json({ status: "error", message: "You can only post announcements as yourself" });
        }
        
        const announcement = new Announcement({ sender, content: content.trim(), status:status.toLowerCase(), timestamp });
        console.log("Creating announcement:", announcement);

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
