import { getInitialsSafe, getAvatarColor } from "/js/utils/avatars.js";

function getPrivilegeRingClass(role) {
  if (!role) return "";
  const roleLower = role.toLowerCase();
  if (roleLower === "admin" || roleLower === "administrator") {
    return "ring-4 ring-pink-400";
  }
  if (roleLower === "coordinator") {
    return "ring-4 ring-yellow-400";
  }
  return ""; // Citizen has no ring
}

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
  const role = me.role || "";
  const ringClass = getPrivilegeRingClass(role);

  const avatar = document.getElementById("header-avatar");
  const avatarInit = document.getElementById("header-avatar-initials");

  if (avatar) {
    avatar.style.backgroundColor = color;
    // Remove existing ring classes
    avatar.classList.remove("ring-2", "ring-4", "ring-pink-400", "ring-yellow-400", "ring-white");
    // Add new ring class if provided
    if (ringClass) {
      const ringClasses = ringClass.split(" ");
      ringClasses.forEach((cls) => {
        if (cls) avatar.classList.add(cls);
      });
    }
  }
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

