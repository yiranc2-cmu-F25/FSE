import { isUsernameValid, isPasswordValid } from "../utils/validators.js";
import { setAuthCookie, clearAuthCookie } from "../middleware/JWT.js";
import User from "../entities/User.js";
import dotenv from "dotenv";
dotenv.config();


const EXPIRATION_TIME = process.env.EXPIRATION_TIME || 1;

export async function register(req, res) {
	try{
		const { username, password } = req.body;

		// if (!isUsernameValid(username)) return res.status(400).json({ error: "Invalid username" });
		// if (!isPasswordValid(password)) return res.status(400).json({ error: "Invalid password" });

		// await req.app.locals.userDao.create({ username, password });

		const user = new User({ username, password });
  		const created = await user.create();

		const userId = String(
			created?._id ?? created?.id ?? user?._id ?? user?.id
		);

		if (!userId) {
			return res.status(500).json({ error: "register_failed_no_id" });
		}

		setAuthCookie(res, userId, username, EXPIRATION_TIME);
		return res.status(201).json({
			message: "User successfully registered",
			username
		});
	} catch (err) {
		console.error("Registration error:", err);

		if (err instanceof Error) {
		if (err.message === "Invalid username") {
			return res.status(400).json({ error: "Invalid username" });
		}
		if (err.message === "Invalid password") {
			return res.status(400).json({ error: "Invalid password" });
		}
		}
		
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
		// const user = await req.app.locals.userDao.findByUsername(username);
		if (user) {
			return res.json({ status: "exists" });
		}

		return res.json({ status: "available" });
		
	} catch (err) {
		console.error("usernameStatus error:", err);
		return res.status(500).json({ status: "error", message: "Server error" });
	}
}