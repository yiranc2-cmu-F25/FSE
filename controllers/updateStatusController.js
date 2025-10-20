import User from "../entities/User.js";

export async function updateStatusById(req, res) {
    try{
        const { userId, newStatus } = req.body;
        //console.log("Received status update request:", { userId, newStatus });
        if (!userId || !newStatus) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const user = await User.getUsernameById(userId);
        // const user = await req.app.locals.userDao.getUsernameById(userId);
        
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        await User.updateStatusById(userId, newStatus);
        // await req.app.locals.userDao.updateStatusById(userId, newStatus);

        const socketInstance = req.app.get("socketInstance");
        if (!socketInstance) {
          return res
            .status(500)
            .json({ status: "error", message: "Socket instance not found" });
        }
        console.log("User status updated:", { userId: userId, newStatus });
        socketInstance.broadcastNewStatus(userId, newStatus);

        return res.status(200).json({ message: "User status updated" });
    } catch (err) {
        console.error("Error updating user status:", err);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
}