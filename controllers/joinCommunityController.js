import User from "../models/User.js";
import { isUsernameValid, isPasswordValid } from "../utils/validators.js";
import { setAuthCookie, clearAuthCookie } from "../middleware/JWT.js";
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

export async function usernameStatus(req, res) {
	try {
		const { username } = req.body;

		if (!isUsernameValid(username)) {
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