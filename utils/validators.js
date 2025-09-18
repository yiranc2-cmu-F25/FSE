import { ForbiddenUsernames }  from "../config/ForbiddenUsernamesConfig.js";
export const isUsernameValid = (u) => {
  const regex = /^(?![_-])(?!.*[_-]$)[a-z0-9_-]+$/;
  return (
    typeof u === "string" &&
    u.length >= 3 &&
    !ForbiddenUsernames.includes(u.toLowerCase()) &&
    !u.includes(".") &&
    regex.test(u)
  );
};
export const isPasswordValid = (p) =>
    typeof p === "string" && p.length >= 4;
