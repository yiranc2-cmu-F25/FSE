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

export function getInitials(input) {
  const s = (input ?? "").toString().trim();
  if (!s) return "?";

  const parts = s.split(/\s+/u).filter(Boolean);

  const pick = (str) => {
    const m = str.match(/[\p{L}\p{N}]/u);
    if (m) return m[0].toUpperCase();
    const chars = Array.from(str);
    return (chars[0] || "?").toUpperCase();
  };

  if (parts.length === 1) {
    const word = parts[0];
    const first = pick(word);
    const rest = Array.from(word).slice(1).join("");
    let second = "";
    const m2 = rest.match(/[\p{L}\p{N}]/u);
    if (m2) second = m2[0].toUpperCase();
    else if (rest) second = Array.from(rest)[0].toUpperCase();

    const out = (first + (second || "")).trim();
    return out || "?";
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
