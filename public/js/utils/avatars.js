import { toStr } from "./dateFormatter.js";
const colors = [
  "#2EA328",
  "#148ADE",
  "#A32828",
  "#28A38A",
  "#A39128",
  "#2870A3",
  "#A34D28",
  "#284FA3",
  "#DECD14",
  "#BC5656",
  "#7D28A3",
];

export function getAvatarColor(name) {
  const charIndex = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
  return colors[charIndex % colors.length];
}

export function getInitials(name) {
  const nameParts = name.split(" ");
  if (nameParts.length === 1) {
    return (
      nameParts[0].charAt(0).toUpperCase() +
      nameParts[0]
        .slice(1)
        .match(/[a-zA-Z0-9]/)[0]
        .toUpperCase()
    );
  } else {
    return (
      nameParts[0].charAt(0).toUpperCase() +
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  }
}
export function getInitialsSafe(name) {
  const s = toStr(name, "").trim();
  if (!s) return "?";
  try {
    const res = getInitials(s);
    if (res && typeof res === "string" && res.length) return res;
  } catch (_) {}
  // Fallback that works for CJK/emoji/etc.
  const chars = Array.from(s); // Unicode-safe split
  const first = chars[0] || "?";
  // If there’s a second word, take its first char too, else just one char
  const second = (s.split(/\s+/)[1] && Array.from(s.split(/\s+/)[1])[0]) || "";
  return (first + second).toUpperCase();
}
