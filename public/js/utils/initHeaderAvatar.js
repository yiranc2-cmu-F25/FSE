// Shared utility to initialize header avatar (initials and background color)
// Computes once and stores in window for reuse across pages

import { getInitialsSafe, getAvatarColor } from "./avatars.js";

/**
 * Initialize the header avatar by loading user info, computing initials/color,
 * and updating the DOM. Stores computed values in window for reuse.
 * @returns {Promise<void>}
 */
export async function initHeaderAvatar() {
  // If already computed, reuse stored values
  if (window.__USER_AVATAR_INITIALS__ && window.__USER_AVATAR_COLOR__) {
    updateAvatarDOM(window.__USER_AVATAR_INITIALS__, window.__USER_AVATAR_COLOR__);
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

    // Store user info globally
    window.__CURRENT_USER_ID__ = me.id ?? me._id ?? me.userId ?? null;
    window.__CURRENT_USER__ = name;

    // Compute initials and color
    const initials = getInitialsSafe(name);
    const color = getAvatarColor(name);

    // Store computed values for reuse
    window.__USER_AVATAR_INITIALS__ = initials;
    window.__USER_AVATAR_COLOR__ = color;

    // Update DOM
    updateAvatarDOM(initials, color);
  } catch (err) {
    console.error("[initHeaderAvatar] Error:", err);
  }
}

/**
 * Update the header avatar DOM elements with initials and color
 * @param {string} initials - The initials to display
 * @param {string} color - The background color (hex)
 */
function updateAvatarDOM(initials, color) {
  const avatar = document.getElementById("header-avatar");
  const avatarInit = document.getElementById("header-avatar-initials");

  if (avatar) {
    avatar.style.backgroundColor = color;
  }
  if (avatarInit) {
    avatarInit.textContent = initials;
  }
}

