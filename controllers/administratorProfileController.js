import User from "../entities/User.js";
import { isUsernameValid, isPasswordValid } from "../utils/validators.js";
import { USER_ROLE } from "../constants/userRole.js";
import { USER_STATUS } from "../constants/userStatus.js";

/**
 * Middleware to check if the current user is an administrator
 */
async function requireAdmin(req, res, next) {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ error: "Current user not found" });
        }
        
        // Handle both Mongoose document and plain object
        const userObj = currentUser.toObject ? currentUser.toObject() : currentUser;
        const role = userObj.role;
        
        if (role !== USER_ROLE.ADMIN) {
            return res.status(403).json({ error: "Forbidden: Administrator privileges required" });
        }
        
        next();
    } catch (err) {
        console.error("Error checking admin privileges:", err);
        return res.status(500).json({ error: "Server error" });
    }
}

/**
 * Get all users (both active and inactive) for administration
 * GET /api/admin/profiles
 */
export async function getAllUsers(req, res) {
    try {
        // Get active users
        const activeUsers = await User.getAllUsers();
        
        // Get inactive users
        const inactiveUsers = await User.DAO.getInactiveUsers();
        
        // Combine and format all users
        const allUsers = [...activeUsers, ...inactiveUsers];
        
        // Format users for response (only include fields that can be modified)
        const users = allUsers.map((user) => ({
            id: String(user._id || user.id),
            username: user.username,
            status: user.status,
            role: user.role,
            // Password is not returned for security reasons
        }));
        
        // Sort by username
        users.sort((a, b) => a.username.localeCompare(b.username));
        
        res.json(users);
    } catch (err) {
        console.error("Error fetching all users:", err);
        return res.status(500).json({ error: "Server error" });
    }
}

/**
 * Update user profile
 * Supports updating: status, role, username, password
 * Can update one or multiple fields at once
 * PUT /api/admin/profiles/:userId
 */
export async function updateUserProfile(req, res) {
    try {
        const { userId } = req.params;
        const { status, role, username, password } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }
        
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        
        const errors = [];
        
        // Validate and prepare status update
        if (status !== undefined) {
            if (status !== USER_STATUS.ACTIVE && status !== USER_STATUS.INACTIVE) {
                errors.push("Invalid status. Must be 'active' or 'inactive'");
            } else {
                // Will update after validation
            }
        }
        
        // Validate and prepare role update
        if (role !== undefined) {
            const validRoles = Object.values(USER_ROLE);
            if (!validRoles.includes(role)) {
                errors.push(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
            } else {
                // Will update after validation
            }
        }
        
        // Validate username if provided
        if (username !== undefined) {
            if (!isUsernameValid(username)) {
                errors.push("Invalid username format. Username must be at least 3 characters, contain no dots, and not be a forbidden username.");
            } else {
                const usernameExists = await User.DAO.usernameExists(username.toLowerCase(), userId);
                if (usernameExists) {
                    errors.push("Username already exists");
                }
            }
        }
        
        // Validate password if provided
        if (password !== undefined) {
            if (!isPasswordValid(password)) {
                errors.push("Invalid password format. Password must be at least 4 characters.");
            }
        }
        
        // If there are validation errors, return them
        if (errors.length > 0) {
            return res.status(400).json({ 
                error: "Validation errors",
                errors: errors
            });
        }
        
        // Perform updates
        const updatePromises = [];
        
        if (status !== undefined) {
            updatePromises.push(User.DAO.updateAccountStatusById(userId, status));
        }
        
        if (role !== undefined) {
            updatePromises.push(User.updateRoleById(userId, role));
        }
        
        if (username !== undefined) {
            updatePromises.push(User.DAO.updateUsernameById(userId, username.toLowerCase()));
        }
        
        if (password !== undefined) {
            updatePromises.push(User.DAO.updatePasswordById(userId, password));
        }
        
        await Promise.all(updatePromises);
        
        // Get updated user
        const updatedUser = await User.findById(userId);
        if (!updatedUser) {
            return res.status(404).json({ error: "User not found after update" });
        }
        
        // Handle both Mongoose document and plain object
        const userObj = updatedUser.toObject ? updatedUser.toObject() : updatedUser;
        const finalUserId = String(userObj._id || userObj.id);
        
        res.json({ 
            message: "Profile updated successfully",
            userId: finalUserId,
            profile: {
                id: finalUserId,
                username: userObj.username,
                status: userObj.status,
                role: userObj.role
            }
        });
    } catch (err) {
        console.error("Error updating user profile:", err);
        
        // Handle duplicate username error
        if (err.message === "Username already exists") {
            return res.status(400).json({ error: "Username already exists" });
        }
        
        return res.status(500).json({ error: "Server error" });
    }
}

// Export the middleware for use in routes
export { requireAdmin };

