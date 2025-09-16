import User from "../models/User.js";
import { isUsernameValid, isPasswordValid } from "../utils/validators.js";
import { setAuthCookie, clearAuthCookie } from "../middleware/jwt.js";
import { ForbiddenUsernames }  from "../config/ForbiddenUsernamesConfig.js";
import dotenv from "dotenv";
dotenv.config();

const EXPIRATION_TIME = process.env.EXPIRATION_TIME;

export async function register(req, res) {
	try{
		const { username, password } = req.body;

		if (!isUsernameValid(username)) return res.status(400).json({ error: "Invalid username" });
		if (!isPasswordValid(password)) return res.status(400).json({ error: "Invalid password" });

		const user = await User.create({ username, password });

		setAuthCookie(res, username, EXPIRATION_TIME);
		return res.status(201).json({
			message: "User successfully registered",
			username: user.username
		});
	} catch (err) {
		console.error("Registration error:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function login(req, res) {
	try {
		const { username, password } = req.body;

		const user = await User.findByUsername(username);

		if (!user) return res.status(404).json({ error: "User not found" });

		if (!(await user.validatePassword(password))) {
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
			username: user.username,
			status: user.sharedstatus ?? "undefined",
			role: user.role,
			image:
			user.avatar ||
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
	} catch (err) {
		console.error("Logout error:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}

export async function usernameStatus(req, res) {
	try {
		const { username } = req.body;

		const filteredName = username.trim().toLowerCase();
		if (ForbiddenUsernames.includes(filteredName)) {
			return res.json({
				status: "reserved",
				reason: "banned_username",
				message: "This username is not allowed."
			});
		}

		const user = await User.findByUsername(username);
		if (user) {
			return res.json({ status: "exists" });
		}

		return res.json({ status: "available" });
		
	} catch (err) {
		console.error("usernameStatus error:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}