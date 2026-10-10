import User from "../entities/User.js";
import Task from "../entities/Task.js";
import { isUsernameValid, isPasswordValid } from "../utils/validators.js";
import { USER_ROLE } from "../constants/userRole.js";
import { USER_STATUS } from "../constants/userStatus.js";
import { toPlainObject } from "../utils/toPlainObject.js";

const VALID_STATUSES = Object.values(USER_STATUS);
const VALID_ROLES = Object.values(USER_ROLE);

/**
 * Middleware: only administrators may continue.
 * Reads the role placed on the request by the auth middleware.
 */
export async function requireAdmin(req, res, next) {
  try {
    const role = req.user?.role || req.role;
    if (!role) {
      return res
        .status(401)
        .json({ error: "Unauthorized: User role not found" });
    }
    if (role !== USER_ROLE.ADMIN) {
      return res
        .status(403)
        .json({ error: "Forbidden: Administrator privileges required" });
    }
    next();
  } catch (err) {
    console.error("Error checking admin privileges:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

function toAdminListItem(user) {
  return {
    id: String(user._id || user.id),
    username: user.username,
    status: user.status,
    role: user.role,
    // The password hash is never returned.
  };
}

/**
 * GET /api/admin/profiles
 * All users (active and inactive) sorted by username.
 */
export async function getAllUsers(req, res) {
  try {
    const activeUsers = await User.getAllUsers();
    const inactiveUsers = await User.getInactiveUsers();
    const users = [...activeUsers, ...inactiveUsers].map(toAdminListItem);
    users.sort((a, b) => a.username.localeCompare(b.username));
    res.json(users);
  } catch (err) {
    console.error("Error fetching all users:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

async function validateUsernameChange(username, userId) {
  if (!isUsernameValid(username)) {
    return [
      "Invalid username format. Username must be at least 3 characters, contain no dots, and not be a forbidden username.",
    ];
  }
  if (await User.usernameExists(username.toLowerCase(), userId)) {
    return ["Username already exists"];
  }
  return [];
}

/** Returns every validation message for the requested changes (empty = valid). */
async function validateProfileChanges(
  { status, role, username, password },
  userId,
) {
  const errors = [];
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    errors.push("Invalid status. Must be 'active' or 'inactive'");
  }
  if (role !== undefined && !VALID_ROLES.includes(role)) {
    errors.push(`Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`);
  }
  if (username !== undefined) {
    errors.push(...(await validateUsernameChange(username, userId)));
  }
  if (password !== undefined && !isPasswordValid(password)) {
    errors.push(
      "Invalid password format. Password must be at least 4 characters.",
    );
  }
  return errors;
}

/** Deactivated users are removed from every task; a failure here is logged, not fatal. */
async function removeInactiveUserFromTasks(userId) {
  try {
    const removedCount = await Task.removeUserFromAllTasks(userId);
    console.log(
      `[Inactive User Privacy] Removed user ${userId} from ${removedCount} task participation(s)`,
    );
  } catch (err) {
    console.error(
      `[Inactive User Privacy] Error removing user ${userId} from tasks:`,
      err,
    );
  }
}

/** Drops sockets that are no longer valid: deactivated accounts and renamed users. */
function disconnectStaleSockets(req, { statusRequested, before, after }) {
  const socketInstance = req.app.get("socketInstance");
  if (!socketInstance) return;

  if (
    statusRequested &&
    after.status === USER_STATUS.INACTIVE &&
    after.username
  ) {
    socketInstance.disconnectUser(after.username);
    console.log(
      `[Force Logout] Disconnected user ${after.username} due to account being set to inactive`,
    );
  }
  if (before.username !== after.username) {
    socketInstance.disconnectUser(before.username);
    console.log(
      `Disconnected socket for username change: ${before.username} -> ${after.username}`,
    );
  }
}

function buildUpdateResponse(user) {
  const id = String(user._id || user.id);
  return {
    message: "Profile updated successfully",
    userId: id,
    profile: {
      id,
      username: user.username,
      status: user.status,
      role: user.role,
    },
  };
}

/**
 * PUT /api/admin/profiles/:userId
 * Updates any of status / role / username / password for a user.
 */
export async function updateUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const { status, role, username, password } = req.body ?? {};
    const changes = { status, role, username, password };

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const before = toPlainObject(await User.findById(userId));
    if (!before) {
      return res.status(404).json({ error: "User not found" });
    }

    const errors = await validateProfileChanges(changes, userId);
    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation errors", errors });
    }

    const after = await User.updateProfileById(userId, changes);
    if (!after) {
      return res.status(404).json({ error: "User not found after update" });
    }

    if (
      status === USER_STATUS.INACTIVE &&
      before.status === USER_STATUS.ACTIVE
    ) {
      await removeInactiveUserFromTasks(userId);
    }
    disconnectStaleSockets(req, {
      statusRequested: status !== undefined,
      before,
      after,
    });

    return res.json(buildUpdateResponse(after));
  } catch (err) {
    console.error("Error updating user profile:", err);
    if (err.message === "Username already exists") {
      return res.status(400).json({ error: "Username already exists" });
    }
    return res.status(500).json({ error: "Server error" });
  }
}
