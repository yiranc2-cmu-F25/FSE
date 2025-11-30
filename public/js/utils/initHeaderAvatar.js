// Shared utility to initialize header avatar (initials and background color)
// Computes once and stores in window for reuse across pages

import { getInitialsSafe, getAvatarColor } from "./avatars.js";

/**
 * Get ring class based on user role/privilege
 * @param {string} role - The user's role (admin, coordinator, citizen)
 * @returns {string} - Tailwind ring classes
 */
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

/**
 * Initialize the header avatar by loading user info, computing initials/color,
 * and updating the DOM. Stores computed values in window for reuse.
 * @returns {Promise<void>}
 */
export async function initHeaderAvatar() {
  // If already computed, reuse stored values
  if (window.__USER_AVATAR_INITIALS__ && window.__USER_AVATAR_COLOR__ && window.__USER_AVATAR_RING_CLASS__) {
    updateAvatarDOM(
      window.__USER_AVATAR_INITIALS__,
      window.__USER_AVATAR_COLOR__,
      window.__USER_AVATAR_RING_CLASS__
    );
    return;
  }

  try {
    const res = await fetch("/api/authentications/accounts", {
      credentials: "include",
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) {
      console.warn("[initHeaderAvatar] Failed to fetch user:", res.status);
      return;
    }

    const me = await res.json();
    const name = (me.username || "").trim() || "Guest";
    const role = me.role || "";

    // Store user info globally
    window.__CURRENT_USER_ID__ = me.id ?? me._id ?? me.userId ?? null;
    window.__CURRENT_USER__ = name;

    // Compute initials and color
    const initials = getInitialsSafe(name);
    const color = getAvatarColor(name);
    const ringClass = getPrivilegeRingClass(role);

    // Store computed values for reuse
    window.__USER_AVATAR_INITIALS__ = initials;
    window.__USER_AVATAR_COLOR__ = color;
    window.__USER_AVATAR_RING_CLASS__ = ringClass;

    // Update DOM
    updateAvatarDOM(initials, color, ringClass);
  } catch (err) {
    console.error("[initHeaderAvatar] Error:", err);
  }
}

/**
 * Update the header avatar DOM elements with initials, color, and ring
 * @param {string} initials - The initials to display
 * @param {string} color - The background color (hex)
 * @param {string} ringClass - The Tailwind ring classes (empty string if no ring)
 */
function updateAvatarDOM(initials, color, ringClass = "") {
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
  if (avatarInit) {
    avatarInit.textContent = initials;
  }
}

