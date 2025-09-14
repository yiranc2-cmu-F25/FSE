import User from "../models/User.js";
import { isUsernameValid, isPasswordValid } from "../utils/validators.js";
import { setAuthCookie, clearAuthCookie } from "../middleware/JWT.js";

export async function register(req, res) {
  const { username, password } = req.body;

  if (!isUsernameValid(username)) return res.status(400).json({ error: "Invalid username" });
  if (!isPasswordValid(password)) return res.status(400).json({ error: "Invalid password" });

  const exists = await User.findOne({ username });
  if (exists) return res.status(409).json({ error: "Username already exists" });

  const user = await User.create({ username, password });

  setAuthCookie(res, { username: user.username }, 2);
  return res.status(201).json({
    message: "User successfully registered",
    username: user.username
  });
}

export async function login(req, res) {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  if (!user || !(await user.validatePassword(password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  setAuthCookie(res, { username: user.username }, 2);
  return res.json({ username: user.username });
}

export async function getMe(req, res) {
  res.json({ username: req.user.username });
}

export async function logout(req, res) {
  clearAuthCookie(res);
  res.json({ ok: true });
}
