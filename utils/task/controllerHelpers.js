/**
 * Helper functions for task controllers
 */

/**
 * Normalizes an ID to a string format
 * This is used to convert the ID to a string (in case browser throws something strange at us)
 * @param {*} idLike - ID in various formats
 * @returns {string} Normalized ID string
 */
export function normId(idLike) {
  if (idLike == null) return "";
  if (typeof idLike === "string") return idLike;
  if (typeof idLike === "object") {
    return String(idLike._id ?? idLike.id ?? "");
  }
  return idLike.toString ? idLike.toString() : String(idLike);
}

/**
 * Extracts and normalizes user ID from request
 * @param {Object} req - Express request object
 * @returns {string|null} Normalized user ID or null if not authenticated
 */
export function getUserIdFromRequest(req) {
  const userIdRaw = req.user?.id ?? req.userId;
  if (!userIdRaw) return null;
  return normId(userIdRaw);
}

/**
 * Validates authentication and returns normalized user ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {string|null} Normalized user ID or null if unauthorized
 */
export function requireAuth(req, res) {
  const userId = getUserIdFromRequest(req);
  if (!userId) {
    res.status(401).json({ status: "error", message: "Unauthorized" });
    return null;
  }
  return userId;
}

/**
 * Validates task ID from request parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {string|null} Task ID or null if invalid
 */
export function getTaskIdFromRequest(req, res) {
  const taskId = req.params.id;
  if (!taskId) {
    res.status(400).json({ status: "error", message: "Task ID is required" });
    return null;
  }
  return taskId;
}

