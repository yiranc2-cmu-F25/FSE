import { getSocket } from "/js/utils/socket.js";
const socket = getSocket();
import { getInitials, getAvatarColor } from "/js/utils/avatars.js";


// select logout button and call Logout on click
const $ = (s) => document.querySelector(s);
const HOME = "/";
const btn = $("#logoutButton");
if (btn) {
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    await Logout();
  });
}
async function Logout() {
  try {
    const res = await fetch("/api/authentications/logout", {
      method: "POST",
      credentials: "include"
    });

    if (!res.ok) {
      throw new Error("Logout failed");
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    window.socket?.disconnect?.();

    window.location.replace(HOME);
  } catch (err) {
    console.error(err);
  }
}

// select edit profile button and navigate to profile update page on click
const editBtn = $(".edit-profile-button");
if (editBtn) {
  editBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/status";
  });
}


async function loadMeAndRender() {
  const res = await fetch("/api/authentications/accounts", {
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const me = await res.json();

  const name = (me.username || "").trim();

  const nameEl   = document.getElementById("username");
  const avatarEl = document.getElementById("avatar");
  if (nameEl)   nameEl.textContent = name;
  if (avatarEl) {
    avatarEl.style.backgroundColor = getAvatarColor(name);
    avatarEl.textContent = getInitials(name);
  }

  window.__CURRENT_USER__ = name;

  const socket = getSocket();
  if (socket && !socket.connected && !socket.active && socket.connect) {
    socket.connect();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadMeAndRender().catch(err => {
    console.error("[profile] load /api/authentications/me failed:", err);
  });
});