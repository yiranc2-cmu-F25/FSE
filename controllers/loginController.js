import User from "../daos/UserDao.js";
import { setAuthCookie, clearAuthCookie } from "../middleware/JWT.js";
import dotenv from "dotenv";
dotenv.config();

const EXPIRATION_TIME = process.env.EXPIRATION_TIME;

export async function login(req, res) {
	try {
		const { username, password } = req.body;

		const user = await User.findByUsername(username);

		if (!user) return res.status(404).json({ error: "User not found" });

		if (!(await User.validatePassword(username,password))) {
			return res.status(401).json({ error: "Invalid password" });
		}

		setAuthCookie(res, username, EXPIRATION_TIME);
		return res.json({ username: username, ok : true});
	} catch (err) {
		console.error("Login error:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function getMe(req, res) {
	try {
		const user = await User.findByUsername(req.username);

		if (!user) return res.status(404).json({ error: "User not found" });

		res.json({
			id: user.id,
			username: user.username,
			status: user.sharedstatus ?? "undefined",
			role: user.role,
			image:
			"images/photos/user-profiles/user1-james.png",
		});
	} catch (err) {
		console.error("Get user profile error:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function logout(req, res) {
	try {
		clearAuthCookie(res);
		const io = req.app.get("io");
		const socketInstance = req.app.get("socketInstance");
		const username = req.username;

		if (io && socketInstance && username) {
		const room = socketInstance.roomFor(
			socketInstance.normUsername(username)
		);
		io.in(room).disconnectSockets(true);
		}
		return res.status(204).end();
	} catch (err) {
		console.error("Logout error:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function listMembers(req, res) {
  try {
    const docs = await User.getAllUsers(); 
	const all = docs.map(d => ({
  	name: d.username,
  	status: d.sharedstatus ?? "UNDEFINED"
	}));

    const onlineNames = req.app.get("socketInstance")?.getOnline?.() ?? [];
    const onlineSet = new Set(onlineNames.map(n => (n || "").toLowerCase()));

    const onlineUsers = [];
    const offlineUsers = [];
    for (const u of all) {
      (onlineSet.has((u.name || "").toLowerCase()) ? onlineUsers : offlineUsers).push(u);
    }
    const byName = (a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase());
    onlineUsers.sort(byName);
    offlineUsers.sort(byName);
	return res.json({ onlineUsers, offlineUsers });
  } catch (err) {
    console.error("listMembers error:", err);
    return res.status(500).json({ status: "error" });
  }
}
