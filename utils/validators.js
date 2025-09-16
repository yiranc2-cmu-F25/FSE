import { ForbiddenUsernames }  from "../config/ForbiddenUsernamesConfig.js";
export const isUsernameValid = (u) =>
    typeof u === "string" && u.length >= 3 && !ForbiddenUsernames.includes(u.toLowerCase());
export const isPasswordValid = (p) =>
    typeof p === "string" && p.length >= 4;
