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
