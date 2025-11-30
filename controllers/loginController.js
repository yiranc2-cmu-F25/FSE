import { setAuthCookie, clearAuthCookie } from "../middleware/JWT.js";
import { getOnlineOfflineMembers } from "../entities/MemberList.js";
import User from "../entities/User.js";
import dotenv from "dotenv";
dotenv.config();

const EXPIRATION_TIME = process.env.EXPIRATION_TIME || 1;

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    const user = await User.findByUsername(username);

    if (!user) return res.status(404).json({ error: "User not found" });

    if (!(await User.validatePassword(username, password))) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const userId = String(user._id ?? user.id ?? user.userId ?? "");
    if (!userId) {
      console.error("[login] missing userId for", username, user);
      return res.status(500).json({ error: "login_failed_no_user_id" });
    }
    
    // Get user role and status from database
    const userObj = user.toObject ? user.toObject() : user;
    const role = userObj.role;
    const status = userObj.status;
    
    // Check if user account is inactive
    const { USER_STATUS } = await import("../constants/userStatus.js");
    if (status === USER_STATUS.INACTIVE) {
      // Don't set auth cookie, return error that will trigger redirect to splash page
      return res.status(403).json({ error: "Account inactive", reason: "Your account has been deactivated" });
    }
    
    setAuthCookie(res, userId, username, role, EXPIRATION_TIME);
    return res.json({ username: username, ok: true });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function getMe(req, res) {
  try {
    // Use userId instead of username because username can change but userId never changes
    // This ensures the endpoint works even after an admin changes the username
    const user = await User.findById(req.userId);

    if (!user) return res.status(404).json({ error: "User not found" });

    // Handle both Mongoose document and plain object
    const userObj = user.toObject ? user.toObject() : user;
    
    res.json({
      id: String(userObj._id || userObj.id),
      username: userObj.username, // Return current username from database (not JWT)
      status: userObj.sharedstatus ?? "undefined",
      role: userObj.role, // Return current role from database (not JWT)
      image: "images/photos/user-profiles/user1-james.png",
    });
  } catch (err) {
    console.error("Get user profile error:", err);
    return res.status(500).json({ status: "error", message: "Server error" });
  }
}

export async function logout(req, res) {
  try {
    clearAuthCookie(res);
    const socketInstance = req.app.get("socketInstance");
    const username = req.username;
    socketInstance.disconnectUser(username);
    return res.status(204).end();
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
