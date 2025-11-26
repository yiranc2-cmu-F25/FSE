import { getInitialsSafe, getAvatarColor } from "/js/utils/avatars.js";

async function loadMe() {
  const res = await fetch("/api/authentications/accounts", {
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const me = await res.json();

  const name = (me.username || "").trim();
  window.__CURRENT_USER_ID__ = me.id ?? me._id ?? me.userId ?? null;
  window.__CURRENT_USER__ = name ?? '';
  const initials = getInitialsSafe(name);
  const color = getAvatarColor(name);

  const avatar = document.getElementById("header-avatar");
  const avatarInit = document.getElementById("header-avatar-initials");

  if (avatar) avatar.style.backgroundColor = color;
  if (avatarInit) avatarInit.textContent = initials;

  window.__CURRENT_USER__ = name;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadMe();
  } catch (err) {
    console.error("[coaching boards] bootstrap failed:", err);
  }
});

