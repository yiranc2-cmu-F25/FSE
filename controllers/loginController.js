import User from "../daos/UserDao.js";
import { setAuthCookie, clearAuthCookie } from "../middleware/JWT.js";
import { disconnectUser } from "../services/sessionService.js";
import { getOnlineOfflineMembers } from "../services/memberService.js";
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
		const user = await findByUsername(req.username);

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
		disconnectUser(req);
		return res.status(200).json({ ok: true });
	} catch (err) {
		console.error("Logout error:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function listMembers(req, res) {
	try {
		const result = await getOnlineOfflineMembers(req.app);
		return res.json(result);
	} catch (err) {
		console.error("listMembers error:", err);
		return res.status(500).json({ status: "error" });
	}
}
