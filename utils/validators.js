import { ForbiddenUsernames } from "../config/ForbiddenUsernamesConfig.js";
export const isUsernameValid = (u) => {
  return (
    typeof u === "string" &&
    u.length >= 3 &&
    !ForbiddenUsernames.includes(u.toLowerCase()) &&
    !u.includes(".")
  );
};

export const isPasswordValid = (p) => typeof p === "string" && p.length >= 4;

/**
 * Validates if a string is a valid MongoDB ObjectId format (24 hex characters)
 * This is a simple format check and does not require mongoose
 */
export const isValidObjectId = (id) => {
  if (typeof id !== "string") return false;
  // MongoDB ObjectId is exactly 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(id);
};
